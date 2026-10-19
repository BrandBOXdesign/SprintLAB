// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { DB } from '../db/db.js';
import { VideoDB } from '../db/videoDb.js';
import { MACRO_MODELS } from '../models/macrocycles.js';
import { render } from '../render/layout.js';
import { state } from '../state/state.js';
import { getCurrentPhase } from '../utils/calculations.js';
import { todayISO } from '../utils/helpers.js';
import { updateNotifications } from '../utils/notifications.js';

export function loadAll() { DB.migrate(); const ids = DB.getAthleteIds(); state.athletes = ids.map(id => DB.getAthlete(id)).filter(Boolean); state.loading = false; render(); }

// ---------- Acciones ----------

export function selectAthlete(id) {
  state.currentAthleteId = id;
  state.athlete = DB.getAthlete(id);
  state.sessions = DB.getSessions(id);
  state.model = DB.getModel(id);
  state.customPhases = DB.getCustomPhases(id);
  state.profileForm = { ...state.athlete, target100: state.athlete?.target100 || '', target200: state.athlete?.target200 || '' };
  let plan = DB.getWeeklyPlan(id);
  if (!plan && state.model === 'custom') {
    const seasonStart = state.athlete && state.athlete.seasonStart;
    const currentPhase = seasonStart ? getCurrentPhase(seasonStart, state.customPhases) : null;
    const defaultDurations = { gym: 60, track: 90, field: 120, rest: 0 };
    const template = (currentPhase && currentPhase.weeklyTemplate) || ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map(day => ({ day, type: 'rest', label: '' }));
    plan = template.map(day => ({ ...day, customLabel: day.label, plannedDuration: defaultDurations[day.type] ?? 60 }));
    DB.saveWeeklyPlan(id, plan);
  } else if (!plan && state.model) {
    const modelData = MACRO_MODELS[state.model];
    if (modelData) {
      const defaultDurations = { gym: 60, track: 90, field: 120, rest: 0 };
      plan = modelData.weeklyTemplate.map(day => ({ ...day, customLabel: day.label, plannedDuration: defaultDurations[day.type] ?? 60 }));
      DB.saveWeeklyPlan(id, plan);
    }
  }
  state.weeklyPlan = plan;
  state.logForm = {
    type: 'track', rpe: 5, duration: '', notes: '', sessionDate: todayISO(),
    trackSeries: [], showTrackSerieForm: false,
    serieFormDist: '100', serieFormTime: '', serieFormWind: '',
    serieFormReaction: '', serieFormStart: '',
    gymExercises: [], showGymExForm: false,
    gymFormExercise: '', gymFormWeight: '', gymFormReps: '',
    gymSessionType: 'fuerza',
  };
  state.tab = 'dashboard';
  state.view = 'app';
  state.progressExercises = [];
  state.dismissedIds = DB.getDismissedNotifications(id);
  updateNotifications();
  render();
}

export function backToAthletes() { state.view = 'athletes'; state.currentAthleteId = null; state.athlete = null; const ids = DB.getAthleteIds(); state.athletes = ids.map(id => DB.getAthlete(id)).filter(Boolean); render(); }

export function openNewAthleteForm() { state.athleteForm = { name: '', age: '', weight: '', time100: '', time200: '', level: 'intermedio', seasonStart: '', target100: '', target200: '' }; state.view = 'athlete-form'; render(); }

export function saveNewAthlete() {
  const f = state.athleteForm;
  if (!f.name.trim()) { state.saveError = 'El nombre del atleta es obligatorio.'; render(); return; }
  const id = 'athlete-' + Date.now();
  const data = { ...f, id, name: f.name.trim() };
  const ids = DB.getAthleteIds();
  ids.push(id);
  DB.saveAthleteIds(ids);
  DB.saveAthlete(id, data);
  state.athletes.push(data);
  selectAthlete(id);
}

export function confirmDeleteAthlete(id) { state.confirmDelete = id; render(); }

export function executeDeleteAthlete(id) {
  // Fase 2.2 del roadmap: DB.deleteAthlete() borra las sesiones de
  // localStorage, pero los videos de esas sesiones viven aparte, en
  // IndexedDB (js/db/videoDb.js). Hay que borrarlos tambien o quedan como
  // blobs huerfanos ocupando espacio sin que ninguna sesion los referencie.
  // Es limpieza en segundo plano (no bloquea el borrado del atleta, que es
  // sincrono via localStorage).
  const sessions = DB.getSessions(id);
  const videoIds = sessions.filter(s => s.videoId).map(s => s.videoId);
  if (videoIds.length) {
    Promise.all(videoIds.map(vid => VideoDB.deleteVideo(vid))).catch(err => console.error('Error borrando videos del atleta eliminado:', err));
  }
  DB.deleteAthlete(id);
  state.athletes = state.athletes.filter(a => a.id !== id);
  state.confirmDelete = null;
  render();
}

