// Metricas biomecanicas de sprint a partir de un esqueleto 2D (MediaPipe, 33 puntos).
// Modulo PURO: no toca <video>, <canvas> ni MediaPipe; solo calculo sobre
// arreglos/objetos, igual que poseLogic.js, para poder probarlo con Node normal
// (ver test/trackingMetrics.test.js). No muta la entrada. Sin dependencias.
//
// CONVENCIONES (resumen; la tabla completa va en la respuesta que acompana este archivo):
//  - Todo se calcula en PIXELES (x*videoWidth, y*videoHeight). En coordenadas
//    normalizadas un video 16:9 deforma los angulos (1 unidad en x != 1 unidad en y).
//  - Rodilla / codo: angulo INTERNO entre los dos segmentos, 0..180. 180 = extendido.
//    Se usa atan2(|producto cruz|, producto punto): estable cerca de 0 y 180.
//  - Cadera: angulo entre el tronco (cadera->hombro) y el muslo (cadera->rodilla).
//    180 = muslo alineado con el tronco hacia abajo (posicion de pie, neutro).
//    < 180 = flexion (muslo ADELANTE del tronco, en el sentido de avance).
//    > 180 = extension (muslo ATRAS del tronco).
//  - Inclinacion de tronco: angulo de (cadera->hombro) respecto a la vertical;
//    positivo = inclinado en el sentido de avance.
//  - Altura de rodilla: (y_cadera - y_rodilla) / femurPx, en la vertical de la
//    IMAGEN. 0 = rodilla a la altura de la cadera; 1 = un femur por encima; <0 = debajo.

/** Parametros ajustables. Se pueden sobreescribir pasando la misma clave en `opts`. */
export const DEFAULTS = Object.freeze({
  // --- Sentido de avance ---
  // 'auto' | 'izq-der' | 'der-izq'. En 'auto' se usa primero la deriva de la cadera
  // y, si la camara sigue al corredor (no hay deriva), la orientacion punta-talon.
  direccion: 'auto',
  // Deriva minima de la cadera (fraccion del ANCHO del video) para fiarse de ella.
  // Subir: mas clips caen al metodo punta-talon. Bajar: el vaiven de una camara
  // que sigue al corredor podria confundirse con avance real.
  umbralDerivaFrac: 0.05,
  // Diferencia minima punta-talon (px) para votar el sentido. Subir: exige un pie
  // mas grande en la imagen; bajar: mas sensible al ruido de los puntos 29-32.
  minPuntaTalonPx: 2,

  // --- Validez de puntos ---
  // Visibilidad minima de MediaPipe. Subir: menos cuadros utilizables pero mas
  // limpios. Bajar: mas cuadros con puntos "adivinados" por el modelo.
  // (Un punto sin campo `visibility` se acepta; NaN se rechaza.)
  visibilidadMin: 0.5,
  // false: un punto `interpolated:true` se trata como ausente (no inventar).
  permitirInterpolados: false,
  // Longitud minima (px) de un segmento para calcular un angulo con el. Evita dividir
  // por ~0 con muslos/brazos colapsados.
  minSegmentoPx: 2,
  // Margen (fraccion del cuadro) fuera de 0..1 que se tolera en x/y. MediaPipe puede
  // dar coordenadas un poco fuera del cuadro con el cuerpo cortado; mas alla de este
  // margen el punto es una extrapolacion sin sentido y se trata como ausente.
  margenFueraDeCuadro: 0.1,

  // --- Suavizado Savitzky-Golay (aplicado por tramos continuos, sin cruzar huecos) ---
  suavizar: true,
  // Ventana (impar, en cuadros). A 50 Hz, 7 cuadros = 140 ms. Subir: menos ruido pero
  // se aplanan picos rapidos (el contacto dura ~5 cuadros). Bajar: mas ruido.
  sgVentana: 7,
  // Orden del polinomio. Subir: conserva mejor los picos, filtra menos ruido.
  // Debe ser <= sgVentana - 2.
  sgOrden: 3,

  // --- Altura de rodilla normalizada ---
  // Si (P95 - P5) / mediana de la longitud proyectada del femur supera esto, la
  // altura se marca no confiable (camara no lateral, perspectiva o fuera de plano).
  // Subir: tolera mas desviacion; bajar: mas estricto.
  maxVariacionFemur: 0.15,
  // Muestras minimas de femur para poder juzgar su variacion.
  minMuestrasFemur: 5,

  // --- Eventos de zancada ---
  // Umbral de contacto como fraccion entre el percentil bajo y alto de la altura del
  // pie relativa a la cadera. Subir (->1): contacto mas corto, pero fragil si el pie
  // "rebota" en apoyo. Bajar: contacto mas largo (se sobreestima).
  umbralContacto: 0.8,
  percentilBajo: 10,
  percentilAlto: 90,
  // Amplitud vertical minima del pie (en femures). Por debajo, no hay zancada que detectar.
  minAmplitudPieFemur: 0.25,
  // Muestras validas minimas por pie para intentar detectar eventos.
  minMuestrasEventos: 10,
  // Un contacto mas corto que esto (s) se descarta como ruido.
  minContactoS: 0.03,
  // Una fase sin contacto de UN pie mas corta que esto (s) se une al contacto vecino.
  minVueloPieS: 0.06,
  // Tiempo de vuelo maximo creible (s); mas que eso se asume que falto un evento.
  maxVueloS: 0.4,
  // Un salto de tiempo mayor que este factor * dt corta la deteccion (cuadros perdidos).
  maxHuecoFactor: 1.5,
});

const RAD2DEG = 180 / Math.PI;
const NOMBRES_LADO = ['izq', 'der'];
const INDICES = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
const CLAVES_CONFIABLE = [
  'rodillaIzq', 'rodillaDer', 'caderaIzq', 'caderaDer', 'troncoInclinacion',
  'codoIzq', 'codoDer', 'alturaRodillaIzq', 'alturaRodillaDer',
];

// ---------------------------------------------------------------- utilidades

function ordenar(arr) {
  return Float64Array.from(arr).sort();
}

/** Percentil con interpolacion lineal sobre un arreglo YA ordenado. */
function percentil(ordenado, p) {
  const n = ordenado.length;
  if (n === 0) return null;
  if (n === 1) return ordenado[0];
  const pos = (p / 100) * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return ordenado[lo] + (ordenado[hi] - ordenado[lo]) * (pos - lo);
}

function mediana(arr) {
  return arr.length ? percentil(ordenar(arr), 50) : null;
}

function media(arr) {
  if (!arr.length) return null;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function finito(v) {
  return Number.isFinite(v) ? v : null;
}

/** Indice de simetria (Robinson et al. 1987): (I - D) / (0.5 (I + D)) * 100. >0: izquierda mayor. */
function indiceSimetria(izq, der) {
  if (izq === null || der === null) return null;
  const m = (izq + der) / 2;
  if (Math.abs(m) < 1e-9) return null;
  return finito(((izq - der) / m) * 100);
}

// ---------------------------------------------------------------- Savitzky-Golay

function invertir(M) {
  const n = M.length;
  const A = M.map((fila, i) => [...fila, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    const d = A[c][c];
    for (let k = 0; k < 2 * n; k++) A[c][k] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c];
      if (f === 0) continue;
      for (let k = 0; k < 2 * n; k++) A[r][k] -= f * A[c][k];
    }
  }
  return A.map(fila => fila.slice(n));
}

const cacheSG = new Map();

/**
 * Coeficientes SG para una ventana de `w` puntos: coefs[k][j] es el peso del punto j de
 * la ventana al evaluar el ajuste polinomico en la posicion k (k = centro => filtro SG
 * clasico; k en los extremos => se evalua el MISMO ajuste en el borde, sin sesgo de
 * relleno ni retraso).
 */
function coefsSG(w, orden) {
  const clave = `${w}:${orden}`;
  if (cacheSG.has(clave)) return cacheSG.get(clave);
  const m = orden + 1;
  const h = (w - 1) / 2;
  const pot = (u, k) => u ** k;
  const A = Array.from({ length: w }, (_, j) => Array.from({ length: m }, (_, k) => pot((j - h) / h, k)));
  const N = Array.from({ length: m }, (_, r) => Array.from({ length: m }, (_, c) => {
    let s = 0;
    for (let j = 0; j < w; j++) s += A[j][r] * A[j][c];
    return s;
  }));
  const Ninv = invertir(N);
  const B = Array.from({ length: m }, (_, r) => Array.from({ length: w }, (_, j) => {
    let s = 0;
    for (let c = 0; c < m; c++) s += Ninv[r][c] * A[j][c];
    return s;
  }));
  const coefs = Array.from({ length: w }, (_, k) => {
    const u = (k - h) / h;
    return Array.from({ length: w }, (_, j) => {
      let s = 0;
      for (let r = 0; r < m; r++) s += pot(u, r) * B[r][j];
      return s;
    });
  });
  cacheSG.set(clave, coefs);
  return coefs;
}

/**
 * Suaviza una serie con SG por tramos continuos de valores no nulos (los `null` se
 * conservan y NUNCA se cruzan). Tramos mas cortos que la ventana usan la mayor ventana
 * impar posible; si no alcanza (< orden + 2) quedan sin tocar.
 */
function suavizarSerie(vals, w, orden) {
  const n = vals.length;
  const out = vals.slice();
  let i = 0;
  while (i < n) {
    if (vals[i] === null) { i++; continue; }
    let j = i;
    while (j < n && vals[j] !== null) j++;
    const largo = j - i;
    const ww = Math.min(w, largo % 2 === 1 ? largo : largo - 1);
    if (ww >= orden + 2) {
      const C = coefsSG(ww, orden);
      const mitad = (ww - 1) / 2;
      for (let k = 0; k < largo; k++) {
        const ini = Math.min(Math.max(k - mitad, 0), largo - ww);
        const fila = C[k - ini];
        let s = 0;
        for (let q = 0; q < ww; q++) s += fila[q] * vals[i + ini + q];
        out[i + k] = Number.isFinite(s) ? s : vals[i + k];
      }
    }
    i = j;
  }
  return out;
}

// ---------------------------------------------------------------- geometria

/** Angulo interno en `centro` entre los rayos a `a` y `b`, 0..180. null si un segmento es ~0. */
function anguloInterno(centro, a, b, minSeg) {
  const ux = a.x - centro.x, uy = a.y - centro.y;
  const vx = b.x - centro.x, vy = b.y - centro.y;
  if (Math.hypot(ux, uy) < minSeg || Math.hypot(vx, vy) < minSeg) return null;
  return finito(Math.atan2(Math.abs(ux * vy - uy * vx), ux * vx + uy * vy) * RAD2DEG);
}

/**
 * Angulo de cadera (180 = neutro, <180 flexion = muslo adelante, >180 extension).
 * Se mide desde la PROLONGACION del tronco hacia abajo hasta el muslo (angulo firmado,
 * sin saltos de +-180 en el rango fisiologico); el signo se fija con el sentido de avance.
 */
function anguloCadera(cadera, hombro, rodilla, dir, minSeg) {
  // Vectores en coordenadas con Y hacia ARRIBA (la imagen tiene Y hacia abajo).
  const ux = hombro.x - cadera.x, uy = -(hombro.y - cadera.y);   // tronco
  const vx = rodilla.x - cadera.x, vy = -(rodilla.y - cadera.y); // muslo
  if (Math.hypot(ux, uy) < minSeg || Math.hypot(vx, vy) < minSeg) return null;
  const wx = -ux, wy = -uy;                                       // tronco prolongado hacia abajo
  const alfa = Math.atan2(wx * vy - wy * vx, wx * vx + wy * vy);  // + = antihorario
  const flexion = dir * alfa * RAD2DEG;                           // + = muslo adelante
  return finito(180 - flexion);
}

// ---------------------------------------------------------------- pasos previos

function pasoTemporal(t, adv) {
  const difs = [];
  let noCreciente = false;
  for (let i = 1; i < t.length; i++) {
    if (t[i] === null || t[i - 1] === null) continue;
    const d = t[i] - t[i - 1];
    if (d > 0) difs.push(d); else noCreciente = true;
  }
  if (noCreciente) adv.push('t no es estrictamente creciente en algunos cuadros; revisar el orden de entrada');
  if (!difs.length) return null;
  const dt = mediana(difs);
  if (difs.some(d => Math.abs(d - dt) > 0.25 * dt)) {
    adv.push('el paso temporal no es uniforme (cuadros perdidos?); el suavizado SG asume paso constante');
  }
  return dt;
}

/** Punto en pixeles o null si falta, esta interpolado, tiene poca visibilidad o no es finito. */
function puntoValido(frame, idx, cfg, W, H) {
  const p = frame && frame.pts ? frame.pts[idx] : undefined;
  if (!p) return null;
  if (p.interpolated && !cfg.permitirInterpolados) return null;
  const v = p.visibility;
  if (v !== undefined && !(v >= cfg.visibilidadMin)) return null;
  const x = p.x * W;
  const y = p.y * H;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const m = cfg.margenFueraDeCuadro;
  if (p.x < -m || p.x > 1 + m || p.y < -m || p.y > 1 + m) return null;
  return { x, y };
}

function calcularFemur(P, cfg) {
  const d = [];
  for (const Pi of P) {
    for (let lado = 0; lado < 2; lado++) {
      const c = Pi[23 + lado], r = Pi[25 + lado];
      if (!c || !r) continue;
      const dist = Math.hypot(r.x - c.x, r.y - c.y);
      if (dist >= cfg.minSegmentoPx) d.push(dist);
    }
  }
  if (!d.length) return { femurPx: null, variacion: null, n: 0 };
  const ord = ordenar(d);
  const med = percentil(ord, 50);
  const variacion = d.length >= cfg.minMuestrasFemur && med > 0
    ? finito((percentil(ord, 95) - percentil(ord, 5)) / med)
    : null;
  return { femurPx: finito(med), variacion, n: d.length };
}

/**
 * Sentido de avance. 1) forzado por opts; 2) deriva horizontal de la cadera (camara fija);
 * 3) orientacion punta-talon (funciona aunque la camara siga al corredor y la cadera casi
 * no se mueva en la imagen); 4) por defecto 'izq-der' con advertencia.
 */
function detectarDireccion(P, W, cfg, adv) {
  if (cfg.direccion === 'izq-der' || cfg.direccion === 'der-izq') return cfg.direccion;

  const xs = [];
  for (const Pi of P) {
    const a = Pi[23], b = Pi[24];
    if (a && b) xs.push((a.x + b.x) / 2);
    else if (a) xs.push(a.x);
    else if (b) xs.push(b.x);
  }
  let deriva = null;
  if (xs.length >= 6) {
    const k = Math.floor(xs.length / 3);
    deriva = mediana(xs.slice(xs.length - k)) - mediana(xs.slice(0, k));
  }
  const dirDeriva = deriva !== null && Math.abs(deriva) >= cfg.umbralDerivaFrac * W
    ? (deriva > 0 ? 'izq-der' : 'der-izq') : null;

  let suma = 0, cuenta = 0;
  for (const Pi of P) {
    for (let lado = 0; lado < 2; lado++) {
      const punta = Pi[31 + lado], talon = Pi[29 + lado];
      if (punta && talon) { suma += punta.x - talon.x; cuenta++; }
    }
  }
  const voto = cuenta >= 5 ? suma / cuenta : null;
  const dirVoto = voto !== null && Math.abs(voto) >= cfg.minPuntaTalonPx
    ? (voto > 0 ? 'izq-der' : 'der-izq') : null;

  if (dirDeriva) {
    if (dirVoto && dirVoto !== dirDeriva) {
      adv.push('el sentido por deriva de cadera y por orientacion del pie no coinciden; se uso la deriva. Revisar.');
    }
    return dirDeriva;
  }
  if (dirVoto) {
    adv.push('sentido de avance inferido por la orientacion punta-talon (poca deriva de cadera: camara que sigue al corredor?)');
    return dirVoto;
  }
  adv.push('no se pudo detectar el sentido de avance; se asume izq-der. Pasar opts.direccion si se conoce.');
  return 'izq-der';
}

// ---------------------------------------------------------------- eventos

/**
 * Cruces del umbral de contacto para UN pie. Senal: altura del punto mas bajo del pie
 * (max y entre tobillo/talon/punta) relativa al centro de la cadera, en femures. En apoyo
 * es una meseta alta; en vuelo del pie baja. Tiempos por interpolacion lineal (sub-cuadro).
 */
function crucesDePie(ry, t, cfg, dt, nombre, adv) {
  const valores = [];
  for (const v of ry) if (v !== null) valores.push(v);
  if (valores.length < cfg.minMuestrasEventos) {
    adv.push(`pie ${nombre}: muy pocas muestras validas (${valores.length}) para detectar eventos`);
    return [];
  }
  const ord = ordenar(valores);
  const lo = percentil(ord, cfg.percentilBajo);
  const hi = percentil(ord, cfg.percentilAlto);
  if (!(hi - lo >= cfg.minAmplitudPieFemur)) {
    adv.push(`pie ${nombre}: la amplitud vertical del pie es menor que ${cfg.minAmplitudPieFemur} femures; no se detectan eventos`);
    return [];
  }
  const umbral = lo + cfg.umbralContacto * (hi - lo);
  const maxHueco = dt ? cfg.maxHuecoFactor * dt : Infinity;
  const cruces = [];
  for (let i = 1; i < ry.length; i++) {
    const a = ry[i - 1], b = ry[i];
    if (a === null || b === null || t[i] === null || t[i - 1] === null) continue;
    if (t[i] - t[i - 1] > maxHueco) continue;
    let tipo = null;
    if (a <= umbral && b > umbral) tipo = 'contacto';
    else if (a > umbral && b <= umbral) tipo = 'despegue';
    if (!tipo) continue;
    const frac = (umbral - a) / (b - a);
    cruces.push({ tipo, t: t[i - 1] + frac * (t[i] - t[i - 1]), idx: i });
  }
  // Depuracion: contactos demasiado cortos y vuelos de un solo pie demasiado cortos son ruido.
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (let k = 0; k + 1 < cruces.length; k++) {
      const A = cruces[k], B = cruces[k + 1];
      const dur = B.t - A.t;
      const corto = (A.tipo === 'contacto' && B.tipo === 'despegue' && dur < cfg.minContactoS)
        || (A.tipo === 'despegue' && B.tipo === 'contacto' && dur < cfg.minVueloPieS);
      if (corto) { cruces.splice(k, 2); cambio = true; break; }
    }
  }
  return cruces;
}

function statsVentana(serie, t, t0, t1) {
  if (t1 === null) return { max: null, min: null };
  let mx = null, mn = null;
  for (let i = 0; i < serie.length; i++) {
    const v = serie[i];
    if (v === null || t[i] === null) continue;
    if (t[i] >= t0 && t[i] < t1) {
      if (mx === null || v > mx) mx = v;
      if (mn === null || v < mn) mn = v;
    }
  }
  return { max: mx, min: mn };
}

function valorCercano(serie, t, t0, tol) {
  let mejor = null, mejorD = Infinity;
  for (let i = 0; i < serie.length; i++) {
    if (serie[i] === null || t[i] === null) continue;
    const d = Math.abs(t[i] - t0);
    if (d < mejorD) { mejorD = d; mejor = serie[i]; }
  }
  return mejor !== null && mejorD <= tol ? mejor : null;
}

// ---------------------------------------------------------------- principal

/**
 * Calcula angulos, altura de rodilla, eventos y metricas por zancada. No muta `frames`.
 * @param {Array<{t:number, pts:Object}>} frames  cuadros ordenados por t (s); x,y normalizados 0-1.
 * @param {{videoWidth:number, videoHeight:number, direccion?:string}} opts  (+ cualquier clave de DEFAULTS)
 */
export function computeMetrics(frames, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  const W = cfg.videoWidth, H = cfg.videoHeight;
  if (!Array.isArray(frames)) throw new TypeError('computeMetrics: frames debe ser un arreglo');
  if (!(Number.isFinite(W) && W > 0 && Number.isFinite(H) && H > 0)) {
    throw new RangeError('computeMetrics: videoWidth y videoHeight deben ser numeros > 0');
  }
  const n = frames.length;
  const adv = [];

  // Opciones numericas: un NaN o un valor absurdo no debe desactivar el suavizado en silencio.
  if (!(Number.isFinite(cfg.sgOrden) && cfg.sgOrden >= 1)) throw new RangeError('computeMetrics: sgOrden debe ser un numero >= 1');
  if (!(Number.isFinite(cfg.sgVentana) && cfg.sgVentana >= 3)) throw new RangeError('computeMetrics: sgVentana debe ser un numero >= 3');
  if (!(Number.isFinite(cfg.margenFueraDeCuadro) && cfg.margenFueraDeCuadro >= 0)) throw new RangeError('computeMetrics: margenFueraDeCuadro debe ser un numero >= 0');

  // Ventana SG valida: impar y >= orden + 2.
  const orden = Math.max(1, Math.floor(cfg.sgOrden));
  let ventana = Math.floor(cfg.sgVentana);
  if (ventana % 2 === 0) ventana++;
  if (ventana < orden + 2) ventana = orden % 2 === 0 ? orden + 3 : orden + 2;

  const t = frames.map(f => (f && Number.isFinite(f.t) ? f.t : null));
  const dt = pasoTemporal(t, adv);
  if (n === 0) adv.push('no hay cuadros');

  // Puntos validos en pixeles (una sola vez por cuadro).
  const P = frames.map(f => {
    const o = {};
    for (const idx of INDICES) o[idx] = puntoValido(f, idx, cfg, W, H);
    return o;
  });

  const fem = calcularFemur(P, cfg);
  const femurPx = fem.femurPx;
  const femurConfiable = femurPx !== null && fem.variacion !== null && fem.variacion <= cfg.maxVariacionFemur;
  if (femurPx === null) {
    adv.push('no hay cuadros fiables de cadera y rodilla: femurPx = null, la altura de rodilla y los eventos no se calculan');
  } else if (fem.variacion === null) {
    adv.push(`solo ${fem.n} muestras de femur: no se puede juzgar su variacion; altura de rodilla marcada no confiable`);
  } else if (!femurConfiable) {
    adv.push(`el femur proyectado varia ${(fem.variacion * 100).toFixed(1)} % (> ${(cfg.maxVariacionFemur * 100).toFixed(0)} %): altura de rodilla marcada no confiable (camara no lateral o movimiento fuera de plano)`);
  }

  const direccion = detectarDireccion(P, W, cfg, adv);
  const dir = direccion === 'izq-der' ? 1 : -1;

  // ----- series por cuadro (null cuando no se puede calcular) -----
  const S = {};
  for (const k of CLAVES_CONFIABLE) S[k] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const Pi = P[i];
    let tx = 0, ty = 0, nTronco = 0;
    for (let lado = 0; lado < 2; lado++) {
      const L = NOMBRES_LADO[lado] === 'izq' ? 'Izq' : 'Der';
      const hom = Pi[11 + lado], cod = Pi[13 + lado], mun = Pi[15 + lado];
      const cad = Pi[23 + lado], rod = Pi[25 + lado], tob = Pi[27 + lado];
      if (cad && rod && tob) S['rodilla' + L][i] = anguloInterno(rod, cad, tob, cfg.minSegmentoPx);
      if (hom && cod && mun) S['codo' + L][i] = anguloInterno(cod, hom, mun, cfg.minSegmentoPx);
      if (hom && cad && rod) S['cadera' + L][i] = anguloCadera(cad, hom, rod, dir, cfg.minSegmentoPx);
      if (cad && rod && femurPx !== null && femurPx > 0) {
        S['alturaRodilla' + L][i] = finito((cad.y - rod.y) / femurPx);
      }
      if (hom && cad) { tx += hom.x - cad.x; ty += hom.y - cad.y; nTronco++; }
    }
    if (nTronco > 0) {
      const ux = tx / nTronco, uyArriba = -(ty / nTronco);
      if (Math.hypot(ux, uyArriba) >= cfg.minSegmentoPx) {
        S.troncoInclinacion[i] = finito(Math.atan2(ux * dir, uyArriba) * RAD2DEG);
      }
    }
  }

  // Banderas de confiabilidad (antes de suavizar: un valor existe si y solo si hubo datos validos).
  const conf = {};
  for (const k of CLAVES_CONFIABLE) conf[k] = S[k].map(v => v !== null);
  for (const k of ['alturaRodillaIzq', 'alturaRodillaDer']) {
    if (!femurConfiable) conf[k] = conf[k].map(() => false);
  }

  if (cfg.suavizar) {
    for (const k of CLAVES_CONFIABLE) {
      S[k] = suavizarSerie(S[k], ventana, orden);
      // El polinomio SG puede rebasar el rango fisico tras un cambio brusco (ej. 5 -> 175 grados
      // daba -11 y 191): rodilla y codo son angulos internos y viven en 0..180.
      if (k.startsWith('rodilla') || k.startsWith('codo')) S[k] = S[k].map(v => (v === null ? v : Math.min(180, Math.max(0, v))));
    }
  }

  const perFrame = frames.map((_, i) => {
    const o = { t: t[i] };
    for (const k of CLAVES_CONFIABLE) o[k] = S[k][i];
    o.confiable = {};
    for (const k of CLAVES_CONFIABLE) o.confiable[k] = conf[k][i];
    return o;
  });

  // ----- cuadros inutilizables -----
  let inutiles = 0;
  const nulosPorMetrica = {};
  for (const k of CLAVES_CONFIABLE) nulosPorMetrica[k] = 0;
  for (let i = 0; i < n; i++) {
    let alguno = false;
    for (const k of CLAVES_CONFIABLE) {
      if (S[k][i] !== null) alguno = true; else nulosPorMetrica[k]++;
    }
    if (!alguno) inutiles++;
  }
  const pctInutiles = n > 0 ? (100 * inutiles) / n : 0;
  if (n > 0 && inutiles > 0) {
    adv.push(`${pctInutiles.toFixed(1)} % de los cuadros (${inutiles}/${n}) son inutilizables: ninguna metrica se pudo calcular`);
  }
  if (n > 0) {
    const detalle = CLAVES_CONFIABLE
      .filter(k => nulosPorMetrica[k] > 0)
      .map(k => `${k} ${((100 * nulosPorMetrica[k]) / n).toFixed(0)} %`);
    if (detalle.length) adv.push('cuadros sin dato por metrica: ' + detalle.join(', '));
  }

  // ----- eventos de zancada -----
  const eventos = [];
  const base = []; // zancadas con contacto y despegue observados sin huecos
  const crucesPorLado = [[], []];
  const nulosPrefijo = [null, null];
  if (femurPx !== null && femurPx > 0) {
    for (let lado = 0; lado < 2; lado++) {
      const ry = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        const Pi = P[i];
        const c1 = Pi[23], c2 = Pi[24];
        let cy = null;
        if (c1 && c2) cy = (c1.y + c2.y) / 2; else if (c1) cy = c1.y; else if (c2) cy = c2.y;
        const tob = Pi[27 + lado];
        if (cy === null || !tob) continue; // exige tobillo; talon/punta se usan si estan
        let yPie = tob.y;
        const tal = Pi[29 + lado], pun = Pi[31 + lado];
        if (tal && tal.y > yPie) yPie = tal.y;
        if (pun && pun.y > yPie) yPie = pun.y;
        ry[i] = finito((yPie - cy) / femurPx);
      }
      const ryS = cfg.suavizar ? suavizarSerie(ry, ventana, orden) : ry;
      const pre = new Array(n + 1).fill(0);
      for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + (ryS[i] === null ? 1 : 0);
      nulosPrefijo[lado] = pre;
      const cruces = crucesDePie(ryS, t, cfg, dt, NOMBRES_LADO[lado], adv);
      crucesPorLado[lado] = cruces;
      for (const c of cruces) eventos.push({ tipo: c.tipo, pie: NOMBRES_LADO[lado], t: c.t });
      for (let k = 0; k + 1 < cruces.length; k++) {
        const c = cruces[k], d = cruces[k + 1];
        if (c.tipo !== 'contacto' || d.tipo !== 'despegue') continue;
        // frames c.idx .. d.idx-1 deben ser todos validos (contacto observado completo)
        if (nulosPrefijo[lado][d.idx] - nulosPrefijo[lado][c.idx] !== 0) continue;
        const sig = cruces.slice(k + 2).find(e => e.tipo === 'contacto');
        base.push({ lado, c, d, tSig: sig ? sig.t : null });
      }
    }
  }
  eventos.sort((a, b) => (a.t - b.t) || (a.tipo === b.tipo ? 0 : a.tipo === 'contacto' ? -1 : 1));

  // ----- por zancada -----
  let solapes = 0;
  const tol = dt ? 1.5 * dt : 0;
  const contactosOpuestos = lado => eventos.filter(e => e.tipo === 'contacto' && e.pie === NOMBRES_LADO[1 - lado]);
  const porZancada = base
    .sort((a, b) => a.c.t - b.c.t)
    .map(({ lado, c, d, tSig }) => {
      const L = lado === 0 ? 'Izq' : 'Der';
      const sigOpuesto = contactosOpuestos(lado).find(e => e.t > c.t);
      let vuelo = null;
      if (sigOpuesto) {
        const v = sigOpuesto.t - d.t;
        if (v < 0) solapes++;
        else if (v <= cfg.maxVueloS) vuelo = v;
      }
      const rod = statsVentana(S['rodilla' + L], t, c.t, tSig);
      const cad = statsVentana(S['cadera' + L], t, c.t, tSig);
      const alt = statsVentana(S['alturaRodilla' + L], t, c.t, tSig);
      return {
        pie: NOMBRES_LADO[lado],
        tContacto: c.t,
        tDespegue: d.t,
        tiempoContacto: d.t - c.t,
        tiempoVuelo: vuelo,
        periodo: tSig !== null ? tSig - c.t : null,
        completo: tSig !== null,
        anguloRodillaContacto: valorCercano(S['rodilla' + L], t, c.t, tol),
        anguloRodillaMax: rod.max,
        anguloRodillaMin: rod.min,
        anguloCaderaMax: cad.max,
        anguloCaderaMin: cad.min,
        alturaRodillaMax: femurConfiable ? alt.max : null,
      };
    });
  if (solapes > 0) {
    adv.push(`${solapes} zancada(s) con contacto del pie opuesto antes del despegue (apoyo doble): tiempoVuelo = null en ellas. Revisar umbralContacto.`);
  }

  // ----- resumen -----
  const contactos = eventos.filter(e => e.tipo === 'contacto');
  const intervalos = [];
  for (let i = 1; i < contactos.length; i++) intervalos.push(contactos[i].t - contactos[i - 1].t);
  const pasoMed = mediana(intervalos);
  const cadencia = pasoMed && pasoMed > 0 ? finito(1 / pasoMed) : null;

  const porPie = {};
  for (const pie of NOMBRES_LADO) {
    const z = porZancada.filter(s => s.pie === pie);
    const val = k => z.map(s => s[k]).filter(v => v !== null);
    porPie[pie] = {
      contactos: contactos.filter(e => e.pie === pie).length,
      zancadas: z.length,
      tiempoContactoMedio: media(val('tiempoContacto')),
      tiempoVueloMedio: media(val('tiempoVuelo')),
      anguloRodillaMinMedio: media(val('anguloRodillaMin')),
      alturaRodillaMaxMedia: media(val('alturaRodillaMax')),
    };
  }
  const todosContacto = porZancada.map(s => s.tiempoContacto);
  const todosVuelo = porZancada.map(s => s.tiempoVuelo).filter(v => v !== null);
  const tcMedio = media(todosContacto);
  if (tcMedio !== null && dt && tcMedio / dt < 8) {
    adv.push(`el contacto medio (${tcMedio.toFixed(3)} s) abarca solo ~${(tcMedio / dt).toFixed(1)} cuadros (paso ${dt.toFixed(3)} s): la resolucion temporal limita la precision de tiempo de contacto y vuelo (error tipico de ~1 cuadro por evento)`);
  }

  const resumen = {
    cadenciaPasosPorSeg: cadencia,
    tiempoContactoMedio: tcMedio,
    tiempoVueloMedio: media(todosVuelo),
    contactosTotales: contactos.length,
    zancadasCompletas: porZancada.filter(s => s.completo).length,
    porPie,
    simetria: {
      tiempoContacto: indiceSimetria(porPie.izq.tiempoContactoMedio, porPie.der.tiempoContactoMedio),
      tiempoVuelo: indiceSimetria(porPie.izq.tiempoVueloMedio, porPie.der.tiempoVueloMedio),
      anguloRodillaMin: indiceSimetria(porPie.izq.anguloRodillaMinMedio, porPie.der.anguloRodillaMinMedio),
      alturaRodillaMax: indiceSimetria(porPie.izq.alturaRodillaMaxMedia, porPie.der.alturaRodillaMaxMedia),
    },
    femurVariacion: fem.variacion,
    femurConfiable,
    resolucionTemporalS: dt,
    cuadrosTotales: n,
    cuadrosInutilizablesPct: pctInutiles,
  };

  return { perFrame, femurPx, direccion, eventos, porZancada, resumen, advertencias: adv };
}