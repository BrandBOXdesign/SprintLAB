// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
export function baseChartConfig() {
  return {
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
      plugins: {
        legend: { display: true, labels: { color: '#8A857C', font: { size: 10 } } },
        tooltip: { backgroundColor: '#17150F', borderColor: '#3A3733', borderWidth: 1, titleColor: '#D9A441', bodyColor: '#F2EFE9', padding: 10 },
      },
      scales: {
        x: { ticks: { color: '#8A857C', font: { size: 10 }, maxTicksLimit: 8 }, grid: { color: 'rgba(58,55,51,0.5)' } },
        y: { ticks: { color: '#8A857C', font: { size: 10 } }, grid: { color: 'rgba(58,55,51,0.5)' } },
      },
    },
  };
}

export const _charts = {};

export function destroyChart(id) { if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; } }

export function createChart(id, config) { destroyChart(id); const canvas = document.getElementById(id); if (!canvas) return; _charts[id] = new Chart(canvas, config); }

