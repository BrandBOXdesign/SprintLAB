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
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

// Indices del esqueleto de 33 puntos de MediaPipe Pose. Y normalizado 0-1,
// creciendo hacia ABAJO (y=0 arriba del frame, y=1 abajo).
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

const MAX_ANALYSIS_SECONDS = 15; // limite duro, sin importar que tan largo sea el video
const SAMPLE_INTERVAL_MS = 66;   // ~15 muestras/segundo
const MIN_CONTACT_GAP_MS = 150;  // ningun pie hace 2 contactos separados por menos de esto
const SEEK_TIMEOUT_MS = 1500;    // seguridad por si el navegador no dispara 'seeked'
const PEAK_MARGIN = 0.01;        // margen minimo sobre el promedio para no contar ruido como contacto (unidades: fraccion normalizada 0-1 del alto del frame)

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
