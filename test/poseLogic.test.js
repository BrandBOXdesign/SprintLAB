// Tests de la logica PURA de analisis de pose (sin DOM/video/MediaPipe --
// eso vive en poseDetection.js y no se puede probar sin un navegador real).
// Corre con: node --test  (test runner nativo de Node, no requiere instalar nada)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  countContacts, fillGapsWithMotionInterpolation, rejectImplausibleDetections, smooth3,
} from '../js/services/poseLogic.js';

test('smooth3: promedia con vecinos, sostiene los bordes contra si mismos', () => {
  assert.deepEqual(smooth3([1, 1, 1]), [1, 1, 1]);
  // [0,3,0] -> centro = (0+3+0)/3 = 1; bordes: (0+0+3)/3=1, (3+0+0)/3=1
  assert.deepEqual(smooth3([0, 3, 0]), [1, 1, 1]);
});

test('countContacts: cuenta picos locales por encima del promedio, con separacion minima', () => {
  // patron sintetico de "pie tocando el suelo" 3 veces: Y alto = pie abajo (apoyado)
  const samples = [
    { t: 0.00, y: 0.5 }, { t: 0.05, y: 0.5 }, { t: 0.10, y: 0.9 }, { t: 0.15, y: 0.5 }, { t: 0.20, y: 0.5 },
    { t: 0.25, y: 0.5 }, { t: 0.30, y: 0.9 }, { t: 0.35, y: 0.5 }, { t: 0.40, y: 0.5 },
    { t: 0.45, y: 0.5 }, { t: 0.50, y: 0.9 }, { t: 0.55, y: 0.5 },
  ];
  assert.equal(countContacts(samples), 3);
});

test('countContacts: dos picos demasiado cerca en tiempo cuentan como uno solo', () => {
  const samples = [
    { t: 0.00, y: 0.5 }, { t: 0.02, y: 0.9 }, { t: 0.04, y: 0.5 }, { t: 0.06, y: 0.9 }, { t: 0.08, y: 0.5 },
  ]; // dos picos a solo 40ms -- por debajo de MIN_CONTACT_GAP_MS (150ms)
  assert.equal(countContacts(samples), 1);
});

test('countContacts: con menos de 3 muestras siempre da 0 (no hay suficiente info)', () => {
  assert.equal(countContacts([{ t: 0, y: 0.9 }]), 0);
  assert.equal(countContacts([]), 0);
});

test('rejectImplausibleDetections: descarta un salto-y-vuelta (confusion de extremidad tipica)', () => {
  const idx = 15; // muñeca, por ejemplo
  const frames = [
    { t: 0.00, pts: { [idx]: { x: 0.30, y: 0.30 } } },
    { t: 0.02, pts: { [idx]: { x: 0.31, y: 0.30 } } },
    { t: 0.04, pts: { [idx]: { x: 0.90, y: 0.90 } } }, // glitch: salta lejos y "vuelve" despues
    { t: 0.06, pts: { [idx]: { x: 0.32, y: 0.30 } } },
    { t: 0.08, pts: { [idx]: { x: 0.33, y: 0.30 } } },
  ];
  rejectImplausibleDetections(frames, [idx]);
  assert.equal(frames[2].pts[idx], undefined, 'el punto con el salto debe quedar borrado (hueco)');
  assert.ok(frames[0].pts[idx] && frames[1].pts[idx] && frames[3].pts[idx] && frames[4].pts[idx], 'los puntos normales no deben tocarse');
});

test('rejectImplausibleDetections: NO descarta movimiento real, aunque sea rapido, si es consistente con la trayectoria', () => {
  const idx = 15;
  // movimiento lineal rapido y consistente -- no deberia dispararse el filtro
  const frames = Array.from({ length: 10 }, (_, i) => ({ t: i * 0.02, pts: { [idx]: { x: 0.1 + i * 0.05, y: 0.5 } } }));
  rejectImplausibleDetections(frames, [idx]);
  for (const f of frames) assert.ok(f.pts[idx], `no deberia haberse borrado ningun punto de un movimiento lineal consistente (t=${f.t})`);
});

test('rejectImplausibleDetections: un punto casi estatico (jitter minimo) no se toca', () => {
  const idx = 11;
  const frames = [
    { t: 0.00, pts: { [idx]: { x: 0.500, y: 0.500 } } },
    { t: 0.02, pts: { [idx]: { x: 0.502, y: 0.499 } } },
    { t: 0.04, pts: { [idx]: { x: 0.499, y: 0.501 } } },
    { t: 0.06, pts: { [idx]: { x: 0.501, y: 0.500 } } },
  ];
  rejectImplausibleDetections(frames, [idx]);
  for (const f of frames) assert.ok(f.pts[idx], 'jitter minimo no debe dispararse como implausible');
});

test('fillGapsWithMotionInterpolation: rellena un hueco corto con una linea recta proporcional al tiempo', () => {
  const idx = 27;
  const frames = [
    { t: 0.0, pts: { [idx]: { x: 0.0, y: 0.0, visibility: 1 } } },
    { t: 0.1, pts: {} },
    { t: 0.2, pts: {} },
    { t: 0.3, pts: {} },
    { t: 0.4, pts: { [idx]: { x: 0.4, y: 0.0, visibility: 1 } } },
  ];
  fillGapsWithMotionInterpolation(frames, [idx]);
  assert.ok(Math.abs(frames[1].pts[idx].x - 0.1) < 1e-9, `esperado x~0.1, dio ${frames[1].pts[idx].x}`);
  assert.ok(Math.abs(frames[2].pts[idx].x - 0.2) < 1e-9, `esperado x~0.2, dio ${frames[2].pts[idx].x}`);
  assert.ok(Math.abs(frames[3].pts[idx].x - 0.3) < 1e-9, `esperado x~0.3, dio ${frames[3].pts[idx].x}`);
});

test('fillGapsWithMotionInterpolation: NO rellena huecos mas largos que MAX_GAP_SECONDS (0.6s)', () => {
  const idx = 27;
  const frames = [
    { t: 0.0, pts: { [idx]: { x: 0.0, y: 0.0, visibility: 1 } } },
    { t: 0.3, pts: {} },
    { t: 0.6, pts: {} },
    { t: 0.9, pts: { [idx]: { x: 0.9, y: 0.0, visibility: 1 } } }, // hueco total de 0.9s > 0.6s
  ];
  fillGapsWithMotionInterpolation(frames, [idx]);
  assert.equal(frames[1].pts[idx], undefined, 'un hueco de 0.9s no deberia rellenarse');
  assert.equal(frames[2].pts[idx], undefined, 'un hueco de 0.9s no deberia rellenarse');
});

test('fillGapsWithMotionInterpolation: un punto que nunca se detecto se queda sin rellenar (no hay "antes" del cual partir)', () => {
  const idx = 27;
  const frames = [{ t: 0.0, pts: {} }, { t: 0.1, pts: {} }, { t: 0.2, pts: {} }];
  fillGapsWithMotionInterpolation(frames, [idx]);
  for (const f of frames) assert.equal(f.pts[idx], undefined);
});
