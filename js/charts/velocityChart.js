// Gráfica de velocidad por serie para una distancia dada (100m / 200m).
import { baseChartConfig, createChart } from './loadChart.js';

export function renderVelocityChart(canvasId, seriesData) {
  const labels = seriesData.map(sd => new Date(sd.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }));
  const cfg = baseChartConfig();
  createChart(canvasId, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Mejor velocidad (m/s)', data: seriesData.map(sd => Number(sd.velocity.toFixed(2))), borderColor: '#D9A441', backgroundColor: 'rgba(217,164,65,0.15)', tension: 0.25 },
      ],
    },
    options: cfg.options,
  });
}

// Fase 2.1: velocidad instantánea a lo largo de una salida importada desde GPX
// (eje X = distancia acumulada en metros, no fechas de sesión).
export function renderGpxVelocityChart(canvasId, speedPoints) {
  const labels = speedPoints.map(sp => `${Math.round(sp.distance)}m`);
  const cfg = baseChartConfig();
  createChart(canvasId, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Velocidad (m/s)', data: speedPoints.map(sp => Number(sp.speed.toFixed(2))), borderColor: '#5A8F5A', backgroundColor: 'rgba(90,143,90,0.15)', pointRadius: 0, tension: 0.15 },
      ],
    },
    options: {
      ...cfg.options,
      scales: {
        ...cfg.options.scales,
        x: { ...cfg.options.scales.x, ticks: { ...cfg.options.scales.x.ticks, maxTicksLimit: 10 } },
      },
    },
  });
}
