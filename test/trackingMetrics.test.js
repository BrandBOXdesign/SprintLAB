// Pruebas de js/services/trackingMetrics.js con datos sinteticos generados aqui.
// Ejecutar: node --test test/trackingMetrics.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMetrics, DEFAULTS } from '../js/services/trackingMetrics.js';

const W = 1920;
const H = 1080;
const OPTS = { videoWidth: W, videoHeight: H };
const D2R = Math.PI / 180;

// ------------------------------------------------------------------ ayudas

function pt(xPx, yPx, extra = {}) {
  return { x: xPx / W, y: yPx / H, visibility: 1, interpolated: false, ...extra };
}

function rotar(v, grados) {
  const a = grados * D2R;
  return [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
}
function unit(v) { const d = Math.hypot(v[0], v[1]); return [v[0] / d, v[1] / d]; }
function suma(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
function esc(v, k) { return [v[0] * k, v[1] * k]; }

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }
  return o;
}

function sinNoFinitos(o, ruta = 'salida') {
  if (typeof o === 'number') {
    assert.ok(Number.isFinite(o), `${ruta} no es finito: ${o}`);
  } else if (Array.isArray(o)) {
    o.forEach((v, i) => sinNoFinitos(v, `${ruta}[${i}]`));
  } else if (o && typeof o === 'object') {
    for (const k of Object.keys(o)) sinNoFinitos(o[k], `${ruta}.${k}`);
  }
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Esqueleto estatico en pixeles con rodilla/cadera/codo conocidos.
 * Cadera: interior (tronco vs muslo) = `cadera`; sentido de avance +x (izq-der).
 * Se rota TODO `rot` grados para que ningun segmento quede alineado con los ejes
 * (asi la deformacion por no usar pixeles se nota).
 */
function esqueletoEstatico({ rodilla, cadera, codo }, rot = 25) {
  const Lt = 300, Lf = 200, Ls = 190, Lb = 150, Lan = 130;
  const hip = [0, 0];
  const sh = [0, -Lt];
  const F = (180 - cadera) * D2R;
  const kn = [Lf * Math.sin(F), Lf * Math.cos(F)];
  const an = suma(kn, esc(rotar(unit([hip[0] - kn[0], hip[1] - kn[1]]), rodilla), Ls));
  const el = [sh[0], sh[1] + Lb];
  const wr = suma(el, esc(rotar(unit([sh[0] - el[0], sh[1] - el[1]]), codo), Lan));
  const pts = {};
  for (let lado = 0; lado < 2; lado++) {
    const off = [lado * 12, 0];
    const colocar = v => suma(suma(rotar(v, rot), [900, 500]), off);
    const asigna = (idx, v) => { const p = colocar(v); pts[idx] = pt(p[0], p[1]); };
    asigna(11 + lado, sh); asigna(13 + lado, el); asigna(15 + lado, wr);
    asigna(23 + lado, hip); asigna(25 + lado, kn); asigna(27 + lado, an);
  }
  return pts;
}

function repetir(pts, n, dt = 0.02) {
  return Array.from({ length: n }, (_, i) => ({ t: i * dt, pts }));
}

/** Angulo que daria el calculo ingenuo (con coordenadas normalizadas, sin pasar a pixeles). */
function anguloIngenuo(c, a, b) {
  const ux = a.x - c.x, uy = a.y - c.y, vx = b.x - c.x, vy = b.y - c.y;
  return Math.atan2(Math.abs(ux * vy - uy * vx), ux * vx + uy * vy) / D2R;
}

// ------------------------------------------------------------------ 1. angulos conocidos

test('1. angulos conocidos (180/90/45) en video 1920x1080 con tolerancia 0.5 grados', () => {
  for (const ang of [180, 90, 45]) {
    const pts = esqueletoEstatico({ rodilla: ang, cadera: ang, codo: ang });
    const r = computeMetrics(repetir(pts, 12), { ...OPTS, direccion: 'izq-der' });
    for (const k of ['rodillaIzq', 'rodillaDer', 'caderaIzq', 'caderaDer', 'codoIzq', 'codoDer']) {
      const v = r.perFrame[6][k];
      assert.ok(v !== null && Math.abs(v - ang) < 0.5, `${k} esperado ${ang}, salio ${v}`);
      assert.equal(r.perFrame[6].confiable[k], true);
    }
    // Demostracion: SIN convertir a pixeles el error seria grande (salvo en 180, que es colineal).
    if (ang !== 180) {
      const naive = anguloIngenuo(pts[25], pts[23], pts[27]);
      assert.ok(Math.abs(naive - ang) > 3, `el calculo ingenuo deberia fallar (dio ${naive.toFixed(1)} para ${ang})`);
    }
  }
});

test('1b. la cadera distingue flexion (muslo adelante) de extension (muslo atras) segun el sentido', () => {
  // Tronco vertical, muslo a 30 grados hacia la derecha de la imagen.
  const mk = (xRod) => ({
    0: { t: 0, pts: {
      11: pt(900, 200), 23: pt(900, 500), 25: pt(900 + xRod, 500 + Math.sqrt(200 ** 2 - xRod ** 2)),
    } },
  });
  const xr = 200 * Math.sin(30 * D2R);
  const frames = [mk(xr)[0]];
  const izqDer = computeMetrics(frames, { ...OPTS, direccion: 'izq-der', suavizar: false });
  const derIzq = computeMetrics(frames, { ...OPTS, direccion: 'der-izq', suavizar: false });
  assert.ok(Math.abs(izqDer.perFrame[0].caderaIzq - 150) < 0.01, 'avanzando a la derecha: muslo adelante => 150 (flexion 30)');
  assert.ok(Math.abs(derIzq.perFrame[0].caderaIzq - 210) < 0.01, 'avanzando a la izquierda: el mismo muslo esta ATRAS => 210 (extension 30)');
});

// ------------------------------------------------------------------ 2. inclinacion de tronco

test('2. inclinacion de tronco 10/20/30 grados a ambos lados con deteccion automatica del sentido', () => {
  const Lt = 300;
  for (const sentido of [1, -1]) {
    for (const mag of [10, 20, 30]) {
      for (const signo of [1, -1]) {
        const inc = signo * mag; // + = inclinado hacia la DERECHA de la imagen
        const frames = [];
        for (let i = 0; i < 12; i++) {
          const hx = (sentido > 0 ? 300 : 1600) + sentido * i * 60;
          const hy = 600;
          const sx = hx + Lt * Math.sin(inc * D2R), sy = hy - Lt * Math.cos(inc * D2R);
          frames.push({ t: i * 0.02, pts: {
            11: pt(sx, sy), 12: pt(sx + 6, sy), 23: pt(hx, hy), 24: pt(hx + 6, hy),
          } });
        }
        const r = computeMetrics(frames, OPTS); // direccion 'auto'
        assert.equal(r.direccion, sentido > 0 ? 'izq-der' : 'der-izq');
        const esperado = sentido * inc; // + = hacia el sentido de avance
        const v = r.perFrame[6].troncoInclinacion;
        assert.ok(Math.abs(v - esperado) < 0.01, `sentido ${sentido}, inc ${inc}: esperado ${esperado}, salio ${v}`);
      }
    }
  }
});

// ------------------------------------------------------------------ 3. altura de rodilla

function framesAltura(escala = 1) {
  const L = 100 * escala;
  const poses = [[1, 0], [0, 1], [0, -1], [Math.SQRT1_2, Math.SQRT1_2]]; // (dx, dyArriba) en femures
  const frames = [];
  let i = 0;
  for (const [dx, dy] of poses) {
    for (let rep = 0; rep < 2; rep++) {
      const pts = {};
      for (let lado = 0; lado < 2; lado++) {
        const hx = 400 * escala + lado * 10, hy = 500 * escala;
        pts[23 + lado] = pt(hx, hy);
        pts[25 + lado] = pt(hx + dx * L, hy - dy * L);
      }
      frames.push({ t: i++ * 0.02, pts });
    }
  }
  return frames;
}

// (el esqueleto x2 sale un poco del cuadro 1080 px: se amplia el margen solo en esta prueba)
test('3. altura de rodilla normalizada: 0 a la altura de la cadera, 1 un femur arriba, invariante al zoom', () => {
  const r1 = computeMetrics(framesAltura(1), { ...OPTS, suavizar: false, margenFueraDeCuadro: 0.5 });
  const r2 = computeMetrics(framesAltura(2), { ...OPTS, suavizar: false, margenFueraDeCuadro: 0.5 });
  const esperado = [0, 0, 1, 1, -1, -1, Math.SQRT1_2, Math.SQRT1_2];
  assert.ok(Math.abs(r1.femurPx - 100) < 1e-6);
  assert.ok(Math.abs(r2.femurPx - 200) < 1e-6, 'el femur en px se duplica con el zoom x2');
  esperado.forEach((e, i) => {
    assert.ok(Math.abs(r1.perFrame[i].alturaRodillaIzq - e) < 1e-9, `cuadro ${i}: ${r1.perFrame[i].alturaRodillaIzq} != ${e}`);
    assert.ok(Math.abs(r1.perFrame[i].alturaRodillaDer - e) < 1e-9);
    assert.ok(Math.abs(r2.perFrame[i].alturaRodillaIzq - r1.perFrame[i].alturaRodillaIzq) < 1e-9, 'misma altura con el esqueleto x2');
    assert.equal(r1.perFrame[i].confiable.alturaRodillaIzq, true);
  });
});

test('3b. si el femur proyectado varia mas que el umbral, la altura es no confiable', () => {
  const frames = [];
  for (let i = 0; i < 40; i++) {
    const L = 80 + (i / 39) * 60; // femur de 80 a 140 px (~ +-27 %)
    frames.push({ t: i * 0.02, pts: { 23: pt(500, 500), 25: pt(500 + L, 500), 24: pt(510, 500), 26: pt(510 + L, 500) } });
  }
  const r = computeMetrics(frames, OPTS);
  assert.equal(r.resumen.femurConfiable, false);
  assert.ok(r.resumen.femurVariacion > DEFAULTS.maxVariacionFemur);
  assert.equal(r.perFrame[10].confiable.alturaRodillaIzq, false);
  assert.ok(r.advertencias.some(a => a.includes('femur proyectado varia')));
  // con un umbral permisivo vuelve a ser confiable
  const r2 = computeMetrics(frames, { ...OPTS, maxVariacionFemur: 0.6 });
  assert.equal(r2.perFrame[10].confiable.alturaRodillaIzq, true);
});

// ------------------------------------------------------------------ 4. corredor sintetico

/**
 * Corredor sintetico de perfil. Pie (punto mas bajo) relativo a la cadera:
 *  - apoyo (fraccion s del ciclo): el pie retrocede a velocidad constante (queda fijo en el suelo), a altura D;
 *  - vuelo del pie: medio seno hacia delante y hacia arriba.
 * Rodilla por cinematica inversa de 2 segmentos (femur L, pierna 0.95 L), rodilla hacia delante.
 * camara 'fija': la cadera avanza por la imagen. 'sigue': la cadera queda quieta en la imagen.
 */
function corredorSintetico({ camara = 'fija', f = 1, dur = 2.78, fs = 50, L = 60, pasosPorSeg = 4.5, faltantes = 0, semilla = 1 } = {}) {
  const Tc = 2 / pasosPorSeg;
  const s = 0.225;
  const a = 0.5 * L;
  const D = 1.8 * L;
  const Hc = 0.9 * L;
  const L2 = 0.95 * L;
  const V = (2 * a) / (s * Tc);
  const x0 = f > 0 ? 100 : 1800;
  const t0Pie = [0.15 + Tc / 2, 0.15]; // [izq, der]: primer contacto de cada pie
  const rnd = mulberry32(semilla);
  const frames = [];
  const verdad = { contactos: [], despegues: [] };
  for (let i = 0; i * (1 / fs) <= dur + 1e-9; i++) {
    const t = i / fs;
    const hx = camara === 'fija' ? x0 + f * V * t : 960;
    const hy = 500;
    const pts = {};
    const cadera = [[hx - 4 * f, hy], [hx + 4 * f, hy]];
    pts[23] = pt(...cadera[0]); pts[24] = pt(...cadera[1]);
    const Ltr = 120;
    const hs = [hx + f * Ltr * Math.sin(5 * D2R), hy - Ltr * Math.cos(5 * D2R)];
    pts[11] = pt(hs[0] - 3 * f, hs[1]); pts[12] = pt(hs[0] + 3 * f, hs[1]);
    for (let lado = 0; lado < 2; lado++) {
      const p = ((((t - t0Pie[lado]) / Tc) % 1) + 1) % 1;
      let rx, ry;
      if (p < s) { const u = p / s; rx = a * (1 - 2 * u); ry = D; }
      else { const u = (p - s) / (1 - s); rx = -a + 2 * a * (1 - Math.cos(Math.PI * u)) / 2; ry = D - Hc * Math.sin(Math.PI * u); }
      const pie = [hx + f * rx, hy + ry];
      const tobillo = [pie[0] - f * 0.25 * L, pie[1] - 0.10 * L];
      const talon = [tobillo[0] - f * 0.10 * L, tobillo[1] + 0.04 * L];
      const h = cadera[lado];
      let dx = tobillo[0] - h[0], dy = tobillo[1] - h[1];
      let d = Math.hypot(dx, dy);
      d = Math.min(d, 0.999 * (L + L2));
      const u = [dx / Math.hypot(dx, dy), dy / Math.hypot(dx, dy)];
      const alfa = Math.acos(Math.max(-1, Math.min(1, (L * L + d * d - L2 * L2) / (2 * L * d))));
      const c1 = suma(h, esc(rotar(u, alfa / D2R), L));
      const c2 = suma(h, esc(rotar(u, -alfa / D2R), L));
      const rodilla = (c1[0] - h[0]) * f > (c2[0] - h[0]) * f ? c1 : c2;
      pts[25 + lado] = pt(...rodilla);
      pts[27 + lado] = pt(...tobillo);
      pts[29 + lado] = pt(...talon);
      pts[31 + lado] = pt(...pie);
    }
    if (faltantes > 0) {
      for (const k of Object.keys(pts)) if (rnd() < faltantes) delete pts[k];
    }
    frames.push({ t, pts });
  }
  for (let lado = 0; lado < 2; lado++) {
    for (let tc = t0Pie[lado]; tc <= dur; tc += Tc) {
      if (tc >= 0) { verdad.contactos.push({ pie: lado === 0 ? 'izq' : 'der', t: tc }); }
    }
  }
  return { frames, verdad, Tc, contactoReal: s * Tc, pasosPorSeg };
}

for (const camara of ['fija', 'sigue']) {
  for (const f of [1, -1]) {
    test(`4. corredor sintetico, camara ${camara}, avance ${f > 0 ? 'izq-der' : 'der-izq'}: contactos y cadencia`, () => {
      const g = corredorSintetico({ camara, f });
      const r = computeMetrics(g.frames, OPTS);
      assert.equal(r.direccion, f > 0 ? 'izq-der' : 'der-izq');
      const contactos = r.eventos.filter(e => e.tipo === 'contacto');
      assert.ok(Math.abs(contactos.length - g.verdad.contactos.length) <= 1,
        `contactos ${contactos.length} vs ${g.verdad.contactos.length}`);
      for (const pie of ['izq', 'der']) {
        const nPie = contactos.filter(e => e.pie === pie).length;
        assert.ok(Math.abs(nPie - 6) <= 1, `pie ${pie}: ${nPie} contactos`);
      }
      assert.ok(Math.abs(r.resumen.cadenciaPasosPorSeg - g.pasosPorSeg) / g.pasosPorSeg < 0.05,
        `cadencia ${r.resumen.cadenciaPasosPorSeg}`);
      // Cada contacto detectado cae cerca de uno real (<= 2 cuadros).
      for (const c of contactos) {
        const cercano = Math.min(...g.verdad.contactos.filter(v => v.pie === c.pie).map(v => Math.abs(v.t - c.t)));
        assert.ok(cercano <= 0.04, `contacto ${c.pie} en ${c.t.toFixed(3)} s a ${cercano.toFixed(3)} s del real`);
      }
      // Tiempo de contacto: el umbral lo SOBREestima algo porque el pie sintetico sube suavemente (ver supuestos).
      assert.ok(r.resumen.tiempoContactoMedio > g.contactoReal - 0.02 && r.resumen.tiempoContactoMedio < g.contactoReal + 0.07,
        `tiempo de contacto medio ${r.resumen.tiempoContactoMedio} (real ${g.contactoReal})`);
      assert.ok(r.resumen.tiempoVueloMedio > 0.05 && r.resumen.tiempoVueloMedio < 0.2, `vuelo ${r.resumen.tiempoVueloMedio}`);
      assert.ok(Math.abs(r.resumen.simetria.tiempoContacto) < 10, 'corredor simetrico => indice cercano a 0');
      sinNoFinitos(r);
    });
  }
}

test('4b. el suavizado SG no aplana picos ni retrasa (angulo de rodilla sinusoidal a 4.5 Hz, 50 Hz)', () => {
  const frames = [];
  for (let i = 0; i < 150; i++) {
    const t = i * 0.02;
    const kappa = 110 + 50 * Math.sin(2 * Math.PI * 4.5 * t);
    const hip = [0, 0], kn = [0, 200];
    const an = suma(kn, esc(rotar([0, -1], kappa), 190));
    frames.push({ t, pts: { 23: pt(900 + hip[0], 400 + hip[1]), 25: pt(900 + kn[0], 400 + kn[1]), 27: pt(900 + an[0], 400 + an[1]) } });
  }
  const crudo = computeMetrics(frames, { ...OPTS, suavizar: false }).perFrame.map(p => p.rodillaIzq);
  const suave = computeMetrics(frames, OPTS).perFrame.map(p => p.rodillaIzq);
  const rango = a => Math.max(...a) - Math.min(...a);
  assert.ok(rango(suave) / rango(crudo) > 0.97, `se conserva ${(100 * rango(suave) / rango(crudo)).toFixed(1)} % de la amplitud`);
  let maxDesfase = 0;
  for (let i = 10; i < 140; i++) maxDesfase = Math.max(maxDesfase, Math.abs(suave[i] - crudo[i]));
  assert.ok(maxDesfase < 3, `desviacion maxima respecto al crudo ${maxDesfase.toFixed(2)} grados`);
  // sin retraso: el pico del suavizado coincide con el crudo en +-0 cuadros
  const pico = a => a.indexOf(Math.max(...a.slice(10, 140)), 10);
  assert.equal(pico(suave), pico(crudo));
});

// ------------------------------------------------------------------ 5. puntos ausentes

test('5. 20 % de puntos ausentes: null en esos cuadros, sin NaN, sin excepciones', () => {
  const g = corredorSintetico({ camara: 'fija', f: 1, faltantes: 0.2, semilla: 7 });
  let r;
  assert.doesNotThrow(() => { r = computeMetrics(g.frames, OPTS); });
  sinNoFinitos(r);
  assert.ok(r.femurPx > 0);
  let nulos = 0;
  g.frames.forEach((fr, i) => {
    const p = r.perFrame[i];
    for (let lado = 0; lado < 2; lado++) {
      const L = lado === 0 ? 'Izq' : 'Der';
      const tiene = idx => !!fr.pts[idx];
      const okRod = tiene(23 + lado) && tiene(25 + lado) && tiene(27 + lado);
      const okCad = tiene(11 + lado) && tiene(23 + lado) && tiene(25 + lado);
      const okAlt = tiene(23 + lado) && tiene(25 + lado);
      assert.equal(p['rodilla' + L] !== null, okRod, `rodilla${L} cuadro ${i}`);
      assert.equal(p.confiable['rodilla' + L], okRod);
      assert.equal(p['cadera' + L] !== null, okCad, `cadera${L} cuadro ${i}`);
      assert.equal(p['alturaRodilla' + L] !== null, okAlt, `altura${L} cuadro ${i}`);
      assert.equal(p['codo' + L], null, 'no hay codos/munecas en el sintetico');
      if (!okRod) nulos++;
    }
    const okTronco = (fr.pts[11] && fr.pts[23]) || (fr.pts[12] && fr.pts[24]);
    assert.equal(p.troncoInclinacion !== null, !!okTronco, `tronco cuadro ${i}`);
  });
  assert.ok(nulos > 10, 'la prueba debe tener cuadros sin dato');
  assert.ok(r.advertencias.some(a => a.includes('por metrica')), 'debe resumir los cuadros sin dato');
});

test('5b. puntos interpolated:true se tratan como ausentes', () => {
  const pts = esqueletoEstatico({ rodilla: 90, cadera: 90, codo: 90 });
  pts[25] = { ...pts[25], interpolated: true };
  const r = computeMetrics(repetir(pts, 5), OPTS);
  assert.equal(r.perFrame[2].rodillaIzq, null);
  assert.equal(r.perFrame[2].confiable.rodillaIzq, false);
  assert.ok(r.perFrame[2].rodillaDer !== null);
  const r2 = computeMetrics(repetir(pts, 5), { ...OPTS, permitirInterpolados: true });
  assert.ok(r2.perFrame[2].rodillaIzq !== null);
});

// ------------------------------------------------------------------ 6. degenerados

test('6. entradas degeneradas: muslo de longitud cero, un cuadro, arreglo vacio, basura', () => {
  // muslo de longitud cero
  const cero = { 11: pt(900, 200), 23: pt(900, 500), 25: pt(900, 500), 27: pt(900, 700), 24: pt(900, 500), 26: pt(900, 500) };
  let r = computeMetrics(repetir(cero, 5), OPTS);
  sinNoFinitos(r);
  assert.equal(r.perFrame[2].rodillaIzq, null);
  assert.equal(r.perFrame[2].caderaIzq, null);
  assert.equal(r.femurPx, null);
  assert.equal(r.perFrame[2].alturaRodillaIzq, null);

  // un solo cuadro
  r = computeMetrics([{ t: 0, pts: esqueletoEstatico({ rodilla: 120, cadera: 120, codo: 120 }) }], OPTS);
  sinNoFinitos(r);
  assert.equal(r.perFrame.length, 1);
  assert.deepEqual(r.eventos, []);

  // arreglo vacio
  r = computeMetrics([], OPTS);
  sinNoFinitos(r);
  assert.deepEqual(r.perFrame, []);
  assert.equal(r.femurPx, null);
  assert.equal(r.resumen.cadenciaPasosPorSeg, null);
  assert.ok(r.advertencias.length >= 1);

  // basura: NaN, visibilidad NaN, sin pts, pts vacio, coordenadas fuera de rango
  const basura = [
    { t: 0 },
    { t: 0.02, pts: {} },
    { t: 0.04, pts: { 23: { x: NaN, y: 0.5, visibility: 1 }, 25: { x: 0.5, y: 0.5, visibility: NaN }, 27: { x: Infinity, y: 0, visibility: 1 } } },
    { t: 0.06, pts: { 23: { x: 5, y: -3, visibility: 1 }, 25: { x: 5, y: -3, visibility: 1 }, 27: { x: 5, y: -3, visibility: 1 } } },
  ];
  assert.doesNotThrow(() => { r = computeMetrics(basura, OPTS); });
  sinNoFinitos(r);

  // opciones invalidas: error claro en vez de resultados sin sentido
  assert.throws(() => computeMetrics([], {}), RangeError);
  assert.throws(() => computeMetrics(null, OPTS), TypeError);
});

// ------------------------------------------------------------------ 7. no muta la entrada

test('7. no muta la entrada (entrada congelada + comparacion con copia)', () => {
  const g = corredorSintetico({ camara: 'fija', f: 1 });
  const copia = structuredClone(g.frames);
  deepFreeze(g.frames);
  const opts = deepFreeze({ ...OPTS, direccion: 'auto' });
  assert.doesNotThrow(() => computeMetrics(g.frames, opts));
  assert.deepEqual(g.frames, copia);
  // y la salida no comparte referencias con la entrada
  const r = computeMetrics(copia, OPTS);
  r.perFrame[0].t = -1;
  assert.notEqual(copia[0].t, -1);
});

// ------------------------------------------------------------------ rendimiento

test('rendimiento: 750 cuadros << 100 ms', () => {
  const g = corredorSintetico({ camara: 'sigue', f: 1, dur: 14.98 });
  assert.equal(g.frames.length, 750);
  computeMetrics(g.frames, OPTS); // calentamiento del JIT
  const t0 = performance.now();
  const r = computeMetrics(g.frames, OPTS);
  const ms = performance.now() - t0;
  console.log(`   750 cuadros: ${ms.toFixed(1)} ms`);
  assert.ok(ms < 100, `tardo ${ms.toFixed(1)} ms`);
  assert.ok(r.eventos.length > 50);
});
// ---- Pruebas añadidas tras la revision cruzada (GPT) ----

test('8. los angulos de rodilla suavizados permanecen entre 0 y 180 grados', () => {
  const W = 1920, H = 1080;
  const pt = (x, y) => ({ x: x / W, y: y / H, visibility: 1 });
  const frames = [];
  for (let i = 0; i < 20; i++) {
    const rad = (i < 10 ? 5 : 175) * Math.PI / 180;
    frames.push({ t: i * 0.02, pts: { 23: pt(500, 400), 25: pt(500, 500), 27: pt(500 + 100 * Math.sin(rad), 500 - 100 * Math.cos(rad)) } });
  }
  const r = computeMetrics(frames, { videoWidth: W, videoHeight: H, direccion: 'izq-der' });
  for (const f of r.perFrame) {
    if (f.rodillaIzq !== null) assert.ok(f.rodillaIzq >= 0 && f.rodillaIzq <= 180, `Angulo imposible: ${f.rodillaIzq}`);
  }
});

test('9. rechaza puntos muy fuera del cuadro normalizado', () => {
  const frames = Array.from({ length: 5 }, (_, i) => ({ t: i * 0.02, pts: {
    23: { x: 5, y: 0.3, visibility: 1 }, 25: { x: 5, y: 0.5, visibility: 1 }, 27: { x: 5, y: 0.7, visibility: 1 } } }));
  const r = computeMetrics(frames, { videoWidth: 1920, videoHeight: 1080, direccion: 'izq-der' });
  assert.equal(r.femurPx, null);
  assert.equal(r.perFrame[2].rodillaIzq, null);
});

test('10. rechaza configuracion de suavizado invalida', () => {
  const base = { videoWidth: 1920, videoHeight: 1080 };
  assert.throws(() => computeMetrics([], { ...base, sgOrden: NaN }), RangeError);
  assert.throws(() => computeMetrics([], { ...base, sgVentana: 0 }), RangeError);
});
