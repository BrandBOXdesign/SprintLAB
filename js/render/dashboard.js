// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { DB } from '../db/db.js';
import { MACRO_MODELS } from '../models/macrocycles.js';
import { exportProfileJSON, exportSessionsCSV, generatePDFReport } from '../services/exports.js';
import { importBackupJSON, importCSV, importFIT, importGPX } from '../services/imports.js';
import { render } from './layout.js';
import { state } from '../state/state.js';
import { acuteChronicRatio, calcularMonotony, calcularStrain, calcularTRIMP, getAlerts, getBestTimes, getDailyLoads, getNextSession, getPlannedVolume, getRealizedVolume, getVolumeStatus, monotonyStatus, ratioStatus, sugerirCarga } from '../utils/calculations.js';
import { el, emptyState, sectionLabel } from '../utils/helpers.js';

// Fase 5.2 del roadmap: orden por defecto de los widgets del dashboard,
// usado si el entrenador nunca los ha reacomodado todavia.
const DEFAULT_WIDGET_ORDER = ['marks', 'ratio', 'suggestion', 'volume', 'trimp', 'next', 'last', 'alerts'];
let _dashboardSortable = null;

function withDragHandle(card) {
  card.insertBefore(el('span', { class: 'widget-drag-handle', title: 'Arrastrar para reordenar' }, '⠿'), card.firstChild);
  return card;
}

export function renderDashboardScreen() {
  const athlete = state.athlete, sessions = state.sessions, weeklyPlan = state.weeklyPlan, model = state.model ? MACRO_MODELS[state.model] : null;
  if (!athlete) return el('div', { class: 'screen' }, [emptyState('Selecciona un atleta para ver su estado.')]);
  const bestTimes = getBestTimes(sessions);
  const ratio = acuteChronicRatio(sessions);
  const rStatus = ratioStatus(ratio);
  const nextSession = getNextSession(weeklyPlan);
  const alerts = getAlerts(athlete, sessions, weeklyPlan);
  const planned = getPlannedVolume(weeklyPlan);
  const realized = getRealizedVolume(sessions);
  const pct = planned > 0 ? Math.min(100, Math.round((realized / planned) * 100)) : 0;
  const volStatus = getVolumeStatus(planned, realized);
  const identityCard = el('div', { class: 'dashboard-card full' }, [
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
      el('div', {}, [el('div', { class: 'label' }, 'Atleta'), el('div', { class: 'value' }, athlete.name), el('div', { class: 'sub' }, `${athlete.level || 'Sin nivel'} · ${athlete.age || '?'} años · ${athlete.weight || '?'} kg`)]),
      el('div', { style: { textAlign: 'right' } }, [el('div', { class: 'label' }, 'Modelo'), el('div', { class: 'value', style: { fontSize: '16px' } }, model ? model.name : 'Sin modelo')]),
    ]),
  ]);
  const marksCard = withDragHandle(el('div', { class: 'dashboard-card full', 'data-widget-id': 'marks' }, [
    el('div', { class: 'label' }, 'Últimas marcas'),
    el('div', { style: { display: 'flex', gap: '20px', marginTop: '8px', flexWrap: 'wrap' } }, [
      el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, '100m'), el('div', { style: { fontSize: '18px', fontWeight: '700' } }, bestTimes.best100 !== null ? `${bestTimes.best100}s` : '—'), el('div', { style: { fontSize: '11px', color: 'var(--muted)' } }, bestTimes.last100 !== null ? `Último: ${bestTimes.last100}s` : '')]),
      el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, '200m'), el('div', { style: { fontSize: '18px', fontWeight: '700' } }, bestTimes.best200 !== null ? `${bestTimes.best200}s` : '—'), el('div', { style: { fontSize: '11px', color: 'var(--muted)' } }, bestTimes.last200 !== null ? `Último: ${bestTimes.last200}s` : '')]),
      el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, 'Objetivo 100m'), el('div', { style: { fontSize: '18px', fontWeight: '700' } }, athlete.target100 ? `${athlete.target100}s` : '—')]),
      el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, 'Objetivo 200m'), el('div', { style: { fontSize: '18px', fontWeight: '700' } }, athlete.target200 ? `${athlete.target200}s` : '—')]),
    ]),
  ]));
  const ratioCard = withDragHandle(el('div', { class: 'dashboard-card', 'data-widget-id': 'ratio' }, [el('div', { class: 'label' }, 'Ratio AC'), el('div', { class: 'value', style: { color: rStatus.color } }, ratio !== null ? ratio.toFixed(2) : '—'), el('div', { class: 'sub' }, rStatus.label)]));
  const volumeCard = withDragHandle(el('div', { class: 'dashboard-card', 'data-widget-id': 'volume' }, [el('div', { class: 'label' }, 'Volumen semanal'), el('div', { class: 'value' }, `${pct}%`), el('div', { class: 'sub' }, `${realized} / ${planned} min · ${volStatus.label}`)]));
  const nextCard = withDragHandle(el('div', { class: 'dashboard-card', 'data-widget-id': 'next' }, [el('div', { class: 'label' }, 'Próxima sesión'), el('div', { class: 'value', style: { fontSize: '16px' } }, nextSession ? nextSession.day : 'No definida'), el('div', { class: 'sub' }, nextSession ? nextSession.label || '' : '')]));
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const lastSession = sortedSessions[0];
  const lastCard = withDragHandle(el('div', { class: 'dashboard-card', 'data-widget-id': 'last' }, [
    el('div', { class: 'label' }, 'Última sesión'),
    el('div', { class: 'value', style: { fontSize: '16px' } }, lastSession ? new Date(lastSession.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : 'Sin registros'),
    el('div', { class: 'sub' }, lastSession ? `${lastSession.type === 'gym' ? 'Gimnasio' : lastSession.type === 'track' ? 'Pista' : 'Campo'} · RPE ${lastSession.rpe} · ${lastSession.durationMin} min` : ''),
  ]));
  const alertItems = alerts.map(a => { const badgeClass = a.level === 'green' ? 'green' : a.level === 'yellow' ? 'yellow' : 'red'; return el('li', {}, [el('span', { class: `alert-badge ${badgeClass}` }), a.msg]); });
  const alertsCard = withDragHandle(el('div', { class: 'dashboard-card full', 'data-widget-id': 'alerts' }, [el('div', { class: 'label' }, 'Alertas'), el('ul', { class: 'alert-list' }, alertItems)]));

  // Fase 4.3: sugerencia automatica de carga (no aplica nada, solo sugiere).
  const suggestion = sugerirCarga(ratio, athlete.level || 'intermedio', planned);
  const suggestionCard = withDragHandle(el('div', { class: 'dashboard-card', 'data-widget-id': 'suggestion' }, [
    el('div', { class: 'label' }, 'Sugerencia próx. semana'),
    el('div', { class: 'value', style: { fontSize: '17px' } }, `${suggestion.volumeMin}-${suggestion.volumeMax} min`),
    el('div', { class: 'sub' }, `RPE objetivo ≈ ${suggestion.rpeTarget} · confianza ${suggestion.confidence}`),
    el('button', { class: 'secondary-button', style: { marginTop: '8px', fontSize: '12.5px', padding: '8px' }, onClick: () => { state.tab = 'week'; render(); } }, 'Ver detalle en Semana →'),
  ]));

  // Fase 5.1: TRIMP / monotony / strain (metodo Foster).
  const trimpLast = lastSession ? calcularTRIMP(lastSession) : 0;
  const weeklyLoad = getDailyLoads(sessions).reduce((a, b) => a + b, 0);
  const monotony = calcularMonotony(sessions);
  const mStatus = monotonyStatus(monotony);
  const strain = calcularStrain(sessions);
  const trimpCard = withDragHandle(el('div', { class: 'dashboard-card', 'data-widget-id': 'trimp' }, [
    el('div', { class: 'label' }, 'Carga interna (TRIMP)'),
    el('div', { class: 'value' }, lastSession ? `${trimpLast}` : '—'),
    el('div', { class: 'sub' }, `Semanal: ${weeklyLoad}`),
    el('div', { style: { fontSize: '13px', marginTop: '2px' } }, [
      el('span', { style: { color: mStatus.color, fontWeight: '600' } }, monotony !== null ? monotony.toFixed(2) : '—'),
      el('span', { style: { marginLeft: '4px', color: 'var(--muted)' } }, mStatus.label),
    ]),
    el('div', { class: 'sub', style: { marginTop: '2px' } }, `Strain: ${strain !== null ? strain : '—'}`),
  ]));

  const fileInput = el('input', { type: 'file', id: 'file-input', accept: '.csv', onchange: (e) => { const file = e.target.files[0]; if (file) importCSV(file); e.target.value = ''; } });
  const gpxFileInput = el('input', { type: 'file', id: 'file-input2', accept: '.gpx', onchange: (e) => { const file = e.target.files[0]; if (file) importGPX(file); e.target.value = ''; } });
  const fitFileInput = el('input', { type: 'file', id: 'file-input3', accept: '.fit', onchange: (e) => { const file = e.target.files[0]; if (file) importFIT(file); e.target.value = ''; } });
  const jsonFileInput = el('input', { type: 'file', id: 'file-input4', accept: '.json', onchange: (e) => { const file = e.target.files[0]; if (file) importBackupJSON(file); e.target.value = ''; } });
  const exportRow = el('div', { class: 'export-row' }, [
    el('button', { class: 'export-btn', onClick: exportSessionsCSV }, [el('span', { class: 'export-icon' }, '⬇'), 'Sesiones CSV']),
    el('button', { class: 'export-btn', onClick: exportProfileJSON }, [el('span', { class: 'export-icon' }, '⬇'), 'Backup JSON']),
    el('button', { class: 'export-btn', onClick: generatePDFReport, style: { borderColor: 'var(--red)' } }, [el('span', { class: 'export-icon' }, '📄'), 'Informe PDF']),
  ]);
  const importBtn = el('button', { class: 'import-btn', onClick: () => document.getElementById('file-input').click() }, [el('span', {}, '📂'), 'Importar sesiones desde CSV']);
  const gpxImportBtn = el('button', { class: 'import-btn', style: { marginTop: '8px' }, onClick: () => document.getElementById('file-input2').click() }, [el('span', {}, '🗺️'), 'Importar salida desde GPX']);
  const fitImportBtn = el('button', { class: 'import-btn', style: { marginTop: '8px' }, onClick: () => document.getElementById('file-input3').click() }, [el('span', {}, '⌚'), 'Importar salida desde FIT']);

  const jsonImportBtn = el('button', { class: 'import-btn', style: { marginTop: '8px' }, onClick: () => document.getElementById('file-input4').click() }, [el('span', {}, '♻️'), 'Restaurar Backup JSON (como atleta nuevo)']);

  // Fase 5.2: aplicar el orden guardado por el entrenador (si existe), y si
  // hay widgets nuevos que no estaban guardados (por una actualizacion
  // futura de la app), se agregan al final en su posicion por defecto.
  const widgetsById = { marks: marksCard, ratio: ratioCard, suggestion: suggestionCard, volume: volumeCard, trimp: trimpCard, next: nextCard, last: lastCard, alerts: alertsCard };
  const savedOrder = DB.getDashboardOrder();
  let widgetOrder = (savedOrder || DEFAULT_WIDGET_ORDER).filter(id => widgetsById[id]);
  for (const id of DEFAULT_WIDGET_ORDER) if (!widgetOrder.includes(id)) widgetOrder.push(id);
  const orderedWidgetCards = widgetOrder.map(id => widgetsById[id]);

  const grid = el('div', { class: 'dashboard-grid' }, [identityCard, ...orderedWidgetCards, el('div', { class: 'dashboard-card full', style: { padding: '10px' } }, [exportRow, importBtn, fileInput, gpxImportBtn, gpxFileInput, fitImportBtn, fitFileInput, jsonImportBtn, jsonFileInput])]);
  requestAnimationFrame(() => {
    if (_dashboardSortable) { _dashboardSortable.destroy(); _dashboardSortable = null; }
    if (typeof Sortable === 'undefined') return;
    _dashboardSortable = Sortable.create(grid, {
      handle: '.widget-drag-handle',
      draggable: '[data-widget-id]',
      animation: 150,
      delay: 150,
      delayOnTouchOnly: true, // en mouse arrastra de inmediato; en tactil espera un poco para no pelear con el scroll
      onEnd: () => {
        const newOrder = Array.from(grid.querySelectorAll('[data-widget-id]')).map(node => node.getAttribute('data-widget-id'));
        DB.saveDashboardOrder(newOrder);
      },
    });
  });
  return el('div', { class: 'screen' }, [sectionLabel('—', 'Estado del atleta'), grid]);
}

