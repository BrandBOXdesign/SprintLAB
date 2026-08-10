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
