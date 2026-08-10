// Fase 6.3 del roadmap: respaldo automático real. Hasta ahora la única
// protección era un recordatorio para que el entrenador descargara un
// "Backup JSON" a mano (fácil de ignorar, y de un solo atleta a la vez).
// Este módulo corre solo, sin que nadie tenga que acordarse de nada, y
// respalda a TODOS los atletas de un jalón.
//
// Requiere el puente `window.sprintlabDesktop` que expone preload.js -- si
// la app corre empaquetada con Electron (ver electron-main.js) existe; si
// alguien abre index.html en un navegador normal (ej. para probar sin
// empaquetar), no existe, y aquí simplemente no se hace nada -- el
// recordatorio manual de notifications.js sigue siendo el respaldo de ese
// caso (ver ajuste en notifications.js).
import { DB } from '../db/db.js';

const AUTO_BACKUP_KEY = 'sl:lastAutoBackupDate';
const MIN_HOURS_BETWEEN_BACKUPS = 24;

function isDesktopBridgeAvailable() {
  return typeof window !== 'undefined' && !!window.sprintlabDesktop;
}

// Junta el estado completo de TODOS los atletas (no solo el que está
// abierto ahora mismo) en un solo objeto -- un respaldo automático debe
// proteger todo lo que el entrenador tiene cargado, no solo lo que está
// viendo en este momento.
function buildFullBackupPayload() {
  const ids = DB.getAthleteIds();
  const athletes = ids.map(id => ({
    athlete: DB.getAthlete(id),
    sessions: DB.getSessions(id),
    model: DB.getModel(id),
    clinicalNotes: DB.getClinicalNotes(id),
    weeklyPlan: DB.getWeeklyPlan(id),
    customPhases: DB.getCustomPhases(id),
    competitions: DB.getCompetitions(id),
  })).filter(a => a.athlete);
  return { backupSchema: 1, kind: 'full-auto-backup', exportedAt: new Date().toISOString(), athletes };
}

function backupFilename(date = new Date()) {
  return `sprintlab-auto-backup-${date.toISOString().replace(/[:.]/g, '-')}.json`;
}

/**
 * Corre el respaldo automático si ya pasaron 24h+ desde el último (o si
 * nunca se ha hecho uno). Se llama al arrancar la app y luego cada hora
 * (ver app.js) -- así no depende de que la app se quede abierta 24h
 * seguidas para disparar el primer respaldo.
 */
export async function runAutoBackupIfDue() {
  if (!isDesktopBridgeAvailable()) return { ran: false, reason: 'no-bridge' };
  const last = localStorage.getItem(AUTO_BACKUP_KEY);
  const hoursSince = last ? (Date.now() - new Date(last).getTime()) / 3600000 : Infinity;
  if (hoursSince < MIN_HOURS_BETWEEN_BACKUPS) return { ran: false, reason: 'not-due' };
  try {
    const payload = buildFullBackupPayload();
    if (!payload.athletes.length) return { ran: false, reason: 'no-athletes' };
    const filename = backupFilename();
    const result = await window.sprintlabDesktop.saveAutoBackup(filename, JSON.stringify(payload));
    if (result && result.ok) {
      localStorage.setItem(AUTO_BACKUP_KEY, new Date().toISOString());
      return { ran: true, path: result.path };
    }
    return { ran: false, reason: 'save-failed', error: result && result.error };
  } catch (e) {
    console.error('Error en respaldo automático:', e);
    return { ran: false, reason: 'exception', error: String(e) };
  }
}

/** Estado para mostrar en la UI: si el puente existe, cuándo fue el último respaldo. */
export function getAutoBackupStatus() {
  return {
    available: isDesktopBridgeAvailable(),
    lastBackup: localStorage.getItem(AUTO_BACKUP_KEY),
  };
}

export async function openBackupsFolder() {
  if (!isDesktopBridgeAvailable()) return;
  await window.sprintlabDesktop.openBackupsFolder();
}
