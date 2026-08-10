// Fase 6.2 del roadmap: calendario de competencias por atleta, para
// conectar el macrociclo con fechas reales de competencia (peaking).
import { DB } from '../db/db.js';
import { render } from '../render/layout.js';
import { state } from '../state/state.js';
import { showToast } from '../utils/notifications.js';
import { todayISO } from '../utils/helpers.js';

function persist() {
  DB.saveCompetitions(state.currentAthleteId, state.competitions);
}

export function addCompetition() {
  state.competitions.push({
    id: 'comp-' + Date.now(),
    name: 'Nueva competencia',
    date: todayISO(),
    location: '',
    priority: 'B',       // 'A' objetivo principal | 'B' importante | 'C' preparación/rodaje
    distance: '100',      // '100' | '200' | 'both'
    targetTime100: '',
    targetTime200: '',
    result: null,         // se llena despues de correr, ver saveCompetitionResult()
  });
  persist();
  render();
  showToast('Competencia agregada');
}

export function updateCompetitionField(id, field, value) {
  const comp = state.competitions.find(c => c.id === id);
  if (!comp) return;
  comp[field] = value;
  persist();
}

// Igual que con atletas/sesiones/fases: confirmación con el modal propio de
// la app, no con confirm() nativo del navegador.
export function confirmDeleteCompetition(id) { state.confirmDeleteCompetitionId = id; render(); }
export function cancelDeleteCompetition() { state.confirmDeleteCompetitionId = null; render(); }
export function executeDeleteCompetition(id) {
  state.competitions = state.competitions.filter(c => c.id !== id);
  state.confirmDeleteCompetitionId = null;
  persist();
  render();
  showToast('Competencia eliminada');
}

// Abre/cierra el formulario de captura de resultado post-competencia.
export function openResultForm(id) {
  const comp = state.competitions.find(c => c.id === id);
  if (!comp) return;
  state.editingResultId = id;
  state.competitionResultForm = comp.result
    ? { ...comp.result }
    : { time100: '', time200: '', wind100: '', wind200: '', position: '', notes: '' };
  render();
}

export function closeResultForm() {
  state.editingResultId = null;
  render();
}

export function updateResultFormField(field, value) {
  state.competitionResultForm[field] = value;
}

export function saveCompetitionResult(id) {
  const comp = state.competitions.find(c => c.id === id);
  if (!comp) return;
  comp.result = { ...state.competitionResultForm };
  state.editingResultId = null;
  persist();
  render();
  showToast('Resultado guardado');
}

export function clearCompetitionResult(id) {
  const comp = state.competitions.find(c => c.id === id);
  if (!comp) return;
  comp.result = null;
  persist();
  render();
  showToast('Resultado borrado');
}
