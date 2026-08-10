import { renderReactionStartChart, renderStrengthChart, renderTimesChart, renderTonnageChart } from '../charts/progressChart.js';
import { renderVelocityChart } from '../charts/velocityChart.js';
import { render } from './layout.js';
import { state } from '../state/state.js';
import {
  getBestReaction, getBestSeriesForDistance, getBestStart, getBestTimes,
  getExercise1RMData, getExerciseNames, getExercisePowerData, getFatigueIndicator,
  getReactionData, getSeriesDataForDistance, getStartData, getWeeklyTonnage,
  predictWeeksToTarget,
} from '../utils/calculations.js';
import { el, emptyState, sectionLabel } from '../utils/helpers.js';

const PROGRESS_TABS = [
  { id: 'times', label: 'Tiempos' },
  { id: 'series', label: 'Series' },
  { id: 'reaction', label: 'Reacción/Salida' },
  { id: 'strength', label: 'Fuerza' },
];

function tabBar() {
  return el('div', { class: 'chart-tabs' }, PROGRESS_TABS.map(t =>
    el('button', {
      class: 'chart-tab' + (state.progressTab === t.id ? ' active' : ''),
      onClick: () => { state.progressTab = t.id; render(); },
    }, t.label)
  ));
}

function predictionLabel(weeks) {
  if (weeks === null) return 'Faltan datos (se necesitan al menos 2 marcas y un objetivo en Perfil).';
  if (weeks === Infinity) return 'La tendencia actual no mejora hacia el objetivo.';
  if (weeks === 0) return '¡Objetivo ya alcanzado!';
  return `≈ ${Math.ceil(weeks)} semana${Math.ceil(weeks) === 1 ? '' : 's'} para llegar al objetivo (proyección lineal).`;
}

// Umbral simple de caída de velocidad entre la primera y última repetición de
// una serie, usado solo para colorear el indicador (no viene especificado en
// el documento original, es un criterio razonable de fatiga por sprint).
function fatigueClass(dropPercent) {
  if (dropPercent < 5) return 'fatigue-low';
  if (dropPercent <= 15) return 'fatigue-moderate';
  return 'fatigue-high';
}

function renderTimesTab(sessions, athlete, initializers) {
  const bestTimes = getBestTimes(sessions);
  const with100 = sessions.filter(s => s.type === 'track' && s.time100).sort((a, b) => new Date(a.date) - new Date(b.date));
  const with200 = sessions.filter(s => s.type === 'track' && s.time200).sort((a, b) => new Date(a.date) - new Date(b.date));
  const target100 = athlete && athlete.target100 ? Number(athlete.target100) : null;
  const target200 = athlete && athlete.target200 ? Number(athlete.target200) : null;
  const weeks100 = predictWeeksToTarget(with100.map(s => s.time100), with100.map(s => s.date), target100);
  const weeks200 = predictWeeksToTarget(with200.map(s => s.time200), with200.map(s => s.date), target200);

  const summaryCard = el('div', { class: 'chart-card' }, [
    el('div', { class: 'chart-title' }, 'Mejores marcas'),
    el('div', { style: { display: 'flex', gap: '20px', flexWrap: 'wrap' } }, [
      el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, '100m'), el('div', { style: { fontSize: '18px', fontWeight: '700' } }, bestTimes.best100 !== null ? `${bestTimes.best100}s` : '—')]),
      el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, '200m'), el('div', { style: { fontSize: '18px', fontWeight: '700' } }, bestTimes.best200 !== null ? `${bestTimes.best200}s` : '—')]),
    ]),
  ]);

  const predictionCard = el('div', { class: 'prediction-card' }, [
    el('div', { class: 'prediction-label' }, 'Proyección al objetivo · 100m'),
    el('div', { class: 'prediction-value', style: { fontSize: '16px' } }, predictionLabel(weeks100)),
    el('div', { class: 'prediction-label', style: { marginTop: '10px' } }, 'Proyección al objetivo · 200m'),
    el('div', { class: 'prediction-value', style: { fontSize: '16px' } }, predictionLabel(weeks200)),
  ]);

  const hasData = with100.length > 0 || with200.length > 0;
  const chartCard = el('div', { class: 'chart-card' }, [
    el('div', { class: 'chart-title' }, 'Evolución de tiempos'),
    hasData
      ? el('div', { class: 'chart-canvas-wrap' }, [el('canvas', { id: 'chart-times' })])
      : el('div', { class: 'chart-empty' }, 'Aún no hay sesiones de pista con tiempos registrados.'),
  ]);
  if (hasData) initializers.push(() => renderTimesChart('chart-times', sessions));

  return [summaryCard, predictionCard, chartCard];
}

function renderSeriesTab(sessions, initializers) {
  const distSelect = el('select', { class: 'exercise-selector', onchange: (e) => { state.progressDist = e.target.value; render(); } }, [
    el('option', { value: '100', selected: state.progressDist === '100' }, '100 metros'),
    el('option', { value: '200', selected: state.progressDist === '200' }, '200 metros'),
  ]);
  distSelect.value = state.progressDist;

  const seriesData = getSeriesDataForDistance(sessions, state.progressDist);
  const best = getBestSeriesForDistance(sessions, state.progressDist);
  const fatigueData = getFatigueIndicator(seriesData);
  const lastFatigue = fatigueData[fatigueData.length - 1];

  const summaryCard = el('div', { class: 'chart-card' }, [
    el('div', { class: 'chart-title' }, `Mejor serie · ${state.progressDist}m`),
    el('div', { style: { display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' } }, [
      el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, 'Velocidad'), el('div', { style: { fontSize: '18px', fontWeight: '700' } }, best.velocity ? `${best.velocity.toFixed(2)} m/s` : '—')]),
      el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, 'Tiempo'), el('div', { style: { fontSize: '18px', fontWeight: '700' } }, best.time !== null ? `${best.time}s` : '—')]),
      lastFatigue
        ? el('span', { class: `fatigue-indicator ${fatigueClass(lastFatigue.dropPercent)}` }, `Caída últ. sesión: ${lastFatigue.dropPercent.toFixed(1)}%`)
        : null,
    ]),
  ]);

  const chartCard = el('div', { class: 'chart-card' }, [
    el('div', { class: 'chart-title' }, 'Velocidad por sesión (mejor serie)'),
    seriesData.length
      ? el('div', { class: 'chart-canvas-wrap' }, [el('canvas', { id: 'chart-velocity' })])
      : el('div', { class: 'chart-empty' }, `Aún no hay series de ${state.progressDist}m registradas.`),
  ]);
  if (seriesData.length) initializers.push(() => renderVelocityChart('chart-velocity', seriesData));

  return [distSelect, summaryCard, chartCard];
}

function renderReactionTab(sessions, initializers) {
  const reactionData = getReactionData(sessions);
  const startData = getStartData(sessions);
  const bestReaction = getBestReaction(sessions);
  const bestStart = getBestStart(sessions);

  const summaryCard = el('div', { class: 'chart-card' }, [
    el('div', { class: 'chart-title' }, 'Mejores marcas'),
    el('div', { style: { display: 'flex', gap: '20px', flexWrap: 'wrap' } }, [
      el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, 'Reacción'), el('div', { style: { fontSize: '18px', fontWeight: '700' } }, bestReaction ? [`${bestReaction.time}s`, el('span', { class: 'reaction-badge' }, bestReaction.serie.dist + 'm')] : '—')]),
      el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, 'Salida'), el('div', { style: { fontSize: '18px', fontWeight: '700' } }, bestStart ? [`${bestStart.time}s`, el('span', { class: 'power-badge' }, bestStart.serie.dist + 'm')] : '—')]),
    ]),
  ]);

  const hasData = reactionData.length > 0 || startData.length > 0;
  const chartCard = el('div', { class: 'chart-card' }, [
    el('div', { class: 'chart-title' }, 'Evolución de reacción y salida'),
    hasData
      ? el('div', { class: 'chart-canvas-wrap' }, [el('canvas', { id: 'chart-reaction' })])
      : el('div', { class: 'chart-empty' }, 'Aún no hay tiempos de reacción/salida registrados.'),
  ]);
  if (hasData) initializers.push(() => renderReactionStartChart('chart-reaction', reactionData, startData));

  return [summaryCard, chartCard];
}

function renderStrengthTab(sessions, initializers) {
  const exerciseNames = getExerciseNames(sessions);
  if (exerciseNames.length === 0) {
    return [el('div', { class: 'chart-card' }, [el('div', { class: 'chart-empty' }, 'Aún no hay ejercicios de gimnasio registrados.')])];
  }
  if (!state.progressExercise || !exerciseNames.includes(state.progressExercise)) state.progressExercise = exerciseNames[0];

  const exerciseSelect = el('select', { class: 'exercise-selector', onchange: (e) => { state.progressExercise = e.target.value; render(); } },
    exerciseNames.map(name => el('option', { value: name, selected: name === state.progressExercise }, name)));
  exerciseSelect.value = state.progressExercise;

  const oneRMData = getExercise1RMData(sessions, state.progressExercise);
  const powerData = getExercisePowerData(sessions, state.progressExercise);
  const tonnageData = getWeeklyTonnage(sessions);

  const lastRM = oneRMData[oneRMData.length - 1];
  const summaryCard = el('div', { class: 'chart-card' }, [
    el('div', { class: 'chart-title' }, state.progressExercise),
    el('div', { style: { display: 'flex', gap: '20px', flexWrap: 'wrap' } }, [
      el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, '1RM estimado más reciente'), el('div', { style: { fontSize: '18px', fontWeight: '700' } }, lastRM ? `${lastRM.rm.toFixed(1)} kg` : '—')]),
    ]),
  ]);

  const strengthChartCard = el('div', { class: 'chart-card' }, [
    el('div', { class: 'chart-title' }, '1RM y potencia'),
    (oneRMData.length || powerData.length)
      ? el('div', { class: 'chart-canvas-wrap' }, [el('canvas', { id: 'chart-strength' })])
      : el('div', { class: 'chart-empty' }, 'Sin datos de 1RM/potencia para este ejercicio.'),
  ]);
  if (oneRMData.length || powerData.length) initializers.push(() => renderStrengthChart('chart-strength', oneRMData, powerData));

  const tonnageChartCard = el('div', { class: 'chart-card' }, [
    el('div', { class: 'chart-title' }, 'Tonelaje semanal (todos los ejercicios)'),
    tonnageData.length
      ? el('div', { class: 'chart-canvas-wrap' }, [el('canvas', { id: 'chart-tonnage' })])
      : el('div', { class: 'chart-empty' }, 'Sin sesiones de gimnasio registradas.'),
  ]);
  if (tonnageData.length) initializers.push(() => renderTonnageChart('chart-tonnage', tonnageData));

  return [exerciseSelect, summaryCard, strengthChartCard, tonnageChartCard];
}

export function renderProgressScreen() {
  const athlete = state.athlete, sessions = state.sessions;
  if (!athlete) return el('div', { class: 'screen' }, [emptyState('Selecciona un atleta para ver su progreso.')]);
  if (!sessions.length) return el('div', { class: 'screen' }, [sectionLabel('04', 'Progreso'), emptyState('Registra sesiones para ver gráficas de progreso.')]);

  const initializers = [];
  let tabContent;
  if (state.progressTab === 'series') tabContent = renderSeriesTab(sessions, initializers);
  else if (state.progressTab === 'reaction') tabContent = renderReactionTab(sessions, initializers);
  else if (state.progressTab === 'strength') tabContent = renderStrengthTab(sessions, initializers);
  else tabContent = renderTimesTab(sessions, athlete, initializers);

  const screen = el('div', { class: 'screen' }, [sectionLabel('04', 'Progreso'), tabBar(), ...tabContent]);

  // Chart.js necesita que el <canvas> ya esté insertado en el DOM real.
  // render() en layout.js inserta este nodo de forma síncrona justo después
  // de que esta función retorna, así que un requestAnimationFrame es
  // suficiente para esperar a que eso ocurra antes de crear las gráficas.
  if (initializers.length) requestAnimationFrame(() => initializers.forEach(fn => fn()));

  return screen;
}
