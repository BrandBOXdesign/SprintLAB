// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { DB } from '../db/db.js';
import { MACRO_MODELS } from '../models/macrocycles.js';
import { render } from '../render/layout.js';
import { state } from '../state/state.js';
import { getCurrentPhase } from '../utils/calculations.js';

export function saveCurrentAthlete(data) { const id = state.currentAthleteId; DB.saveAthlete(id, { ...data, id }); state.athlete = { ...data, id }; state.athletes = state.athletes.map(a => a.id === id ? state.athlete : a); render(); }

const DEFAULT_DURATIONS = { gym: 60, track: 90, field: 120, rest: 0 };
const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function saveCurrentModel(modelId) {
  DB.saveModel(state.currentAthleteId, modelId);
  state.model = modelId;
  let plan = DB.getWeeklyPlan(state.currentAthleteId);
  if (!plan) {
    if (modelId === 'custom') {
      const seasonStart = state.athlete && state.athlete.seasonStart;
      const currentPhase = seasonStart ? getCurrentPhase(seasonStart, state.customPhases || []) : null;
      const template = (currentPhase && currentPhase.weeklyTemplate) || WEEK_DAYS.map(day => ({ day, type: 'rest', label: '' }));
      plan = template.map(day => ({ ...day, customLabel: day.label, plannedDuration: DEFAULT_DURATIONS[day.type] ?? 60 }));
      DB.saveWeeklyPlan(state.currentAthleteId, plan);
      state.weeklyPlan = plan;
    } else {
      const modelData = MACRO_MODELS[modelId];
      if (modelData) {
        plan = modelData.weeklyTemplate.map(day => ({ ...day, customLabel: day.label, plannedDuration: DEFAULT_DURATIONS[day.type] ?? 60 }));
        DB.saveWeeklyPlan(state.currentAthleteId, plan);
        state.weeklyPlan = plan;
      }
    }
  }
  render();
}

