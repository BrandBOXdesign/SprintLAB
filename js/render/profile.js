// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { confirmDeleteAthlete } from '../actions/athletes.js';
import { handleAuthSubmit, handleSignOut, handleSyncNow, setAuthFormField, toggleAuthFormMode } from '../actions/auth.js';
import { addCompetition, cancelDeleteCompetition, clearCompetitionResult, closeResultForm, confirmDeleteCompetition, executeDeleteCompetition, openResultForm, saveCompetitionResult, updateCompetitionField, updateResultFormField } from '../actions/competitions.js';
import { addPhase, cancelDeletePhase, confirmDeletePhase, executeDeletePhase, reorderPhases, savePhaseWeeklyTemplate, updatePhaseField } from '../actions/phases.js';
import { saveCurrentAthlete, saveCurrentModel } from '../actions/profile.js';
import { DB } from '../db/db.js';
import { MACRO_MODELS } from '../models/macrocycles.js';
import { render } from './layout.js';
import { FIREBASE_CONFIGURED } from '../services/firebaseConfig.js';
import { state } from '../state/state.js';
import { checkWindLegal, sortCompetitions } from '../utils/calculations.js';
import { COMPETITION_PRIORITY, DAY_COLORS } from '../utils/constants.js';
import { decimalInput, el, field, sectionLabel, todayISO } from '../utils/helpers.js';
import { showToast } from '../utils/notifications.js';

let _phasesSortable = null;
const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function renderCloudCard() {
  if (!FIREBASE_CONFIGURED) {
    return el('div', { class: 'card' }, [
      el('div', { style: { fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'Cuenta en la nube'),
      el('p', { class: 'helper-text', style: { marginTop: '6px', marginBottom: 0 } },
        'Todavía no está configurado Firebase para esta instalación. Sigue las instrucciones en js/services/firebaseConfig.js para activar la sincronización entre dispositivos. Mientras tanto, tus datos se guardan solo en este navegador.'),
    ]);
  }

  if (state.cloudUser) {
    const statusColor = state.syncStatus === 'error' ? 'var(--red)' : state.syncStatus === 'synced' ? 'var(--green)' : 'var(--muted)';
    return el('div', { class: 'card' }, [
      el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
        el('div', {}, [el('div', { style: { fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'Cuenta en la nube'), el('div', { style: { fontSize: '15px', fontWeight: '700', marginTop: '4px' } }, state.cloudUser.email)]),
        el('button', { class: 'secondary-button', style: { width: 'auto', marginTop: 0 }, onClick: handleSignOut }, 'Cerrar sesión'),
      ]),
      el('button', {
        class: 'primary-button', style: { marginTop: '12px' },
        onClick: handleSyncNow,
        disabled: state.syncStatus === 'syncing',
      }, state.syncStatus === 'syncing' ? 'Sincronizando…' : 'Sincronizar ahora'),
      state.syncMessage ? el('div', { style: { fontSize: '12px', color: statusColor, marginTop: '8px' } }, state.syncMessage) : null,
    ]);
  }

  const emailInput = el('input', { type: 'email', value: state.authForm.email, placeholder: 'correo@ejemplo.com', oninput: e => setAuthFormField('email', e.target.value) });
  const passwordInput = el('input', { type: 'password', value: state.authForm.password, placeholder: '••••••••', oninput: e => setAuthFormField('password', e.target.value) });
  const isRegister = state.authFormMode === 'register';
  return el('div', { class: 'card' }, [
    el('div', { style: { fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' } }, 'Cuenta en la nube'),
    el('p', { class: 'helper-text', style: { marginTop: '6px' } }, isRegister ? 'Crea una cuenta para respaldar y sincronizar tus atletas entre dispositivos.' : 'Inicia sesión para sincronizar tus atletas entre dispositivos.'),
    field('Correo', emailInput),
    field('Contraseña', passwordInput),
    state.authError ? el('div', { class: 'field-error' }, state.authError) : null,
    el('button', { class: 'primary-button', onClick: handleAuthSubmit }, isRegister ? 'Crear cuenta' : 'Iniciar sesión'),
    el('button', { class: 'secondary-button', onClick: toggleAuthFormMode }, isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Crea una'),
  ]);
}

function renderWeeklyTemplateEditor(phase) {
  const template = phase.weeklyTemplate || WEEK_DAYS.map(day => ({ day, type: 'rest', label: '' }));
  const rows = WEEK_DAYS.map((dayName, idx) => {
    const dayData = template.find(d => d.day === dayName) || { day: dayName, type: 'rest', label: '' };
    const typeSel = el('select', { class: 'day-type-select', oninput: e => { dayData.type = e.target.value; } }, [
      el('option', { value: 'gym', selected: dayData.type === 'gym' }, 'Gimnasio'),
      el('option', { value: 'track', selected: dayData.type === 'track' }, 'Pista'),
      el('option', { value: 'field', selected: dayData.type === 'field' }, 'Campo'),
      el('option', { value: 'rest', selected: dayData.type === 'rest' }, 'Descanso'),
    ]);
    typeSel.value = dayData.type;
    const labelInput = el('input', { class: 'day-label-input', value: dayData.label || '', placeholder: 'Contenido del día', oninput: e => { dayData.label = e.target.value; } });
    template[idx] = dayData;
    return el('div', { class: 'day-lane' }, [
      el('div', { class: 'day-marker', style: { backgroundColor: DAY_COLORS[dayData.type] } }),
      el('div', { class: 'day-info' }, [el('div', { class: 'day-name' }, dayName), labelInput]),
      el('div', { style: { width: '90px', flexShrink: 0 } }, typeSel),
    ]);
  });
  return el('div', { style: { marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' } }, [
    ...rows,
    el('button', { class: 'secondary-button', style: { marginTop: '8px' }, onClick: () => { savePhaseWeeklyTemplate(phase.id, template); state.editingPhaseId = null; } }, 'Guardar plantilla de esta fase'),
  ]);
}

function renderPhasesEditor() {
  const phases = state.customPhases || [];
  const list = el('div', { class: 'phase-list' }, phases.map(p => {
    const nameInput = el('input', { value: p.name, oninput: e => updatePhaseField(p.id, 'name', e.target.value) });
    const durationInput = el('input', { type: 'number', min: 1, value: p.duration, style: { width: '60px' }, oninput: e => updatePhaseField(p.id, 'duration', Number(e.target.value) || 1) });
    const unitSel = el('select', { oninput: e => updatePhaseField(p.id, 'unit', e.target.value) }, [
      el('option', { value: 'weeks', selected: p.unit === 'weeks' }, 'semanas'),
      el('option', { value: 'months', selected: p.unit === 'months' }, 'meses'),
    ]);
    unitSel.value = p.unit;
    const intensitySel = el('select', { oninput: e => updatePhaseField(p.id, 'intensity', e.target.value) }, [
      el('option', { value: 'baja', selected: p.intensity === 'baja' }, 'Baja'),
      el('option', { value: 'media', selected: p.intensity === 'media' }, 'Media'),
      el('option', { value: 'alta', selected: p.intensity === 'alta' }, 'Alta'),
    ]);
    intensitySel.value = p.intensity;
    const objectiveInput = el('input', { value: p.objective || '', placeholder: 'Objetivo de esta fase', oninput: e => updatePhaseField(p.id, 'objective', e.target.value) });
    const isEditingTemplate = state.editingPhaseId === p.id;
    return el('div', { class: 'phase-row', 'data-id': p.id, style: { flexDirection: 'column', alignItems: 'stretch' } }, [
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
        el('span', { class: 'widget-drag-handle' }, '⠿'),
        nameInput,
        durationInput, unitSel, intensitySel,
        el('button', { class: 'danger-button', style: { width: 'auto', padding: '6px 10px' }, onClick: () => confirmDeletePhase(p.id) }, '✕'),
      ]),
      objectiveInput,
      el('button', { class: 'secondary-button', style: { marginTop: '6px' }, onClick: () => { state.editingPhaseId = isEditingTemplate ? null : p.id; render(); } }, isEditingTemplate ? 'Cerrar editor de plantilla' : 'Editar plantilla semanal de esta fase'),
      isEditingTemplate ? renderWeeklyTemplateEditor(p) : null,
    ]);
  }));

  requestAnimationFrame(() => {
    if (_phasesSortable) { _phasesSortable.destroy(); _phasesSortable = null; }
    if (typeof Sortable === 'undefined') return;
    _phasesSortable = Sortable.create(list, {
      handle: '.widget-drag-handle', animation: 150, delay: 150, delayOnTouchOnly: true,
      onEnd: () => reorderPhases(Array.from(list.querySelectorAll('[data-id]')).map(n => n.getAttribute('data-id'))),
    });
  });

  const confirmModal = state.confirmDeletePhaseId ? el('div', { class: 'modal-overlay' }, [
    el('div', { class: 'modal-box' }, [
      el('div', { class: 'modal-title' }, 'Eliminar fase'),
      el('div', { class: 'modal-body' }, 'Esta fase se eliminará permanentemente de tu macrociclo personalizado.'),
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'danger-button', onClick: () => executeDeletePhase(state.confirmDeletePhaseId) }, 'Eliminar'),
        el('button', { class: 'secondary-button', onClick: cancelDeletePhase }, 'Cancelar'),
      ]),
    ]),
  ]) : null;

  return el('div', {}, [
    el('p', { class: 'helper-text' }, 'Crea tus propias fases de temporada, arrastra el ⠿ para reordenarlas, y opcionalmente dale a cada fase su propia plantilla semanal (microciclo variable).'),
    list,
    el('button', { class: 'secondary-button', onClick: addPhase }, '+ Agregar fase'),
    confirmModal,
  ]);
}

function renderResultForm(comp) {
  const f = state.competitionResultForm;
  const showsBoth = comp.distance === 'both';
  const windBadge = (wind) => {
    const legal = checkWindLegal(wind);
    if (legal === null) return null;
    return el('span', { style: { fontSize: '11px', marginLeft: '8px', color: legal ? 'var(--green)' : 'var(--red)' } },
      legal ? '✓ viento legal' : '✕ viento ilegal (World Athletics, > +2.0 m/s)');
  };
  const rows = [];
  if (comp.distance === '100' || showsBoth) {
    rows.push(el('div', { class: 'row' }, [
      field('Tiempo 100m (s)', decimalInput({ value: f.time100, placeholder: '—', oninput: e => updateResultFormField('time100', e.target.value) }), true),
      field('Viento 100m (m/s)', el('div', {}, [decimalInput({ value: f.wind100, placeholder: '—', oninput: e => { updateResultFormField('wind100', e.target.value); render(); } }), windBadge(f.wind100)]), true),
    ]));
  }
  if (comp.distance === '200' || showsBoth) {
    rows.push(el('div', { class: 'row' }, [
      field('Tiempo 200m (s)', decimalInput({ value: f.time200, placeholder: '—', oninput: e => updateResultFormField('time200', e.target.value) }), true),
      field('Viento 200m (m/s)', el('div', {}, [decimalInput({ value: f.wind200, placeholder: '—', oninput: e => { updateResultFormField('wind200', e.target.value); render(); } }), windBadge(f.wind200)]), true),
    ]));
  }
  return el('div', { style: { marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' } }, [
    ...rows,
    field('Lugar / posición', el('input', { value: f.position, placeholder: 'ej. 2° lugar', oninput: e => updateResultFormField('position', e.target.value) })),
    field('Notas', el('input', { value: f.notes, placeholder: 'condiciones, sensaciones...', oninput: e => updateResultFormField('notes', e.target.value) })),
    el('div', { style: { display: 'flex', gap: '8px', marginTop: '6px' } }, [
      el('button', { class: 'primary-button', onClick: () => saveCompetitionResult(comp.id) }, 'Guardar resultado'),
      el('button', { class: 'secondary-button', onClick: closeResultForm }, 'Cancelar'),
    ]),
  ]);
}

function renderCompetitionsEditor() {
  const competitions = sortCompetitions(state.competitions || []);
  const list = el('div', { class: 'phase-list' }, competitions.map(c => {
    const nameInput = el('input', { value: c.name, oninput: e => updateCompetitionField(c.id, 'name', e.target.value) });
    const dateInput = el('input', { type: 'date', value: c.date, oninput: e => updateCompetitionField(c.id, 'date', e.target.value) });
    const locationInput = el('input', { value: c.location || '', placeholder: 'Sede (opcional)', oninput: e => updateCompetitionField(c.id, 'location', e.target.value) });
    const prioritySel = el('select', { oninput: e => updateCompetitionField(c.id, 'priority', e.target.value) }, [
      el('option', { value: 'A', selected: c.priority === 'A' }, 'A · Objetivo principal'),
      el('option', { value: 'B', selected: c.priority === 'B' }, 'B · Importante'),
      el('option', { value: 'C', selected: c.priority === 'C' }, 'C · Preparación'),
    ]);
    prioritySel.value = c.priority;
    const distanceSel = el('select', { oninput: e => updateCompetitionField(c.id, 'distance', e.target.value) }, [
      el('option', { value: '100', selected: c.distance === '100' }, '100m'),
      el('option', { value: '200', selected: c.distance === '200' }, '200m'),
      el('option', { value: 'both', selected: c.distance === 'both' }, '100m y 200m'),
    ]);
    distanceSel.value = c.distance;
    const target100 = decimalInput({ value: c.targetTime100 || '', placeholder: '—', oninput: e => updateCompetitionField(c.id, 'targetTime100', e.target.value) });
    const target200 = decimalInput({ value: c.targetTime200 || '', placeholder: '—', oninput: e => updateCompetitionField(c.id, 'targetTime200', e.target.value) });
    const isEditingResult = state.editingResultId === c.id;
    const resultSummary = c.result
      ? el('div', { style: { fontSize: '12px', color: 'var(--text2)', marginTop: '6px' } },
          `Resultado: ${c.result.time100 ? c.result.time100 + 's (100m) ' : ''}${c.result.time200 ? c.result.time200 + 's (200m) ' : ''}${c.result.position ? '· ' + c.result.position : ''}`)
      : null;
    return el('div', { class: 'phase-row', 'data-id': c.id, style: { flexDirection: 'column', alignItems: 'stretch' } }, [
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
        el('div', { style: { width: '6px', height: '28px', borderRadius: '2px', flexShrink: 0, backgroundColor: COMPETITION_PRIORITY[c.priority].color } }),
        nameInput,
        dateInput,
        el('button', { class: 'danger-button', style: { width: 'auto', padding: '6px 10px' }, onClick: () => confirmDeleteCompetition(c.id) }, '✕'),
      ]),
      locationInput,
      el('div', { class: 'row' }, [field('Prioridad', prioritySel, true), field('Prueba', distanceSel, true)]),
      el('div', { class: 'row' }, [field('Marca objetivo 100m (s)', target100, true), field('Marca objetivo 200m (s)', target200, true)]),
      el('button', { class: 'secondary-button', style: { marginTop: '6px' }, onClick: () => isEditingResult ? closeResultForm() : openResultForm(c.id) }, isEditingResult ? 'Cerrar' : (c.result ? 'Editar resultado' : 'Registrar resultado')),
      resultSummary,
      isEditingResult ? renderResultForm(c) : null,
      c.result && !isEditingResult ? el('button', { class: 'danger-button', style: { width: 'auto', marginTop: '6px', fontSize: '11px', padding: '4px 8px' }, onClick: () => clearCompetitionResult(c.id) }, 'Borrar resultado') : null,
    ]);
  }));

  const confirmModal = state.confirmDeleteCompetitionId ? el('div', { class: 'modal-overlay' }, [
    el('div', { class: 'modal-box' }, [
      el('div', { class: 'modal-title' }, 'Eliminar competencia'),
      el('div', { class: 'modal-body' }, 'Esta competencia y su resultado (si lo hay) se eliminarán permanentemente.'),
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'danger-button', onClick: () => executeDeleteCompetition(state.confirmDeleteCompetitionId) }, 'Eliminar'),
        el('button', { class: 'secondary-button', onClick: cancelDeleteCompetition }, 'Cancelar'),
      ]),
    ]),
  ]) : null;

  return el('div', {}, [
    el('p', { class: 'helper-text' }, 'Registra las competencias de la temporada y marca cuáles son prioridad A (el objetivo real). Cuando falten pocas semanas para una competencia A, la app te avisará en el tablero y en la semana para que consideres el taper.'),
    competitions.length ? list : el('div', { class: 'empty-state' }, 'Aún no hay competencias registradas.'),
    el('button', { class: 'secondary-button', onClick: addCompetition }, '+ Agregar competencia'),
    confirmModal,
  ]);
}

export function renderProfileScreen() {
  const form = state.profileForm;
  const nameInput = el('input', { value: form.name, placeholder: 'Nombre del atleta', oninput: e => form.name = e.target.value });
  const ageInput = el('input', { type: 'number', value: form.age, placeholder: '—', oninput: e => form.age = e.target.value });
  const weightInput = decimalInput({ value: form.weight, placeholder: '—', oninput: e => form.weight = e.target.value });
  const t100Input = decimalInput({ value: form.time100, placeholder: '—', oninput: e => form.time100 = e.target.value });
  const t200Input = decimalInput({ value: form.time200, placeholder: '—', oninput: e => form.time200 = e.target.value });
  const levelSel = el('select', { oninput: e => form.level = e.target.value }, [
    el('option', { value: 'principiante', selected: form.level === 'principiante' }, 'Principiante'),
    el('option', { value: 'intermedio', selected: form.level === 'intermedio' }, 'Intermedio'),
    el('option', { value: 'avanzado', selected: form.level === 'avanzado' }, 'Avanzado'),
  ]);
  levelSel.value = form.level;
  const seasonStartInput = el('input', { type: 'date', value: form.seasonStart || '', max: todayISO(), oninput: e => form.seasonStart = e.target.value });
  const target100Input = decimalInput({ value: form.target100 || '', placeholder: '—', oninput: e => form.target100 = e.target.value });
  const target200Input = decimalInput({ value: form.target200 || '', placeholder: '—', oninput: e => form.target200 = e.target.value });
  const card = el('div', { class: 'card' }, [
    field('Nombre', nameInput),
    el('div', { class: 'row' }, [field('Edad', ageInput, true), field('Peso (kg)', weightInput, true)]),
    el('div', { class: 'row' }, [field('100m base (s)', t100Input, true), field('200m base (s)', t200Input, true)]),
    field('Nivel', levelSel),
    field('Inicio de temporada', seasonStartInput),
    el('div', { class: 'row' }, [field('Objetivo 100m (s)', target100Input, true), field('Objetivo 200m (s)', target200Input, true)]),
    el('button', { class: 'primary-button', onClick: () => saveCurrentAthlete({ ...form }) }, 'Guardar perfil'),
  ]);
  const laneSelector = el('div', { class: 'lane-selector' }, [
    ...Object.values(MACRO_MODELS).map(m => el('button', { class: 'lane-card' + (state.model === m.id ? ' selected' : ''), onClick: () => saveCurrentModel(m.id) }, [el('div', { class: 'lane-number' }, m.id === 'annual' ? 'CARRIL 1' : 'CARRIL 2'), el('div', { class: 'lane-name' }, m.name), el('div', { class: 'lane-subtitle' }, m.subtitle), el('div', { class: 'lane-description' }, m.description)])),
    el('button', { class: 'lane-card' + (state.model === 'custom' ? ' selected' : ''), onClick: () => saveCurrentModel('custom') }, [el('div', { class: 'lane-number' }, 'CARRIL 3'), el('div', { class: 'lane-name' }, 'Personalizado'), el('div', { class: 'lane-subtitle' }, 'Tus propias fases'), el('div', { class: 'lane-description' }, 'Define y ordena tus propias fases de temporada, cada una con su propia plantilla semanal.')]),
  ]);
  const phasesEditor = state.model === 'custom' ? renderPhasesEditor() : null;
  const savedNotes = DB.getClinicalNotes(state.currentAthleteId);
  let notesArea;
  const notesCard = el('div', { class: 'card' }, [
    el('label', { class: 'field-label' }, 'Observaciones clínicas'),
    notesArea = el('textarea', { class: 'clinical-notes-area', placeholder: 'Lesiones previas, limitaciones físicas, medicación, objetivos específicos de temporada...' }, savedNotes),
    el('div', { class: 'notes-save-row' }, [el('button', { class: 'notes-save-btn', onClick: () => { DB.saveClinicalNotes(state.currentAthleteId, notesArea.value); showToast('Notas guardadas'); } }, 'Guardar notas')]),
  ]);
  const dangerZone = el('div', { class: 'danger-zone' }, [el('div', { class: 'danger-zone-title' }, 'Zona de riesgo'), el('button', { class: 'danger-button', style: { width: '100%', padding: '12px' }, onClick: () => confirmDeleteAthlete(state.currentAthleteId) }, 'Eliminar a ' + (state.athlete ? state.athlete.name : 'este atleta') + ' y todos sus datos')]);
  return el('div', { class: 'screen' }, [sectionLabel('01', 'Atleta'), card, sectionLabel('02', 'Notas clínicas'), notesCard, sectionLabel('03', 'Modelo de macrociclo'), el('p', { class: 'helper-text' }, 'Elige cómo se estructura el año de entrenamiento. Puedes cambiarlo después.'), laneSelector, phasesEditor, el('div', { class: 'disclaimer' }, 'Esta app aplica modelos de periodización y fórmulas públicamente documentadas (Epley, Brzycki, ratio de carga aguda:crónica por EWMA — Williams, Trewartha, Kemp & Stokes, 2016). No sustituye a un entrenador certificado ni a evaluación médico-deportiva.'), sectionLabel('04', 'Competencias'), renderCompetitionsEditor(), sectionLabel('05', 'Nube'), renderCloudCard(), dangerZone]);
}

