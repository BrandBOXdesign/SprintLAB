// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { VALIDATION_RULES } from './constants.js';

export function epley1RM(w, r) { if (!w || !r) return null; return w * (1 + r / 30); }

export function brzycki1RM(w, r) { if (!w || !r || r >= 37) return null; return w / (1.0278 - 0.0278 * r); }

export function avg1RM(w, r) { const e = epley1RM(w, r), b = brzycki1RM(w, r); if (e && b) return (e + b) / 2; return e || b || null; }

export function estimateVelocity(weight, rm) { if (!weight || !rm || rm <= 0) return null; const percent = weight / rm; if (percent > 1) return null; let vel = 1.67 - 1.10 * percent; if (vel < 0.3) vel = 0.3; if (vel > 1.2) vel = 1.2; return vel; }

export function estimatePower(weight, velocity) { if (!weight || !velocity) return null; return weight * 9.81 * velocity; }

export function acuteChronicRatio(sessions, asOfDate = new Date()) {
  if (!sessions.length) return null;
  const now = asOfDate;
  const d7 = new Date(now - 7 * 86400000);
  const d28 = new Date(now - 28 * 86400000);
  const acute = sessions.filter(s => new Date(s.date) >= d7 && new Date(s.date) <= now);
  const chronic = sessions.filter(s => new Date(s.date) >= d28 && new Date(s.date) <= now);
  const aLoad = acute.reduce((s, x) => s + (x.rpe || 0) * (x.durationMin || 0), 0);
  const cLoad = chronic.reduce((s, x) => s + (x.rpe || 0) * (x.durationMin || 0), 0) / 4;
  if (cLoad === 0) return null;
  return aLoad / cLoad;
}

export function ratioStatus(ratio) {
  if (ratio === null) return { label: 'Sin datos', color: '#3A3733' };
  if (ratio < 0.8) return { label: 'Carga baja', color: '#D9A441' };
  if (ratio <= 1.3) return { label: 'Zona óptima', color: '#5A8F5A' };
  if (ratio <= 1.5) return { label: 'Riesgo moderado', color: '#D9A441' };
  return { label: 'Riesgo alto', color: '#C8332A' };
}

export function calcVelocity(dist, time) { if (!dist || !time || time <= 0) return null; return dist / time; }

// ============================================================
//  Fase 4.3 — Sugerencia automática de carga
// ============================================================
/**
 * Sugiere volumen (minutos) e intensidad (RPE 1-10) para la proxima semana,
 * a partir del ratio agudo:cronico y el nivel del atleta. No aplica nada
 * directamente -- solo devuelve una recomendacion para que el entrenador
 * la revise, edite si quiere, y decida aplicarla o no.
 * @param {number|null} ratio - acuteChronicRatio(sessions)
 * @param {string} level - 'principiante'|'intermedio'|'avanzado'
 * @param {number} plannedVolumeThisWeek - getPlannedVolume(weeklyPlan)
 */
export function sugerirCarga(ratio, level, plannedVolumeThisWeek) {
  const base = plannedVolumeThisWeek || 60;
  const rpeCap = level === 'principiante' ? 7 : level === 'avanzado' ? 9 : 8;
  const rpeFloor = level === 'principiante' ? 3 : 2;

  if (ratio === null) {
    return {
      volumeMin: Math.round(base * 0.9), volumeMax: Math.round(base * 1.1),
      rpeTarget: Math.min(5, rpeCap),
      rationale: 'Aún no hay suficiente historial (menos de 28 días). Se recomienda mantener el volumen actual y seguir registrando sesiones.',
      confidence: 'baja',
    };
  }

  let volumeMin, volumeMax, rpeTarget, rationale, confidence;
  if (ratio < 0.8) {
    volumeMin = Math.round(base * 1.10); volumeMax = Math.round(base * 1.20);
    rpeTarget = Math.min(7, rpeCap);
    rationale = `Ratio de carga bajo (${ratio.toFixed(2)}) — el atleta podría estar desentrenando. Se sugiere aumentar el volumen semanal 10-20%.`;
    confidence = 'media';
  } else if (ratio <= 1.3) {
    volumeMin = Math.round(base * 0.95); volumeMax = Math.round(base * 1.05);
    rpeTarget = Math.min(6, rpeCap);
    rationale = `Ratio de carga en zona óptima (${ratio.toFixed(2)}) — se mantiene el volumen planificado con ajustes menores.`;
    confidence = 'alta';
  } else if (ratio <= 1.5) {
    volumeMin = Math.round(base * 0.85); volumeMax = Math.round(base * 0.90);
    rpeTarget = Math.max(rpeFloor, 4);
    rationale = `Ratio de carga en riesgo moderado (${ratio.toFixed(2)}) — se sugiere reducir el volumen semanal 10-15%.`;
    confidence = 'media';
  } else {
    volumeMin = Math.round(base * 0.70); volumeMax = Math.round(base * 0.80);
    rpeTarget = Math.max(rpeFloor, 4);
    rationale = `Ratio de carga alto (${ratio.toFixed(2)}) — riesgo elevado de lesión. Se recomienda reducir el volumen semanal 20-30% y bajar la intensidad.`;
    confidence = 'alta';
  }
  rpeTarget = Math.min(rpeCap, Math.max(rpeFloor, rpeTarget));
  return { volumeMin, volumeMax, rpeTarget, rationale, confidence };
}

// ============================================================
//  Fase 5.1 — TRIMP, monotony y strain (metodo Foster)
// ============================================================
/** TRIMP simplificado: duracion(min) * RPE de sesion (1-10). */
export function calcularTRIMP(session) {
  return (session.durationMin || 0) * (session.rpe || 0);
}

/**
 * Carga diaria total de los ultimos `days` dias (uno por dia, 0 si no hubo
 * sesion ese dia). Usa diferencia de fechas reales (no comparacion de
 * strings) porque session.date se guarda como datetime ISO completo, no
 * como 'YYYY-MM-DD' -- comparar strings directamente nunca coincidiria.
 */
export function getDailyLoads(sessions, days = 7) {
  const loads = new Array(days).fill(0);
  const now = new Date();
  for (const s of sessions) {
    const diffDays = Math.floor((now - new Date(s.date)) / 86400000);
    if (diffDays >= 0 && diffDays < days) {
      loads[days - 1 - diffDays] += calcularTRIMP(s);
    }
  }
  return loads;
}

/** Monotony (Foster): promedio de carga diaria / desviación estándar. */
export function calcularMonotony(sessions, days = 7) {
  const loads = getDailyLoads(sessions, days);
  const mean = loads.reduce((a, b) => a + b, 0) / days;
  if (mean === 0) return null;
  const variance = loads.reduce((sum, l) => sum + (l - mean) ** 2, 0) / days;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return null;
  return mean / stdDev;
}

/** Strain (Foster): carga total de la semana * monotony. */
export function calcularStrain(sessions, days = 7) {
  const monotony = calcularMonotony(sessions, days);
  if (monotony === null) return null;
  const total = getDailyLoads(sessions, days).reduce((a, b) => a + b, 0);
  return Math.round(total * monotony);
}

export function monotonyStatus(monotony) {
  if (monotony === null) return { label: 'Sin datos', color: '#3A3733' };
  if (monotony < 1.5) return { label: 'Normal', color: '#5A8F5A' };
  if (monotony <= 2.0) return { label: 'Elevada', color: '#D9A441' };
  return { label: 'Muy alta - riesgo', color: '#C8332A' };
}

// ============================================================
//  Fase 5.3 — Alertas predictivas
// ============================================================
/**
 * Proyecta si el ratio agudo:cronico va a superar 1.5 (riesgo alto, mismo
 * umbral que ratioStatus) en las proximas 2 semanas, usando una regresion
 * lineal sobre el historial de ratios semanales recientes. Reutiliza
 * acuteChronicRatio(sessions, fecha) en vez de recalcular sumas a mano, para
 * que un cambio futuro en esa formula se refleje aqui automaticamente.
 */
export function predictRatioTrend(sessions, weeks = 4) {
  if (!sessions || sessions.length < 5) return null;
  const weeklyRatios = [];
  const now = new Date();
  for (let i = weeks; i >= 0; i--) {
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() - i * 7);
    const ratio = acuteChronicRatio(sessions, endDate);
    if (ratio !== null) weeklyRatios.push(ratio);
  }
  if (weeklyRatios.length < 3) return null;

  const x = weeklyRatios.map((_, idx) => idx);
  const reg = linearRegression(x, weeklyRatios);
  if (!reg || reg.slope <= 0) return { willExceed: false, weeksUntil: null, projectedRatio: weeklyRatios[weeklyRatios.length - 1] };

  const todayX = weeklyRatios.length - 1; // "hoy" es el ultimo punto, no x=0
  const projectedRatio = reg.intercept + reg.slope * (todayX + 1);
  const crossX = (1.5 - reg.intercept) / reg.slope; // x donde la recta cruza 1.5
  const weeksFromToday = crossX - todayX;
  const willExceed = weeksFromToday >= 0 && weeksFromToday <= 2;

  return { willExceed, weeksUntil: willExceed ? Math.max(1, Math.ceil(weeksFromToday)) : null, projectedRatio };
}

// ============================================================
//  Fase 4.2 — Microciclos variables (plantilla semanal por fase)
// ============================================================
/**
 * Determina en que fase personalizada esta el atleta hoy, segun la fecha de
 * inicio de temporada y la duracion acumulada de las fases anteriores.
 * Devuelve null si la temporada aun no empieza (fecha futura) o si ya pasaron
 * todas las fases definidas.
 */
export function getCurrentPhase(seasonStart, customPhases, today = new Date()) {
  if (!seasonStart || !customPhases || customPhases.length === 0) return null;
  const start = new Date(seasonStart + 'T12:00:00');
  const daysSince = Math.floor((today - start) / 86400000);
  if (daysSince < 0) return null; // la temporada todavia no empieza

  let accumulatedWeeks = 0;
  for (const phase of customPhases) {
    const phaseWeeks = phase.unit === 'months' ? phase.duration * 4.345 : phase.duration;
    if (daysSince / 7 < accumulatedWeeks + phaseWeeks) {
      return { ...phase, currentWeekInPhase: Math.floor(daysSince / 7 - accumulatedWeeks) + 1 };
    }
    accumulatedWeeks += phaseWeeks;
  }
  return null; // ya paso la ultima fase definida
}

/**
 * Igual que calcMacroPosition() pero generico, para el macrociclo
 * "Personalizado" (Fase 4.1) en vez de los 2 modelos fijos con semanas
 * hardcodeadas. Calcula el total de semanas sumando la duracion de todas
 * las fases definidas por el entrenador.
 */
export function calcCustomMacroPosition(customPhases, seasonStart) {
  if (!seasonStart || !customPhases || customPhases.length === 0) return null;
  const start = new Date(seasonStart + 'T12:00:00');
  const now = new Date();
  if (now < start) return null;
  const daysSinceStart = Math.floor((now - start) / 86400000);
  const currentWeek = Math.floor(daysSinceStart / 7) + 1;

  const phaseWeeks = customPhases.map(p => p.unit === 'months' ? p.duration * 4.345 : p.duration);
  const totalWeeks = Math.round(phaseWeeks.reduce((a, b) => a + b, 0));
  const week = Math.min(currentWeek, totalWeeks || 1);

  let accumulated = 0, phaseName = customPhases[0] ? customPhases[0].name : 'Sin fases', weeksLeftInPhase = 0;
  for (let i = 0; i < customPhases.length; i++) {
    accumulated += phaseWeeks[i];
    if (week <= accumulated) {
      phaseName = customPhases[i].name;
      weeksLeftInPhase = Math.round(accumulated - week + 1);
      break;
    }
  }
  return { week, totalWeeks, phase: phaseName, weeksLeftInPhase, finished: currentWeek > totalWeeks };
}

// ---------- Modelos de macrociclo ----------

export function registrationGapDays(sessions) {
  if (!sessions.length) return null;
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastDate = new Date(sorted[0].date);
  const now = new Date();
  const diffDays = Math.floor((now - lastDate) / 86400000);
  return diffDays;
}

export function getBestTimes(sessions) {
  const trackS = sessions.filter(s => s.type === 'track');
  const with100 = trackS.filter(s => s.time100);
  const with200 = trackS.filter(s => s.time200);
  const best100 = with100.length ? Math.min(...with100.map(s => s.time100)) : null;
  const best200 = with200.length ? Math.min(...with200.map(s => s.time200)) : null;
  const last100 = [...with100].sort((a,b) => new Date(b.date)-new Date(a.date))[0];
  const last200 = [...with200].sort((a,b) => new Date(b.date)-new Date(a.date))[0];
  return { best100, best200, last100: last100?.time100 || null, last200: last200?.time200 || null };
}

export function getNextSession(weeklyPlan) {
  if (!weeklyPlan) return null;
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const now = new Date(); const todayIndex = now.getDay();
  for (let i = 0; i < 7; i++) {
    const dayIndex = (todayIndex + i) % 7;
    const dayName = days[dayIndex];
    const planDay = weeklyPlan.find(d => d.day === dayName);
    if (planDay && planDay.type !== 'rest') return { day: dayName, label: planDay.customLabel || planDay.label, type: planDay.type };
  }
  return null;
}

export function getAlerts(athlete, sessions, weeklyPlan) {
  const alerts = [];
  const ratio = acuteChronicRatio(sessions);
  const gap = registrationGapDays(sessions);
  const bestTimes = getBestTimes(sessions);
  const target100 = athlete?.target100 ? Number(athlete.target100) : null;
  if (ratio !== null) {
    if (ratio < 0.8) alerts.push({ level: 'yellow', msg: `Ratio AC bajo (${ratio.toFixed(2)}). Posible desentrenamiento.` });
    else if (ratio > 1.5) alerts.push({ level: 'red', msg: `Ratio AC alto (${ratio.toFixed(2)}). Riesgo de lesión.` });
    else alerts.push({ level: 'green', msg: `Ratio AC en zona óptima (${ratio.toFixed(2)}).` });
  } else alerts.push({ level: 'yellow', msg: 'Sin datos suficientes para calcular ratio AC.' });
  if (gap !== null && gap >= 3) alerts.push({ level: 'yellow', msg: `${gap} días sin registrar sesiones.` });
  else if (gap !== null) alerts.push({ level: 'green', msg: `Última sesión hace ${gap} días.` });
  else alerts.push({ level: 'yellow', msg: 'Aún no hay sesiones registradas.' });
  if (target100 && bestTimes.best100 !== null) {
    const diff = bestTimes.best100 - target100;
    if (diff > 0.1) alerts.push({ level: 'yellow', msg: `100m: a ${diff.toFixed(2)}s del objetivo (${target100}s).` });
    else if (diff <= 0) alerts.push({ level: 'green', msg: `100m: objetivo alcanzado (${bestTimes.best100}s).` });
    else alerts.push({ level: 'green', msg: `100m: a ${(-diff).toFixed(2)}s del objetivo.` });
  } else if (target100) alerts.push({ level: 'yellow', msg: '100m: sin tiempos registrados para comparar con objetivo.' });
  const next = getNextSession(weeklyPlan);
  if (next) alerts.push({ level: 'green', msg: `Próxima sesión: ${next.day} · ${next.label}` });
  else alerts.push({ level: 'yellow', msg: 'No hay plan semanal definido.' });
  const trend = predictRatioTrend(sessions);
  if (trend && trend.willExceed) {
    const msg = trend.weeksUntil
      ? `🚨 Proyección: si sigue esta tendencia, el ratio AC superará 1.5 en ~${trend.weeksUntil} semana(s).`
      : '🚨 Proyección: tendencia al alza en el ratio AC.';
    alerts.push({ level: 'yellow', msg });
  }
  return alerts;
}

export function getPlannedVolume(plan) { if (!plan) return 0; return plan.reduce((sum, day) => sum + (Number(day.plannedDuration) || 0), 0); }

export function getRealizedVolume(sessions) {
  const { start, end } = getWeekRange();
  const weekSessions = sessions.filter(s => { const d = new Date(s.date); return d >= start && d <= end; });
  return weekSessions.reduce((sum, s) => sum + (Number(s.durationMin) || 0), 0);
}

export function getVolumeStatus(planned, realized) {
  if (planned === 0) return { label: 'Sin plan', color: '#3A3733' };
  const ratio = realized / planned;
  if (ratio < 0.6) return { label: 'Muy bajo', color: '#D9A441' };
  if (ratio < 0.9) return { label: 'Bajo', color: '#D9A441' };
  if (ratio <= 1.1) return { label: 'Óptimo', color: '#5A8F5A' };
  if (ratio <= 1.3) return { label: 'Alto', color: '#D9A441' };
  return { label: 'Muy alto', color: '#C8332A' };
}

export function getWeekRange() {
  const now = new Date();
  const day = now.getDay() || 7;
  const diff = day - 1;
  const monday = new Date(now); monday.setDate(now.getDate() - diff); monday.setHours(0,0,0,0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
  return { start: monday, end: sunday };
}

export function getSeriesDataForDistance(sessions, dist) {
  const result = [];
  sessions.forEach(s => {
    const series = (s.trackSeries || []).filter(serie => serie.dist == dist && serie.time);
    if (series.length === 0) return;
    let bestV = 0, bestT = null;
    series.forEach(serie => { const v = calcVelocity(Number(dist), Number(serie.time)); if (v > bestV) { bestV = v; bestT = Number(serie.time); } });
    result.push({ date: s.date, velocity: bestV, time: bestT, count: series.length, series: series.map(serie => ({ time: Number(serie.time), velocity: calcVelocity(Number(dist), Number(serie.time)) })) });
  });
  result.sort((a, b) => new Date(a.date) - new Date(b.date));
  return result;
}

export function getFatigueIndicator(seriesData) {
  const result = [];
  seriesData.forEach(sd => {
    if (sd.series.length < 2) return;
    const first = sd.series[0].velocity, last = sd.series[sd.series.length - 1].velocity;
    if (first === 0 || last === 0) return;
    const drop = ((first - last) / first) * 100;
    result.push({ date: sd.date, dropPercent: drop, firstV: first, lastV: last });
  });
  return result;
}

export function getReactionData(sessions) {
  const data = [];
  sessions.forEach(s => { (s.trackSeries || []).forEach(serie => { if (serie.reactionTime != null && serie.reactionTime > 0) data.push({ date: s.date, value: Number(serie.reactionTime), dist: serie.dist }); }); });
  data.sort((a, b) => new Date(a.date) - new Date(b.date));
  return data;
}

export function getStartData(sessions) {
  const data = [];
  sessions.forEach(s => { (s.trackSeries || []).forEach(serie => { if (serie.startTime != null && serie.startTime > 0) data.push({ date: s.date, value: Number(serie.startTime), dist: serie.dist }); }); });
  data.sort((a, b) => new Date(a.date) - new Date(b.date));
  return data;
}

export function getBestReaction(sessions) {
  let best = Infinity; let bestSerie = null;
  sessions.forEach(s => { (s.trackSeries || []).forEach(serie => { if (serie.reactionTime != null && serie.reactionTime > 0 && serie.reactionTime < best) { best = Number(serie.reactionTime); bestSerie = serie; } }); });
  return best !== Infinity ? { time: best, serie: bestSerie } : null;
}

export function getBestStart(sessions) {
  let best = Infinity; let bestSerie = null;
  sessions.forEach(s => { (s.trackSeries || []).forEach(serie => { if (serie.startTime != null && serie.startTime > 0 && serie.startTime < best) { best = Number(serie.startTime); bestSerie = serie; } }); });
  return best !== Infinity ? { time: best, serie: bestSerie } : null;
}

export function getExercise1RMData(sessions, exerciseName) {
  const data = [];
  sessions.forEach(s => { if (s.type !== 'gym') return; (s.gymExercises || []).forEach(e => { if ((e.exercise || '').trim() === exerciseName && e.estimated1RM) data.push({ date: s.date, rm: Number(e.estimated1RM) }); }); });
  data.sort((a, b) => new Date(a.date) - new Date(b.date));
  return data;
}

export function getExercisePowerData(sessions, exerciseName) {
  const data = [];
  sessions.forEach(s => { if (s.type !== 'gym') return; (s.gymExercises || []).forEach(e => { if ((e.exercise || '').trim() === exerciseName && e.power) data.push({ date: s.date, power: Number(e.power), velocity: e.velocity ? Number(e.velocity) : null }); }); });
  data.sort((a, b) => new Date(a.date) - new Date(b.date));
  return data;
}

export function getWeeklyTonnage(sessions) {
  const weekMap = {};
  sessions.forEach(s => {
    if (s.type !== 'gym') return;
    const d = new Date(s.date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() + 1 - day);
    const weekKey = d.toISOString().slice(0, 10);
    if (!weekMap[weekKey]) weekMap[weekKey] = 0;
    (s.gymExercises || []).forEach(e => { weekMap[weekKey] += (Number(e.weight) || 0) * (Number(e.reps) || 0); });
  });
  const weeks = Object.keys(weekMap).sort();
  return weeks.map(w => ({ week: w, tonnage: weekMap[w] }));
}

export function getExerciseNames(sessions) {
  const names = new Set();
  sessions.forEach(s => { if (s.type !== 'gym') return; (s.gymExercises || []).forEach(e => { const name = (e.exercise || 'Ejercicio').trim(); if (name) names.add(name); }); });
  return Array.from(names).sort();
}

export function getBestSeriesForDistance(sessions, dist) {
  let bestVelocity = 0, bestTime = Infinity, bestSession = null;
  sessions.forEach(s => { (s.trackSeries || []).forEach(serie => { if (serie.dist == dist && serie.time) { const v = calcVelocity(Number(dist), Number(serie.time)); if (v > bestVelocity) { bestVelocity = v; bestTime = Number(serie.time); bestSession = s; } } }); });
  return { velocity: bestVelocity || null, time: bestTime !== Infinity ? bestTime : null, session: bestSession };
}

export function linearRegression(x, y) {
  const n = x.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) { sumX += x[i]; sumY += y[i]; sumXY += x[i] * y[i]; sumX2 += x[i] * x[i]; }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function predictWeeksToTarget(times, dates, target) {
  if (times.length < 2 || target === null || target === undefined) return null;
  const firstDate = new Date(dates[0]);
  const x = dates.map(d => Math.floor((new Date(d) - firstDate) / (86400000 * 7)));
  const y = times.map(t => Number(t));
  const reg = linearRegression(x, y);
  if (!reg) return null;
  if (reg.slope >= 0) return Infinity;
  const weeksNeeded = (target - reg.intercept) / reg.slope;
  if (weeksNeeded < 0) return 0;
  return weeksNeeded;
}

export function calcMacroPosition(model, seasonStart) {
  if (!seasonStart) return null;
  const start = new Date(seasonStart + 'T12:00:00');
  const now = new Date();
  if (now < start) return null;
  const daysSinceStart = Math.floor((now - start) / 86400000);
  const currentWeek = Math.floor(daysSinceStart / 7) + 1;
  if (model.id === 'annual') {
    const totalWeeks = 47;
    const week = Math.min(currentWeek, totalWeeks);
    let phase, weeksLeftInPhase, weeksInPhase;
    if (week <= 39) { phase = 'Carga sostenida'; weeksInPhase = 39; weeksLeftInPhase = 39 - week + 1; }
    else if (week <= 43) { phase = 'Descarga activa'; weeksInPhase = 4; weeksLeftInPhase = 43 - week + 1; }
    else { phase = 'Descanso activo'; weeksInPhase = 4; weeksLeftInPhase = 47 - week + 1; }
    return { week, totalWeeks, phase, weeksLeftInPhase, weeksInPhase, finished: currentWeek > totalWeeks };
  } else {
    const totalWeeks = 21;
    const week = Math.min(currentWeek, totalWeeks);
    let phase, weeksLeftInPhase;
    if (week <= 4)       { phase = 'Base/Acumulación'; weeksLeftInPhase = 4  - week + 1; }
    else if (week === 5) { phase = 'Descarga';         weeksLeftInPhase = 1; }
    else if (week <= 9)  { phase = 'Transformación';   weeksLeftInPhase = 9  - week + 1; }
    else if (week === 10){ phase = 'Descarga';         weeksLeftInPhase = 1; }
    else if (week <= 14) { phase = 'Realización';      weeksLeftInPhase = 14 - week + 1; }
    else if (week === 15){ phase = 'Descarga';         weeksLeftInPhase = 1; }
    else                 { phase = 'Tapering';         weeksLeftInPhase = 21 - week + 1; }
    return { week, totalWeeks, phase, weeksLeftInPhase, finished: currentWeek > totalWeeks };
  }
}

export function validateNum(value, ruleKey) {
  const rule = VALIDATION_RULES[ruleKey];
  if (!rule || value === '' || value === null || value === undefined) return { ok: true };
  const n = Number(value);
  if (isNaN(n)) return { ok: false, error: 'Valor no válido' };
  if (n < rule.min) return { ok: false, error: `Mínimo ${rule.min}` };
  if (n > rule.max) return { ok: false, error: `Máximo ${rule.max}` };
  if (rule.warnMax && n > rule.warnMax) return { ok: true, warn: `Valor inusualmente alto (>${rule.warnMax})` };
  return { ok: true };
}

export function validateLogForm(form) {
  const errors = [];
  if (!form.duration) { errors.push('La duración es obligatoria.'); return errors; }
  const dv = validateNum(form.duration, 'duration');
  if (!dv.ok) errors.push('Duración: ' + dv.error);
  if (form.type === 'track') {
    form.trackSeries.forEach((s, i) => {
      const rule = s.dist === '200' ? 'time200' : 'time100';
      const v = validateNum(s.time, rule);
      if (!v.ok) errors.push(`Serie ${i+1} (${s.dist}m): ${v.error}`);
      if (s.reactionTime && !validateNum(s.reactionTime, 'reaction').ok) errors.push(`Serie ${i+1} reacción: ${validateNum(s.reactionTime, 'reaction').error}`);
      if (s.startTime && !validateNum(s.startTime, 'start').ok) errors.push(`Serie ${i+1} salida: ${validateNum(s.startTime, 'start').error}`);
    });
  }
  if (form.type === 'gym') {
    form.gymExercises.forEach((e, i) => {
      const wv = validateNum(e.weight, 'gymWeight');
      const rv = validateNum(e.reps, 'gymReps');
      if (!wv.ok) errors.push(`Ejercicio ${i+1} peso: ${wv.error}`);
      if (!rv.ok) errors.push(`Ejercicio ${i+1} reps: ${rv.error}`);
    });
  }
  return errors;
}

