// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { DB } from '../db/db.js';
import { render } from '../render/layout.js';
import { state } from '../state/state.js';
import { acuteChronicRatio } from '../utils/calculations.js';
import { showToast } from '../utils/notifications.js';

export function autoAdjustWeek() {
  const ratio = acuteChronicRatio(state.sessions);
  const level = state.athlete.level || 'intermedio';
  const newPlan = state.weeklyPlan.map(day => {
    let suffix = '';
    // Siempre se ajusta desde la duración BASE (la que puso el entrenador), no desde el último ajuste:
    // si no, cada clic multiplicaba otra vez por 1,2 o 0,8. baseDuration se borra al editar a mano.
    const base = day.baseDuration ?? (day.plannedDuration ?? 60);
    let duration = base;
    if (day.type !== 'rest') {
      if (ratio !== null) {
        if (ratio < 0.8) { suffix += ' (↑ volumen)'; duration = Math.round(duration * 1.2); }
        else if (ratio > 1.5) { suffix += ' (↓ intensidad)'; duration = Math.round(duration * 0.8); }
      }
      if (level === 'avanzado') suffix += ' · alta exigencia';
      else if (level === 'principiante') suffix += ' · técnica prioritaria';
    }
    return { ...day, baseDuration: base, customLabel: (day.label || '') + suffix, plannedDuration: Math.max(0, duration) };
  });
  state.weeklyPlan = newPlan;
  DB.saveWeeklyPlan(state.currentAthleteId, newPlan);
  render();
  showToast('Plan ajustado automáticamente');
}

// Fase 4.3: aplica la sugerencia de carga (ya revisada/editada por el
// entrenador) repartiendo el volumen total entre los dias NO-descanso
// (type !== 'rest', el valor real que usa el proyecto -- no 'descanso'),
// respetando las proporciones relativas que ya tenian entre si.
export function applySuggestion(totalVolume, rpeTarget) {
  const plan = state.weeklyPlan;
  if (!plan || plan.length === 0) { showToast('No hay plan semanal para aplicar la sugerencia'); return; }
  const activeDays = plan.filter(d => d.type !== 'rest');
  if (activeDays.length === 0) { showToast('No hay días de entrenamiento en el plan'); return; }

  const currentTotal = activeDays.reduce((sum, d) => sum + (d.plannedDuration || 0), 0);
  if (currentTotal === 0) {
    const perDay = Math.max(5, Math.round(totalVolume / activeDays.length));
    activeDays.forEach(d => { d.plannedDuration = perDay; delete d.baseDuration; });
  } else {
    let assigned = 0;
    activeDays.forEach((d, i) => {
      const proportion = (d.plannedDuration || 0) / currentTotal;
      let amount = Math.round(totalVolume * proportion);
      if (amount < 5) amount = 5;
      if (i === activeDays.length - 1) amount = Math.max(5, totalVolume - assigned); // el ultimo dia absorbe el redondeo
      d.plannedDuration = amount;
      delete d.baseDuration;
      assigned += amount;
    });
  }

  state.weeklyPlan = [...plan];
  DB.saveWeeklyPlan(state.currentAthleteId, state.weeklyPlan);
  state.suggestionDismissed = true;
  render();
  showToast(`Sugerencia aplicada: ${totalVolume} min repartidos, RPE objetivo ${rpeTarget}/10`);
}

