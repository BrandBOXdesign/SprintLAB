// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { DB } from '../db/db.js';
import { VideoDB } from '../db/videoDb.js';
import { render } from '../render/layout.js';
import { state } from '../state/state.js';
import { releaseVideoPlayback } from './video.js';
import { updateNotifications } from '../utils/notifications.js';

export function addSessionToCurrentAthlete(session) { const updated = [...state.sessions, { ...session, id: Date.now() }]; state.sessions = updated; DB.saveSessions(state.currentAthleteId, updated); updateNotifications(); render(); }

// Fase 1.3 del roadmap (UI/UX movil): soporte para el gesto "deslizar para
// eliminar" en la lista de sesiones. Sigue el mismo patron de confirmacion
// que ya existia para eliminar atletas (modal, no window.confirm).
export function confirmDeleteSession(sessionId) { state.confirmDeleteSessionId = sessionId; render(); }
export function cancelDeleteSession() { state.confirmDeleteSessionId = null; render(); }
export function executeDeleteSession(sessionId) {
  // Fase 2.2 del roadmap: si la sesion tenia un video local (IndexedDB), se
  // borra tambien, para no dejar blobs huerfanos sin ninguna sesion que los
  // referencie.
  const target = state.sessions.find(s => s.id === sessionId);
  if (target && target.videoId) {
    if (state.videoPlayback.sessionId === sessionId) releaseVideoPlayback();
    VideoDB.deleteVideo(target.videoId).catch(err => console.error('Error borrando video de la sesión eliminada:', err));
  }
  const updated = state.sessions.filter(s => s.id !== sessionId);
  state.sessions = updated;
  DB.saveSessions(state.currentAthleteId, updated);
  state.confirmDeleteSessionId = null;
  if (state.expandedSessionId === sessionId) state.expandedSessionId = null;
  updateNotifications();
  render();
}

