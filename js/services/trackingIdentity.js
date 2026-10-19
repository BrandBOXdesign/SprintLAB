// Correccion de identidad izquierda/derecha (swap) en el esqueleto de un
// velocista visto de lado. Logica PURA: nada de MediaPipe, <video>, ni DOM.
// Pensado para Node 20 y Chromium (modulo ES, sin dependencias).
//
// Idea central:
//   - Por cada extremidad (pierna / brazo) existe UN estado binario por
//     cuadro: 0 = etiquetas de MediaPipe tal cual, 1 = intercambiadas.
//   - El estado se resuelve con Viterbi de 2 estados sobre TODA la secuencia,
//     con un costo de emision (continuidad + longitud de segmento) y un
//     costo de transicion que actua de histeresis. Viterbi es globalmente
//     optimo, no parpadea y admite evidencia dudosa sin romper el resto.
//   - Las caderas (23/24) y los hombros (11/12) NO se intercambian: en
//     vista lateral son la referencia anatomica estable y casi nunca se
//     cruzan en la imagen. Solo se intercambia el bloque distal.
//   - Se devuelve un arreglo NUEVO de frames (no se muta la entrada).
// Ver test/trackingIdentity.test.js.

// ---------------------------------------------------------------------------
// Indices de MediaPipe usados (impares = izquierda, pares = derecha).
// ---------------------------------------------------------------------------

/** Bloques que SI se intercambian al cambiar el estado de una extremidad. */
const LIMB_LANDMARKS = {
  pierna: {
    // Rodilla, tobillo, talon, punta de pie.
    distal: [25, 26, 27, 28, 29, 30, 31, 32],
    // Segmentos cuyas longitudes deben permanecer ~constantes.
    segments: [
      [23, 25], [24, 26], // muslo izq / der (usa cadera como ancla)
      [25, 27], [26, 28], // pantorrilla izq / der
      [27, 29], [28, 30], // tobillo-talon izq / der
      [27, 31], [28, 32], // tobillo-punta izq / der
    ],
    // Puntos que se mueven mucho y son la mejor senal de continuidad.
    moving: [25, 26, 27, 28],
  },
  brazo: {
    // Codo y muneca. El hombro rara vez se cruza y sirve de ancla.
    distal: [13, 14, 15, 16],
    segments: [
      [11, 13], [12, 14], // brazo superior izq / der
      [13, 15], [14, 16], // antebrazo izq / der
    ],
    moving: [13, 14, 15, 16],
  },
};

// Torso de referencia (hombro-cadera). Nunca se intercambia.
const TORSO_ANCHORS = {
  leftShoulder: 11, rightShoulder: 12,
  leftHip: 23, rightHip: 24,
};

// ---------------------------------------------------------------------------
// Parametros ajustables. Todos con comentario de "que pasa si se sube/baja".
// ---------------------------------------------------------------------------

export const DEFAULTS = {
  // Costo adicional por CAMBIAR de estado entre cuadros consecutivos.
  // Sube -> mas histéresis (tarda mas en aceptar un swap real, pero ignora
  //        mejor el ruido de 1 cuadro).
  // Baja -> reacciona antes, pero puede parpadear con ruido.
  TRANSITION_COST: 2.0,

  // Peso relativo del termino de continuidad (distancia a la prediccion de
  // velocidad constante) frente al de longitud de segmento.
  // Sube -> prioriza suavidad temporal.
  // Baja -> prioriza coherencia anatomica de largos.
  W_CONTINUITY: 3.0,

  // Peso relativo del termino de longitud de segmento.
  W_SEGMENT: 0.6,

  // Costo por cuadro de estar en estado "intercambiado". Rompe la simetria global:
  // sin el, un clip entero con las etiquetas al reves costaria lo mismo que uno normal.
  // Sube -> exige mas evidencia para declarar un tramo intercambiado.
  PRIOR_SWAP: 0.02,

  // Peso aplicado a la evidencia de un punto `interpolated` (mas debil).
  // Sube -> confia mas en interpolados (riesgoso).
  // Baja -> los ignora mas.
  INTERP_WEIGHT: 0.3,

  // Peso aplicado a la evidencia cuando falta un punto del par (no hay
  // punto directo con el que comparar). Sube -> decide con menos datos.
  MISSING_WEIGHT: 0.15,

  // Fraccion del rango de costos por debajo de la cual consideramos que la
  // decision fue "dudosa" y se reporta en lowConfidenceRanges.
  // Sube -> reporta mas tramos (mas conservador en la UI).
  LOW_CONFIDENCE_RATIO: 0.15,

  // Costo de "no decidir" (evidencia insuficiente) aplicado cuando en un
  // cuadro no hay ningun punto del bloque distal. Permite heredar estado
  // sin forzar una decision que la evidencia no respalda.
  // Sube -> favorece heredar el estado anterior en cuadros vacios.
  NEUTRAL_COST: 0.5,

  // Largo minimo de tramo (en segundos) para reportar en lowConfidenceRanges.
  MIN_LOWCONF_SECONDS: 0.1,
};

// ---------------------------------------------------------------------------
// Utilidades geometricas.
// ---------------------------------------------------------------------------

const have = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const wOf = (p, options) => {
  if (!p) return 0;
  if (p.interpolated) return options.INTERP_WEIGHT;
  const v = Number.isFinite(p.visibility) ? p.visibility : 1;
  return Math.max(0, Math.min(1, v));
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Distancia punto-segmento (a-b). */
function pointSegmentDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const L2 = dx * dx + dy * dy;
  if (L2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Mediana robusta de un arreglo de numeros (ignora no finitos). */
function median(arr) {
  const xs = arr.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (xs.length === 0) return 0;
  const m = xs.length >> 1;
  return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
}

/**
 * Escala para normalizar: mediana del LARGO DEL TRONCO (centro de caderas a
 * centro de hombros). En vista lateral los dos hombros casi se superponen,
 * asi que su separacion es minuscula e inestable; el largo del tronco no.
 */
function estimateTorsoScale(frames) {
  const vals = [];
  for (const f of frames) {
    const hip = hipCenter(f.pts);
    const ls = f.pts[TORSO_ANCHORS.leftShoulder], rs = f.pts[TORSO_ANCHORS.rightShoulder];
    let sho = null;
    if (have(ls) && have(rs)) sho = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
    else if (have(ls)) sho = ls; else if (have(rs)) sho = rs;
    if (hip && sho) vals.push(dist(hip, sho));
  }
  const m = median(vals);
  return m > 1e-6 ? m : 0.2; // fallback razonable en coordenadas normalizadas
}

/**
 * Longitud esperada (mediana robusta) de cada segmento del bloque, usando
 * solo cuadros donde ambos extremos existen y son "reales" (no interpolados).
 * Devuelve { [key]: number } con key `${a}-${b}`.
 */
function estimateSegmentLengths(frames, limbDef) {
  const out = {};
  for (const [a, b] of limbDef.segments) {
    const vals = [];
    for (const f of frames) {
      const pa = f.pts[a], pb = f.pts[b];
      if (!have(pa) || !have(pb)) continue;
      if (pa.interpolated || pb.interpolated) continue;
      vals.push(dist(pa, pb));
    }
    const m = median(vals);
    if (m > 1e-6) out[`${a}-${b}`] = m;
  }
  return out;
}

/**
 * Posicion CORREGIDA de un landmark bajo la hipotesis `swap`. Solo los
 * puntos del bloque distal cambian de lado; las anclas (cadera, hombro) no.
 */
function getMappedPoint(pts, idx, swap, distalSet) {
  if (!swap || !distalSet.has(idx)) return pts[idx] || null;
  const mapped = idx % 2 === 0 ? idx - 1 : idx + 1; // impar<->par (izq<->der)
  return pts[mapped] || null;
}

/** Centro de caderas del cuadro (referencia para quitar el avance del corredor), o null. */
function hipCenter(pts) {
  const l = pts[TORSO_ANCHORS.leftHip], r = pts[TORSO_ANCHORS.rightHip];
  if (have(l) && have(r)) return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
  if (have(l)) return { x: l.x, y: l.y };
  if (have(r)) return { x: r.x, y: r.y };
  return null;
}

/**
 * Costo de EMISION (por cuadro y estado): cuanto se desvian de su longitud
 * esperada los segmentos del bloque al aplicar la hipotesis. Un swap falso
 * suele dar largos anatomicamente raros (ej. cadera izq -> rodilla der).
 * Devuelve { cost, weight }; weight 0 = sin evidencia en este cuadro.
 */
function emissionCost(frame, swap, ctx) {
  const { limbDef, distalSet, segmentLengths, torso, options } = ctx;
  const pts = frame.pts;
  let total = 0, weightSum = 0;
  for (const [a, b] of limbDef.segments) {
    const expected = segmentLengths[`${a}-${b}`];
    if (!expected) continue;
    const pa = getMappedPoint(pts, a, swap, distalSet);
    const pb = getMappedPoint(pts, b, swap, distalSet);
    if (!have(pa) || !have(pb)) continue;
    const w = Math.min(wOf(pa, options), wOf(pb, options));
    if (w <= 0) continue;
    total += w * options.W_SEGMENT * Math.abs(dist(pa, pb) - expected) / torso;
    weightSum += w;
  }
  return { cost: total, weight: weightSum };
}

/**
 * Costo de CONTINUIDAD entre el cuadro i-1 (estado a) y el cuadro i (estado b):
 * suma de distancias entre las posiciones CORREGIDAS de cada punto movil,
 * relativas al centro de caderas (quita el avance del corredor).
 * Si a == b es el salto "crudo" de las etiquetas; si a != b es el salto que
 * habria si se cambia de lado justo en ese cuadro. Un swap real produce un
 * salto crudo enorme y un salto cruzado pequeno: eso es lo que lo delata.
 */
function transitionJump(prev, cur, a, b, ctx) {
  const { limbDef, distalSet, torso, options } = ctx;
  const hp = hipCenter(prev.pts), hc = hipCenter(cur.pts);
  const dx = hp && hc ? hc.x - hp.x : 0;
  const dy = hp && hc ? hc.y - hp.y : 0;
  let total = 0, weightSum = 0;
  for (const idx of limbDef.moving) {
    const p0 = getMappedPoint(prev.pts, idx, a, distalSet);
    const p1 = getMappedPoint(cur.pts, idx, b, distalSet);
    if (!have(p0) || !have(p1)) continue;
    const w = Math.min(wOf(p0, options), wOf(p1, options));
    if (w <= 0) continue;
    total += w * Math.hypot(p1.x - p0.x - dx, p1.y - p0.y - dy) / torso;
    weightSum += w;
  }
  return { cost: total * options.W_CONTINUITY, weight: weightSum };
}

// ---------------------------------------------------------------------------
// Viterbi de 2 estados para una extremidad.
// ---------------------------------------------------------------------------

/**
 * Resuelve el estado swap (0/1) por cuadro con Viterbi de 2 estados sobre
 * TODA la secuencia. El costo de pasar del estado a (cuadro i-1) al b
 * (cuadro i) es: TRANSITION_COST si a != b (histeresis) + el salto de las
 * posiciones corregidas (continuidad). Asi el camino elegido es el que
 * deja la trayectoria corregida mas suave, y un tramo intercambiado se
 * corrige ENTERO (no solo en sus bordes). PRIOR_SWAP rompe la simetria
 * global (todo el clip "al reves" tendria el mismo costo de continuidad):
 * se prefiere que el estado normal sea el de las etiquetas originales.
 */
function runViterbi(frames, limbDef, segmentLengths, torso, options) {
  const n = frames.length;
  if (n === 0) return { swaps: [], lowConf: [] };
  const ctx = { limbDef, distalSet: new Set(limbDef.distal), segmentLengths, torso, options };

  const emit = frames.map(f => {
    const e0 = emissionCost(f, 0, ctx), e1 = emissionCost(f, 1, ctx);
    return { c0: e0.cost, c1: e1.cost + options.PRIOR_SWAP, w: Math.max(e0.weight, e1.weight) };
  });

  const TC = options.TRANSITION_COST;
  const INF = Infinity;
  const dp = [new Array(n).fill(INF), new Array(n).fill(INF)];
  const back = [new Array(n).fill(-1), new Array(n).fill(-1)];
  const ambiguous = new Array(n).fill(false);
  dp[0][0] = emit[0].c0;
  dp[1][0] = emit[0].c1;
  ambiguous[0] = emit[0].w <= 0;

  for (let i = 1; i < n; i++) {
    // jump[a][b]: costo de continuidad entre (i-1, estado a) y (i, estado b).
    const jump = [[0, 0], [0, 0]];
    let evidence = 0;
    for (let a = 0; a < 2; a++) {
      for (let b = 0; b < 2; b++) {
        const j = transitionJump(frames[i - 1], frames[i], a, b, ctx);
        // Sin puntos comparables: no se inventa un salto, solo cuenta TC por cambiar.
        jump[a][b] = j.weight > 0 ? j.cost : 0;
        evidence = Math.max(evidence, j.weight);
      }
    }
    for (let k = 0; k < 2; k++) {
      const e = k === 0 ? emit[i].c0 : emit[i].c1;
      let bestPrev = -1, bestCost = INF;
      for (let pk = 0; pk < 2; pk++) {
        const cand = dp[pk][i - 1] + (pk === k ? 0 : TC) + jump[pk][k];
        if (cand < bestCost) { bestCost = cand; bestPrev = pk; }
      }
      dp[k][i] = e + bestCost;
      back[k][i] = bestPrev;
    }
    // Decision dudosa: sin evidencia, o quedarse en 0 y cambiar a 1 cuestan casi lo mismo.
    const stay = jump[0][0], change = TC + jump[0][1];
    ambiguous[i] = evidence <= 0 ||
      Math.abs(stay - change) < options.LOW_CONFIDENCE_RATIO * Math.max(stay, change, 1e-9);
  }

  let lastK = dp[0][n - 1] <= dp[1][n - 1] ? 0 : 1;
  const swaps = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    swaps[i] = lastK;
    lastK = back[lastK][i];
  }

  const lowConf = [];
  let start = -1;
  for (let i = 0; i < n; i++) {
    if (ambiguous[i] && start < 0) start = i;
    if (!ambiguous[i] && start >= 0) { lowConf.push([start, i - 1]); start = -1; }
  }
  if (start >= 0) lowConf.push([start, n - 1]);
  return { swaps, lowConf };
}

// ---------------------------------------------------------------------------
// API publica.
// ---------------------------------------------------------------------------

/**
 * Corrige intercambios izquierda/derecha en un esqueleto de velocista.
 *
 * @param {Array<{t:number, pts:Object}>} frames  Secuencia ordenada por t.
 * @param {Object} [options]  Overrides de DEFAULTS.
 * @returns {{frames: Array, report: Object}}
 *   - frames: arreglo NUEVO (no muta la entrada).
 *   - report: { swapsDetected, swaps, lowConfidenceRanges }.
 */
export function applyIdentityTracking(frames, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  if (!Array.isArray(frames) || frames.length === 0) {
    return { frames: [], report: { swapsDetected: 0, swaps: [], lowConfidenceRanges: [] } };
  }

  const torso = estimateTorsoScale(frames);

  // Resolver cada extremidad de forma independiente.
  const limbResults = {};
  for (const limb of ['pierna', 'brazo']) {
    const limbDef = LIMB_LANDMARKS[limb];
    const segLen = estimateSegmentLengths(frames, limbDef);
    limbResults[limb] = runViterbi(frames, limbDef, segLen, torso, opts);
  }

  // Construir los frames de salida (copia superficial de pts y aplicando
  // swaps donde corresponda).
  const out = new Array(frames.length);
  for (let i = 0; i < frames.length; i++) {
    const src = frames[i];
    const pts = { ...src.pts };
    for (const limb of ['pierna', 'brazo']) {
      const swap = limbResults[limb].swaps[i];
      if (!swap) continue;
      const { distal } = LIMB_LANDMARKS[limb];
      // Intercambiar cada par impar/par dentro del bloque distal.
      // Nota: en el bloque distal, 25<->26, 27<->28, 29<->30, 31<->32,
      // 13<->14, 15<->16. Todos son pares (impar, par) adyacentes.
      for (const idx of distal) {
        // Recorrer solo impares para no duplicar el intercambio.
        if (idx % 2 === 0) continue;
        const rightIdx = idx + 1;
        const a = src.pts[idx];
        const b = src.pts[rightIdx];
        if (a) pts[rightIdx] = a; else delete pts[rightIdx];
        if (b) pts[idx] = b; else delete pts[idx];
      }
    }
    out[i] = { t: src.t, pts };
  }

  // Construir reporte.
  const report = { swapsDetected: 0, swaps: [], lowConfidenceRanges: [] };

  for (const limb of ['pierna', 'brazo']) {
    const { swaps, lowConf } = limbResults[limb];
    // Tramos de swap activo (estado 1).
    let start = -1;
    for (let i = 0; i <= swaps.length; i++) {
      const active = i < swaps.length && swaps[i] === 1;
      if (active && start < 0) start = i;
      if (!active && start >= 0) {
        const tStart = frames[start].t;
        const tEnd = frames[i - 1].t;
        // Confianza: 1 - (fraccion de cuadros ambiguos en el tramo).
        let amb = 0;
        for (let j = start; j < i; j++) if (limbResults[limb].swaps[j] === 1) amb++;
        const conf = Math.max(0, Math.min(1, 1 - amb / Math.max(1, i - start) * 0));
        // Ajuste: confianza basada en longitud del tramo y baja confianza.
        let lowCount = 0;
        for (let j = start; j < i; j++) {
          // Reutilizamos el criterio de ambiguedad: lo sabemos via lowConf.
          const inLow = lowConf.some(([a, b]) => j >= a && j <= b);
          if (inLow) lowCount++;
        }
        const confidence = Math.max(0, 1 - lowCount / Math.max(1, i - start));
        report.swaps.push({ tStart, tEnd, limb, confidence });
        report.swapsDetected++;
        start = -1;
      }
    }
    // Tramos de baja confianza en la decision.
    for (const [a, b] of lowConf) {
      const tStart = frames[a].t;
      const tEnd = frames[b].t;
      if (tEnd - tStart >= opts.MIN_LOWCONF_SECONDS) {
        report.lowConfidenceRanges.push({
          tStart, tEnd,
          reason: `Decision izquierda/derecha dudosa en ${limb}`,
        });
      }
    }
  }

  return { frames: out, report };
}