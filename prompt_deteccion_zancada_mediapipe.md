# PROMPT PARA IA — Sprint Lab: Detección automática de cadencia de zancada (MediaPipe)

Pega este documento completo como primer mensaje. Es contexto + tarea en uno.

---

## 0. CÓMO SE VA A TRABAJAR ESTO (importante)

Esta tarea se le está pidiendo por separado a dos IAs distintas (tú y otra).
Después de que ambas entreguen su implementación, se le va a pedir a cada una
que revise el código de la otra buscando errores reales (no de estilo), y se
va a iterar hasta llegar a una única versión limpia. Ten esto en cuenta:

- Sé preciso y verifica en vez de asumir (ver sección 2, ya se investigó la
  librería exacta a usar para evitar el error que ya pasó una vez en este
  proyecto: una URL de CDN que apuntaba a una versión que no existía).
- Donde haya ambigüedad de diseño, dilo explícitamente en tu resumen final en
  vez de decidir en silencio — así la otra IA (y el humano) pueden evaluar tu
  decisión en la revisión cruzada.

---

## 1. CONTEXTO DEL PROYECTO

**Sprint Lab** es una app web (sin backend propio) para entrenadores de
velocidad (100m/200m). HTML + CSS + JavaScript vanilla puro, ES Modules
nativos del navegador (`<script type="module">`), sin bundler, sin build
step. Todo `import`/`export` es **nombrado** (nunca `export default`).
Librerías externas ya cargadas por CDN en `index.html` como variables
globales: `Chart`, `L` (Leaflet), `Sortable`, `jspdf`, `gpxParser`.

Arquitectura relevante para esta tarea:
- `js/state/state.js`: un objeto `state` global mutable.
- `js/render/*.js`: construyen DOM real con el helper `el(tag, attrs, children)`
  (sin virtual DOM; cada `render()` reconstruye TODO el DOM de la pantalla
  activa desde cero — por eso librerías con estado propio como Chart.js/
  Leaflet/Sortable se inicializan con `requestAnimationFrame(() => {...})`
  DESPUÉS de retornar el nodo, para esperar a que ya esté insertado en el DOM).
- `js/actions/*.js`: mutan `state`, guardan en `DB` (localStorage), llaman a
  `render()`.
- `js/services/*.js`: integraciones externas (parseo de GPX/FIT, export CSV/
  PDF, Firebase). Aquí es donde debe ir el código nuevo de esta tarea.

### 1.1. Lo que YA EXISTE (video local, ya implementado — Fase 3 del roadmap)

- `js/db/videoDb.js`: `VideoDB.saveVideo(id, blob)`, `VideoDB.getVideo(id)` →
  `{ id, blob, mimeType, createdAt }`, `VideoDB.deleteVideo(id)`. Los videos
  se guardan en IndexedDB (no en la nube, decisión explícita del usuario).
- `js/actions/video.js`: grabación (`startVideoRecording`, `stopVideoRecording`,
  `cancelVideoRecording`), subida de archivo (`uploadVideoFile`), reproducción
  (`loadVideoForPlayback`, `releaseVideoPlayback`), marcadores de hitos
  (`addVideoMarker`, `deleteVideoMarker`), y el cálculo de zancada:
  ```js
  // Ya existe: velocidad (de una serie de pista o distancia/tiempo manual)
  // dividida entre frecuencia de zancada, que HASTA AHORA el entrenador
  // cuenta a simple vista viendo el video y teclea a mano.
  export function saveStrideEstimation(sessionId, { distance, time, strideFrequency }) {
    // usa calcVelocity(dist, time) de utils/calculations.js, guarda
    // session.strideData = { distance, time, strideFrequency, velocity, strideLength, computedAt }
  }
  ```
- `js/state/state.js` → `state.videoPlayback`:
  ```js
  videoPlayback: {
    sessionId: null, objectUrl: null, loading: false, error: null,
    markerLabelInput: '', strideFreqInput: '', strideSerieIndex: '',
    strideManualDist: '', strideManualTime: '',
  }
  ```
- `js/render/sessions.js` → función `renderStrideEstimator(s)`: muestra el
  selector de serie de pista (o inputs manuales de distancia/tiempo), el
  input `strideFreqInput` (frecuencia de zancada, editable a mano), y un
  botón que llama a `saveStrideEstimation`.

### 1.2. EL PROBLEMA A RESOLVER

El usuario (entrenador) probó la app con un video real y quedó claro que
**contar la frecuencia de zancada a simple vista es tedioso** — quiere que la
app lo detecte automáticamente analizando el video, dejando el campo
editable por si la detección se equivoca (nunca ocultar la opción manual).

---

## 2. LA TAREA: detección automática de cadencia con MediaPipe Pose Landmarker

### 2.1. Librería a usar (YA VERIFICADA, no la vuelvas a investigar ni cambies la version)

Paquete real en npm: `@mediapipe/tasks-vision`, versión estable **0.10.35**
(existen versiones `1.0.0-rc.*` más nuevas pero son *release candidates*,
NO las uses). Se importa como ES Module directo desde jsDelivr (sin `npm
install`, sin bundler, igual que el resto de este proyecto):

```js
import { FilesetResolver, PoseLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs';

const vision = await FilesetResolver.forVisionTasks(
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
);

const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    delegate: 'GPU', // si falla la creacion, reintentar una vez con delegate: 'CPU' (mas compatible, mas lento)
  },
  runningMode: 'VIDEO',
  numPoses: 1,
});
```

Notas importantes ya verificadas:
- El modelo (`.task`, ~unos MB) se descarga aparte, desde Google Cloud
  Storage (URL de arriba, pública, sin API key). NO está en jsDelivr/npm.
- Usa el modelo **`lite`** (no `full` ni `heavy`) — suficiente para este caso
  (una sola persona, no es tiempo real crítico) y más rápido en equipos
  modestos.
- `PoseLandmarker.detectForVideo(videoElement, timestampMs)` devuelve
  `{ landmarks: [[{x,y,z,visibility}, ...33 puntos]] }` por pose detectada.
  Los indices relevantes del esqueleto de 33 puntos: **27 = tobillo
  izquierdo, 28 = tobillo derecho**. Las coordenadas `x`/`y` vienen
  normalizadas 0-1 respecto al frame, con **`y` creciendo hacia ABAJO** (y=0
  arriba de la imagen, y=1 abajo).

### 2.2. Archivo nuevo: `js/services/poseDetection.js`

```js
/**
 * Analiza un elemento <video> ya cargado (con su blob local, sin nube) y
 * estima la cadencia de zancada contando los contactos de pie con el suelo
 * (minimos/maximos en la posicion vertical de los tobillos a lo largo del
 * tiempo).
 *
 * @param {HTMLVideoElement} videoEl - debe tener .duration valido (metadata cargada)
 * @param {{ startTime?: number, endTime?: number, onProgress?: (pct:number)=>void }} opts
 * @returns {Promise<{
 *   stepsPerSecond: number,          // cadencia detectada (contactos de CUALQUIER pie por segundo)
 *   totalSteps: number,
 *   analyzedSeconds: number,
 *   confidence: 'baja'|'media'|'alta', // basado en cuantos frames tuvieron pose detectada
 *   samples: Array<{t:number, leftY:number, rightY:number}>, // para depuracion/debug, no mostrar en UI por defecto
 * }>}
 */
export async function analyzeStrideCadence(videoEl, opts = {}) { ... }
```

**Cómo debe funcionar por dentro** (sé explícito en el código, no dejes esto
implícito):

1. Inicializar `PoseLandmarker` (cachear la instancia en una variable de
   módulo para no recrearla en cada análisis — crearla es lento).
2. Determinar el rango a analizar: `opts.startTime` / `opts.endTime`, o el
   video completo si no se especifican. **Limita el análisis a máximo 15
   segundos** aunque el video sea más largo (advierte de esto en el
   resultado o en un `console.warn`, y dilo en tu resumen final) — analizar
   un video largo cuadro por cuadro puede tardar mucho en equipos modestos.
3. Recorrer el rango en pasos fijos de tiempo (recomendado: cada ~66ms, ≈15
   muestras por segundo — no hace falta más para detectar cadencia de
   carrera, que rara vez supera 5 contactos/segundo por pie). Para cada paso:
   - `videoEl.currentTime = t`
   - esperar el evento `seeked` del video (con un timeout de seguridad, por
     si el navegador no lo dispara en algún caso raro)
   - `const result = poseLandmarker.detectForVideo(videoEl, t * 1000)`
   - si hay pose detectada, guardar `{ t, leftY: landmarks[27].y, rightY: landmarks[28].y }`
4. **Algoritmo de conteo de contactos** (especifícalo así, no inventes otro
   sin justificarlo): para cada pie por separado (izquierdo y derecho),
   sobre su serie temporal de `Y`:
   - suaviza la señal con un promedio móvil simple de 3 muestras (reduce
     ruido de la detección de pose).
   - encuentra picos (maximos locales, ya que Y mayor = mas abajo = pie en
     el suelo): un punto `i` es un contacto si `y[i] > y[i-1]` y
     `y[i] > y[i+1]` y `y[i]` supera el promedio de esa serie por un margen
     mínimo (para no contar micro-ruido como contacto).
   - aplica un **tiempo mínimo entre contactos del mismo pie de 150ms** (ni
     el velocista más rápido supera ~6-7 contactos/segundo por pie) para
     evitar contar el mismo contacto dos veces por ruido.
   - suma los contactos de ambos pies para el total de "pasos" (no
     "zancadas completas" — un ciclo de zancada completo son 2 contactos,
     uno por pie; sé explícito con el usuario de que `stepsPerSecond` mide
     contactos de CUALQUIER pie, que es lo que el campo `strideFreqInput`
     ya usaba implícitamente al pedirle al entrenador "contar zancadas
     viendo el video" -- mantén la misma unidad para no romper el cálculo
     de `saveStrideEstimation` que ya existe).
5. `confidence`: `'alta'` si hubo pose detectada en >80% de las muestras,
   `'media'` si 50-80%, `'baja'` si menos (avisale al entrenador que revise
   el número a mano si sale `'baja'`).
6. Llama a `opts.onProgress(pct)` cada cierto numero de muestras procesadas,
   para que la UI pueda mostrar una barra de progreso (el analisis puede
   tardar varios segundos).

### 2.3. Integración en `js/render/sessions.js` → `renderStrideEstimator(s)`

Agrega, junto al input `strideFreqInput` ya existente, un botón **"🤖
Detectar automáticamente"** que:
- Deshabilite el botón mientras corre (usa una bandera en
  `state.videoPlayback`, ej. `state.videoPlayback.detectingCadence: boolean`
  y `detectingCadenceProgress: number`, agrégalas al objeto ya existente en
  `state.js`).
- Llame a `analyzeStrideCadence(videoElement, { onProgress: pct => { state.videoPlayback.detectingCadenceProgress = pct; render(); } })`.
- Al terminar, **rellena `vp.strideFreqInput` con el resultado pero NO
  guarda automáticamente** — el entrenador debe poder revisarlo/corregirlo
  y darle igual al botón existente "Calcular longitud de zancada" para
  confirmarlo. Nunca reemplaces el flujo manual, solo pre-llena el campo.
- Si `confidence === 'baja'`, muestra una nota visible tipo: "⚠ La detección
  no fue muy confiable en este video (ángulo de cámara, resolución, u
  oclusión). Revisa el número antes de continuar."
- Mientras corre, muestra una barra/porcentaje de progreso simple (no hace
  falta que sea elaborada, un texto "Analizando... 45%" es suficiente).

### 2.4. Honestidad requerida en tu resumen final (no lo omitas)

Explica en tu resumen, en español simple, que la precisión de esto depende
mucho de:
- El ángulo de cámara (funciona mucho mejor con una toma lateral del
  corredor que con ángulos diagonales o videos de stock genéricos).
- La resolución/calidad del video.
- Que el corredor no esté ocluido por otras personas/objetos.

Y que por eso el campo se deja siempre editable — la detección automática
es un punto de partida, no una verdad absoluta.

---

## 3. CRITERIOS DE ACEPTACIÓN

- [ ] No usaste `require()` en ningún lado (esto es ES Modules de navegador,
      no Node/bundler).
- [ ] Pineaste la versión `0.10.35` exacta en las 3 URLs de CDN (bundle,
      wasm, y el modelo `.task`), no `@latest` ni una release candidate.
- [ ] El análisis nunca corre más de 15 segundos de video de una vez.
- [ ] El campo de frecuencia sigue siendo editable después de la detección
      automática (nunca se auto-guarda sin que el entrenador confirme).
- [ ] Manejaste el caso de que `PoseLandmarker.createFromOptions` falle con
      `delegate: 'GPU'` (reintenta con `'CPU'` antes de mostrar error).
- [ ] Todo `import`/`export` nombrado, cada archivo pasa `node --check` si
      tienes Node disponible en tu entorno para probarlo tú mismo.
- [ ] Mencionaste explícitamente en tu resumen las limitaciones de precisión
      (sección 2.4), no las omitiste.

## 4. FORMATO DE ENTREGA
Para cada archivo que crees o modifiques: ruta completa + contenido COMPLETO
del archivo final (no un diff). Al final, resumen de 3-5 líneas de qué
cambiaste, más las limitaciones de precisión pedidas arriba.
