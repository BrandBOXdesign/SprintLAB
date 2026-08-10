// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
export const state = {
  view: 'athletes',
  athletes: [],
  currentAthleteId: null,
  tab: 'dashboard',
  athlete: null,
  sessions: [],
  model: null,
  weeklyPlan: null,
  profileForm: { name: '', age: '', weight: '', time100: '', time200: '', level: 'intermedio', seasonStart: '', target100: '', target200: '' },
  logForm: {
    type: 'track', rpe: 5, duration: '', notes: '', sessionDate: '',
    trackSeries: [], showTrackSerieForm: false,
    serieFormDist: '100', serieFormTime: '', serieFormWind: '',
    serieFormReaction: '', serieFormStart: '',
    gymExercises: [], showGymExForm: false,
    gymFormExercise: '', gymFormWeight: '', gymFormReps: '',
    gymSessionType: 'fuerza',
  },
  athleteForm: { name: '', age: '', weight: '', time100: '', time200: '', level: 'intermedio', seasonStart: '', target100: '', target200: '' },
  confirmDelete: null,
  saveError: null,
  loading: true,
  progressTab: 'times',
  progressDist: '100',
  progressExercise: '',
  progressExercises: [],
  sessionPage: 0,
  notifications: [],
  dismissedIds: [],
  // ---- Fase 1.1: sincronizacion en la nube ----
  cloudUser: null,          // objeto Firebase User cuando hay sesión iniciada, si no null
  authFormMode: 'login',    // 'login' | 'register'
  authForm: { email: '', password: '' },
  authError: null,
  syncStatus: 'idle',       // 'idle' | 'syncing' | 'synced' | 'error'
  syncMessage: '',
  // ---- Fase 2.1: importacion GPX (mapa + grafica de velocidad) ----
  expandedSessionId: null,  // id de la sesion cuyo detalle (mapa/grafica) esta desplegado
  // ---- Fase 1.3: UI/UX movil (deslizar para eliminar) ----
  confirmDeleteSessionId: null,
  // ---- Fase 4.3: sugerencia automatica de carga ----
  suggestionDismissed: false, // efimero: se resetea a false cada vez que se abre la app
  // ---- Fase 4.1: editor visual de fases personalizadas ----
  customPhases: [],
  confirmDeletePhaseId: null,
  // ---- Ayuda dentro de la app (panel accesible desde el header) ----
  showHelp: false,
  helpSectionId: null,
  // ---- Fase 2.2: video local (grabacion, reproduccion, marcadores, zancada) ----
  // Todo esto es efimero (no se persiste tal cual); lo que se persiste por
  // sesion es session.videoId (referencia a IndexedDB), session.videoMarkers
  // y session.strideData, via DB.saveSessions.
  recording: {
    active: false,       // hay una grabacion en curso ahora mismo
    sessionId: null,     // a que sesion pertenece esta grabacion
    stream: null,        // MediaStream de la camara (referencia directa, no serializable)
    mediaRecorder: null,
    chunks: [],
    startedAt: null,
    elapsedSec: 0,
    error: null,
  },
  videoPlayback: {
    sessionId: null,      // sesion cuyo video esta cargado en el reproductor
    objectUrl: null,       // URL.createObjectURL del blob leido de IndexedDB
    loading: false,
    error: null,
    markerLabelInput: '',
    playbackRate: 1, // velocidad de reproduccion (1, 0.5, 0.25...) -- se reaplica al <video> en cada render() porque layout.js reconstruye el DOM entero, ver videoInitializer en sessions.js
    strideFreqInput: '',
    strideSerieIndex: '',  // indice de trackSeries elegido para el calculo, si aplica ('' = manual)
    strideManualDist: '',
    strideManualTime: '',
    // Deteccion automatica de cadencia (MediaPipe Pose). Ver
    // js/services/poseDetection.js y actions/video.js#detectStrideCadence.
    detectingCadence: false,
    detectingCadenceProgress: 0,
    lastConfidence: null,   // 'baja' | 'media' | 'alta' | null
    cadenceError: null,
    // Fase A del roadmap de "sprint lab" (analisis de forma de carrera):
    // captura del esqueleto completo. Ver js/services/poseDetection.js
    // (analyzeFullSkeleton), js/services/skeletonOverlay.js (dibujo
    // sincronizado con el video) y actions/video.js#analyzeFullSprint.
    skeletonFrames: null,          // array de {t, pts} devuelto por analyzeFullSkeleton, o null si no se ha corrido
    detectingSkeleton: false,
    detectingSkeletonProgress: 0,
    skeletonConfidence: null,      // 'baja' | 'media' | 'alta' | null
    skeletonAnalyzedSeconds: null,
    skeletonVideoWidth: null,      // dimensiones nativas del video analizado, para el aspect ratio del panel de replay (ver skeletonOverlay.js)
    skeletonVideoHeight: null,
    skeletonError: null,
  },
};
