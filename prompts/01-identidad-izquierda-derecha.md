# Tarea: corregir intercambios izquierda/derecha en el esqueleto de un sprinter (JavaScript puro)

Eres un ingeniero de visión por computadora y biomecánica. Necesito UN módulo ES (JavaScript puro, sin dependencias, funciona en Node 20 y en Chromium) con pruebas. Responde con **dos bloques de código completos** (sin "..."): `js/services/trackingIdentity.js` y `test/trackingIdentity.test.js` (usa `node:test` y `node:assert/strict`). Comentarios en español.

Si algo depende del comportamiento interno de MediaPipe y no estás seguro, **dilo explícitamente** en vez de inventar.

## Contexto

App de escritorio para entrenadores de velocistas (100/200 m). Un video lateral (cámara de celular, un solo punto de vista) se analiza con MediaPipe PoseLandmarker (heavy) a ~50 muestras/s. El problema: MediaPipe etiqueta cada punto como izquierdo/derecho **cuadro por cuadro, sin memoria**. En un sprint las piernas (y los brazos) se cruzan en la imagen varias veces por segundo y la etiqueta puede **intercambiarse** (la "rodilla izquierda" salta a la pierna derecha y se queda así varios cuadros). Hoy nada lo detecta ni lo corrige.

## Datos de entrada (contrato exacto)

```js
// frames: arreglo ordenado por t (segundos, absoluto del video, paso ~0.02 s)
// cada frame: { t: number, pts: { [indice]: { x, y, visibility, interpolated } } }
// x, y NORMALIZADOS 0-1 (y crece hacia ABAJO). Puede faltar cualquier índice en un frame.
// interpolated:true = punto rellenado por interpolación lineal (menos confiable).
```

Índices de MediaPipe que se usan (impares = izquierda, pares = derecha, salvo 29-32 que siguen el mismo patrón):

| Parte | Izq | Der |
|---|---|---|
| Hombro | 11 | 12 |
| Codo | 13 | 14 |
| Muñeca | 15 | 16 |
| Cadera | 23 | 24 |
| Rodilla | 25 | 26 |
| Tobillo | 27 | 28 |
| Talón | 29 | 30 |
| Punta de pie | 31 | 32 |

Pares de segmentos: pierna = cadera→rodilla→tobillo→(talón, punta); brazo = hombro→codo→muñeca. Todos los clips son de **vista lateral** (el corredor se desplaza de lado a lado del encuadre).

## Lo que debes implementar

Exporta `applyIdentityTracking(frames, options?)` que **devuelve un arreglo nuevo de frames** (no muta el de entrada) con las etiquetas corregidas, más `report`:

```js
{ frames: [...], report: { swapsDetected: number, swaps: [{ tStart, tEnd, limb: 'pierna'|'brazo', confidence: 0-1 }], lowConfidenceRanges: [{ tStart, tEnd, reason }] } }
```

Requisitos:

1. **Unidad de intercambio = extremidad completa**, no punto suelto: si se intercambia la pierna, se intercambian juntos cadera?→rodilla→tobillo→talón→punta de izquierda y derecha (ojo: las caderas casi nunca se cruzan; decide y justifica si se tratan aparte). Igual con el brazo (codo + muñeca, el hombro rara vez).
2. **Costo de asignación por continuidad**: para cada cuadro, comparar las dos asignaciones posibles (mantener / intercambiar) usando distancia respecto a la posición **predicha** (velocidad constante desde los cuadros previos ya corregidos) y la **longitud de segmento esperada** (el largo del muslo y de la pantorrilla del atleta es casi constante: estímalo con la mediana de los cuadros fiables). Normaliza por el tamaño del torso o del muslo, no por píxeles.
3. **Histéresis**: un intercambio solo se acepta si la evidencia se mantiene ≥ N cuadros (parámetro, valor por defecto razonado) para no "parpadear" con ruido de un solo cuadro.
4. **Pasada hacia adelante Y hacia atrás** con un consenso real (por ejemplo Viterbi / programación dinámica de 2 estados por extremidad sobre toda la secuencia, con costo de transición). Si no justificas que la doble pasada aporta, usa Viterbi de 2 estados y explica por qué es mejor que una heurística voraz.
5. **Puntos ausentes o `interpolated`**: no deben guiar la decisión con el mismo peso; deben poder quedar sin decidir (hereda el estado vecino).
6. **Parámetros ajustables** en un objeto `DEFAULTS` exportado, cada uno con comentario de qué significa y qué pasa si se sube o baja.
7. **Rendimiento**: 15 s a 50 cuadros/s = 750 cuadros; debe tardar << 100 ms.
8. Marcar en `report.lowConfidenceRanges` los tramos donde la decisión fue dudosa (costos casi iguales), para que la interfaz pueda avisar al entrenador.

## Pruebas obligatorias (`test/trackingIdentity.test.js`, datos sintéticos generados en el propio test)

Genera un corredor sintético lateral (cadera con avance lineal, rodillas y tobillos con movimiento sinusoidal en oposición de fase, segmentos de longitud fija) y comprueba:

1. Sin intercambios: la salida es idéntica a la entrada y `swapsDetected === 0`.
2. Un intercambio de pierna de 8 cuadros inyectado en el medio: se corrige y la trayectoria final coincide con la original (error < tolerancia).
3. Intercambio al principio y al final de la secuencia (bordes).
4. Dos intercambios separados por pocos cuadros.
5. Intercambio de brazo independiente del de la pierna.
6. Ruido gaussiano pequeño en todos los puntos: sin falsos positivos (corre con 20 semillas fijas).
7. Cuadros con puntos ausentes (≈15 % al azar) y puntos `interpolated`: sigue corrigiendo.
8. Cruce de piernas REAL sin intercambio de etiqueta (las dos piernas pasan una sobre la otra con trayectorias suaves): **no debe** "corregir" nada. Este es el caso difícil: explica cómo lo distingue de un intercambio.
9. No muta la entrada (`structuredClone` antes y comparar).

## Formato de tu respuesta

1. Resumen de 5 líneas del algoritmo y por qué es el adecuado.
2. Los dos archivos completos.
3. Lista de **supuestos y lo que NO sabes** (por ejemplo: si vistas no estrictamente laterales rompen el método).
4. Cómo ajustar los parámetros si el resultado no es bueno con un video real.

---

## CÓDIGO ADJUNTO (referencia del estilo y de las funciones existentes de `js/services/poseLogic.js`)

No lo modifiques; solo para que tu módulo sea coherente con él (mismo estilo, constantes con nombre, comentarios en español).

```js
// Logica PURA de analisis de pose: nada de esto toca <video>, <canvas>, ni
// MediaPipe directamente -- son funciones de calculo puro sobre arrays de
// numeros/objetos. Separado a proposito de poseDetection.js (que si
// depende del navegador) para que esta parte -- la que de verdad tiene
// "inteligencia" y mas riesgo de tener bugs sutiles -- se pueda probar con
// Node normal y corriente, sin Electron, sin navegador, sin video real.
// Ver test/poseLogic.test.js.

export const PEAK_MARGIN = 0.01;
export const MIN_CONTACT_GAP_MS = 150;
export const MIN_DISPLACEMENT_FOR_OUTLIER_TEST = 0.012;
export const DETOUR_RATIO_THRESHOLD = 0.35;
export const MAX_GAP_SECONDS = 0.6;

/** Suavizado de ventana 3 (promedio con el vecino anterior y siguiente; los bordes se sostienen contra si mismos). */
export function smooth3(values) {
  return values.map((v, i) => {
    const prev = i > 0 ? values[i - 1] : v;
    const next = i < values.length - 1 ? values[i + 1] : v;
    return (prev + v + next) / 3;
  });
}

/**
 * Cuenta contactos con el suelo de UN pie: picos locales (maximos, ya que Y
 * mayor = mas abajo en el frame = pie apoyado) que superen el promedio de
 * la serie por un margen minimo, con al menos MIN_CONTACT_GAP_MS entre
 * contactos consecutivos del mismo pie.
 */
export function countContacts(samples) {
  if (samples.length < 3) return 0;
  const ys = smooth3(samples.map(s => s.y));
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  let lastContactMs = -Infinity;
  let count = 0;
  for (let i = 1; i < ys.length - 1; i++) {
    // Un pico de un solo cuadro (tipico de un contacto breve) puede
    // suavizarse en una MESETA de 2-3 valores identicos por smooth3() --
    // un empate exacto no pasa la prueba estricta "mayor que AMBOS
    // vecinos". Se acepta el borde de una meseta como pico (>= de un lado,
    // > estricto del otro) para no perder esos contactos; el debounce de
    // MIN_CONTACT_GAP_MS de abajo colapsa los dos bordes de una misma
    // meseta en un solo contacto, asi que no hay doble conteo. (Bug real
    // encontrado por test/poseLogic.test.js, no una hipotesis sin probar.)
    const isPeak = (ys[i] >= ys[i - 1] && ys[i] > ys[i + 1] && ys[i] > mean + PEAK_MARGIN)
                || (ys[i] > ys[i - 1] && ys[i] >= ys[i + 1] && ys[i] > mean + PEAK_MARGIN);
    if (!isPeak) continue;
    const tMs = samples[i].t * 1000;
    if (tMs - lastContactMs < MIN_CONTACT_GAP_MS) continue;
    lastContactMs = tMs;
    count++;
  }
  return count;
}

/**
 * Detecta y descarta detecciones individuales geometricamente implausibles
 * (el "salto y vuelta" tipico de una confusion de extremidad durante un
 * cruce). Ver comentario largo original en poseDetection.js/historial de
 * conversacion -- se mantiene aca la version resumida.
 *
 * `frames` es un array de { t, pts: { [landmarkIdx]: {x,y,visibility} } }.
 * Muta `frames` in-place (borra pts[idx] en los cuadros implausibles) y
 * tambien lo retorna, por conveniencia en los tests.
 */
export function rejectImplausibleDetections(frames, landmarkIndices) {
  for (const idx of landmarkIndices) {
    const realIdxs = [];
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].pts[idx]) realIdxs.push(i);
    }
    const toDrop = [];
    for (let k = 1; k < realIdxs.length - 1; k++) {
      const bi = realIdxs[k - 1], mi = realIdxs[k], ai = realIdxs[k + 1];
      const before = frames[bi].pts[idx], mid = frames[mi].pts[idx], after = frames[ai].pts[idx];
      const dBeforeMid = Math.hypot(mid.x - before.x, mid.y - before.y);
      const dMidAfter = Math.hypot(after.x - mid.x, after.y - mid.y);
      const dBeforeAfter = Math.hypot(after.x - before.x, after.y - before.y);
      const detourLen = dBeforeMid + dMidAfter;
      if (detourLen < MIN_DISPLACEMENT_FOR_OUTLIER_TEST) continue;
      const ratio = detourLen > 0 ? dBeforeAfter / detourLen : 1;
      if (ratio < DETOUR_RATIO_THRESHOLD) toDrop.push(mi);
    }
    for (const fi of toDrop) delete frames[fi].pts[idx];
  }
  return frames;
}

/**
 * Rellena huecos cortos de deteccion con una interpolacion en linea recta
 * entre la ultima posicion real conocida antes del hueco y la primera
 * posicion real conocida despues. Muta `frames` in-place y lo retorna.
 */
export function fillGapsWithMotionInterpolation(frames, landmarkIndices) {
  for (const idx of landmarkIndices) {
    let lastRealPos = null;
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
                visibility: Math.min(lastRealPos.visibility, p.visibility) * 0.6,
                interpolated: true,
              };
            }
          }
        }
        lastRealPos = { frameIdx: i, x: p.x, y: p.y, visibility: p.visibility };
      }
    }
  }
  return frames;
}
```
