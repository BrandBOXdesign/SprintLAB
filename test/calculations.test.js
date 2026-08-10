// Tests de las formulas de calculations.js -- logica pura, sin DOM, nunca
// antes probada automaticamente. Corre con: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  acuteChronicRatio, avg1RM, brzycki1RM, calcVelocity, epley1RM,
  estimatePower, estimateVelocity, ratioStatus,
} from '../js/utils/calculations.js';

test('epley1RM: formula w*(1+r/30)', () => {
  assert.equal(epley1RM(100, 5), 100 * (1 + 5 / 30));
  assert.equal(epley1RM(0, 5), null, 'peso 0 debe dar null (falsy guard)');
  assert.equal(epley1RM(100, 0), null, 'repeticiones 0 debe dar null (falsy guard)');
});

test('brzycki1RM: formula w/(1.0278-0.0278*r), invalida desde r=37', () => {
  const expected = 100 / (1.0278 - 0.0278 * 5);
  assert.ok(Math.abs(brzycki1RM(100, 5) - expected) < 1e-9);
  assert.equal(brzycki1RM(100, 37), null, 'r=37 es el limite documentado -- debe dar null, no un numero negativo sin sentido');
  assert.equal(brzycki1RM(100, 40), null);
});

test('avg1RM: promedia epley y brzycki cuando ambos existen', () => {
  const e = epley1RM(100, 5), b = brzycki1RM(100, 5);
  assert.ok(Math.abs(avg1RM(100, 5) - (e + b) / 2) < 1e-9);
});

test('avg1RM: si uno de los dos es null (ej. r>=37), usa el que si exista en vez de null', () => {
  const e = epley1RM(100, 37); // brzycki da null en r=37, epley no
  assert.equal(avg1RM(100, 37), e);
});

test('estimateVelocity: formula 1.67 - 1.10*(weight/rm), clamped [0.3, 1.2]', () => {
  assert.ok(Math.abs(estimateVelocity(80, 100) - (1.67 - 1.10 * 0.8)) < 1e-9);
  assert.equal(estimateVelocity(10, 100), 1.2, 'porcentaje muy bajo debe quedar clampeado al techo 1.2');
  assert.equal(estimateVelocity(100, 100), 1.67 - 1.10 * 1, 'al 100% del RM, sin clamp todavia (da 0.57)');
});

test('estimateVelocity: peso mayor al RM (percent>1) no tiene sentido fisico -- debe dar null, no un numero negativo', () => {
  assert.equal(estimateVelocity(110, 100), null);
});

test('estimateVelocity: guardas contra division por cero / valores faltantes', () => {
  assert.equal(estimateVelocity(80, 0), null);
  assert.equal(estimateVelocity(0, 100), null);
  assert.equal(estimateVelocity(80, null), null);
});

test('estimatePower: formula weight * 9.81 * velocity', () => {
  assert.ok(Math.abs(estimatePower(80, 0.8) - 80 * 9.81 * 0.8) < 1e-9);
  assert.equal(estimatePower(0, 0.8), null);
});

test('calcVelocity: distancia/tiempo, con guardas', () => {
  assert.equal(calcVelocity(100, 20), 5);
  assert.equal(calcVelocity(100, 0), null, 'tiempo cero debe dar null, no Infinity');
  assert.equal(calcVelocity(100, -5), null, 'tiempo negativo no tiene sentido -- debe dar null');
  assert.equal(calcVelocity(0, 20), null);
});

test('ratioStatus: clasifica el ratio agudo:cronico en las 4 zonas documentadas', () => {
  assert.equal(ratioStatus(null).label, 'Sin datos');
  assert.equal(ratioStatus(0.5).label, 'Carga baja');
  assert.equal(ratioStatus(1.0).label, 'Zona óptima');
  assert.equal(ratioStatus(1.3).label, 'Zona óptima', 'el limite 1.3 es inclusive segun el codigo (<=1.3)');
  assert.equal(ratioStatus(1.31).label, 'Riesgo moderado');
  assert.equal(ratioStatus(1.5).label, 'Riesgo moderado', 'el limite 1.5 es inclusive segun el codigo (<=1.5)');
  assert.equal(ratioStatus(1.51).label, 'Riesgo alto');
});

test('acuteChronicRatio: sin sesiones da null', () => {
  assert.equal(acuteChronicRatio([]), null);
});

test('acuteChronicRatio: calcula carga aguda (7 dias) contra cronica (28 dias / 4)', () => {
  const asOf = new Date('2026-07-28T12:00:00');
  const daysAgo = n => new Date(asOf - n * 86400000).toISOString();
  const sessions = [
    { date: daysAgo(2), rpe: 6, durationMin: 60 },  // dentro de agudo (7d) Y cronico (28d)
    { date: daysAgo(5), rpe: 7, durationMin: 45 },  // dentro de agudo Y cronico
    { date: daysAgo(20), rpe: 5, durationMin: 50 }, // solo dentro de cronico
  ];
  const acuteLoad = 6 * 60 + 7 * 45; // 360 + 315 = 675
  const chronicLoad = (6 * 60 + 7 * 45 + 5 * 50) / 4; // (360+315+250)/4 = 231.25
  const expected = acuteLoad / chronicLoad;
  const got = acuteChronicRatio(sessions, asOf);
  assert.ok(Math.abs(got - expected) < 1e-9, `esperado ${expected}, dio ${got}`);
});

test('acuteChronicRatio: si la carga cronica da 0, devuelve null en vez de Infinity/NaN', () => {
  const asOf = new Date('2026-07-28T12:00:00');
  const sessions = [{ date: asOf.toISOString(), rpe: 0, durationMin: 0 }];
  assert.equal(acuteChronicRatio(sessions, asOf), null);
});
