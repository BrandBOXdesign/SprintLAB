// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { applySuggestion, autoAdjustWeek } from '../actions/weeklyplan.js';
import { DB } from '../db/db.js';
import { MACRO_MODELS } from '../models/macrocycles.js';
import { render } from './layout.js';
import { state } from '../state/state.js';
import { acuteChronicRatio, calcCustomMacroPosition, calcMacroPosition, daysUntil, getCurrentPhase, getNextCompetition, getPeakingAlert, getPlannedVolume, getRealizedVolume, getVolumeStatus, ratioStatus, sugerirCarga } from '../utils/calculations.js';
import { COMPETITION_PRIORITY, DAY_COLORS } from '../utils/constants.js';
import { el, emptyState, field, sectionLabel } from '../utils/helpers.js';

// Plantilla neutra usada cuando una fase personalizada no define la suya
// propia y tampoco hay una fase anterior de la que heredar (Fase 4.2).
const NEUTRAL_TEMPLATE = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(day => ({ day, type: 'rest', label: '' }));

export function renderWeekScreen() {
  if (!state.model) return el('div', { class: 'screen' }, [emptyState('Elige un modelo de macrociclo en Perfil para ver tu semana.')]);
  const isCustom = state.model === 'custom';
  const m = isCustom
    ? { name: 'Personalizado', phases: (state.customPhases || []).map(p => ({ name: p.name, weeks: p.unit === 'weeks' ? p.duration : null, months: p.unit === 'months' ? p.duration : null, note: p.objective || '' })) }
    : MACRO_MODELS[state.model];
  if (isCustom && (!state.customPhases || state.customPhases.length === 0)) {
    return el('div', { class: 'screen' }, [emptyState('Todavía no has definido ninguna fase personalizada. Ve a Perfil → "Editor de fases" para crear al menos una.')]);
  }
  const seasonStart = state.athlete && state.athlete.seasonStart;
  const pos = isCustom ? calcCustomMacroPosition(state.customPhases, seasonStart) : calcMacroPosition(m, seasonStart);

  // Fase 6.2: próxima competencia + aviso de peaking (taper) si aplica.
  const nextComp = getNextCompetition(state.competitions);
  const peaking = getPeakingAlert(nextComp);
  let competitionCard = null;
  if (nextComp) {
    const days = daysUntil(nextComp.date);
    const prio = COMPETITION_PRIORITY[nextComp.priority];
    competitionCard = el('div', { class: 'macro-position-card' }, [
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
        el('div', { style: { width: '6px', height: '20px', borderRadius: '2px', flexShrink: 0, backgroundColor: prio.color } }),
        el('div', { class: 'macro-phase' }, nextComp.name),
      ]),
      el('div', { class: 'macro-sublabel' }, `${prio.label} · ${days === 0 ? 'hoy' : days === 1 ? 'mañana' : `en ${days} días`}${nextComp.location ? ' · ' + nextComp.location : ''}`),
      peaking ? el('div', { class: `alert-box ${peaking.days <= 7 ? 'high' : 'low'}`, style: { marginTop: '8px' } }, [el('span', { class: 'icon' }, '🎯'), el('span', {}, peaking.msg)]) : null,
    ]);
  }
  let positionNode;
  if (!seasonStart) positionNode = el('div', { class: 'macro-no-start' }, 'Agrega la fecha de inicio de temporada en Perfil para ver en qué semana del macrociclo está este atleta.');
  else if (pos && pos.finished) positionNode = el('div', { class: 'macro-position-card' }, [el('div', { class: 'macro-phase' }, 'Temporada completada'), el('div', { class: 'macro-sublabel' }, 'Han pasado ' + pos.week + ' semanas desde el inicio. Inicia una nueva temporada actualizando la fecha en Perfil.')]);
  else if (pos) {
    const pct = Math.min(100, Math.round((pos.week / pos.totalWeeks) * 100));
    const weeksLeft = pos.totalWeeks - pos.week + 1;
    positionNode = el('div', { class: 'macro-position-card' }, [
      el('div', { class: 'macro-week-row' }, [el('span', { class: 'macro-week-num' }, pos.week), el('span', { class: 'macro-week-label' }, '/ ' + pos.totalWeeks + ' semanas')]),
      el('div', { class: 'macro-phase' }, pos.phase),
      el('div', { class: 'macro-sublabel' }, pos.weeksLeftInPhase === 1 ? 'Última semana de esta fase' : pos.weeksLeftInPhase + ' semanas restantes en esta fase · ' + weeksLeft + ' sem. para fin de temporada'),
      el('div', { class: 'macro-progress-bar' }, [el('div', { class: 'macro-progress-fill', style: { width: pct + '%' } })]),
      el('div', { class: 'macro-progress-labels' }, [el('span', {}, 'Semana 1'), el('span', {}, pct + '% completado'), el('span', {}, 'Sem. ' + pos.totalWeeks)]),
    ]);
  }
  const planned = getPlannedVolume(state.weeklyPlan);
  const realized = getRealizedVolume(state.sessions);
  const volStatus = getVolumeStatus(planned, realized);
  const pct2 = planned > 0 ? Math.min(100, Math.round((realized / planned) * 100)) : 0;
  const loadSummary = el('div', { class: 'load-summary' }, [
    el('div', { class: 'load-item' }, [el('div', { class: 'label' }, 'Planificado (min)'), el('div', { class: 'value' }, planned)]),
    el('div', { class: 'load-item' }, [el('div', { class: 'label' }, 'Realizado (min)'), el('div', { class: 'value' }, realized)]),
    el('div', { class: 'load-item' }, [el('div', { class: 'label' }, 'Cumplimiento'), el('div', { class: 'value', style: { color: volStatus.color } }, pct2 + '%'), el('div', { class: 'sub' }, volStatus.label)]),
  ]);
  const ratio = acuteChronicRatio(state.sessions);
  const status = ratioStatus(ratio);
  let alertNode = null;
  if (ratio !== null) {
    let cls = 'ok', icon = '✅', msg = 'Ratio en zona óptima.';
    if (ratio < 0.8) { cls = 'low'; icon = '⚠️'; msg = 'Ratio bajo: posible desentrenamiento. Considera aumentar volumen o intensidad moderadamente.'; }
    else if (ratio > 1.5) { cls = 'high'; icon = '🔴'; msg = 'Ratio alto: riesgo de lesión. Reduce intensidad o volumen en los próximos días.'; }
    alertNode = el('div', { class: `alert-box ${cls}` }, [el('span', { class: 'icon' }, icon), el('span', {}, `Ratio AC: ${ratio.toFixed(2)} — ${msg}`)]);
  }

  // Fase 4.3: sugerencia automatica de carga, con vista previa editable.
  let suggestionCard = null;
  if (!state.suggestionDismissed) {
    const suggestion = sugerirCarga(ratio, state.athlete ? state.athlete.level : 'intermedio', planned);
    const volInput = el('input', { type: 'number', min: 0, step: 5, value: Math.round((suggestion.volumeMin + suggestion.volumeMax) / 2) });
    const rpeInput = el('input', { type: 'number', min: 1, max: 10, value: suggestion.rpeTarget });
    suggestionCard = el('div', { class: 'chart-card', style: { marginBottom: '14px' } }, [
      el('div', { class: 'chart-title' }, `Sugerencia de carga · confianza ${suggestion.confidence}`),
      el('p', { class: 'helper-text', style: { marginTop: '2px' } }, suggestion.rationale),
      el('div', { style: { display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '8px' } }, [
        field('Volumen total sugerido (min)', volInput, true),
        field('RPE objetivo', rpeInput, true),
      ]),
      el('div', { style: { display: 'flex', gap: '10px', marginTop: '4px' } }, [
        el('button', { class: 'primary-button', style: { marginTop: 0 }, onClick: () => applySuggestion(Number(volInput.value) || planned, Number(rpeInput.value) || suggestion.rpeTarget) }, 'Aplicar sugerencia'),
        el('button', { class: 'secondary-button', style: { marginTop: 0 }, onClick: () => { state.suggestionDismissed = true; render(); } }, 'Descartar'),
      ]),
    ]);
  }
  const weekTrack = el('div', { class: 'week-track' }, (state.weeklyPlan || []).map((day, idx) => {
    const typeSelect = el('select', { class: 'day-type-select', onchange: (e) => { state.weeklyPlan[idx].type = e.target.value; DB.saveWeeklyPlan(state.currentAthleteId, state.weeklyPlan); render(); } }, [
      el('option', { value: 'gym', selected: day.type === 'gym' }, 'Gimnasio'),
      el('option', { value: 'track', selected: day.type === 'track' }, 'Pista'),
      el('option', { value: 'field', selected: day.type === 'field' }, 'Campo'),
      el('option', { value: 'rest', selected: day.type === 'rest' }, 'Descanso'),
    ]);
    typeSelect.value = day.type;
    const labelInput = el('input', { class: 'day-label-input', value: day.customLabel || day.label || '', oninput: (e) => { state.weeklyPlan[idx].customLabel = e.target.value; DB.saveWeeklyPlan(state.currentAthleteId, state.weeklyPlan); }, placeholder: 'Contenido del día' });
    const durationInput = el('input', { type: 'number', class: 'day-duration-input', value: day.plannedDuration || 0, min: 0, step: 5, oninput: (e) => { state.weeklyPlan[idx].plannedDuration = Number(e.target.value) || 0; DB.saveWeeklyPlan(state.currentAthleteId, state.weeklyPlan); render(); }, title: 'Duración planificada (min)' });
    return el('div', { class: 'day-lane' }, [
      el('div', { class: 'day-marker', style: { backgroundColor: DAY_COLORS[day.type] } }),
      el('div', { class: 'day-info' }, [el('div', { class: 'day-name' }, day.day), labelInput]),
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 } }, [durationInput, el('span', { style: { fontSize: '10px', color: 'var(--muted)' } }, 'min')]),
      el('div', { style: { width: '90px', flexShrink: 0 } }, typeSelect),
    ]);
  }));
  const children = [];
  if (competitionCard) children.push(sectionLabel('—', 'Próxima competencia'), competitionCard);
  children.push(sectionLabel('—', 'Posición en temporada'), positionNode, sectionLabel('—', 'Carga semanal'), loadSummary, alertNode, suggestionCard, sectionLabel('—', 'Microciclo · ' + m.name), el('p', { class: 'helper-text' }, 'Edita contenido, tipo y duración planificada. Los cambios se guardan automáticamente.'), weekTrack, el('button', { class: 'primary-button', style: { marginTop: '12px' }, onClick: autoAdjustWeek }, 'Ajustar semana automáticamente'));
  if (state.model === 'annual') children.push(el('div', { class: 'field-note' }, [el('div', { class: 'field-note-title' }, 'Sábado de campo — dos sub-bloques'), el('div', { class: 'field-note-row' }, [el('span', { class: 'field-note-tag' }, 'CARGA'), el('span', {}, '30 vueltas de 200m en arena + saltos + arrancones de 60m')]), el('div', { class: 'field-note-row' }, [el('span', { class: 'field-note-tag discharge' }, 'DESCARGA'), el('span', {}, 'Sprints explosivos y saltos en agua media (cierre de sesión)')])]));
  children.push(sectionLabel('—', 'Fases del macrociclo'), el('div', { class: 'phase-list' }, m.phases.map((p, i) => { const isActive = pos && p.name === pos.phase; return el('div', { class: 'phase-row', style: isActive ? { borderLeft: '2px solid #C8332A', paddingLeft: '10px', marginLeft: '-12px' } : {} }, [el('div', { class: 'phase-duration', style: isActive ? { color: '#C8332A' } : {} }, p.months ? p.months + ' mes' + (p.months > 1 ? 'es' : '') : p.weeks + ' sem.'), el('div', {}, [el('div', { class: 'phase-name', style: isActive ? { color: '#F2EFE9' } : {} }, p.name + (isActive ? ' ←' : '')), el('div', { class: 'phase-note' }, p.note)])]); })));
  return el('div', { class: 'screen' }, children);
}

