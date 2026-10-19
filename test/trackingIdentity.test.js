// Pruebas de applyIdentityTracking con datos sinteticos generados aqui.
// Correr con: node --test test/trackingIdentity.test.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyIdentityTracking } from '../js/services/trackingIdentity.js';

// ---------------------------------------------------------------------------
// Generador de corredor sintetico lateral.
// ---------------------------------------------------------------------------

// Landmarks usados.
const L = {
  lSho: 11, rSho: 12, lElb: 13, rElb: 14, lWri: 15, rWri: 16,
  lHip: 23, rHip: 24, lKne: 25, rKne: 26, lAnk: 27, rAnk: 28,
  lHeel: 29, rHeel: 30, lToe: 31, rToe: 32,
};

const DT = 0.02; // 50 muestras/s
const TORSO_LEN = 0.18; // en coords normalizadas
const THIGH = 0.14;
const SHIN = 0.14;
const UPPER_ARM = 0.11;
const FOREARM = 0.11;

/**
 * Genera un corredor lateral con avance lineal y movimiento sinusoidal
 * en oposicion de fase de piernas y brazos. Devuelve { frames, truth }
 * donde truth tiene las posiciones "verdaderas" (sin swaps) para comparar.
 */
function makeRunner(n = 200, opts = {}) {
  const {
    noise = 0,
    seed = 1,
    dropRate = 0,
    interpRate = 0,
    legSwap = null,   // {start, end}
    armSwap = null,
    crossLegs = false, // cruce real sin swap de etiqueta
  } = opts;

  let rng = seed >>> 0;
  const rand = () => {
    // xorshift32 determinista.
    rng ^= rng << 13; rng >>>= 0;
    rng ^= rng >> 17;
    rng ^= rng << 5; rng >>>= 0;
    return rng / 0xffffffff;
  };
  const gauss = () => {
    // Box-Muller.
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const frames = [];
  const truth = [];
  const speed = 0.0035; // avance por cuadro en x

  for (let i = 0; i < n; i++) {
    const t = i * DT;
    const cx = 0.3 + speed * i;
    const cy = 0.55;

    // Cadera comun (en vista lateral las dos caderas casi coinciden).
    const hipX = cx;
    const hipY = cy;

    // Fase de zancada.
    const phase = (i * 0.22); // radianes por cuadro
    const legAmp = crossLegs ? 0.10 : 0.08;

    // Rodillas: movimiento sinusoidal opuesto. En vista lateral las
    // rodillas se mueven principalmente en x (adelante/atras) y algo en y.
    const kneeLx = hipX + legAmp * Math.sin(phase);
    const kneeLy = hipY + 0.5 * THIGH - 0.02 * Math.cos(phase);
    const kneeRx = hipX - legAmp * Math.sin(phase);
    const kneeRy = hipY + 0.5 * THIGH + 0.02 * Math.cos(phase);

    // Tobillos: continuacion del movimiento.
    const ankLx = kneeLx + 0.4 * Math.sin(phase + 0.4);
    const ankLy = kneeLy + SHIN * 0.95;
    const ankRx = kneeRx - 0.4 * Math.sin(phase + 0.4);
    const ankRy = kneeRy + SHIN * 0.95;

    // Talones y puntas (offset del tobillo).
    const heelLx = ankLx - 0.02, heelLy = ankLy + 0.02;
    const heelRx = ankRx - 0.02, heelRy = ankRy + 0.02;
    const toeLx = ankLx + 0.03, toeLy = ankLy + 0.025;
    const toeRx = ankRx + 0.03, toeRy = ankRy + 0.025;

    // Brazos: opuestos a las piernas.
    const armAmp = 0.06;
    const elbLx = hipX + 0.05 + armAmp * Math.sin(phase + Math.PI);
    const elbLy = hipY - 0.06 + 0.02 * Math.cos(phase);
    const elbRx = hipX + 0.05 - armAmp * Math.sin(phase + Math.PI);
    const elbRy = hipY - 0.06 - 0.02 * Math.cos(phase);

    const wriLx = elbLx + 0.3 * Math.sin(phase + 0.4 + Math.PI);
    const wriLy = elbLy + FOREARM * 0.9;
    const wriRx = elbRx - 0.3 * Math.sin(phase + 0.4 + Math.PI);
    const wriRy = elbRy + FOREARM * 0.9;

    // Hombros.
    const shoLx = hipX + 0.01, shoLy = hipY - TORSO_LEN;
    const shoRx = hipX - 0.01, shoRy = hipY - TORSO_LEN;

    // Cadera izquierda / derecha (casi coincidentes, ligeramente
    // separadas en y para que sea detectable como par).
    const hipLx = hipX - 0.005, hipLy = hipY;
    const hipRx = hipX + 0.005, hipRy = hipY;

    const truthPts = {
      [L.lSho]: { x: shoLx, y: shoLy, visibility: 1 },
      [L.rSho]: { x: shoRx, y: shoRy, visibility: 1 },
      [L.lElb]: { x: elbLx, y: elbLy, visibility: 1 },
      [L.rElb]: { x: elbRx, y: elbRy, visibility: 1 },
      [L.lWri]: { x: wriLx, y: wriLy, visibility: 1 },
      [L.rWri]: { x: wriRx, y: wriRy, visibility: 1 },
      [L.lHip]: { x: hipLx, y: hipLy, visibility: 1 },
      [L.rHip]: { x: hipRx, y: hipRy, visibility: 1 },
      [L.lKne]: { x: kneeLx, y: kneeLy, visibility: 1 },
      [L.rKne]: { x: kneeRx, y: kneeRy, visibility: 1 },
      [L.lAnk]: { x: ankLx, y: ankLy, visibility: 1 },
      [L.rAnk]: { x: ankRx, y: ankRy, visibility: 1 },
      [L.lHeel]: { x: heelLx, y: heelLy, visibility: 1 },
      [L.rHeel]: { x: heelRx, y: heelRy, visibility: 1 },
      [L.lToe]: { x: toeLx, y: toeLy, visibility: 1 },
      [L.rToe]: { x: toeRx, y: toeRy, visibility: 1 },
    };

    truth.push({ t, pts: truthPts });

    // Frames con swaps inyectados (etiquetas cambiadas).
    const pts = {};
    for (const [k, p] of Object.entries(truthPts)) {
      pts[k] = { ...p };
    }

    const inLegSwap = legSwap && i >= legSwap.start && i < legSwap.end;
    const inArmSwap = armSwap && i >= armSwap.start && i < armSwap.end;
    if (inLegSwap) {
      for (const [a, b] of [[25, 26], [27, 28], [29, 30], [31, 32]]) {
        const pa = pts[a], pb = pts[b];
        if (pa && pb) { pts[a] = pb; pts[b] = pa; }
      }
    }
    if (inArmSwap) {
      for (const [a, b] of [[13, 14], [15, 16]]) {
        const pa = pts[a], pb = pts[b];
        if (pa && pb) { pts[a] = pb; pts[b] = pa; }
      }
    }

    // Ruido.
    if (noise > 0) {
      for (const k of Object.keys(pts)) {
        const p = pts[k];
        if (!p) continue;
        p.x += noise * gauss();
        p.y += noise * gauss();
      }
    }

    // Puntos ausentes / interpolados.
    if (dropRate > 0) {
      for (const k of Object.keys(pts)) {
        if (rand() < dropRate) delete pts[k];
      }
    }
    if (interpRate > 0) {
      for (const k of Object.keys(pts)) {
        if (pts[k] && rand() < interpRate) {
          pts[k].interpolated = true;
          pts[k].visibility = 0.5;
        }
      }
    }

    frames.push({ t, pts });
  }

  return { frames, truth };
}

/** Error de trayectoria: distancia media entre salida y verdad. */
function meanLandmarkError(outFrames, truthFrames, indices) {
  let sum = 0, count = 0;
  for (let i = 0; i < outFrames.length; i++) {
    for (const idx of indices) {
      const a = outFrames[i].pts[idx];
      const b = truthFrames[i].pts[idx];
      if (!a || !b) continue;
      sum += Math.hypot(a.x - b.x, a.y - b.y);
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

const LEG_DISTAL = [25, 26, 27, 28, 29, 30, 31, 32];
const ARM_DISTAL = [13, 14, 15, 16];

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------

test('1. sin intercambios: salida identica y swapsDetected === 0', () => {
  const { frames } = makeRunner(150);
  const { frames: out, report } = applyIdentityTracking(frames);
  assert.equal(report.swapsDetected, 0);
  assert.equal(out.length, frames.length);
  for (let i = 0; i < frames.length; i++) {
    assert.deepEqual(out[i].pts, frames[i].pts);
  }
});

test('2. un intercambio de pierna de 8 cuadros se corrige', () => {
  const { frames, truth } = makeRunner(200, { legSwap: { start: 80, end: 88 } });
  const { frames: out, report } = applyIdentityTracking(frames);
  assert.ok(report.swapsDetected >= 1, 'debe detectar al menos un swap');
  const err = meanLandmarkError(out, truth, LEG_DISTAL);
  assert.ok(err < 0.02, `error de trayectoria ${err} demasiado alto`);
});

test('3. intercambios en los bordes (principio y final)', () => {
  const a = makeRunner(150, { legSwap: { start: 0, end: 10 } });
  const ra = applyIdentityTracking(a.frames);
  assert.ok(ra.report.swapsDetected >= 1, 'swap al principio no detectado');
  assert.ok(meanLandmarkError(ra.frames, a.truth, LEG_DISTAL) < 0.02);

  const b = makeRunner(150, { legSwap: { start: 140, end: 150 } });
  const rb = applyIdentityTracking(b.frames);
  assert.ok(rb.report.swapsDetected >= 1, 'swap al final no detectado');
  assert.ok(meanLandmarkError(rb.frames, b.truth, LEG_DISTAL) < 0.02);
});

test('4. dos intercambios separados por pocos cuadros', () => {
  const { frames, truth } = makeRunner(220, {
    legSwap: { start: 60, end: 65 },
  });
  // Segundo swap distinto: aplicamos otro en el generador via hack:
  // re-generamos con un swap combinado que no sea contiguo. El generador
  // solo admite un tramo por extremidad; usamos 2 corridas para simular
  // el caso 2-swaps-no-contiguos combinando manualmente.
  // Solucion directa: generar dos y combinar el tramo 2.
  const { frames: f2 } = makeRunner(220, { legSwap: { start: 120, end: 128 } });
  // Aplicamos el swap del 2o tramo sobre los frames del 1o.
  for (let i = 120; i < 128; i++) {
    for (const [a, b] of [[25, 26], [27, 28], [29, 30], [31, 32]]) {
      const pa = frames[i].pts[a], pb = frames[i].pts[b];
      if (pa && pb) { frames[i].pts[a] = pb; frames[i].pts[b] = pa; }
    }
  }
  const { frames: out, report } = applyIdentityTracking(frames);
  assert.ok(report.swapsDetected >= 2, `esperaba >=2 swaps, hubo ${report.swapsDetected}`);
  assert.ok(meanLandmarkError(out, truth, LEG_DISTAL) < 0.02);
});

test('5. swap de brazo independiente del de pierna', () => {
  const { frames, truth } = makeRunner(200, {
    legSwap: { start: 100, end: 108 },
    armSwap: { start: 40, end: 46 },
  });
  const { frames: out, report } = applyIdentityTracking(frames);
  assert.ok(report.swapsDetected >= 2, `esperaba >=2 swaps, hubo ${report.swapsDetected}`);
  const limbSet = new Set(report.swaps.map(s => s.limb));
  assert.ok(limbSet.has('pierna'));
  assert.ok(limbSet.has('brazo'));
  assert.ok(meanLandmarkError(out, truth, LEG_DISTAL) < 0.02);
  assert.ok(meanLandmarkError(out, truth, ARM_DISTAL) < 0.02);
});

test('6. ruido gaussiano: sin falsos positivos (20 semillas)', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const { frames } = makeRunner(150, { noise: 0.004, seed });
    const { report } = applyIdentityTracking(frames);
    assert.equal(
      report.swapsDetected, 0,
      `falso positivo con semilla ${seed}: ${report.swapsDetected} swaps`,
    );
  }
});

test('7. puntos ausentes (~15%) e interpolated: sigue corrigiendo', () => {
  const { frames, truth } = makeRunner(200, {
    legSwap: { start: 80, end: 88 },
    dropRate: 0.15,
    interpRate: 0.15,
    seed: 7,
  });
  const { frames: out, report } = applyIdentityTracking(frames);
  assert.ok(report.swapsDetected >= 1, 'no detecto el swap con puntos faltantes');
  const err = meanLandmarkError(out, truth, LEG_DISTAL);
  assert.ok(err < 0.03, `error ${err} alto con puntos faltantes`);
});

test('8. cruce REAL de piernas sin swap de etiqueta: no corrige', () => {
  // Cruce real: las trayectorias de las dos rodillas se acercan y se
  // cruzan suavemente (fase de zancada) sin que las etiquetas cambien.
  // El discriminante clave: en un cruce REAL cada trayectoria es suave
  // en el tiempo y la distancia al punto predicho por velocidad constante
  // es pequena; en un SWAP de etiqueta la trayectoria "salta" de una
  // pierna a la otra en un solo cuadro, lo que dispara el termino de
  // continuidad. Ademas las longitudes de segmento se mantienen (en un
  // swap tambien se mantienen, pero la discontinuidad temporal es el
  // discriminante fuerte).
  const { frames } = makeRunner(200, { crossLegs: true });
  const { report } = applyIdentityTracking(frames);
  assert.equal(report.swapsDetected, 0, 'detecto swap falso en cruce real');
});

test('9. no muta la entrada', () => {
  const { frames } = makeRunner(150, { legSwap: { start: 60, end: 70 } });
  const snapshot = structuredClone(frames);
  applyIdentityTracking(frames);
  assert.deepEqual(frames, snapshot);
});