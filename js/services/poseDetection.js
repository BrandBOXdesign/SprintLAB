// Fase 2.2 del roadmap (extensión): detección automática de cadencia de
// zancada sobre un video ya cargado localmente (IndexedDB, sin nube),
// usando MediaPipe Pose Landmarker corriendo 100% en el navegador/Electron
// (WASM + WebGL), sin mandar el video a ningún servidor.
//
// Librería: @mediapipe/tasks-vision@0.10.35 (version estable verificada,
// NO @latest ni un release candidate 1.0.0-rc.*). El bundle JS, el runtime
// WASM y los modelos lite/heavy viven en vendor/ (descargados una vez): el
// analisis de video funciona 100% local, sin internet.
import { FilesetResolver, PoseLandmarker } from '../../vendor/mediapipe/vision_bundle.mjs';
import { countContacts, fillGapsWithMotionInterpolation, rejectImplausibleDetections } from './poseLogic.js';

const WASM_URL = new URL('../../vendor/mediapipe/wasm', import.meta.url).href;
const MODEL_URL = new URL('../../vendor/models/pose_landmarker_lite.task', import.meta.url).href;
// Variante "heavy": mismo formato de salida (33 landmarks), notablemente
// mas precisa en oclusiones (extremidades cruzandose, que es exactamente
// el problema reportado en la carrera) a cambio de tardar mas por cuadro.
// Solo se usa en analyzeFullSkeleton() -- analyzeStrideCadence() sigue con
// la "lite" porque ahi solo nos interesan los tobillos y la velocidad de
// deteccion importa mas que la precision fina de oclusion.
const MODEL_URL_HEAVY = new URL('../../vendor/models/pose_landmarker_heavy.task', import.meta.url).href;

// Indices del esqueleto de 33 puntos de MediaPipe Pose. Y normalizado 0-1,
// creciendo hacia ABAJO (y=0 arriba del frame, y=1 abajo).
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

const MAX_ANALYSIS_SECONDS = 15; // limite duro, sin importar que tan largo sea el video
const SAMPLE_INTERVAL_MS = 66;   // ~15 muestras/segundo (analyzeStrideCadence)
const SKELETON_SAMPLE_INTERVAL_MS = 20; // ~50 muestras/segundo (analyzeFullSkeleton) -- mas denso a proposito: mas datos crudos, huecos mas cortos que rellenar, sin importar que tarde mas en procesar
const SEEK_TIMEOUT_MS = 1500;    // seguridad por si el navegador no dispara 'seeked'
const MIN_VISIBILITY = 0.3;      // por debajo de esto, MediaPipe no esta seguro de donde esta el punto -- mejor no dibujarlo/usarlo que mostrar una posicion inventada
// PEAK_MARGIN y MIN_CONTACT_GAP_MS ahora viven en poseLogic.js (los usa countContacts internamente); MIN_DISPLACEMENT_FOR_OUTLIER_TEST, DETOUR_RATIO_THRESHOLD y MAX_GAP_SECONDS igual, los usan rejectImplausibleDetections/fillGapsWithMotionInterpolation ahi.

// Fase A del roadmap de "sprint lab" (analisis de forma de carrera): captura
// del esqueleto completo, no solo los tobillos. MediaPipe ya calcula estos
// 33 puntos en cada cuadro para analyzeStrideCadence() -- ahi simplemente se
// tiraban todos menos los tobillos. Aqui nos quedamos con los puntos utiles
// para forma de carrera (cadera, rodillas, tobillos, hombros, codos,
// muñecas, talones y punta de pie); se deja fuera la cara (indices 0-10)
// porque no aporta nada al analisis de tecnica de sprint.
export const SKELETON_LANDMARKS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

// Pares de indices que se dibujan como lineas del "muñeco de palitos".
// Torso, brazos y piernas completos, mas el triangulo talon-tobillo-punta
// de pie en cada pie (util para ver la orientacion del pie al contacto).
export const SKELETON_CONNECTIONS = [
  [11, 12], [11, 23], [12, 24], [23, 24],       // torso (hombros-caderas)
  [11, 13], [13, 15],                            // brazo izquierdo
  [12, 14], [14, 16],                            // brazo derecho
  [23, 25], [25, 27],                            // pierna izquierda (cadera-rodilla-tobillo)
  [24, 26], [26, 28],                            // pierna derecha
  [27, 29], [27, 31], [29, 31],                  // pie izquierdo (tobillo-talon-punta)
  [28, 30], [28, 32], [30, 32],                  // pie derecho
];

/**
 * Crea una instancia de PoseLandmarker. Intenta GPU primero; si falla,
 * reintenta una vez con CPU (mas compatible, mas lento).
 * @param {string} [modelUrl] por defecto la variante "lite" (rapida); pasar MODEL_URL_HEAVY para mayor precision en oclusiones (analyzeFullSkeleton).
 */
async function createLandmarker(modelUrl = MODEL_URL) {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  const baseOptions = (delegate) => ({
    baseOptions: { modelAssetPath: modelUrl, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
  try {
    return await PoseLandmarker.createFromOptions(vision, baseOptions('GPU'));
  } catch (err) {
    console.warn('poseDetection: no se pudo crear PoseLandmarker con delegate GPU, reintentando con CPU.', err);
    return await PoseLandmarker.createFromOptions(vision, baseOptions('CPU'));
  }
}

/** Mueve el <video> a un instante exacto y espera a que el frame esté listo. */
function seekTo(videoEl, t) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      videoEl.removeEventListener('seeked', finish);
      resolve();
    };
    videoEl.addEventListener('seeked', finish);
    videoEl.currentTime = t;
    setTimeout(finish, SEEK_TIMEOUT_MS);
  });
}

// smooth3() y countContacts() ahora viven en poseLogic.js (importadas
// arriba) -- se movieron ahi junto con rejectImplausibleDetections() y
// fillGapsWithMotionInterpolation() porque son logica pura, sin nada de
// DOM/video, y asi se pueden probar con Node normal (ver test/poseLogic.test.js).

/**
 * Analiza un <video> ya cargado (con metadata disponible: .duration válido)
 * y estima la cadencia de zancada contando contactos de CUALQUIER pie con
 * el suelo por segundo -- misma unidad que el campo "frecuencia de
 * zancada" que el entrenador ya llenaba a mano, para no romper el cálculo
 * existente de longitud de zancada (velocidad ÷ frecuencia).
 *
 * @param {HTMLVideoElement} videoEl
 * @param {{ startTime?: number, endTime?: number, onProgress?: (pct:number)=>void }} [opts]
 * @returns {Promise<{ stepsPerSecond:number, totalSteps:number, analyzedSeconds:number, confidence:'baja'|'media'|'alta', detectionRate:number }>}
 */
export async function analyzeStrideCadence(videoEl, opts = {}) {
  if (!videoEl || !isFinite(videoEl.duration) || videoEl.duration <= 0) {
    throw new Error('El video no tiene duración válida todavía (¿ya cargó por completo?).');
  }

  const startTime = Math.max(0, opts.startTime ?? 0);
  let endTime = opts.endTime ?? videoEl.duration;
  endTime = Math.min(endTime, videoEl.duration);
  if (endTime - startTime > MAX_ANALYSIS_SECONDS) {
    endTime = startTime + MAX_ANALYSIS_SECONDS;
    console.warn(`analyzeStrideCadence: video más largo que ${MAX_ANALYSIS_SECONDS}s -- se analizan solo los primeros ${MAX_ANALYSIS_SECONDS}s del rango pedido.`);
  }
  const totalDuration = endTime - startTime;
  if (totalDuration <= 0) throw new Error('Rango de análisis inválido (duración cero o negativa).');

  const wasPaused = videoEl.paused;
  const originalTime = videoEl.currentTime;
  videoEl.pause();

  // IMPORTANTE: se crea una instancia NUEVA de PoseLandmarker en CADA
  // analisis, nunca se cachea entre llamadas. detectForVideo() exige
  // timestamps estrictamente crecientes: si se le manda un timestamp menor
  // al ultimo que proceso, MediaPipe queda en error permanente y no se
  // recupera (bug documentado de la libreria, sin metodo de reset
  // disponible). Como cada analisis vuelve a empezar su conteo de tiempo
  // desde startTime, cachear la instancia entre analisis (de la misma
  // sesion u otra) dispararia justo ese caso. Crear una instancia por
  // analisis cuesta algo de tiempo de carga (el modelo ya deberia estar en
  // cache HTTP del navegador tras el primer uso), pero es la unica forma
  // confiable de evitar el bug.
  const landmarker = await createLandmarker();

  const leftSamples = [], rightSamples = [];
  let detectedFrames = 0, totalFrames = 0;

  try {
    const stepSeconds = SAMPLE_INTERVAL_MS / 1000;
    const stepCount = Math.floor(totalDuration / stepSeconds) + 1;
    for (let i = 0; i < stepCount; i++) {
      const t = Math.min(startTime + i * stepSeconds, endTime);
      totalFrames++;
      await seekTo(videoEl, t);

      // Timestamp relativo a startTime, arrancando en 1ms (no en 0) y
      // siempre creciente dentro de esta instancia -- ver nota arriba.
      const timestampMs = Math.round((t - startTime) * 1000) + 1;
      let result;
      try {
        result = landmarker.detectForVideo(videoEl, timestampMs);
      } catch (err) {
        console.warn(`analyzeStrideCadence: detectForVideo falló en t=${t.toFixed(2)}s:`, err);
        if (opts.onProgress) opts.onProgress(Math.min(100, Math.round(((t - startTime) / totalDuration) * 100)));
        continue;
      }
      const landmarks = result && result.landmarks && result.landmarks[0];
      if (landmarks) {
        detectedFrames++;
        if (landmarks[LEFT_ANKLE]) leftSamples.push({ t, y: landmarks[LEFT_ANKLE].y });
        if (landmarks[RIGHT_ANKLE]) rightSamples.push({ t, y: landmarks[RIGHT_ANKLE].y });
      }
      if (opts.onProgress) opts.onProgress(Math.min(100, Math.round(((t - startTime) / totalDuration) * 100)));
      if (t >= endTime) break;
    }
  } finally {
    try { landmarker.close(); } catch (err) { console.warn('analyzeStrideCadence: no se pudo liberar PoseLandmarker limpiamente.', err); }
    try {
      videoEl.currentTime = originalTime;
      if (!wasPaused) await videoEl.play();
    } catch { /* el navegador puede bloquear el autoplay tras manipular el video; no es critico */ }
  }

  const leftContacts = countContacts(leftSamples);
  const rightContacts = countContacts(rightSamples);
  const totalSteps = leftContacts + rightContacts;
  const stepsPerSecond = totalDuration > 0 ? totalSteps / totalDuration : 0;
  const detectionRate = totalFrames > 0 ? detectedFrames / totalFrames : 0;
  const confidence = detectionRate > 0.8 ? 'alta' : detectionRate >= 0.5 ? 'media' : 'baja';

  return {
    stepsPerSecond: Math.round(stepsPerSecond * 100) / 100,
    totalSteps,
    analyzedSeconds: Math.round(totalDuration * 100) / 100,
    confidence,
    detectionRate: Math.round(detectionRate * 100) / 100,
  };
}

/**
 * Fase A: captura el esqueleto completo (SKELETON_LANDMARKS) cuadro a
 * cuadro sobre un <video> ya cargado, para poder dibujar despues una
 * animacion de "muñeco de palitos" sincronizada con la reproduccion.
 *
 * Reutiliza exactamente el mismo patron de analyzeStrideCadence(): misma
 * instancia de PoseLandmarker por analisis (nunca se cachea entre
 * llamadas, ver nota arriba sobre timestamps crecientes), mismo limite de
 * MAX_ANALYSIS_SECONDS, mismo intervalo de muestreo. La diferencia es que
 * en vez de quedarnos solo con los tobillos, guardamos todos los puntos de
 * SKELETON_LANDMARKS de cada cuadro detectado.
 *
 * Los puntos con baja "visibility" (MediaPipe no esta seguro de donde
 * estan, tipicamente por oclusion o que salieron del cuadro) se descartan
 * punto por punto en vez de descartar el cuadro completo -- asi una mano
 * fuera de cuadro no tira todo el resto del cuerpo detectado ese instante.
 *
 * @param {HTMLVideoElement} videoEl
 * @param {{ startTime?: number, endTime?: number, onProgress?: (pct:number)=>void }} [opts]
 * @returns {Promise<{ frames: Array<{t:number, pts:Object}>, analyzedSeconds:number, confidence:'baja'|'media'|'alta', detectionRate:number, videoWidth:number, videoHeight:number }>}
 */
export async function analyzeFullSkeleton(videoEl, opts = {}) {
  if (!videoEl || !isFinite(videoEl.duration) || videoEl.duration <= 0) {
    throw new Error('El video no tiene duración válida todavía (¿ya cargó por completo?).');
  }

  const startTime = Math.max(0, opts.startTime ?? 0);
  let endTime = opts.endTime ?? videoEl.duration;
  endTime = Math.min(endTime, videoEl.duration);
  if (endTime - startTime > MAX_ANALYSIS_SECONDS) {
    endTime = startTime + MAX_ANALYSIS_SECONDS;
    console.warn(`analyzeFullSkeleton: video más largo que ${MAX_ANALYSIS_SECONDS}s -- se analizan solo los primeros ${MAX_ANALYSIS_SECONDS}s del rango pedido.`);
  }
  const totalDuration = endTime - startTime;
  if (totalDuration <= 0) throw new Error('Rango de análisis inválido (duración cero o negativa).');

  const wasPaused = videoEl.paused;
  const originalTime = videoEl.currentTime;
  videoEl.pause();

  const landmarker = await createLandmarker(MODEL_URL_HEAVY);

  const frames = [];
  let detectedFrames = 0, totalFrames = 0;
  const lastReal = {}; // idx -> { x, y, visibility, sampleIndex } -- ultima deteccion FRESCA real (no interpolada), para el suavizado leve
  const SMOOTH_ALPHA = 0.35; // peso del cuadro anterior en el suavizado leve (0=sin suavizar, cerca de 1=casi congelado)

  try {
    const stepSeconds = SKELETON_SAMPLE_INTERVAL_MS / 1000;
    const stepCount = Math.floor(totalDuration / stepSeconds) + 1;
    for (let i = 0; i < stepCount; i++) {
      const t = Math.min(startTime + i * stepSeconds, endTime);
      totalFrames++;
      await seekTo(videoEl, t);

      const timestampMs = Math.round((t - startTime) * 1000) + 1;
      let result;
      try {
        result = landmarker.detectForVideo(videoEl, timestampMs);
      } catch (err) {
        console.warn(`analyzeFullSkeleton: detectForVideo falló en t=${t.toFixed(2)}s:`, err);
        if (opts.onProgress) opts.onProgress(Math.min(100, Math.round(((t - startTime) / totalDuration) * 100)));
        continue;
      }
      const landmarks = result && result.landmarks && result.landmarks[0];
      const pts = {};
      if (landmarks) {
        detectedFrames++;
        for (const idx of SKELETON_LANDMARKS) {
          const rawP = landmarks[idx];
          if (!rawP) continue;
          if (typeof rawP.visibility === 'number' && rawP.visibility < MIN_VISIBILITY) continue; // punto no confiable este cuadro -- se deja hueco, se rellena despues por interpolacion real (ver fillGapsWithMotionInterpolation)
          let x = rawP.x, y = rawP.y;
          const visibility = typeof rawP.visibility === 'number' ? rawP.visibility : 1;
          // Suavizado leve SOLO entre muestras consecutivas reales
          // (sampleIndex adyacente) -- si hubo un hueco de por medio, no se
          // suaviza contra un valor viejo de antes del hueco, porque ya lo
          // va a resolver la interpolacion de movimiento entre los dos
          // extremos reales. ALPHA bajo a proposito: un sprint mueve los
          // brazos rapido y suavizar de mas introduce atraso perceptible.
          const prev = lastReal[idx];
          if (prev && prev.sampleIndex === i - 1) {
            x = prev.x * SMOOTH_ALPHA + x * (1 - SMOOTH_ALPHA);
            y = prev.y * SMOOTH_ALPHA + y * (1 - SMOOTH_ALPHA);
          }
          lastReal[idx] = { x, y, visibility, sampleIndex: i };
          pts[idx] = { x, y, visibility, interpolated: false };
        }
      }
      // t es tiempo ABSOLUTO del video (igual que videoEl.currentTime), no
      // relativo a startTime -- asi el overlay puede buscar el cuadro mas
      // cercano directo contra video.currentTime sin tener que acordarse
      // de con que startTime se corrio el analisis. Se empuja un frame por
      // cada muestra (aunque pts quede vacio este instante) para mantener
      // una grilla de tiempo uniforme -- eso es lo que necesita el relleno
      // de huecos de abajo para saber exactamente cuanto tiempo paso entre
      // la ultima deteccion real y la siguiente.
      frames.push({ t, pts, sampleIndex: i });
      if (opts.onProgress) opts.onProgress(Math.min(100, Math.round(((t - startTime) / totalDuration) * 100)));
      if (t >= endTime) break;
    }
  } finally {
    try { landmarker.close(); } catch (err) { console.warn('analyzeFullSkeleton: no se pudo liberar PoseLandmarker limpiamente.', err); }
    try {
      videoEl.currentTime = originalTime;
      if (!wasPaused) await videoEl.play();
    } catch { /* el navegador puede bloquear el autoplay tras manipular el video; no es critico */ }
  }

  rejectImplausibleDetections(frames, SKELETON_LANDMARKS);
  fillGapsWithMotionInterpolation(frames, SKELETON_LANDMARKS);
  // Ya rellenados los huecos cortos, se puede sacar el sampleIndex interno
  // (no forma parte del contrato publico de "frames") y descartar cuadros
  // que quedaron sin ningun punto (nadie detectado ese instante, ni
  // siquiera interpolable).
  const cleanFrames = frames
    .filter(f => Object.keys(f.pts).length > 0)
    .map(f => ({ t: f.t, pts: f.pts }));

  const detectionRate = totalFrames > 0 ? detectedFrames / totalFrames : 0;
  const confidence = detectionRate > 0.8 ? 'alta' : detectionRate >= 0.5 ? 'media' : 'baja';

  return {
    frames: cleanFrames,
    analyzedSeconds: Math.round(totalDuration * 100) / 100,
    confidence,
    detectionRate: Math.round(detectionRate * 100) / 100,
    videoWidth: videoEl.videoWidth,
    videoHeight: videoEl.videoHeight,
  };
}

// rejectImplausibleDetections() y fillGapsWithMotionInterpolation() ahora
// viven en poseLogic.js (importadas arriba), junto con smooth3() y
// countContacts() -- todas son logica pura sin DOM/video, movidas ahi para
// poder probarlas con Node sin necesidad de navegador (ver
// test/poseLogic.test.js).
