# Tarea: ángulos articulares y métricas de sprint desde un esqueleto 2D (JavaScript puro)

Eres un biomecánico del deporte e ingeniero de software. Necesito UN módulo ES (JavaScript puro, sin dependencias, Node 20 y Chromium) con pruebas. Responde con **dos bloques de código completos** (sin "..."): `js/services/trackingMetrics.js` y `test/trackingMetrics.test.js` (usa `node:test` y `node:assert/strict`). Comentarios en español.

Si no estás seguro de una convención biomecánica o de un valor de referencia, **dilo explícitamente** y cita de dónde sale (o di que es una suposición). Prefiero "no sé" a una cifra inventada.

## Contexto

App de escritorio para entrenadores de velocistas (100/200 m). Video lateral de celular, UNA cámara, sin calibración. Un paso previo (otro módulo) ya entrega el esqueleto con la identidad izquierda/derecha corregida. Tú calculas las métricas a partir de él.

## Datos de entrada (contrato exacto)

```js
// frames: arreglo ordenado por t (segundos, paso ~0.02 s)
// cada frame: { t, pts: { [indice]: { x, y, visibility, interpolated } } }
// x, y NORMALIZADOS 0-1 respecto al ancho/alto del VIDEO; y crece hacia ABAJO.
// Hay que convertir a píxeles con videoWidth/videoHeight antes de calcular ángulos
// (si no, los ángulos salen distorsionados cuando el video no es cuadrado).
// opts: { videoWidth, videoHeight, direccion?: 'izq-der' | 'der-izq' | 'auto' }
```

Índices MediaPipe: hombros 11/12, codos 13/14, muñecas 15/16, caderas 23/24, rodillas 25/26, tobillos 27/28, talones 29/30, puntas 31/32 (impar = izquierda, par = derecha). Los puntos pueden faltar o venir `interpolated:true`.

## Qué debes implementar

Exporta `computeMetrics(frames, opts)` que devuelve, **sin mutar la entrada**:

```js
{
  perFrame: [{ t, rodillaIzq, rodillaDer, caderaIzq, caderaDer, troncoInclinacion, codoIzq, codoDer, alturaRodillaIzq, alturaRodillaDer, confiable: { ... } }],  // null cuando no se puede calcular
  femurPx: number | null,           // longitud de referencia del fémur del atleta
  direccion: 'izq-der' | 'der-izq', // sentido de avance detectado
  eventos: [{ tipo: 'contacto' | 'despegue', pie: 'izq' | 'der', t }],
  porZancada: [{ pie, tContacto, tDespegue, tiempoContacto, tiempoVuelo, anguloRodillaMax, anguloRodillaMin, alturaRodillaMax, ... }],
  resumen: { cadenciaPasosPorSeg, tiempoContactoMedio, tiempoVueloMedio, ... },
  advertencias: [string]
}
```

### 1. Ángulos (define y JUSTIFICA la convención)

- **Rodilla**: ángulo interno entre muslo (rodilla→cadera) y pierna (rodilla→tobillo). Convención pedida: **180° = pierna extendida, valores menores = más flexión**. Usa `atan2` sobre el producto cruz y punto (no solo `acos`, que pierde el signo y es inestable cerca de 0/180).
- **Cadera**: ángulo entre el tronco (cadera→hombro) y el muslo (cadera→rodilla). Define qué es 0°/180° y si el signo indica flexión vs extensión (el muslo adelante o atrás del tronco), considerando el sentido de avance.
- **Inclinación de tronco**: ángulo respecto a la **vertical** (cadera→hombro); positivo = inclinado en el sentido del avance. Detecta el sentido con la deriva horizontal de la cadera.
- **Codo**: igual que la rodilla (180° = brazo extendido).
- Trabaja en píxeles (usa videoWidth/videoHeight). Explica el error de la proyección 2D (el ángulo real de una articulación fuera del plano de la cámara se subestima o sobreestima).
- Suavizado: propón y aplica un filtro **que no retrase ni aplane picos** (ej. Savitzky-Golay o Butterworth de fase cero) con ventana razonada para 50 Hz; permite desactivarlo.

### 2. Altura de rodilla normalizada

Reporta cuánto sube la rodilla **comparable entre repeticiones y entre atletas, sin importar el zoom ni la distancia**: normaliza por la longitud del fémur del propio atleta (mediana de la distancia cadera→rodilla en los cuadros fiables, en píxeles). Define el cero (ej. altura de la rodilla respecto a la cadera, medida en dirección vertical, expresada en "fémures"; 0 = rodilla a la altura de la cadera, valores negativos = por debajo). Explica cómo afecta una cámara no perfectamente lateral y marca la métrica `confiable:false` si el fémur proyectado varía > X % durante el clip (parámetro).

### 3. Eventos de zancada

Contacto y despegue de cada pie con el suelo a partir de la trayectoria del tobillo/talón/punta (por ejemplo: velocidad horizontal del pie relativa a la cadera cercana a cero + mínimo de altura). Debes funcionar con un corredor que **avanza en la imagen** (la cámara puede o no seguirlo): usa coordenadas relativas a la cadera/tronco para ser robusto a ambos casos y explica la elección. Calcula tiempo de contacto, tiempo de vuelo, cadencia y simetría izquierda/derecha.

### 4. Robustez

- Cuadros con puntos ausentes o `interpolated`: la métrica de ese cuadro es `null` (no inventar) y `confiable` lo indica; en `advertencias` resume el porcentaje de cuadros inutilizables.
- Parámetros ajustables en `DEFAULTS` exportado, con comentarios (qué pasa al subir/bajar).
- Rendimiento: 750 cuadros en << 100 ms.

## Pruebas obligatorias (datos sintéticos generados dentro del test)

1. Esqueleto estático con ángulos conocidos (rodilla 180°, 90°, 45°; cadera y codo igual) en un video **no cuadrado** (1920×1080): los ángulos coinciden con tolerancia 0,5°. Incluye el caso en que olvidar la conversión a píxeles daría un error (demuestra que la conversión importa).
2. Tronco inclinado 10°, 20°, 30° hacia la derecha y hacia la izquierda: signo y magnitud correctos, con detección automática del sentido.
3. Rodilla a la altura de la cadera → 0; rodilla un fémur por encima → 1; la normalización da el mismo valor si todo el esqueleto se escala ×2.
4. Corredor sintético con 6 zancadas (movimiento sinusoidal, cámara fija y cámara que sigue al corredor): el número de contactos y la cadencia salen correctos (±1 evento).
5. Puntos ausentes (20 %): salida `null` en esos cuadros, sin NaN, sin excepciones.
6. Ningún valor `NaN` o `Infinity` en la salida con entradas degeneradas (muslo de longitud cero, un solo cuadro, arreglo vacío).
7. No muta la entrada.

## Formato de tu respuesta

1. Tabla con las convenciones adoptadas (ángulo, vectores, 0°/180°, signo) y la fuente o "suposición".
2. Los dos archivos completos.
3. **Supuestos y lo que NO sabes** (por ejemplo: valores típicos de referencia de un sprinter de élite, si los cites, indica que son orientativos).
4. Cómo validar los números con un video real (qué mirar, qué rangos son sospechosos).

---

## CÓDIGO ADJUNTO (referencia de estilo, de `js/services/poseLogic.js`)

No lo modifiques; solo para que tu módulo sea coherente con él.

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
