// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
export const DB = {
  getAthleteIds() {
    try { return JSON.parse(localStorage.getItem('sl:athlete-ids') || '[]'); } catch { return []; }
  },
  saveAthleteIds(ids) {
    localStorage.setItem('sl:athlete-ids', JSON.stringify(ids));
  },
  getAthlete(id) {
    try { return JSON.parse(localStorage.getItem(`sl:athlete:${id}`) || 'null'); } catch { return null; }
  },
  saveAthlete(id, data) {
    localStorage.setItem(`sl:athlete:${id}`, JSON.stringify(data));
  },
  deleteAthlete(id) {
    localStorage.removeItem(`sl:athlete:${id}`);
    localStorage.removeItem(`sl:sessions:${id}`);
    localStorage.removeItem(`sl:model:${id}`);
    localStorage.removeItem(`sl:weeklyPlan:${id}`);
    localStorage.removeItem(`sl:dismissed:${id}`);
    const ids = DB.getAthleteIds().filter(i => i !== id);
    DB.saveAthleteIds(ids);
  },
  getSessions(athleteId) {
    try {
      const raw = JSON.parse(localStorage.getItem(`sl:sessions:${athleteId}`) || '[]');
      // videoId/videoMarkers/strideData: Fase 2.2 (video local). Solo se
      // guarda aqui la referencia (videoId) al blob real, que vive en
      // IndexedDB (ver js/db/videoDb.js), no en localStorage.
      return raw.map(s => ({
        ...s,
        trackSeries: Array.isArray(s.trackSeries) ? s.trackSeries : [],
        gymExercises: Array.isArray(s.gymExercises) ? s.gymExercises : [],
        videoId: s.videoId || null,
        videoMarkers: Array.isArray(s.videoMarkers) ? s.videoMarkers : [],
        strideData: s.strideData || null,
      }));
    } catch { return []; }
  },
  saveSessions(athleteId, sessions) {
    localStorage.setItem(`sl:sessions:${athleteId}`, JSON.stringify(sessions));
  },
  getModel(athleteId) {
    try { return JSON.parse(localStorage.getItem(`sl:model:${athleteId}`) || 'null'); } catch { return null; }
  },
  saveModel(athleteId, modelId) {
    localStorage.setItem(`sl:model:${athleteId}`, JSON.stringify(modelId));
  },
  getClinicalNotes(athleteId) {
    return localStorage.getItem(`sl:notes:${athleteId}`) || '';
  },
  saveClinicalNotes(athleteId, notes) {
    localStorage.setItem(`sl:notes:${athleteId}`, notes);
  },
  getWeeklyPlan(athleteId) {
    try { return JSON.parse(localStorage.getItem(`sl:weeklyPlan:${athleteId}`) || 'null'); } catch { return null; }
  },
  saveWeeklyPlan(athleteId, plan) {
    localStorage.setItem(`sl:weeklyPlan:${athleteId}`, JSON.stringify(plan));
  },
  getDismissedNotifications(athleteId) {
    try { return JSON.parse(localStorage.getItem(`sl:dismissed:${athleteId}`) || '[]'); } catch { return []; }
  },
  saveDismissedNotifications(athleteId, list) {
    localStorage.setItem(`sl:dismissed:${athleteId}`, JSON.stringify(list));
  },
  // Fase 1.2 del roadmap (version simplificada, sin Google Drive/OneDrive):
  // solo recordamos CUANDO fue el ultimo backup local (JSON) que el propio
  // entrenador descargo, para poder avisarle si ya pasaron 7+ dias. Es un
  // dato global de la app (no por atleta), ya que es un habito, no un dato
  // de un atleta en particular.
  getLastBackupDate() {
    return localStorage.getItem('sl:last-backup-date') || null;
  },
  saveLastBackupDate(isoDate) {
    localStorage.setItem('sl:last-backup-date', isoDate);
  },
  // Fase 5.2 del roadmap: orden de los widgets del dashboard, elegido por el
  // propio entrenador arrastrandolos. Es una preferencia de UI global de la
  // app (no por atleta), guardada como un simple arreglo de ids.
  getDashboardOrder() {
    const raw = localStorage.getItem('sl:dashboard-order');
    return raw ? JSON.parse(raw) : null;
  },
  saveDashboardOrder(orderArray) {
    localStorage.setItem('sl:dashboard-order', JSON.stringify(orderArray));
  },
  migrate() {
    const oldAthlete = localStorage.getItem('sprintlab-athlete-profile');
    const oldSessions = localStorage.getItem('sprintlab-sessions-log');
    const oldModel = localStorage.getItem('sprintlab-macrocycle-model');
    if (!oldAthlete) return;
    try {
      const athlete = JSON.parse(oldAthlete);
      if (!athlete || !athlete.name) return;
      if (DB.getAthleteIds().length > 0) return;
      const id = 'athlete-' + Date.now();
      DB.saveAthleteIds([id]);
      DB.saveAthlete(id, { ...athlete, id });
      if (oldSessions) {
        const sessions = JSON.parse(oldSessions).map(s => ({ ...s, trackSeries: Array.isArray(s.trackSeries) ? s.trackSeries : [], gymExercises: Array.isArray(s.gymExercises) ? s.gymExercises : [] }));
        DB.saveSessions(id, sessions);
      }
      if (oldModel) DB.saveModel(id, JSON.parse(oldModel));
      localStorage.removeItem('sprintlab-athlete-profile');
      localStorage.removeItem('sprintlab-sessions-log');
      localStorage.removeItem('sprintlab-macrocycle-model');
      console.log('Sprint Lab: migración completada para', athlete.name);
    } catch(e) { console.error('Error en migración:', e); }
  },
  // Fase 4.1/4.2 del roadmap: fases personalizadas de macrociclo, con
  // plantilla semanal propia por fase (microciclos variables).
  getCustomPhases(athleteId) {
    const raw = localStorage.getItem(`sl:customPhases:${athleteId}`);
    try { return raw ? JSON.parse(raw) : []; } catch { return []; }
  },
  saveCustomPhases(athleteId, phases) {
    localStorage.setItem(`sl:customPhases:${athleteId}`, JSON.stringify(phases));
  },
};
