// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { DB } from '../db/db.js';
import { render } from '../render/layout.js';
import { state } from '../state/state.js';
import { acuteChronicRatio, getBestTimes, getNextSession, registrationGapDays } from './calculations.js';
import { el } from './helpers.js';

export function showToast(msg) {
  let t = document.getElementById('sl-toast');
  if (!t) { t = document.createElement('div'); t.id = 'sl-toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('visible'), 2200);
}

// ---------- Notificaciones (Mejora 12) ----------

export function updateNotifications() {
  const athlete = state.athlete, sessions = state.sessions, weeklyPlan = state.weeklyPlan;
  if (!athlete) { state.notifications = []; return; }
  const notifs = [], dismissed = state.dismissedIds || [];
  if (sessions.length === 0) { notifs.push({ id: 'no-data', type: 'warning', msg: 'Aún no hay sesiones registradas. Comienza a registrar para ver tu progreso.' }); }
  const gap = registrationGapDays(sessions);
  if (gap !== null && gap >= 3) notifs.push({ id: 'gap-' + gap, type: 'warning', msg: `⚠️ Han pasado ${gap} días desde la última sesión. ¿Estás siguiendo el plan?` });
  const ratio = acuteChronicRatio(sessions);
  if (ratio !== null) {
    if (ratio < 0.8) notifs.push({ id: 'ratio-low', type: 'warning', msg: `Ratio AC bajo (${ratio.toFixed(2)}). Posible desentrenamiento.` });
    else if (ratio > 1.5) notifs.push({ id: 'ratio-high', type: 'danger', msg: `🔴 Ratio AC alto (${ratio.toFixed(2)}). Riesgo de lesión.` });
    else notifs.push({ id: 'ratio-ok', type: 'success', msg: `✅ Ratio AC en zona óptima (${ratio.toFixed(2)}). Buen trabajo.` });
  }
  const next = getNextSession(weeklyPlan);
  if (next) {
    const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const now = new Date();
    const todayName = days[now.getDay()];
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1); const tomorrowName = days[tomorrow.getDay()];
    if (next.day === todayName) notifs.push({ id: 'session-today', type: 'info', msg: `📅 Sesión de hoy: ${next.label || next.day}` });
    else if (next.day === tomorrowName) notifs.push({ id: 'session-tomorrow', type: 'info', msg: `📅 Sesión mañana: ${next.label || next.day}` });
    else notifs.push({ id: 'session-next', type: 'info', msg: `📅 Próxima sesión: ${next.day} · ${next.label || ''}` });
  } else if (weeklyPlan) notifs.push({ id: 'no-next-session', type: 'warning', msg: 'No hay sesiones planificadas en el plan semanal.' });
  const bestTimes = getBestTimes(sessions);
  const target100 = athlete.target100 ? Number(athlete.target100) : null;
  if (target100 && bestTimes.best100 !== null) {
    const diff = bestTimes.best100 - target100;
    if (diff > 0.2) notifs.push({ id: 'target100-far', type: 'warning', msg: `🎯 100m: a ${diff.toFixed(2)}s del objetivo (${target100}s). Sigue trabajando.` });
    else if (diff <= 0) notifs.push({ id: 'target100-achieved', type: 'success', msg: `🎯 100m: ¡objetivo alcanzado! (${bestTimes.best100}s)` });
    else notifs.push({ id: 'target100-close', type: 'success', msg: `🎯 100m: a ${(-diff).toFixed(2)}s del objetivo. ¡Cerca!` });
  }
  if (weeklyPlan) {
    const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const today = new Date(); const todayName = days[today.getDay()];
    const planToday = weeklyPlan.find(d => d.day === todayName);
    if (planToday && planToday.type !== 'rest') {
      const todaySessions = sessions.filter(s => { const d = new Date(s.date); return d.toDateString() === today.toDateString(); });
      if (todaySessions.length === 0) notifs.push({ id: 'reminder-today', type: 'info', msg: `🔔 Recuerda: hoy tienes ${planToday.label || 'entrenamiento'}.` });
    }
  }
  // Fase 1.2 del roadmap (version simplificada, sin Google Drive/OneDrive):
  // recordatorio de backup local si han pasado 7+ dias desde el ultimo
  // "Backup JSON" descargado (o si nunca se ha hecho uno).
  const lastBackup = DB.getLastBackupDate();
  const daysSinceBackup = lastBackup ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24)) : null;
  if (daysSinceBackup === null) notifs.push({ id: 'backup-never', type: 'warning', msg: '💾 Todavía no has hecho ningún backup local. Ve a "Estado" y descarga tu Backup JSON por seguridad.' });
  else if (daysSinceBackup >= 7) notifs.push({ id: 'backup-due-' + Math.floor(daysSinceBackup / 7), type: 'warning', msg: `💾 Han pasado ${daysSinceBackup} días desde tu último backup local. Descarga uno nuevo desde "Estado".` });
  state.notifications = notifs.filter(n => !dismissed.includes(n.id));
}

export function dismissNotification(id) { if (!state.dismissedIds.includes(id)) { state.dismissedIds.push(id); DB.saveDismissedNotifications(state.currentAthleteId, state.dismissedIds); } state.notifications = state.notifications.filter(n => n.id !== id); render(); }
