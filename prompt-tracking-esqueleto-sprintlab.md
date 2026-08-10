# Prompt para consulta técnica externa (Grok / DeepSeek)
### Tema: seguimiento robusto de articulaciones ("heavy tracking") en un esqueleto de sprint capturado con MediaPipe Pose, dentro de una app de escritorio 100% local

Copia todo este documento (prompt + código adjunto) en una sola conversación con cada modelo. El código está incluido completo para que trabajen sobre la implementación real, no sobre una descripción aproximada.

---

## 1. Contexto del proyecto

"Sprint Lab" es una app de escritorio (Electron, Windows) para entrenadores de velocistas (100m/200m). Es una SPA en JavaScript vanilla (sin framework — un patrón de `render()` que reconstruye todo el DOM en cada cambio de estado), corriendo 100% local: no hay backend, no hay servidor propio, todo el procesamiento de video ocurre en el navegador/Electron (Chromium) del entrenador.

Existe un módulo (código completo más abajo) que:

1. Carga un video ya grabado/subido de una sesión de un atleta (guardado en IndexedDB, sin nube).
2. Corre **MediaPipe Tasks Vision — `PoseLandmarker`** (`@mediapipe/tasks-vision@0.10.35`, modelo `pose_landmarker_lite`, `runningMode: 'VIDEO'`) muestreando el video a ~15 cuadros/segundo (cada 66ms), avanzando el `<video>` con `.currentTime` y `detectForVideo()` en cada muestra.
3. Se queda con 16 de los 33 puntos del esqueleto de MediaPipe (hombros, codos, muñecas, caderas, rodillas, tobillos, talones, punta de pie — se descarta la cara).
4. Rellena huecos de detección (oclusión, mala visibilidad) con interpolación lineal de movimiento real entre la última posición conocida antes del hueco y la primera después, por articulación, solo si el hueco es corto (≤0.6s).
5. Dibuja el resultado como un "muñeco de palitos" (canvas superpuesto al video, sincronizado con `video.currentTime`, con su propia interpolación para verse fluido entre las muestras de ~66ms).
6. Por separado, cuenta contactos de pie con el suelo (picos locales de la posición Y del tobillo) para estimar cadencia de zancada (zancadas/segundo).

**Esto es puramente visual y de conteo simple.** No calcula ángulos articulares, no mide altura de rodilla, y — el problema central que quiero resolver — **no hay ninguna garantía real de que "rodilla izquierda" siga siendo la misma identidad de punto a lo largo del tiempo.** Cada cuadro se procesa de forma independiente; MediaPipe etiqueta cada punto como left/right según su propio modelo por cuadro, pero no hay ninguna capa adicional de seguimiento temporal, validación anatómica, ni corrección de errores de identidad (swap izquierda/derecha) en movimiento rápido y cíclico como el sprint, donde las piernas se cruzan visualmente en la proyección 2D varias veces por segundo.

## 2. Lo que necesito construir (el objetivo real)

Un **seguimiento robusto ("heavy tracking")** del esqueleto, no solo detección por cuadro. En concreto:

### 2.1. Identidad persistente de cada articulación
El sistema debe saber, en todo momento, exactamente cuál tobillo/rodilla/muñeca es cuál (izquierdo vs. derecho), de forma consistente cuadro a cuadro, incluso durante:
- El cruce visual de las piernas en plena zancada de sprint (las piernas se superponen en la imagen 2D varias veces por segundo).
- Oclusión parcial breve (un brazo tapando al otro, una pierna tapando parte del torso).
- Motion blur por la velocidad del atleta.

Hoy, si MediaPipe "confunde" la identidad de un punto en un cuadro (error conocido en estimación de pose monocular durante movimiento cíclico rápido), el código actual no tiene ninguna forma de detectarlo ni corregirlo — lo toma tal cual venga.

### 2.2. Ángulos articulares correctos
A partir de los puntos ya capturados, calcular (y no solo mostrar el punto, sino el ÁNGULO):
- Ángulo de flexión de rodilla (entre el segmento muslo cadera→rodilla y el segmento pierna rodilla→tobillo).
- Ángulo de cadera (entre el segmento de tronco y el segmento del muslo).
- Ángulo de inclinación de tronco (respecto a la vertical).
- Ángulo de codo.

Necesito la convención correcta de cómo calcular esto (qué vectores, qué producto/atan2, qué convención de 0°/180°) para que el número tenga sentido biomecánico real y no sea solo "un ángulo cualquiera entre tres puntos".

### 2.3. Altura de rodilla (y métricas verticales similares)
Necesito poder reportar, por ejemplo, "qué tan alto sube la rodilla" en la fase de apoyo/vuelo del sprint, de forma **comparable entre repeticiones y entre atletas** — el problema es que solo tengo coordenadas normalizadas 2D (0–1 respecto al frame del video), sin ninguna calibración de distancia real. Necesito una propuesta concreta de cómo normalizar esto (¿contra la longitud del fémur del propio atleta medida en un cuadro de referencia? ¿contra el ancho de hombros? ¿otra cosa?) para que el número no dependa de qué tan cerca esté la cámara o el zoom del video.

### 2.4. Robustez general
Todo lo anterior debe sobrevivir a: video de calidad variable (celular de un entrenador, no cámara de laboratorio), un solo punto de vista (lateral, monocular, sin calibración de múltiples cámaras), clips cortos (máx. 15s por límite de la app), y debe seguir corriendo **100% en el navegador/Electron, sin servidor ni backend en Python** — esta restricción no es negociable, es la arquitectura completa del producto.

## 3. Preguntas concretas que necesito que respondan

Por favor sean específicos y con fórmulas/algoritmos/pseudocódigo listos para integrar en JavaScript, no consejos genéricos de "usa un filtro de Kalman" sin más. Si no están seguros de algo (por ejemplo, del comportamiento interno exacto de una API de MediaPipe en su versión más reciente), **dígan explícitamente que no están seguros y por qué**, en vez de inventar un comportamiento plausible. Prefiero un "no sé, verifícalo así" a una respuesta segura pero incorrecta.

1. **¿`PoseLandmarker` en `runningMode: 'VIDEO'` ya hace algún tracking temporal interno (usa el cuadro anterior como prior/ROI para el siguiente)?** Si es así, ¿hasta qué punto eso ya ayuda con la identidad izquierda/derecha, y qué le falta encima?

2. **`PoseLandmarkerResult` expone tanto `landmarks` (2D normalizado a la imagen, con una z relativa) como `worldLandmarks` (3D métrico, centrado en la cadera) según la documentación de MediaPipe.** ¿Conviene migrar los cálculos de ángulos y altura de rodilla a `worldLandmarks` en vez de los `landmarks` normalizados que usa el código actual? ¿Qué tan confiable es esa estimación 3D desde una sola cámara lateral (que es nuestro caso de uso típico), y qué limitaciones tiene que deba comunicarle al entrenador que use la app?

3. **Nota concreta sobre el código adjunto**: el modelo cargado actualmente es la variante `pose_landmarker_lite` (ver `MODEL_URL` en `poseDetection.js`). ¿Vale la pena cambiar a la variante `full` o `heavy` de MediaPipe para mejorar precisión de ángulos/identidad, dado que los clips son cortos (≤15s) y el análisis no es en tiempo real (se puede tolerar más latencia de procesamiento a cambio de más precisión)? ¿Cuál es el trade-off real de latencia/precisión entre las tres variantes para este caso de uso?

4. **Filtro temporal por articulación**: propongan un diseño concreto (Kalman simple de velocidad constante, o algo más adecuado para este caso) que:
   - Suavice el ruido de detección cuadro a cuadro.
   - Rellene huecos de oclusión con un modelo de movimiento informado (no solo interpolación lineal como hace el código actual).
   - Sirva como mecanismo de **detección de outliers/posibles swaps de identidad**: si la posición implicada por un nuevo cuadro requeriría una velocidad físicamente imposible para esa articulación en ese intervalo de tiempo, marcarlo como sospechoso en vez de aceptarlo tal cual.

5. **Específicamente sobre el error de identidad izquierda/derecha en gait cíclico monocular**: ¿qué técnicas existen en la literatura de análisis de marcha/sprint por video (no necesariamente deep learning — también aceptable de biomecánica clásica) para prevenir o corregir el swap de identidad de una articulación cuando las piernas se cruzan en la proyección 2D? Por ejemplo: restricciones anatómicas (las dos rodillas no pueden estar a cierta distancia imposible entre sí), simetría de cadera, o un enfoque tipo *multi-object tracking* con asociación de datos aplicado punto por punto en vez de persona por persona.

6. **Fórmulas exactas** (con convención de signo/rango clara) para:
   - Ángulo de flexión de rodilla.
   - Ángulo de cadera.
   - Ángulo de inclinación de tronco respecto a la vertical.
   - Ángulo de codo.

   En cada caso, especifiquen qué vectores usar, si el resultado debe ir en el rango 0°–180° o -180°–180°, y qué convención usa la literatura de biomecánica del sprint (por ejemplo, ¿180° = rodilla completamente extendida, o al revés?).

7. **Altura de rodilla normalizada y comparable**: propongan un método concreto para expresar "qué tan alto sube la rodilla" como un número comparable entre repeticiones/atletas/distancias de cámara, dado que solo hay coordenadas normalizadas 2D sin calibración real. ¿Normalizar contra la longitud de un segmento corporal estable medido en un cuadro de referencia (por ejemplo, de pie, al inicio del clip)? ¿Contra el ancho de hombros? ¿Otra propuesta mejor?

8. **¿Vale la pena complementar MediaPipe con optical flow ligero (en JS/WASM) entre las detecciones dispersas, para suavizado sub-cuadro y mejor continuidad de identidad**, o es mejor esfuerzo invertir directamente en el filtro temporal del punto 4 y dejar el optical flow fuera? Sean honestos sobre el costo de implementación vs. beneficio real para este caso de uso (clips cortos, análisis no en tiempo real).

9. Si creen que hay un enfoque completamente distinto (otro modelo, otra librería compatible con navegador/Electron sin servidor) que resolvería esto mejor que seguir extendiendo MediaPipe Tasks Vision, propónganlo — pero solo si de verdad corre 100% cliente (WASM/TF.js/ONNX Runtime Web), no algo que requiera un backend.

## 4. Formato de respuesta que espero

- Arquitectura recomendada concreta (qué mantener de lo que ya existe, qué agregar, qué reemplazar).
- Pseudocódigo o código JS listo para adaptar a los archivos adjuntos (mismo estilo: funciones puras donde se pueda, comentarios explicando el porqué).
- Fórmulas exactas para los ángulos y la métrica de altura de rodilla.
- Cualquier suposición o incertidumbre marcada explícitamente como tal.

---

# Apéndice: código fuente completo del procesador de video y del generador de esqueleto

Estos son los tres archivos reales del proyecto que manejan esto hoy. Trabajen sobre esta implementación real, no sobre la descripción de arriba.

## `js/services/poseDetection.js`
(detección de pose con MediaPipe: cadencia de zancada + captura de esqueleto completo)

```javascript
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

  fillGapsWithMotionInterpolation(frames);
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
    let lastRealPos = null; // { frameIdx, x, y, visibility }
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
              };
            }
          }
          // si el hueco es mas largo que MAX_GAP_SECONDS, se deja tal cual
          // (sin ese punto) en los cuadros intermedios -- perdida real
        }
        lastRealPos = { frameIdx: i, x: p.x, y: p.y, visibility: p.visibility };
      }
    }
  }
}

```

## `js/services/skeletonOverlay.js`
(dibuja el esqueleto interpolado sobre un `<canvas>` sincronizado con el `<video>`)

```javascript
// Fase A del roadmap de "sprint lab": dibuja el "muñeco de palitos"
// (esqueleto capturado por analyzeFullSkeleton en poseDetection.js) sobre
// un <canvas> superpuesto al <video>, sincronizado con video.currentTime.
// Se dibuja tambien una capa negra semitransparente (20% opacidad) debajo
// del esqueleto para que las lineas se lean bien sin importar el color del
// fondo del video -- solo aparece cuando hay un cuadro capturado para
// mostrar; si todavia no se ha corrido el analisis, el video se ve normal.
//
// IMPORTANTE (bug corregido): el <video> usa object-fit:contain (ver
// components.css), asi que su contenido real puede quedar mas chico que
// la caja del elemento, centrado, con barras negras a los lados o
// arriba/abajo si el aspect ratio del clip no coincide con el contenedor
// (tipico con video vertical de celular). Los landmarks de MediaPipe estan
// normalizados respecto al FRAME NATIVO del video, no respecto a la caja
// completa del <video> -- por eso el dibujo pasa por computeContainRect()
// antes de posicionar cualquier punto, en vez de escalar directo contra el
// ancho/alto del canvas. Sin esto, el esqueleto se desalinea del corredor
// cada vez que hay letterboxing (justo el bug reportado).
//
// OJO con el patron de esta app: render() en layout.js reconstruye TODO el
// DOM de #app desde cero en cada llamada (ver comentario ahi). Eso significa
// que cualquier referencia directa a un nodo <canvas> o <video> capturada
// en un closure queda obsoleta en cuanto el usuario escribe una letra en
// cualquier campo de la pantalla. Por eso este loop NUNCA guarda una
// referencia a los nodos: en cada frame de animacion vuelve a buscarlos por
// id con document.getElementById(). Si en algun momento el id ya no existe
// (el usuario navego a otra sesion, borro el video, etc.) el loop se
// detiene solo -- no hace falta cancelarlo desde afuera.
const runningLoops = new Set();

const MAX_INTERP_GAP = 0.25; // segundos. Si entre dos cuadros capturados hay
// un hueco mas grande que esto (la deteccion se perdio varios cuadros
// seguidos -- oclusion, corredor salio del encuadre, etc.), no interpolamos
// en linea recta entre ellos porque el "salto" real del cuerpo no fue una
// linea recta. Mejor mostrar el cuadro mas cercano y aceptar un salto visible
// que inventar un movimiento fantasma que no ocurrio.

/**
 * Interpola linealmente entre los dos cuadros capturados que rodean a t.
 * Esto es lo que le da fluidez a la animacion: sin esto, el esqueleto salta
 * en escalones cada ~66ms (la cadencia de muestreo de analyzeFullSkeleton),
 * que es perceptible incluso a simple vista.
 */
function interpolateFrames(frames, t) {
  if (!frames || frames.length === 0) return null;
  if (t <= frames[0].t) return frames[0];
  if (t >= frames[frames.length - 1].t) return frames[frames.length - 1];
  let lo = 0, hi = frames.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= t) lo = mid; else hi = mid;
  }
  const fa = frames[lo], fb = frames[hi];
  const span = fb.t - fa.t;
  const ratio = span > 0 ? (t - fa.t) / span : 0;
  if (span > MAX_INTERP_GAP) return ratio < 0.5 ? fa : fb;

  const pts = {};
  const keys = new Set([...Object.keys(fa.pts), ...Object.keys(fb.pts)]);
  for (const k of keys) {
    const pa = fa.pts[k], pb = fb.pts[k];
    if (pa && pb) {
      pts[k] = {
        x: pa.x + (pb.x - pa.x) * ratio,
        y: pa.y + (pb.y - pa.y) * ratio,
        visibility: Math.min(pa.visibility, pb.visibility),
      };
    } else if (pa && ratio < 0.5) {
      pts[k] = pa; // el punto desapareció a mitad de camino -- se sostiene el último valor conocido en vez de cortar de golpe
    } else if (pb && ratio >= 0.5) {
      pts[k] = pb;
    }
  }
  return { t, pts };
}

/**
 * Con object-fit:contain, el contenido real del video (sin distorsión)
 * queda centrado dentro de la caja del <video>, con barras negras a los
 * lados o arriba/abajo si el aspect ratio del clip no coincide con el de
 * la caja. Los landmarks de MediaPipe estan normalizados (0-1) respecto al
 * FRAME NATIVO del video, no respecto a la caja completa -- asi que hay
 * que mapearlos dentro de ese rectangulo interno, no directo contra
 * canvasW/canvasH, o el esqueleto queda desalineado del corredor (esto es
 * justo lo que causaba el desfase reportado).
 */
function computeContainRect(canvasW, canvasH, videoW, videoH) {
  if (!videoW || !videoH) return { x: 0, y: 0, w: canvasW, h: canvasH };
  const canvasAR = canvasW / canvasH;
  const videoAR = videoW / videoH;
  let w, h;
  if (videoAR > canvasAR) {
    // el clip es relativamente mas ancho que la caja -> el ancho manda, barras arriba/abajo
    w = canvasW;
    h = canvasW / videoAR;
  } else {
    // el clip es relativamente mas alto (tipico de video vertical de celular) -> el alto manda, barras a los lados
    h = canvasH;
    w = canvasH * videoAR;
  }
  return { x: (canvasW - w) / 2, y: (canvasH - h) / 2, w, h };
}

function drawSkeleton(ctx, connections, frame, canvasW, canvasH, contentRect) {
  ctx.clearRect(0, 0, canvasW, canvasH);
  if (!frame) return;

  const { x: ox, y: oy, w, h } = contentRect;

  // Capa oscura semitransparente para que el esqueleto se lea bien sobre
  // cualquier video, sin taparlo del todo (20% opacidad). Solo sobre el
  // rectangulo real de contenido, no sobre las barras negras del letterbox.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(ox, oy, w, h);

  const pts = frame.pts;
  ctx.lineWidth = Math.max(2, w * 0.006);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(61, 220, 132, 0.9)';
  for (const [a, b] of connections) {
    const pa = pts[a], pb = pts[b];
    if (!pa || !pb) continue;
    ctx.beginPath();
    ctx.moveTo(ox + pa.x * w, oy + pa.y * h);
    ctx.lineTo(ox + pb.x * w, oy + pb.y * h);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 221, 51, 0.95)';
  const r = Math.max(2.5, w * 0.007);
  for (const key of Object.keys(pts)) {
    const p = pts[key];
    ctx.beginPath();
    ctx.arc(ox + p.x * w, oy + p.y * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Arranca (si no esta ya corriendo) el loop de dibujo para un par
 * video/canvas identificados por id. Idempotente: llamarlo de nuevo con el
 * mismo canvasId mientras ya esta corriendo no hace nada.
 *
 * @param {string} videoElId
 * @param {string} canvasElId
 * @param {() => Array<{t:number, pts:Object}> | null} getFrames  se llama en cada frame de animacion; debe devolver los frames vigentes (o null) leyendo el estado actual, nunca un valor capturado de antemano
 * @param {Array<[number,number]>} connections
 */
export function startSkeletonOverlayLoop(videoElId, canvasElId, getFrames, connections) {
  if (runningLoops.has(canvasElId)) return;
  runningLoops.add(canvasElId);

  function tick() {
    const canvas = document.getElementById(canvasElId);
    const video = document.getElementById(videoElId);
    if (!canvas || !video) {
      runningLoops.delete(canvasElId);
      return; // el bloque ya no esta en pantalla -- el loop se auto-cierra aqui
    }
    const rect = video.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const frames = getFrames();
    const ctx = canvas.getContext('2d');
    if (frames && frames.length > 0) {
      const contentRect = computeContainRect(w, h, video.videoWidth, video.videoHeight);
      drawSkeleton(ctx, connections, interpolateFrames(frames, video.currentTime), w, h, contentRect);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

```

## `js/actions/video.js`
(conecta grabación/carga de video, detección de cadencia y captura de esqueleto al resto de la app)

```javascript
// Fase 2.2 del roadmap: video local por sesion (sin nube). Grabacion con
// getUserMedia + MediaRecorder, almacenamiento del blob en IndexedDB
// (js/db/videoDb.js), y solo la referencia (videoId) en la sesion que ya
// vive en localStorage via DB.
import { DB } from '../db/db.js';
import { VideoDB } from '../db/videoDb.js';
import { render } from '../render/layout.js';
import { state } from '../state/state.js';
import { calcVelocity } from '../utils/calculations.js';
import { showToast } from '../utils/notifications.js';
import { analyzeFullSkeleton, analyzeStrideCadence } from '../services/poseDetection.js';

function pickSupportedMimeType() {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return null;
  for (const c of candidates) { if (MediaRecorder.isTypeSupported(c)) return c; }
  return null;
}

let recordingTimerHandle = null;
function stopRecordingTimer() { if (recordingTimerHandle) { clearInterval(recordingTimerHandle); recordingTimerHandle = null; } }
function startRecordingTimer() {
  stopRecordingTimer();
  recordingTimerHandle = setInterval(() => {
    if (!state.recording.active) { stopRecordingTimer(); return; }
    state.recording.elapsedSec = Math.floor((Date.now() - state.recording.startedAt) / 1000);
    render();
  }, 1000);
}

function resetRecordingState(error, sessionId) {
  state.recording = { active: false, sessionId: error ? (sessionId || null) : null, stream: null, mediaRecorder: null, chunks: [], startedAt: null, elapsedSec: 0, error: error || null };
}

export async function startVideoRecording(sessionId) {
  if (state.recording.active) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    state.recording.error = 'Este entorno no expone acceso a cámara/micrófono (getUserMedia no disponible).';
    render();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const mimeType = pickSupportedMimeType();
    const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => finalizeRecording(sessionId, chunks, mediaRecorder.mimeType || mimeType || 'video/webm');
    mediaRecorder.start();
    state.recording = { active: true, sessionId, stream, mediaRecorder, chunks, startedAt: Date.now(), elapsedSec: 0, error: null };
    startRecordingTimer();
    render();
  } catch (err) {
    resetRecordingState('No se pudo acceder a la cámara/micrófono: ' + (err && err.message ? err.message : 'permiso denegado.'), sessionId);
    render();
  }
}

export function stopVideoRecording() {
  const rec = state.recording;
  if (!rec.active || !rec.mediaRecorder) return;
  rec.mediaRecorder.stop();
  rec.stream.getTracks().forEach(t => t.stop());
}

export function cancelVideoRecording() {
  const rec = state.recording;
  if (rec.mediaRecorder && rec.active) {
    rec.mediaRecorder.ondataavailable = null;
    rec.mediaRecorder.onstop = null; // evita que se dispare el guardado
    try { rec.mediaRecorder.stop(); } catch { /* ya estaba detenido */ }
  }
  if (rec.stream) rec.stream.getTracks().forEach(t => t.stop());
  stopRecordingTimer();
  resetRecordingState(null);
  render();
}

async function finalizeRecording(sessionId, chunks, mimeType) {
  stopRecordingTimer();
  if (chunks.length === 0) {
    resetRecordingState('La grabación quedó vacía (0 bytes). Intenta de nuevo.', sessionId);
    render();
    return;
  }
  const blob = new Blob(chunks, { type: mimeType });
  const videoId = 'vid-' + Date.now();
  let error = null;
  try {
    await VideoDB.saveVideo(videoId, blob);
    const session = state.sessions.find(s => s.id === sessionId);
    if (session) {
      session.videoId = videoId;
      session.videoMarkers = [];
      DB.saveSessions(state.currentAthleteId, state.sessions);
      showToast('✓ Video guardado');
    }
  } catch (err) {
    error = 'No se pudo guardar el video en el almacenamiento local: ' + (err && err.message ? err.message : 'error desconocido.');
  }
  resetRecordingState(error, sessionId);
  render();
}

// Subida de un archivo de video externo (celular, WhatsApp, USB, etc.).
// Útil cuando la app corre en una PC sin cámara utilizable para el
// entrenamiento: el entrenador graba con el celular y luego "sube" ese
// archivo, que se guarda igual que uno grabado en vivo (mismo IndexedDB,
// mismo flujo de reproducción/marcadores/zancada).
export async function uploadVideoFile(sessionId, file) {
  if (!file) return;
  if (!file.type || !file.type.startsWith('video/')) {
    state.recording.error = 'El archivo elegido no parece ser un video (' + (file.type || 'tipo desconocido') + ').';
    state.recording.sessionId = sessionId;
    render();
    return;
  }
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) return;
  const videoId = 'vid-' + Date.now();
  try {
    await VideoDB.saveVideo(videoId, file);
    session.videoId = videoId;
    session.videoMarkers = [];
    DB.saveSessions(state.currentAthleteId, state.sessions);
    state.recording.error = null;
    showToast('✓ Video subido');
  } catch (err) {
    state.recording.error = 'No se pudo guardar el video subido: ' + (err && err.message ? err.message : 'error desconocido.');
    state.recording.sessionId = sessionId;
  }
  render();
}

export async function loadVideoForPlayback(sessionId) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session || !session.videoId) return;
  if (state.videoPlayback.sessionId === sessionId && (state.videoPlayback.objectUrl || state.videoPlayback.loading)) return;
  releaseVideoPlayback();
  state.videoPlayback.sessionId = sessionId;
  state.videoPlayback.loading = true;
  render();
  try {
    const record = await VideoDB.getVideo(session.videoId);
    if (!record || !record.blob) {
      state.videoPlayback.error = 'El video no se encontró en el almacenamiento local (¿se limpió el almacenamiento del navegador?).';
    } else {
      state.videoPlayback.objectUrl = URL.createObjectURL(record.blob);
    }
  } catch (err) {
    state.videoPlayback.error = 'No se pudo leer el video: ' + (err && err.message ? err.message : 'error desconocido.');
  }
  state.videoPlayback.loading = false;
  render();
}

export function releaseVideoPlayback() {
  if (state.videoPlayback.objectUrl) URL.revokeObjectURL(state.videoPlayback.objectUrl);
  state.videoPlayback = {
    sessionId: null, objectUrl: null, loading: false, error: null,
    markerLabelInput: '', strideFreqInput: '', strideSerieIndex: '',
    strideManualDist: '', strideManualTime: '',
    detectingCadence: false, detectingCadenceProgress: 0, lastConfidence: null, cadenceError: null,
    skeletonFrames: null, detectingSkeleton: false, detectingSkeletonProgress: 0,
    skeletonConfidence: null, skeletonAnalyzedSeconds: null,
    skeletonVideoWidth: null, skeletonVideoHeight: null, skeletonError: null,
  };
}

export async function deleteSessionVideo(sessionId) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session || !session.videoId) return;
  const videoId = session.videoId;
  if (state.videoPlayback.sessionId === sessionId) releaseVideoPlayback();
  try { await VideoDB.deleteVideo(videoId); } catch (err) { console.error('Error borrando video de IndexedDB:', err); }
  session.videoId = null;
  session.videoMarkers = [];
  session.strideData = null;
  DB.saveSessions(state.currentAthleteId, state.sessions);
  showToast('Video eliminado');
  render();
}

export function addVideoMarker(sessionId, timeSeconds, label) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session || typeof timeSeconds !== 'number' || isNaN(timeSeconds)) return;
  if (!Array.isArray(session.videoMarkers)) session.videoMarkers = [];
  session.videoMarkers.push({ id: 'mk-' + Date.now(), time: timeSeconds, label: (label || '').trim() || `Marca ${session.videoMarkers.length + 1}` });
  session.videoMarkers.sort((a, b) => a.time - b.time);
  DB.saveSessions(state.currentAthleteId, state.sessions);
  render();
}

export function deleteVideoMarker(sessionId, markerId) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session || !Array.isArray(session.videoMarkers)) return;
  session.videoMarkers = session.videoMarkers.filter(m => m.id !== markerId);
  DB.saveSessions(state.currentAthleteId, state.sessions);
  render();
}

// Longitud de zancada = velocidad / frecuencia de zancada. La velocidad se
// obtiene con la misma calcVelocity() ya usada en el resto de la app
// (dist/tiempo), a partir de una serie de pista ya registrada o de una
// distancia/tiempo manual (para sesiones de campo/gimnasio o series sueltas
// vistas en el video pero no cargadas como serie formal). La frecuencia de
// zancada la cuenta el entrenador manualmente viendo el video (zancadas por
// segundo); no se detecta automáticamente.
export function saveStrideEstimation(sessionId, { distance, time, strideFrequency }) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) return null;
  const dist = Number(distance), t = Number(time), freq = Number(strideFrequency);
  const velocity = calcVelocity(dist, t);
  if (!velocity || !freq || freq <= 0) return null;
  const strideLength = velocity / freq;
  session.strideData = { distance: dist, time: t, strideFrequency: freq, velocity, strideLength, computedAt: Date.now() };
  DB.saveSessions(state.currentAthleteId, state.sessions);
  render();
  return session.strideData;
}

// Deteccion automatica de cadencia de zancada con MediaPipe Pose (ver
// js/services/poseDetection.js). Solo RELLENA el campo de frecuencia -- el
// entrenador sigue teniendo que darle a "Calcular longitud de zancada" para
// confirmar, nunca se autoguarda. Requiere internet la primera vez (carga
// el runtime WASM y el modelo de pose desde CDN); esto es una excepcion
// deliberada a la regla de "todo el video es local" del resto de esta
// funcionalidad -- ver aviso en la UI.
export async function detectStrideCadence(sessionId, videoElId) {
  const vp = state.videoPlayback;
  if (vp.detectingCadence || vp.detectingSkeleton) return; // ya hay un analisis en curso, ignora clics repetidos
  const videoEl = document.getElementById(videoElId);
  if (!videoEl) {
    vp.cadenceError = 'No se encontró el reproductor de video en pantalla.';
    render();
    return;
  }
  vp.detectingCadence = true;
  vp.detectingCadenceProgress = 0;
  vp.cadenceError = null;
  vp.lastConfidence = null;
  render();
  try {
    const result = await analyzeStrideCadence(videoEl, {
      onProgress: pct => { vp.detectingCadenceProgress = pct; render(); },
    });
    vp.strideFreqInput = String(result.stepsPerSecond);
    vp.lastConfidence = result.confidence;
    if (result.confidence === 'baja') {
      showToast('⚠ Detección poco confiable — revisa el número a mano');
    } else {
      showToast(`✓ Cadencia detectada: ${result.stepsPerSecond} zancadas/s`);
    }
  } catch (err) {
    vp.cadenceError = 'No se pudo analizar el video: ' + (err && err.message ? err.message : 'error desconocido.') +
      ' Puedes seguir escribiendo la frecuencia a mano.';
  }
  vp.detectingCadence = false;
  render();
}

// Fase A del roadmap de "sprint lab" (analisis de forma de carrera):
// captura el esqueleto completo del video (cadera, rodillas, tobillos,
// hombros, codos, muñecas, pies) con MediaPipe Pose -- ver
// js/services/poseDetection.js#analyzeFullSkeleton. Los resultados quedan
// en vp.skeletonFrames y de ahi los toma js/services/skeletonOverlay.js
// para dibujar el "muñeco de palitos" sincronizado sobre el video, sin
// necesidad de re-analizar cada vez que el entrenador reproduce el clip.
// Igual que la deteccion de cadencia, requiere internet la primera vez
// (carga el runtime WASM y el modelo desde CDN); el resto del video es
// 100% local.
export async function analyzeFullSprint(sessionId, videoElId) {
  const vp = state.videoPlayback;
  if (vp.detectingCadence || vp.detectingSkeleton) return; // ya hay un analisis en curso, ignora clics repetidos
  const videoEl = document.getElementById(videoElId);
  if (!videoEl) {
    vp.skeletonError = 'No se encontró el reproductor de video en pantalla.';
    render();
    return;
  }
  vp.detectingSkeleton = true;
  vp.detectingSkeletonProgress = 0;
  vp.skeletonError = null;
  render();
  try {
    const result = await analyzeFullSkeleton(videoEl, {
      onProgress: pct => { vp.detectingSkeletonProgress = pct; render(); },
    });
    if (!result.frames || result.frames.length === 0) {
      vp.skeletonFrames = null;
      vp.skeletonError = 'No se detectó ninguna persona con suficiente claridad en el video analizado.';
    } else {
      vp.skeletonFrames = result.frames;
      vp.skeletonConfidence = result.confidence;
      vp.skeletonAnalyzedSeconds = result.analyzedSeconds;
      vp.skeletonVideoWidth = result.videoWidth;
      vp.skeletonVideoHeight = result.videoHeight;
      if (result.confidence === 'baja') {
        showToast('⚠ Detección poco confiable — el esqueleto puede verse errático');
      } else {
        showToast(`✓ Esqueleto capturado: ${result.analyzedSeconds}s analizados`);
      }
    }
  } catch (err) {
    vp.skeletonError = 'No se pudo analizar el video: ' + (err && err.message ? err.message : 'error desconocido.');
  }
  vp.detectingSkeleton = false;
  render();
}

export function clearSkeletonCapture() {
  const vp = state.videoPlayback;
  vp.skeletonFrames = null;
  vp.skeletonConfidence = null;
  vp.skeletonAnalyzedSeconds = null;
  vp.skeletonVideoWidth = null;
  vp.skeletonVideoHeight = null;
  vp.skeletonError = null;
  render();
}

```

## Fragmento relevante de `js/state/state.js`
(forma del estado efímero de grabación/reproducción/esqueleto — no se persiste tal cual; lo que se persiste por sesión es `session.videoId`, `session.videoMarkers` y `session.strideData`)

```javascript
  recording: {
    active: false,       // hay una grabacion en curso ahora mismo
    sessionId: null,     // a que sesion pertenece esta grabacion
    stream: null,        // MediaStream de la camara (referencia directa, no serializable)
    mediaRecorder: null,
    chunks: [],
    startedAt: null,
    elapsedSec: 0,
    error: null,
  },
  videoPlayback: {
    sessionId: null,      // sesion cuyo video esta cargado en el reproductor
    objectUrl: null,      // URL.createObjectURL del blob leido de IndexedDB
    loading: false,
    error: null,
    markerLabelInput: '',
    strideFreqInput: '',
    strideSerieIndex: '',  // indice de trackSeries elegido para el calculo, si aplica ('' = manual)
    strideManualDist: '',
    strideManualTime: '',
    detectingCadence: false,
    detectingCadenceProgress: 0,
    lastConfidence: null,   // 'baja' | 'media' | 'alta' | null
    cadenceError: null,
    skeletonFrames: null,          // Array<{ t:number, pts:Object }> | null -- lo que consume skeletonOverlay.js
    detectingSkeleton: false,
    detectingSkeletonProgress: 0,
    skeletonConfidence: null,      // 'baja' | 'media' | 'alta' | null
    skeletonAnalyzedSeconds: null,
    skeletonVideoWidth: null,
    skeletonVideoHeight: null,
    skeletonError: null,
  },
```

## Fragmento relevante de `js/render/sessions.js`
(cómo se conecta el `<canvas>` del esqueleto al `<video>` en la UI — el patrón de "reinicializar en cada render sin duplicar" es importante para entender las restricciones de arquitectura)

```javascript
  const busy = vp.detectingCadence || vp.detectingSkeleton;
  const videoElId = `video-player-${s.id}`;
  const canvasElId = `skeleton-canvas-${s.id}`;
  const videoEl = el('video', { id: videoElId, class: 'video-player', controls: true, src: vp.objectUrl, playsinline: true });
  const skeletonCanvas = el('canvas', { id: canvasElId, class: 'skeleton-overlay' });
  // El loop de dibujo se auto-administra (ver skeletonOverlay.js): se puede
  // pedir arrancar en cada render() sin miedo a duplicar, y se cierra solo
  // cuando el canvas deja de existir (otra sesion, video borrado, etc.).
  videoInitializers.push(() => startSkeletonOverlayLoop(
    videoElId, canvasElId,
    () => (state.videoPlayback.sessionId === s.id ? state.videoPlayback.skeletonFrames : null),
    SKELETON_CONNECTIONS,
  ));
```

*(Nota: `render()` en `layout.js` reconstruye TODO el DOM de `#app` desde cero en cada cambio de estado — por eso ningún módulo puede guardar una referencia directa a un nodo `<video>`/`<canvas>` entre llamadas; siempre se vuelve a buscar por `id` con `document.getElementById()`. Cualquier propuesta de arquitectura debe respetar esta restricción o explicar cómo cambiarla.)*
