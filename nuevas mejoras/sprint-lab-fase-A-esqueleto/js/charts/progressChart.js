// Implementación de las gráficas de la pestaña "Progreso" (Fase 2.3 / 5.1 del roadmap).
import { baseChartConfig, createChart } from './loadChart.js';

export function renderTimesChart(canvasId, sessions) {
  const withTimes = sessions
    .filter(s => s.type === 'track' && (s.time100 || s.time200))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const labels = withTimes.map(s => new Date(s.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }));
  const data100 = withTimes.map(s => s.time100 ? Number(s.time100) : null);
  const data200 = withTimes.map(s => s.time200 ? Number(s.time200) : null);
  const cfg = baseChartConfig();
  createChart(canvasId, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: '100m (s)', data: data100, borderColor: '#C8332A', backgroundColor: 'rgba(200,51,42,0.15)', spanGaps: true, tension: 0.25 },
        { label: '200m (s)', data: data200, borderColor: '#D9A441', backgroundColor: 'rgba(217,164,65,0.15)', spanGaps: true, tension: 0.25 },
      ],
    },
    options: cfg.options,
  });
}

export function renderReactionStartChart(canvasId, reactionData, startData) {
  const dates = Array.from(new Set([...reactionData, ...startData].map(d => d.date))).sort((a, b) => new Date(a) - new Date(b));
  const labels = dates.map(d => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }));
  const byDateAvg = (arr) => dates.map(d => {
    const vals = arr.filter(x => x.date === d).map(x => x.value);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  });
  const cfg = baseChartConfig();
  createChart(canvasId, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Reacción (s)', data: byDateAvg(reactionData), borderColor: '#D9A441', backgroundColor: 'rgba(217,164,65,0.15)', spanGaps: true, tension: 0.25 },
        { label: 'Salida (s)', data: byDateAvg(startData), borderColor: '#5A8F5A', backgroundColor: 'rgba(90,143,90,0.15)', spanGaps: true, tension: 0.25 },
      ],
    },
    options: cfg.options,
  });
}

export function renderStrengthChart(canvasId, oneRMData, powerData) {
  const dates = Array.from(new Set([...oneRMData.map(d => d.date), ...powerData.map(d => d.date)])).sort((a, b) => new Date(a) - new Date(b));
  const labels = dates.map(d => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }));
  const rmByDate = dates.map(d => { const v = oneRMData.find(x => x.date === d); return v ? v.rm : null; });
  const powerByDate = dates.map(d => { const v = powerData.find(x => x.date === d); return v ? v.power : null; });
  const cfg = baseChartConfig();
  createChart(canvasId, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: '1RM estimado (kg)', data: rmByDate, borderColor: '#C8332A', backgroundColor: 'rgba(200,51,42,0.15)', spanGaps: true, tension: 0.25, yAxisID: 'y' },
        { label: 'Potencia (W)', data: powerByDate, borderColor: '#5A8F5A', backgroundColor: 'rgba(90,143,90,0.15)', spanGaps: true, tension: 0.25, yAxisID: 'y1' },
      ],
    },
    options: {
      ...cfg.options,
      scales: {
        x: cfg.options.scales.x,
        y: { ...cfg.options.scales.y, position: 'left' },
        y1: { ...cfg.options.scales.y, position: 'right', grid: { display: false } },
      },
    },
  });
}

export function renderTonnageChart(canvasId, tonnageData) {
  const labels = tonnageData.map(t => new Date(t.week + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }));
  const cfg = baseChartConfig();
  createChart(canvasId, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Tonelaje semanal (kg)', data: tonnageData.map(t => t.tonnage), backgroundColor: 'rgba(217,164,65,0.5)', borderColor: '#D9A441', borderWidth: 1 }] },
    options: cfg.options,
  });
}
