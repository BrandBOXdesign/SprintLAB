// Fase 4.1 del roadmap: editor visual de fases personalizadas de macrociclo.
import { DB } from '../db/db.js';
import { render } from '../render/layout.js';
import { state } from '../state/state.js';
import { showToast } from '../utils/notifications.js';

function persist() {
  DB.saveCustomPhases(state.currentAthleteId, state.customPhases);
}

export function addPhase() {
  state.customPhases.push({
    id: 'phase-' + Date.now(),
    name: 'Nueva fase',
    duration: 4,
    unit: 'weeks', // 'weeks' | 'months'
    intensity: 'media', // 'baja' | 'media' | 'alta'
    objective: '',
    weeklyTemplate: null, // Fase 4.2: si es null, hereda la plantilla de la fase anterior
  });
  persist();
  render();
  showToast('Fase agregada');
}

export function updatePhaseField(id, field, value) {
  const phase = state.customPhases.find(p => p.id === id);
  if (!phase) return;
  phase[field] = value;
  persist();
}

// Igual que con atletas/sesiones: pedir confirmación con el modal propio de
// la app, no con confirm() nativo del navegador (rompería el estilo visual).
export function confirmDeletePhase(id) { state.confirmDeletePhaseId = id; render(); }
export function cancelDeletePhase() { state.confirmDeletePhaseId = null; render(); }
export function executeDeletePhase(id) {
  state.customPhases = state.customPhases.filter(p => p.id !== id);
  state.confirmDeletePhaseId = null;
  persist();
  render();
  showToast('Fase eliminada');
}

// Fase 4.2: guarda la plantilla semanal (7 dias) propia de una fase.
export function savePhaseWeeklyTemplate(id, weeklyTemplate) {
  const phase = state.customPhases.find(p => p.id === id);
  if (!phase) return;
  phase.weeklyTemplate = weeklyTemplate;
  persist();
  render();
  showToast('Plantilla semanal guardada para esta fase');
}

// Llamado por Sortable.create() en render/profile.js al soltar una fase
// arrastrada -- reordena el arreglo real segun el nuevo orden del DOM.
export function reorderPhases(newOrderIds) {
  const byId = Object.fromEntries(state.customPhases.map(p => [p.id, p]));
  state.customPhases = newOrderIds.map(id => byId[id]).filter(Boolean);
  persist();
}
