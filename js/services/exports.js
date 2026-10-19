// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { DB } from '../db/db.js';
import { MACRO_MODELS } from '../models/macrocycles.js';
import { state } from '../state/state.js';
import { acuteChronicRatio, getAlerts, getBestTimes, getPlannedVolume, getRealizedVolume, getVolumeStatus, ratioStatus } from '../utils/calculations.js';
import { el, escapeCSV } from '../utils/helpers.js';
import { showToast } from '../utils/notifications.js';

export function exportSessionsCSV() {
  const athlete = state.athlete, sessions = state.sessions;
  if (!sessions.length) { showToast('Sin sesiones para exportar'); return; }
  const headers = ['Fecha', 'Tipo', 'Subtipo gym', 'Duración (min)', 'RPE', 'Carga (RPE×min)', 'Mejor 100m (s)', 'Mejor 200m (s)', 'Series pista', 'Ejercicios gimnasio', 'Notas'];
  const rows = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date)).map(s => {
    const fecha = new Date(s.date).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const tipo = s.type === 'gym' ? 'Gimnasio' : s.type === 'track' ? 'Pista' : 'Campo';
    const carga = (s.rpe || 0) * (s.durationMin || 0);
    const seriesStr = (s.trackSeries || []).map(ts => { let str = ts.dist + 'm/' + ts.time + 's'; if (ts.wind != null) str += '/' + (ts.wind > 0 ? '+' : '') + ts.wind + 'viento'; if (ts.reactionTime != null) str += '/reac' + ts.reactionTime; if (ts.startTime != null) str += '/sal' + ts.startTime; return str; }).join('; ');
    const gymStr = (s.gymExercises || []).map(e => { let str = (e.exercise || 'Ejercicio') + ' ' + e.weight + 'kg×' + e.reps; if (e.estimated1RM) str += ' 1RM≈' + e.estimated1RM.toFixed(1) + 'kg'; if (e.velocity) str += ' vel≈' + e.velocity.toFixed(2) + 'm/s'; if (e.power) str += ' pot≈' + Math.round(e.power) + 'W'; return str; }).join('; ');
    return [fecha, tipo, s.gymSessionType || '', s.durationMin || '', s.rpe || '', carga, s.time100 || '', s.time200 || '', seriesStr, gymStr, s.notes || ''].map(escapeCSV).join(',');
  });
  const bom = '\uFEFF';
  const csv = bom + headers.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const name = (athlete ? athlete.name.replace(/\s+/g, '_') : 'atleta') + '_sesiones.csv';
  a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  showToast('CSV descargado');
}

export function exportProfileJSON() {
  const athlete = state.athlete, sessions = state.sessions;
  if (!athlete) return;
  const data = { exportDate: new Date().toISOString(), appVersion: 'Sprint Lab v2', athlete, model: state.model, weeklyPlan: state.weeklyPlan, customPhases: state.customPhases, clinicalNotes: DB.getClinicalNotes(state.currentAthleteId), sessions: [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date)) };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const name = (athlete.name.replace(/\s+/g, '_') || 'atleta') + '_backup.json';
  a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  DB.saveLastBackupDate(new Date().toISOString());
  showToast('Backup JSON descargado');
}

export function generatePDFReport() {
  const athlete = state.athlete, sessions = state.sessions, weeklyPlan = state.weeklyPlan, model = state.model ? MACRO_MODELS[state.model] : null;
  if (!athlete || sessions.length === 0) { showToast('No hay datos suficientes para generar el informe.'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const margin = 15;
  let y = margin;
  const addText = (text, size = 12, style = 'normal', color = '#000000', align = 'left') => { doc.setFontSize(size); doc.setFont('helvetica', style); doc.setTextColor(color); doc.text(text, margin, y, { align }); y += size * 0.6 + 2; };
  addText('SPRINT LAB - INFORME DE RENDIMIENTO', 18, 'bold', '#C8332A', 'center'); y += 4;
  addText(`Atleta: ${athlete.name}`, 14, 'bold', '#000000');
  addText(`Nivel: ${athlete.level || 'No definido'} · Edad: ${athlete.age || '?'} años · Peso: ${athlete.weight || '?'} kg`, 11, 'normal', '#555555');
  if (model) addText(`Modelo de macrociclo: ${model.name}`, 11, 'normal', '#555555');
  addText(`Fecha del informe: ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`, 10, 'normal', '#666666');
  y += 6;
  const bestTimes = getBestTimes(sessions);
  const target100 = athlete.target100 ? Number(athlete.target100) : null;
  const target200 = athlete.target200 ? Number(athlete.target200) : null;
  const marksData = [['Distancia', 'Mejor', 'Último', 'Objetivo'], ['100m', bestTimes.best100 !== null ? `${bestTimes.best100}s` : '—', bestTimes.last100 !== null ? `${bestTimes.last100}s` : '—', target100 ? `${target100}s` : '—'], ['200m', bestTimes.best200 !== null ? `${bestTimes.best200}s` : '—', bestTimes.last200 !== null ? `${bestTimes.last200}s` : '—', target200 ? `${target200}s` : '—']];
  doc.autoTable({ head: [marksData[0]], body: marksData.slice(1), startY: y, theme: 'striped', styles: { fontSize: 10 }, headStyles: { fillColor: '#C8332A', textColor: '#FFFFFF', fontSize: 11, fontStyle: 'bold' }, margin: { left: margin, right: margin } });
  y = doc.lastAutoTable.finalY + 6;
  const ratio = acuteChronicRatio(sessions);
  const rStatus = ratioStatus(ratio);
  const planned = getPlannedVolume(weeklyPlan);
  const realized = getRealizedVolume(sessions);
  const pct = planned > 0 ? Math.min(100, Math.round((realized / planned) * 100)) : 0;
  const volStatus = getVolumeStatus(planned, realized);
  addText('Resumen de carga', 14, 'bold', '#C8332A');
  addText(`Ratio Aguda:Crónica: ${ratio !== null ? ratio.toFixed(2) : 'Sin datos'} — ${rStatus.label}`, 11);
  addText(`Volumen semanal: ${realized} / ${planned} min (${pct}%) — ${volStatus.label}`, 11);
  y += 4;
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const last10 = sortedSessions.slice(0, 10);
  const sessionRows = last10.map(s => { const dateStr = new Date(s.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }); const typeLabel = s.type === 'gym' ? 'Gimnasio' : s.type === 'track' ? 'Pista' : 'Campo'; const seriesCount = (s.trackSeries?.length || 0) + (s.gymExercises?.length || 0); return [dateStr, typeLabel, s.rpe, s.durationMin + ' min', seriesCount > 0 ? seriesCount : '-']; });
  doc.autoTable({ head: [['Fecha', 'Tipo', 'RPE', 'Duración', 'Series']], body: sessionRows, startY: y, theme: 'striped', styles: { fontSize: 9 }, headStyles: { fillColor: '#3A3733', textColor: '#FFFFFF', fontSize: 10, fontStyle: 'bold' }, margin: { left: margin, right: margin } });
  y = doc.lastAutoTable.finalY + 6;
  addText('Gráficas de evolución', 14, 'bold', '#C8332A');
  const chartIds = ['chart-times', 'chart-load', 'chart-strength-rm', 'chart-strength-power', 'chart-tonnage', 'chart-series-velocity', 'chart-reaction', 'chart-start'];
  const chartCanvases = chartIds.map(id => document.getElementById(id)).filter(c => c);
  if (chartCanvases.length > 0) {
    for (const canvas of chartCanvases) {
      try {
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 170;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;
        if (y + imgHeight + 10 > 270) { doc.addPage(); y = margin; }
        doc.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
        y += imgHeight + 6;
      } catch (e) { console.warn('No se pudo capturar gráfica:', e); }
    }
  } else addText('No se encontraron gráficas para incluir.', 10, 'italic', '#888888');
  const alerts = getAlerts(athlete, sessions, weeklyPlan);
  if (alerts.length > 0) {
    if (y > 250) { doc.addPage(); y = margin; }
    addText('Alertas', 14, 'bold', '#C8332A');
    alerts.forEach(a => { const color = a.level === 'green' ? '#5A8F5A' : a.level === 'yellow' ? '#D9A441' : '#C8332A'; addText(`• ${a.msg}`, 10, 'normal', color); });
  }
  doc.setFontSize(8); doc.setTextColor('#999999');
  doc.text('Informe generado automáticamente por Sprint Lab', margin, 285, { align: 'center' });
  const fileName = `${athlete.name.replace(/\s+/g, '_')}_informe_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fileName);
  showToast('Informe PDF generado y descargado');
}

