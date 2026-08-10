// Fase 2.2 del roadmap (extensión): detección automática de cadencia de
// zancada sobre un video ya cargado localmente (IndexedDB, sin nube),
// usando MediaPipe Pose Landmarker corriendo 100% en el navegador/Electron
// (WASM + WebGL), sin mandar el video a ningún servidor.
//
// Librería: @mediapipe/tasks-vision@0.10.35 (version estable verificada,
// NO @latest ni un release candidate 1.0.0-rc.*). El bundle JS se pide a
// jsDelivr y el modelo de pose (~unos MB) a Google Cloud Storage — ambos
// requieren internet la primera vez que se usa esta función en particular
// (el resto del sistema de video de la app es 100% local; esto es la
// excepción, ver aviso en el panel de Ayuda / README si se agrega).
import { FilesetResolver, PoseLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
// Variante "heavy": verificado empíricamente (herramienta de prueba aislada,
// comparando lite/full/heavy sobre el mismo cuadro exacto de un video real
// con motion blur) que da una mejora muy notable en la ubicación de tobillos
// y rodillas frente a "lite". El costo en tiempo de procesamiento no es un
// problema para este caso de uso (análisis post-captura, no en vivo).
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task';

// Indices del esqueleto de 33 puntos de MediaPipe Pose. Y normalizado 0-1,
// creciendo hacia ABAJO (y=0 arriba del frame, y=1 abajo).
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

const MAX_ANALYSIS_SECONDS = 15; // limite duro, sin importar que tan largo sea el video
const SAMPLE_INTERVAL_MS = 66;   // ~15 muestras/segundo
const MIN_CONTACT_GAP_MS = 150;  // ningun pie hace 2 contactos separados por menos de esto
const SEEK_TIMEOUT_MS = 1500;    // seguridad por si el navegador no dispara 'seeked'
const PEAK_MARGIN = 0.01;        // margen minimo sobre el promedio para no contar ruido como contacto (unidades: fraccion normalizada 0-1 del alto del frame)
const MIN_VISIBILITY = 0.3;      // por debajo de esto, MediaPipe no esta seguro de donde esta el punto -- mejor no dibujarlo/usarlo que mostrar una posicion inventada

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
 */
async function createLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  const baseOptions = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
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

/** Promedio móvil simple de 3 muestras, para suavizar ruido de detección. */
function smooth3(values) {
  return values.map((v, i) => {
    const prev = i > 0 ? values[i - 1] : v;
    const next = i < values.length - 1 ? values[i + 1] : v;
    return (prev + v + next) / 3;
  });
}

/**
 * Cuenta contactos con el suelo de UN pie: picos locales (máximos, ya que Y
 * mayor = más abajo en el frame = pie apoyado) que superen el promedio de
 * la serie por un margen mínimo, con al menos MIN_CONTACT_GAP_MS entre
 * contactos consecutivos del mismo pie.
 */
function countContacts(samples) {
  if (samples.length < 3) return 0;
  const ys = smooth3(samples.map(s => s.y));
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  let lastContactMs = -Infinity;
  let count = 0;
  for (let i = 1; i < ys.length - 1; i++) {
    const isPeak = ys[i] > ys[i - 1] && ys[i] > ys[i + 1] && ys[i] > mean + PEAK_MARGIN;
    if (!isPeak) continue;
    const tMs = samples[i].t * 1000;
    if (tMs - lastContactMs < MIN_CONTACT_GAP_MS) continue;
    lastContactMs = tMs;
    count++;
  }
  return count;
}

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

  const landmarker = await createLandmarker();

  const frames = [];
  let detectedFrames = 0, totalFrames = 0;
  const lastReal = {}; // idx -> { x, y, visibility, sampleIndex } -- ultima deteccion FRESCA real (no interpolada), para el suavizado leve
  const SMOOTH_ALPHA = 0.35; // peso del cuadro anterior en el suavizado leve (0=sin suavizar, cerca de 1=casi congelado)

  try {
    const stepSeconds = SAMPLE_INTERVAL_MS / 1000;
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
      const worldLandmarks = result && result.worldLandmarks && result.worldLandmarks[0];
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
          const rawW = worldLandmarks && worldLandmarks[idx];
          pts[idx] = {
            x, y, visibility, interpolated: false,
            // Coordenadas 3D metricas (metros, origen en el centro de las
            // caderas) -- se usan para angulos articulares, altura de
            // rodilla y correccion de identidad izquierda/derecha, todo
            // fase "heavy tracking". No se suavizan aqui (ALPHA de arriba
            // es solo para x,y 2D) -- el suavizado de world pasa despues,
            // en applyHeavyTracking(), junto con el resto del pipeline.
            world: rawW ? { x: rawW.x, y: rawW.y, z: rawW.z } : null,
            suspect: false,
          };
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

  fillGapsWithMotionInterpolation(frames);
  // Fase "heavy tracking": corrige posibles intercambios de identidad
  // izquierda/derecha, suaviza con deteccion de outliers, y calcula
  // angulos articulares + altura de rodilla normalizada. Todo esto opera
  // sobre `world` (3D metrico), no sobre x,y (2D de imagen) -- ver
  // applyHeavyTracking() mas abajo para el porque.
  applyHeavyTracking(frames);
  // Ya rellenados los huecos cortos, se puede sacar el sampleIndex interno
  // (no forma parte del contrato publico de "frames") y descartar cuadros
  // que quedaron sin ningun punto (nadie detectado ese instante, ni
  // siquiera interpolable).
  const cleanFrames = frames
    .filter(f => Object.keys(f.pts).length > 0)
    .map(f => ({ t: f.t, pts: f.pts, metrics: f.metrics || null }));

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

const MAX_GAP_SECONDS = 0.6; // hueco maximo (antes-a-despues) que se anima con una linea recta entre las dos posiciones reales conocidas. Mas alla de esto, una interpolacion en linea recta ya no es confiable (el punto pudo haber hecho un recorrido curvo, no recto, en ese tiempo) -- se deja el hueco visible en vez de inventar un trayecto.

/**
 * Rellena, PARA CADA ARTICULACION POR SEPARADO, los huecos de deteccion
 * cortos con una interpolacion de movimiento real: traza una linea recta
 * entre la ultima posicion real conocida ANTES del hueco y la primera
 * posicion real conocida DESPUES del hueco, repartida en el tiempo -- el
 * "in-betweening" clasico de animacion, en vez de congelar el punto en su
 * ultima posicion hasta que reaparece.
 *
 * Muta `frames` in-place (les agrega puntos interpolados a los pts que
 * falten dentro de huecos cortos). No se puede hacer esto en tiempo real
 * cuadro a cuadro durante la captura -- necesita conocer el extremo
 * "despues" del hueco, que todavia no existe mientras se esta grabando.
 * Por eso es un paso aparte, despues de terminar todo el muestreo.
 */
function fillGapsWithMotionInterpolation(frames) {
  for (const idx of SKELETON_LANDMARKS) {
    let lastRealPos = null; // { frameIdx, x, y, visibility, world }
    for (let i = 0; i < frames.length; i++) {
      const p = frames[i].pts[idx];
      if (p) {
        if (lastRealPos && i - lastRealPos.frameIdx > 1) {
          const gapSeconds = frames[i].t - frames[lastRealPos.frameIdx].t;
          if (gapSeconds <= MAX_GAP_SECONDS) {
            for (let j = lastRealPos.frameIdx + 1; j < i; j++) {
              const span = frames[i].t - frames[lastRealPos.frameIdx].t;
              const ratio = span > 0 ? (frames[j].t - frames[lastRealPos.frameIdx].t) / span : 0;
              frames[j].pts[idx] = {
                x: lastRealPos.x + (p.x - lastRealPos.x) * ratio,
                y: lastRealPos.y + (p.y - lastRealPos.y) * ratio,
                // visibilidad marcada mas baja para dejar registro de que
                // es una posicion interpolada, no una deteccion fresca
                visibility: Math.min(lastRealPos.visibility, p.visibility) * 0.6,
                interpolated: true,
                // Interpolacion lineal de world tambien, misma logica --
                // si algun extremo no tiene world (deteccion sin
                // worldLandmarks ese cuadro), se deja null en vez de
                // inventar un valor a medias.
                world: (lastRealPos.world && p.world) ? {
                  x: lastRealPos.world.x + (p.world.x - lastRealPos.world.x) * ratio,
                  y: lastRealPos.world.y + (p.world.y - lastRealPos.world.y) * ratio,
                  z: lastRealPos.world.z + (p.world.z - lastRealPos.world.z) * ratio,
                } : null,
                suspect: false,
              };
            }
          }
          // si el hueco es mas largo que MAX_GAP_SECONDS, se deja tal cual
          // (sin ese punto) en los cuadros intermedios -- perdida real
        }
        lastRealPos = { frameIdx: i, x: p.x, y: p.y, visibility: p.visibility, world: p.world ? { ...p.world } : null };
      }
    }
  }
}

// ============================================================
//  Fase "heavy tracking": identidad persistente + suavizado con
//  deteccion de outliers + angulos articulares + altura de rodilla.
// ============================================================
// Todo esto opera sobre `world` (coordenadas 3D metricas, en metros,
// origen en el centro de las caderas), no sobre x,y de imagen 2D -- los
// angulos calculados sobre una proyeccion 2D cambian con el angulo de la
// camara; en 3D son (mucho mas) invariantes a eso.
//
// VERIFICADO EMPIRICAMENTE (herramienta de prueba aislada, sobre video
// real): worldLandmarks de MediaPipe usa Y CRECIENDO HACIA ABAJO, igual
// que los landmarks de imagen 2D -- NO "Y hacia arriba" como se asumio en
// un primer intento sin comprobar. Todas las formulas de abajo ya
// incorporan esto. Si en algun momento se actualiza la version de
// MediaPipe, vale la pena volver a correr esa verificacion antes de
// confiar en que esto sigue siendo cierto.

const TRACKING_CONFIG = {
  ALPHA: 0.62,                 // peso del suavizado exponencial (EMA) sobre world
  MAX_POSITION_CHANGE: {       // salto maximo esperable, en metros, entre dos muestras (~66ms)
    27: 0.50, 28: 0.50,        // tobillos
    25: 0.40, 26: 0.40,        // rodillas
    23: 0.30, 24: 0.30,        // caderas
    11: 0.30, 12: 0.30,        // hombros
    13: 0.40, 14: 0.40,        // codos
    15: 0.45, 16: 0.45,        // muñecas
  },
  DEFAULT_MAX_JUMP: 0.40,
  // Umbrales SIN VALIDAR TODAVIA contra multiples videos reales de sprint
  // -- son un punto de partida razonable (velocidades de tobillo/rodilla
  // durante sprint segun literatura general de biomecanica), no una
  // medicion de esta app en particular. Ajustar si en la practica se ve
  // demasiados puntos marcados "suspect" (subir el valor) o muy pocos
  // (bajarlo).
  SWAP_DIST_THRESHOLD: 0.28,   // metros: por debajo de esto, dos puntos de un mismo par L/R se consideran "ambiguos" y se revisa su continuidad temporal
  FEMUR_REF_FRAMES: 10,        // cuantos de los primeros cuadros se usan para estimar la longitud del femur de referencia
  MAX_CONSECUTIVE_FREEZES: 2,  // tras este numero de cuadros seguidos marcados "outlier", se asume que es movimiento rapido real (ej. fase de vuelo) y se deja de congelar
};

function dist3D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * Corrige posibles intercambios de identidad izquierda/derecha (ej. las
 * piernas se cruzan visualmente durante la zancada y MediaPipe, que
 * procesa cada cuadro de forma independiente, etiqueta a la pierna
 * equivocada como "izquierda"). Solo actua cuando los dos puntos de un
 * par L/R estan sospechosamente cerca uno del otro (por debajo de
 * SWAP_DIST_THRESHOLD) -- si estan claramente separados no hay ambiguedad
 * que corregir.
 *
 * Para decidir si de verdad hay swap, se compara la continuidad de cada
 * punto contra el cuadro ANTERIOR y el cuadro SIGUIENTE (los que existan).
 * Se exigen al menos 2 votos independientes Y unanimidad entre ellos --
 * un solo vecino no es evidencia suficiente (ver nota tecnica abajo sobre
 * por que).
 *
 * Todas las decisiones se calculan contra los datos ORIGINALES sin mutar
 * nada, y los swaps se aplican todos juntos al final -- si se mutara
 * mientras se decide, un cuadro ya corregido podria contaminar la
 * evidencia usada para decidir sobre su vecino, y en casos ambiguos eso
 * puede generar una cascada que corrompa cuadros que en realidad estaban
 * bien. (Esto no es una hipotesis: se detecto como bug real al probar
 * esta funcion con datos sinteticos de 3 cuadros donde solo el cuadro del
 * medio estaba mal -- la primera version, con mutacion in-place y solo 1
 * voto minimo, terminaba "corrigiendo" los dos cuadros que SI estaban
 * bien y dejaba sin corregir el que SI estaba mal.)
 *
 * LIMITE DE ALCANCE CONOCIDO (probado y documentado a proposito, no un
 * descuido): esta funcion SOLO actua cuando los dos puntos del par L/R
 * estan sospechosamente cerca uno del otro en ese cuadro (< 
 * SWAP_DIST_THRESHOLD). Si en algun momento MediaPipe llegara a etiquetar
 * mal un punto SIN que los dos puntos del par esten fisicamente cerca (un
 * tipo de falla distinto del clasificador interno del modelo, en teoria
 * menos probable), esta funcion no lo detecta ni corrige. El caso que si
 * cubre -- y es el que motivo construirla -- es el cruce visual de
 * piernas a media zancada, que es exactamente cuando los dos puntos SI
 * quedan cerca uno del otro en la proyeccion de la camara.
 */
function correctIdentitySwaps(frames) {
  const pairs = [[23, 24], [25, 26], [27, 28], [11, 12], [13, 14], [15, 16]];
  // Fase 1: decidir TODOS los swaps comparando contra los datos
  // ORIGINALES, sin mutar nada todavia. Esto es necesario -- si se
  // corrige un cuadro y se usa ese mismo cuadro ya corregido como
  // "evidencia" para decidir el siguiente, un solo cuadro mal detectado
  // puede generar una cascada que termine corrompiendo cuadros vecinos
  // que en realidad estaban bien (se encontro este bug real probando la
  // funcion con datos sinteticos antes de integrarla).
  const swapsToApply = [];
  for (let i = 0; i < frames.length; i++) {
    const currPts = frames[i].pts;
    for (const [lIdx, rIdx] of pairs) {
      const l = currPts[lIdx]?.world;
      const r = currPts[rIdx]?.world;
      if (!l || !r) continue;
      if (dist3D(l, r) > TRACKING_CONFIG.SWAP_DIST_THRESHOLD) continue; // separados de sobra, sin ambiguedad

      let votesForSwap = 0, votesTotal = 0;
      const prevPts = frames[i - 1]?.pts;
      const nextPts = frames[i + 1]?.pts;
      if (prevPts) {
        const prevL = prevPts[lIdx]?.world, prevR = prevPts[rIdx]?.world;
        if (prevL && prevR) {
          votesTotal++;
          if (dist3D(r, prevL) < dist3D(l, prevL) && dist3D(l, prevR) < dist3D(r, prevR)) votesForSwap++;
        }
      }
      if (nextPts) {
        const nextL = nextPts[lIdx]?.world, nextR = nextPts[rIdx]?.world;
        if (nextL && nextR) {
          votesTotal++;
          if (dist3D(r, nextL) < dist3D(l, nextL) && dist3D(l, nextR) < dist3D(r, nextR)) votesForSwap++;
        }
      }
      // Se exige AL MENOS 2 votos independientes (no solo 1) antes de
      // actuar. Con un solo vecino disponible (bordes del clip, o el
      // otro vecino sin dato) no hay suficiente evidencia -- un cuadro
      // ambiguo comparado contra un unico vecino que TAMBIEN resulte
      // estar mal no se puede distinguir de un cuadro correcto rodeado
      // de un vecino malo, y actuar ahi es mas riesgo que beneficio.
      if (votesTotal >= 2 && votesForSwap === votesTotal) {
        swapsToApply.push({ i, lIdx, rIdx });
      }
    }
  }

  // Fase 2: aplicar todos los swaps decididos, de una sola vez.
  for (const { i, lIdx, rIdx } of swapsToApply) {
    const pts = frames[i].pts;
    const tmp = pts[lIdx];
    pts[lIdx] = pts[rIdx];
    pts[rIdx] = tmp;
    pts[lIdx].suspect = true;
    pts[rIdx].suspect = true;
  }
}

/**
 * Suaviza cada articulacion por separado con un promedio exponencial
 * (EMA) sobre `world`, con deteccion de outliers por salto absoluto de
 * posicion entre dos muestras consecutivas (~66ms).
 *
 * A diferencia de un primer diseño, esto NO se queda "congelado" para
 * siempre si el salto grande persiste varios cuadros seguidos: tras
 * MAX_CONSECUTIVE_FREEZES cuadros marcados como outlier de forma
 * consecutiva, se asume que ya no es un glitch puntual sino movimiento
 * rapido real (tipicamente la fase de vuelo de la zancada, donde el pie
 * de la pierna que se recobra puede moverse mas rapido que cualquier
 * otra parte del cuerpo) y se "re-adquiere" el punto con el dato crudo en
 * vez de seguir comparandolo contra una posicion cada vez mas vieja.
 */
class JointTracker {
  constructor() {
    this.history = new Map(); // idx -> { world, consecutiveOutliers }
  }

  update(idx, world) {
    if (!world) return null;
    const key = String(idx);
    if (!this.history.has(key)) {
      this.history.set(key, { world: { ...world }, consecutiveOutliers: 0 });
      return { ...world, suspect: false };
    }

    const prev = this.history.get(key);
    const jump = dist3D(world, prev.world);
    const maxJump = TRACKING_CONFIG.MAX_POSITION_CHANGE[idx] || TRACKING_CONFIG.DEFAULT_MAX_JUMP;

    let accepted = world;
    let suspect = false;
    if (jump > maxJump) {
      if (prev.consecutiveOutliers >= TRACKING_CONFIG.MAX_CONSECUTIVE_FREEZES) {
        accepted = world; // re-adquisicion: confiamos en el dato crudo
      } else {
        accepted = { ...prev.world }; // probable glitch de 1 cuadro: congelamos
        suspect = true;
      }
    }
    const consecutiveOutliers = suspect ? prev.consecutiveOutliers + 1 : 0;

    const ALPHA = TRACKING_CONFIG.ALPHA;
    const smoothed = {
      x: prev.world.x * ALPHA + accepted.x * (1 - ALPHA),
      y: prev.world.y * ALPHA + accepted.y * (1 - ALPHA),
      z: prev.world.z * ALPHA + accepted.z * (1 - ALPHA),
    };
    this.history.set(key, { world: { ...smoothed }, consecutiveOutliers });
    return { ...smoothed, suspect };
  }
}

/** Angulo entre dos vectores 3D, en grados (0-180). */
function angleBetweenVectors(u, v) {
  const dot = u.x * v.x + u.y * v.y + u.z * v.z;
  const nu = Math.hypot(u.x, u.y, u.z) || 1;
  const nv = Math.hypot(v.x, v.y, v.z) || 1;
  let cos = dot / (nu * nv);
  cos = Math.max(-1, Math.min(1, cos));
  return Math.acos(cos) * (180 / Math.PI);
}

/**
 * Angulo de flexion de rodilla: 180° = pierna completamente extendida,
 * disminuye a medida que la rodilla se flexiona. Se calcula entre el
 * vector del muslo (cadera->rodilla) y el vector de la pierna
 * (rodilla->tobillo) -- el "180 - angulo_entre_vectores" es lo que
 * convierte el angulo geometrico crudo en la convencion anatomica
 * estandar (verificado a mano: angulo(-A,B) = 180-angulo(A,B)).
 */
function computeKneeAngle(hip, knee, ankle) {
  if (!hip || !knee || !ankle) return null;
  const u = { x: knee.x - hip.x, y: knee.y - hip.y, z: knee.z - hip.z };
  const v = { x: ankle.x - knee.x, y: ankle.y - knee.y, z: ankle.z - knee.z };
  return 180 - angleBetweenVectors(u, v);
}

/** Angulo de cadera (tronco-cadera-muslo), misma convencion que la rodilla. */
function computeHipAngle(shoulder, hip, knee) {
  if (!shoulder || !hip || !knee) return null;
  const u = { x: shoulder.x - hip.x, y: shoulder.y - hip.y, z: shoulder.z - hip.z };
  const v = { x: knee.x - hip.x, y: knee.y - hip.y, z: knee.z - hip.z };
  return 180 - angleBetweenVectors(u, v);
}

/** Angulo de codo, misma convencion (180° = brazo extendido). */
function computeElbowAngle(shoulder, elbow, wrist) {
  if (!shoulder || !elbow || !wrist) return null;
  const u = { x: elbow.x - shoulder.x, y: elbow.y - shoulder.y, z: elbow.z - shoulder.z };
  const v = { x: wrist.x - elbow.x, y: wrist.y - elbow.y, z: wrist.z - elbow.z };
  return 180 - angleBetweenVectors(u, v);
}

/** Inclinacion del tronco respecto a la vertical (0° = totalmente vertical). */
function computeTrunkInclination(shoulderMid, hipMid) {
  if (!shoulderMid || !hipMid) return null;
  const u = { x: shoulderMid.x - hipMid.x, y: shoulderMid.y - hipMid.y, z: shoulderMid.z - hipMid.z };
  return angleBetweenVectors(u, { x: 0, y: -1, z: 0 }); // -1 porque Y crece hacia ABAJO (ver nota de verificacion arriba); "hacia arriba" real es -Y
}

/** Longitud del femur (cadera-rodilla) como referencia de escala del atleta. Se mide en 3D, asi que no depende de si la pierna esta flexionada o no en ese cuadro (la distancia entre dos huesos rigidos no cambia con el angulo de la articulacion). Mediana de varias muestras para ser robusto a un cuadro raro. */
function calculateReferenceFemur(frames) {
  const femurs = [];
  const limit = Math.min(frames.length, TRACKING_CONFIG.FEMUR_REF_FRAMES);
  for (let i = 0; i < limit; i++) {
    const hipL = frames[i].pts[23]?.world, kneeL = frames[i].pts[25]?.world;
    const hipR = frames[i].pts[24]?.world, kneeR = frames[i].pts[26]?.world;
    if (hipL && kneeL) femurs.push(dist3D(hipL, kneeL));
    if (hipR && kneeR) femurs.push(dist3D(hipR, kneeR));
  }
  if (!femurs.length) return null;
  femurs.sort((a, b) => a - b);
  return femurs[Math.floor(femurs.length / 2)];
}

/**
 * "Elevacion de rodilla" normalizada por la longitud del femur del propio
 * atleta, para que sea comparable entre repeticiones/atletas/distancias
 * de camara sin necesitar calibracion externa. Como Y crece hacia ABAJO
 * (verificado empiricamente), la brecha vertical cruda (knee.y - hip.y)
 * es GRANDE cuando la rodilla esta muy por debajo de la cadera y se
 * acerca a 0 (o se vuelve negativa) cuando la rodilla sube a la altura de
 * la cadera o mas arriba. Se reporta como 100 menos esa brecha para que
 * un numero MAYOR siempre signifique "rodilla mas alta" -- mas intuitivo
 * para el entrenador que un numero que baja cuando la rodilla sube.
 */
function computeKneeHeightNormalized(hip, knee, femurLength) {
  if (!hip || !knee || !femurLength || femurLength === 0) return null;
  const verticalGapNorm = ((knee.y - hip.y) / femurLength) * 100;
  return 100 - verticalGapNorm;
}

function computeFrameMetrics(pts, femurLength) {
  const w = (idx) => pts[idx]?.world || null;
  const hipL = w(23), hipR = w(24), kneeL = w(25), kneeR = w(26), ankleL = w(27), ankleR = w(28);
  const shoulderL = w(11), shoulderR = w(12), elbowL = w(13), elbowR = w(14), wristL = w(15), wristR = w(16);
  const mid = (a, b) => (a && b) ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 } : null;

  return {
    kneeAngleL: computeKneeAngle(hipL, kneeL, ankleL),
    kneeAngleR: computeKneeAngle(hipR, kneeR, ankleR),
    hipAngleL: computeHipAngle(shoulderL, hipL, kneeL),
    hipAngleR: computeHipAngle(shoulderR, hipR, kneeR),
    elbowAngleL: computeElbowAngle(shoulderL, elbowL, wristL),
    elbowAngleR: computeElbowAngle(shoulderR, elbowR, wristR),
    trunkInclination: computeTrunkInclination(mid(shoulderL, shoulderR), mid(hipL, hipR)),
    kneeHeightL: computeKneeHeightNormalized(hipL, kneeL, femurLength),
    kneeHeightR: computeKneeHeightNormalized(hipR, kneeR, femurLength),
  };
}

/**
 * Orquesta el pipeline completo, EN ESTE ORDEN (importa mucho el orden):
 *   1. Corregir identidad izquierda/derecha -- ANTES de suavizar, porque
 *      si se suaviza primero, el historial del suavizado de "rodilla
 *      izquierda" queda contaminado con datos de la derecha antes de que
 *      la correccion se entere, y la correccion tampoco alcanza a
 *      arreglar ese historial interno despues.
 *   2. Suavizar + detectar outliers, ya sobre identidades corregidas.
 *   3. Calcular metricas (angulos, altura de rodilla), ya sobre datos
 *      suavizados y con identidad correcta.
 */
function applyHeavyTracking(frames) {
  if (frames.length < 3) return;

  correctIdentitySwaps(frames);

  const tracker = new JointTracker();
  for (const frame of frames) {
    for (const idx of SKELETON_LANDMARKS) {
      const p = frame.pts[idx];
      if (p?.world) {
        const updated = tracker.update(idx, p.world);
        if (updated) {
          p.world = { x: updated.x, y: updated.y, z: updated.z };
          if (updated.suspect) p.suspect = true;
        }
      }
    }
  }

  const femurLength = calculateReferenceFemur(frames);
  for (const frame of frames) {
    frame.metrics = femurLength ? computeFrameMetrics(frame.pts, femurLength) : null;
  }
}
