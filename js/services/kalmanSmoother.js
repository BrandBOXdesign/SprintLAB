// Suavizador de trayectorias por articulacion: filtro de Kalman (modelo de
// velocidad constante, 2D) + suavizado hacia atras (RTS, Rauch-Tung-Striebel).
//
// Reemplaza el enfoque anterior (una prueba geometrica ad-hoc de "salto y
// vuelta" para descartar detecciones malas, mas relleno de huecos en linea
// recta) por algo estadisticamente principiado:
//
// - En vez de un umbral geometrico fijo, el filtro de Kalman calcula en
//   cada instante DONDE ESPERA que este el punto (con su propia
//   incertidumbre, que crece segun que tan rapido se ha estado moviendo)
//   y solo acepta una deteccion nueva si cae dentro de un rango razonable
//   de esa prediccion ("gating" por distancia de Mahalanobis). Si el
//   modelo ya espera que un brazo se mueva rapido, no rechaza detecciones
//   rapidas legitimas -- pero si una deteccion aparece en un lugar que ni
//   el movimiento mas rapido esperado explica (la firma tipica de una
//   confusion de extremidad durante un cruce), la rechaza. Es la misma
//   idea de fondo que la prueba anterior, pero auto-calibrada en vez de
//   un umbral fijo a ojo.
//
// - Para los huecos, el paso hacia atras (RTS) combina TODA la
//   informacion disponible -- pasado y futuro -- para estimar la
//   trayectoria mas probable durante el hueco, incluyendo una estimacion
//   de velocidad, no solo una linea recta entre dos posiciones. Sigue sin
//   inventar movimiento indefinidamente (los huecos largos se siguen
//   descartando, ver MAX_GAP_SECONDS), pero lo que si rellena es mas fiel
//   a como se mueve realmente una extremidad en pleno sprint.
//
// Este archivo no sabe nada de MediaPipe ni de landmarks especificos --
// solo trabaja con series de tiempo genericas {t, x, y, visibility}.
// Quien lo llama (poseDetection.js) le pasa una serie por articulacion.

// ---- algebra de matrices minima (arrays de arrays), solo lo que hace falta aqui ----

function zeros(rows, cols) {
  return Array.from({ length: rows }, () => new Array(cols).fill(0));
}
function identity(n) {
  const M = zeros(n, n);
  for (let i = 0; i < n; i++) M[i][i] = 1;
  return M;
}
function matMul(A, B) {
  const rows = A.length, inner = B.length, cols = B[0].length;
  const R = zeros(rows, cols);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      let s = 0;
      for (let k = 0; k < inner; k++) s += A[i][k] * B[k][j];
      R[i][j] = s;
    }
  }
  return R;
}
function matTranspose(A) {
  const rows = A.length, cols = A[0].length;
  const R = zeros(cols, rows);
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) R[j][i] = A[i][j];
  return R;
}
function matAdd(A, B) { return A.map((row, i) => row.map((v, j) => v + B[i][j])); }
function matSub(A, B) { return A.map((row, i) => row.map((v, j) => v - B[i][j])); }

/**
 * Inversa de una matriz cuadrada NxN via Gauss-Jordan con pivoteo parcial.
 * Aqui solo se usa con N=2 (innovacion) y N=4 (covarianza del estado),
 * ambas siempre bien condicionadas en este contexto (covarianzas con
 * diagonal positiva por construccion). El pivoteo parcial es solo por
 * prudencia numerica, no porque se esperen matrices casi-singulares.
 */
function matInverse(A) {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...identity(n)[i]]);
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivotRow][col])) pivotRow = r;
    if (Math.abs(M[pivotRow][col]) < 1e-12) M[pivotRow][col] += 1e-9; // evita division por cero en el caso degenerado (no deberia ocurrir con covarianzas validas)
    [M[col], M[pivotRow]] = [M[pivotRow], M[col]];
    const pivot = M[col][col];
    for (let j = 0; j < 2 * n; j++) M[col][j] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let j = 0; j < 2 * n; j++) M[r][j] -= factor * M[col][j];
    }
  }
  return M.map(row => row.slice(n));
}

// ---- modelo: velocidad constante en 2D, estado [x, y, vx, vy] ----

const Q_ACCEL = 6.0;   // intensidad del ruido de proceso (que tan brusco se permite que acelere el punto entre muestras). Alto a proposito: un sprint acelera y frena extremidades muy rapido -- si esto fuera bajo, el filtro "atrasaria" el movimiento real.
const R_MIN = 0.0009;  // varianza minima de medicion (deteccion con visibility=1) -- equivale a una desviacion estandar de ~3% del ancho/alto del frame
const R_MAX = 0.01;    // varianza maxima de medicion (visibility apenas por encima del umbral) -- ~10% del frame
const GATE_THRESHOLD = 9.21; // distancia de Mahalanobis^2 maxima para aceptar una medicion (chi-cuadrado, 2 grados de libertad, ~99%) -- solo rechaza detecciones que ni el margen de incertidumbre del modelo explica
const MAX_GAP_SECONDS = 0.6; // igual que en el enfoque anterior: mas alla de esto sin NINGUNA deteccion real cerca, se prefiere no reportar el punto a extrapolar a ciegas

function transitionMatrix(dt) {
  return [
    [1, 0, dt, 0],
    [0, 1, 0, dt],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}
function processNoise(dt) {
  const dt2 = dt * dt, dt3 = dt2 * dt, dt4 = dt3 * dt;
  const q = Q_ACCEL;
  return [
    [dt4 / 4 * q, 0, dt3 / 2 * q, 0],
    [0, dt4 / 4 * q, 0, dt3 / 2 * q],
    [dt3 / 2 * q, 0, dt2 * q, 0],
    [0, dt3 / 2 * q, 0, dt2 * q],
  ];
}
const H = [[1, 0, 0, 0], [0, 1, 0, 0]];
const HT = matTranspose(H);

/**
 * Suaviza la trayectoria de UNA articulacion a lo largo de todo el clip.
 *
 * @param {Array<{t:number, x:number|null, y:number|null, visibility:number|null}>} samples
 *   una entrada por instante muestreado, en orden de tiempo. x/y/visibility
 *   son null si esa articulacion no se detecto con suficiente confianza en
 *   ese instante (el filtrado por confianza pasa ANTES de llegar aca, en
 *   poseDetection.js).
 * @returns {Array<{x:number, y:number, visibility:number}|null>} misma
 *   longitud que `samples`; null donde no hay estimacion confiable (antes
 *   de la primera deteccion real de esta articulacion, o un hueco mas
 *   largo que MAX_GAP_SECONDS sin ninguna deteccion real cerca).
 */
export function smoothLandmarkTrajectory(samples) {
  const n = samples.length;
  const out = new Array(n).fill(null);

  const firstIdx = samples.findIndex(s => s.x != null);
  if (firstIdx === -1) return out; // esta articulacion nunca se detecto con confianza en todo el clip

  // ---- pasada hacia adelante: filtro de Kalman clasico ----
  let x = [samples[firstIdx].x, samples[firstIdx].y, 0, 0]; // arranca con velocidad 0: no hay informacion previa para estimarla
  let P = [
    [R_MIN, 0, 0, 0],
    [0, R_MIN, 0, 0],
    [0, 0, 1, 0], // incertidumbre alta en velocidad inicial -- no sabemos que tan rapido se movia antes de la primera deteccion
    [0, 0, 0, 1],
  ];

  const xFiltered = new Array(n).fill(null);
  const pFiltered = new Array(n).fill(null);
  const xPredicted = new Array(n).fill(null); // necesario para el paso hacia atras
  const pPredicted = new Array(n).fill(null);
  const dtUsed = new Array(n).fill(0);

  xFiltered[firstIdx] = x;
  pFiltered[firstIdx] = P;

  for (let i = firstIdx + 1; i < n; i++) {
    const dt = Math.max(1e-3, samples[i].t - samples[i - 1].t);
    dtUsed[i] = dt;
    const F = transitionMatrix(dt);
    const Q = processNoise(dt);

    const xPred = matMul(F, x.map(v => [v])).map(row => row[0]);
    const PPred = matAdd(matMul(matMul(F, P), matTranspose(F)), Q);
    xPredicted[i] = xPred;
    pPredicted[i] = PPred;

    const meas = samples[i];
    let accepted = false;
    if (meas.x != null) {
      const visibility = meas.visibility ?? 1;
      const r = R_MIN + (1 - visibility) * (R_MAX - R_MIN);
      const R = [[r, 0], [0, r]];
      const zPred = matMul(H, xPred.map(v => [v])).map(row => row[0]);
      const innov = [meas.x - zPred[0], meas.y - zPred[1]];
      const S = matAdd(matMul(matMul(H, PPred), matTranspose(H)), R);
      const SInv = matInverse(S);
      const mahal = innov[0] * (SInv[0][0] * innov[0] + SInv[0][1] * innov[1])
                  + innov[1] * (SInv[1][0] * innov[0] + SInv[1][1] * innov[1]);
      if (mahal <= GATE_THRESHOLD) {
        const K = matMul(matMul(PPred, HT), SInv); // ganancia de Kalman (4x2)
        const correction = matMul(K, [[innov[0]], [innov[1]]]).map(row => row[0]);
        x = xPred.map((v, k) => v + correction[k]);
        P = matMul(matSub(identity(4), matMul(K, H)), PPred);
        accepted = true;
      }
      // si no paso el gating, se descarta esta medicion (confusion de
      // extremidad probable) y se sigue solo con la prediccion, igual que
      // si no hubiera habido deteccion este instante
    }
    if (!accepted) { x = xPred; P = PPred; }
    xFiltered[i] = x;
    pFiltered[i] = P;
  }

  // ---- pasada hacia atras: suavizado RTS (usa el futuro para corregir el pasado) ----
  const xSmoothed = new Array(n).fill(null);
  xSmoothed[n - 1] = xFiltered[n - 1] ?? xFiltered[firstIdx];
  let lastSmoothedP = pFiltered[n - 1] ?? pFiltered[firstIdx];

  for (let i = n - 2; i >= firstIdx; i--) {
    if (xFiltered[i] == null) continue;
    if (xPredicted[i + 1] == null) { xSmoothed[i] = xFiltered[i]; continue; }
    const F = transitionMatrix(dtUsed[i + 1]);
    const PPredInv = matInverse(pPredicted[i + 1]);
    const C = matMul(matMul(pFiltered[i], matTranspose(F)), PPredInv); // ganancia del suavizador (4x4)
    const diff = xSmoothed[i + 1].map((v, k) => v - xPredicted[i + 1][k]);
    const correction = matMul(C, diff.map(v => [v])).map(row => row[0]);
    xSmoothed[i] = xFiltered[i].map((v, k) => v + correction[k]);
  }

  // ---- construir la salida: solo donde hay una estimacion confiable ----
  for (let i = firstIdx; i < n; i++) {
    const xs = xSmoothed[i];
    if (!xs) continue;
    const meas = samples[i];
    if (meas.x != null) {
      out[i] = { x: xs[0], y: xs[1], visibility: meas.visibility ?? 1 };
      continue;
    }
    // cuadro sin deteccion real -- se evalua el hueco (sin ninguna
    // deteccion real de por medio) mirando hacia atras y hacia adelante
    // desde este instante hasta la deteccion real mas cercana en cada
    // direccion, para decidir si vale la pena reportar la estimacion
    // suavizada o si el hueco ya es demasiado largo para confiar en ella.
    let back = i; while (back >= firstIdx && samples[back].x == null) back--;
    let fwd = i; while (fwd < n && samples[fwd].x == null) fwd++;
    const hasBack = back >= firstIdx;
    const hasFwd = fwd < n;
    if (!hasBack) continue; // no deberia pasar (ya arrancamos en firstIdx), por seguridad nada mas

    if (hasFwd) {
      const totalGap = samples[fwd].t - samples[back].t;
      if (totalGap <= MAX_GAP_SECONDS) {
        // hueco acotado por pasado Y futuro reales -- la estimacion RTS
        // aca es la mas confiable posible sin ser una deteccion fresca
        out[i] = { x: xs[0], y: xs[1], visibility: 0.6 };
      }
    } else {
      // cola del clip: no hay ninguna deteccion futura, se esta
      // extrapolando a ciegas -- mucho mas conservador (mitad del margen)
      // y con confianza decayendo mientras mas lejos de la ultima
      // deteccion real
      const distBack = samples[i].t - samples[back].t;
      if (distBack <= MAX_GAP_SECONDS / 2) {
        out[i] = { x: xs[0], y: xs[1], visibility: Math.max(0.25, 0.5 - distBack / MAX_GAP_SECONDS) };
      }
    }
  }
  return out;
}
