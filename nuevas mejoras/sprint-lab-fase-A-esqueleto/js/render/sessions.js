// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { addSessionToCurrentAthlete, cancelDeleteSession, confirmDeleteSession, executeDeleteSession } from '../actions/sessions.js';
import {
  addVideoMarker, analyzeFullSprint, cancelVideoRecording, clearSkeletonCapture, deleteSessionVideo, deleteVideoMarker,
  detectStrideCadence, loadVideoForPlayback, saveStrideEstimation, startVideoRecording,
  stopVideoRecording, uploadVideoFile,
} from '../actions/video.js';
import { renderGpxMap } from '../charts/gpxMap.js';
import { renderGpxVelocityChart } from '../charts/velocityChart.js';
import { render } from './layout.js';
import { SKELETON_CONNECTIONS } from '../services/poseDetection.js';
import { startSkeletonOverlayLoop } from '../services/skeletonOverlay.js';
import { state } from '../state/state.js';
import { avg1RM, calcVelocity, estimatePower, estimateVelocity, registrationGapDays, validateLogForm, validateNum } from '../utils/calculations.js';
import { DAY_COLORS } from '../utils/constants.js';
import { attachSwipeToDelete, dateFieldToISO, decimalInput, el, emptyState, field, fieldV, sectionLabel, todayISO } from '../utils/helpers.js';
import { showToast } from '../utils/notifications.js';

// Fase 2.2 del roadmap: bloque de video local, embebido en el panel de
// detalle de CUALQUIER sesion (no solo las que tienen GPX). Vive en su
// propia funcion porque tiene bastante logica propia: 3 estados posibles
// (sin video / grabando / con video guardado).
function renderVideoBlock(s, videoInitializers) {
  const rec = state.recording;
  const isRecordingThis = rec.active && rec.sessionId === s.id;

  if (isRecordingThis) {
    const videoPreview = el('video', { class: 'video-preview', autoplay: true, muted: true, playsinline: true });
    videoInitializers.push(() => { videoPreview.srcObject = rec.stream; });
    const mm = String(Math.floor(rec.elapsedSec / 60)).padStart(2, '0');
    const ss = String(rec.elapsedSec % 60).padStart(2, '0');
    return el('div', { class: 'video-block' }, [
      el('div', { class: 'video-record-box' }, [
        videoPreview,
        el('div', { class: 'video-record-controls' }, [
          el('span', { class: 'video-record-timer' }, `● REC ${mm}:${ss}`),
          el('button', { class: 'danger-button', onClick: () => stopVideoRecording() }, '■ Detener y guardar'),
          el('button', { class: 'secondary-button', onClick: () => cancelVideoRecording() }, 'Cancelar'),
        ]),
      ]),
    ]);
  }

  const errorNode = rec.error && rec.sessionId === s.id ? el('div', { class: 'video-error' }, '⚠ ' + rec.error) : null;

  if (!s.videoId) {
    const fileInputId = `video-upload-${s.id}`;
    const fileInput = el('input', {
      id: fileInputId, type: 'file', accept: 'video/*', style: { display: 'none' },
      onChange: e => { const file = e.target.files && e.target.files[0]; if (file) uploadVideoFile(s.id, file); e.target.value = ''; },
    });
    return el('div', { class: 'video-block' }, [
      errorNode,
      el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
        el('button', { class: 'secondary-button', onClick: () => startVideoRecording(s.id) }, '🎥 Grabar video'),
        el('button', { class: 'secondary-button', onClick: () => document.getElementById(fileInputId).click() }, '📁 Subir video'),
      ]),
      fileInput,
    ]);
  }

  // Hay video guardado: se carga (lazy) desde IndexedDB la primera vez que
  // este bloque se muestra, igual que el patron ya usado para mapas GPX.
  const vp = state.videoPlayback;
  const isThisLoaded = vp.sessionId === s.id;
  if (!isThisLoaded || (!vp.objectUrl && !vp.loading && !vp.error)) {
    videoInitializers.push(() => loadVideoForPlayback(s.id));
  }

  if (isThisLoaded && vp.loading) {
    return el('div', { class: 'video-block' }, [el('div', { class: 'video-loading' }, 'Cargando video…')]);
  }
  if (isThisLoaded && vp.error) {
    return el('div', { class: 'video-block' }, [el('div', { class: 'video-error' }, '⚠ ' + vp.error)]);
  }
  if (!isThisLoaded || !vp.objectUrl) {
    return el('div', { class: 'video-block' }, [el('div', { class: 'video-loading' }, 'Cargando video…')]);
  }

  const busy = vp.detectingCadence || vp.detectingSkeleton;
  const videoElId = `video-player-${s.id}`;
  const canvasElId = `skeleton-canvas-${s.id}`;
  const videoEl = el('video', { id: videoElId, class: 'video-player', controls: true, src: vp.objectUrl, playsinline: true });
  const skeletonCanvas = el('canvas', { id: canvasElId, class: 'skeleton-overlay' });
  // El loop de dibujo se auto-administra (ver skeletonOverlay.js): se puede
  // pedir arrancar en cada render() sin miedo a duplicar, y se cierra solo
  // cuando el canvas deja de existir (otra sesion, video borrado, etc.).
  videoInitializers.push(() => startSkeletonOverlayLoop(
    videoElId, canvasElId,
    () => (state.videoPlayback.sessionId === s.id ? state.videoPlayback.skeletonFrames : null),
    SKELETON_CONNECTIONS,
  ));
  const markerLabelInput = el('input', { value: vp.markerLabelInput, placeholder: 'Etiqueta (ej. contacto de pie)', disabled: busy, oninput: e => { vp.markerLabelInput = e.target.value; } });
  const markBtn = el('button', { class: 'secondary-button', disabled: busy, onClick: () => {
    const v = document.getElementById(videoElId);
    const t = v ? v.currentTime : NaN;
    if (isNaN(t)) return;
    addVideoMarker(s.id, t, vp.markerLabelInput);
    vp.markerLabelInput = '';
  } }, '📍 Marcar');
  const markers = Array.isArray(s.videoMarkers) ? s.videoMarkers : [];
  const markersList = markers.length === 0 ? null : el('div', { class: 'video-markers' }, markers.map(m => el('div', { class: 'marker-row' }, [
    el('button', { class: 'marker-jump', title: 'Ir a este momento', disabled: busy, onClick: () => { const v = document.getElementById(videoElId); if (v) { v.currentTime = m.time; v.pause(); } } }, `⏱ ${m.time.toFixed(2)}s`),
    el('span', { class: 'marker-label' }, m.label),
    el('button', { class: 'marker-delete', title: 'Eliminar marca', disabled: busy, onClick: () => deleteVideoMarker(s.id, m.id) }, '✕'),
  ])));

  return el('div', { class: 'video-block' }, [
    el('div', { class: 'video-player-wrap' }, [
      el('div', { class: 'video-canvas-stack' }, [videoEl, skeletonCanvas]),
      el('div', { class: 'video-marker-form' }, [markerLabelInput, markBtn]),
      markersList,
      el('button', { class: 'danger-button', style: { marginTop: '8px' }, disabled: busy, onClick: () => deleteSessionVideo(s.id) }, '🗑 Eliminar video'),
    ]),
    renderStrideEstimator(s, videoElId),
    renderSkeletonCapture(s, videoElId),
  ]);
}

// Longitud de zancada estimada = velocidad / frecuencia de zancada. La
// velocidad reutiliza calcVelocity() (dist/tiempo), ya sea de una serie de
// pista ya registrada o de una distancia/tiempo manual (para sesiones sin
// series formales, o una carrera vista en el video que no se cargo como
// serie). La frecuencia de zancada la cuenta el entrenador viendo el video;
// no hay deteccion automatica.
function renderStrideEstimator(s, videoElId) {
  const vp = state.videoPlayback;
  const hasSeries = s.type === 'track' && Array.isArray(s.trackSeries) && s.trackSeries.length > 0;
  const useManual = !hasSeries || vp.strideSerieIndex === '';

  const serieSelect = hasSeries ? el('select', { oninput: e => { vp.strideSerieIndex = e.target.value; render(); } }, [
    el('option', { value: '' }, '— usar distancia/tiempo manual —'),
    ...s.trackSeries.map((serie, i) => el('option', { value: String(i), selected: String(vp.strideSerieIndex) === String(i) }, `S${i + 1} — ${serie.dist}m en ${serie.time}s`)),
  ]) : null;
  if (serieSelect) serieSelect.value = vp.strideSerieIndex;

  const busy = vp.detectingCadence || vp.detectingSkeleton;
  const distInput = decimalInput({ value: vp.strideManualDist, placeholder: 'Distancia (m)', disabled: !useManual, oninput: e => { vp.strideManualDist = e.target.value; } });
  const timeInput = decimalInput({ value: vp.strideManualTime, placeholder: 'Tiempo (s)', disabled: !useManual, oninput: e => { vp.strideManualTime = e.target.value; } });
  const freqInput = decimalInput({ value: vp.strideFreqInput, placeholder: 'Zancadas/seg', disabled: busy, oninput: e => { vp.strideFreqInput = e.target.value; } });

  // Deteccion automatica con MediaPipe Pose (ver services/poseDetection.js).
  // Solo rellena freqInput -- el entrenador confirma con el boton de abajo.
  const detectBtn = el('button', {
    class: 'secondary-button', disabled: busy || !vp.objectUrl,
    onClick: () => detectStrideCadence(s.id, videoElId),
  }, vp.detectingCadence ? 'Analizando…' : '🤖 Detectar automáticamente');

  const progressNode = vp.detectingCadence ? el('div', { class: 'cadence-progress' }, [
    el('div', { class: 'cadence-progress-track' }, [el('div', { class: 'cadence-progress-fill', style: { width: vp.detectingCadenceProgress + '%' } })]),
    el('span', { class: 'cadence-progress-label' }, `Analizando el video… ${vp.detectingCadenceProgress}%`),
  ]) : null;

  const confidenceBadge = (!vp.detectingCadence && vp.lastConfidence) ? el('div', { class: `confidence-badge confidence-${vp.lastConfidence}` },
    vp.lastConfidence === 'baja'
      ? '⚠ Confianza baja — revisa el número antes de calcular'
      : vp.lastConfidence === 'media'
        ? '● Confianza media — conviene revisar el número'
        : '✓ Confianza alta',
  ) : null;

  const cadenceErrorNode = vp.cadenceError && !vp.detectingCadence ? el('div', { class: 'video-error' }, '⚠ ' + vp.cadenceError) : null;

  const calcBtn = el('button', { class: 'secondary-button', disabled: busy, onClick: () => {
    let distance, time;
    if (!useManual) { const serie = s.trackSeries[Number(vp.strideSerieIndex)]; distance = serie.dist; time = serie.time; }
    else { distance = vp.strideManualDist; time = vp.strideManualTime; }
    const result = saveStrideEstimation(s.id, { distance, time, strideFrequency: vp.strideFreqInput });
    if (!result) showToast('⚠ Revisa distancia, tiempo y frecuencia de zancada.');
  } }, 'Calcular longitud de zancada');

  const resultNode = s.strideData ? el('div', { class: 'calc-hint' },
    `Longitud de zancada ≈ ${s.strideData.strideLength.toFixed(2)} m  (vel. ${s.strideData.velocity.toFixed(2)} m/s ÷ ${s.strideData.strideFrequency} zanc./s)`,
  ) : null;

  return el('div', { class: 'stride-calc-box' }, [
    el('div', { class: 'series-block-title' }, 'Longitud de zancada (estimada)'),
    hasSeries ? field('Basar cálculo en serie registrada', serieSelect) : null,
    useManual ? el('div', { class: 'row' }, [field('Distancia (m)', distInput, true), field('Tiempo (s)', timeInput, true)]) : null,
    field('Frecuencia de zancada (zancadas/s, contadas en el video o detectadas automáticamente)', freqInput),
    el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '6px' } }, [detectBtn]),
    progressNode,
    confidenceBadge,
    cadenceErrorNode,
    el('p', { class: 'help-p', style: { marginTop: '2px', marginBottom: '10px', fontSize: '11.5px' } },
      'La detección automática analiza como máximo los primeros 15 segundos del video y funciona mejor con una toma lateral del corredor, buena resolución y sin que nadie lo tape. Es un punto de partida, no una medición exacta — siempre revisa el número antes de calcular. Requiere internet la primera vez que se usa (descarga el modelo de análisis).'),
    calcBtn,
    resultNode,
  ].filter(Boolean));
}

// Fase A del roadmap de "sprint lab" (analisis de forma de carrera): panel
// para disparar analyzeFullSprint() y mostrar su estado. El resultado en si
// (el muñeco de palitos) no se dibuja aqui -- eso lo hace el loop de
// skeletonOverlay.js sobre el <canvas> que ya se agrego junto al <video> en
// renderVideoBlock(). Este panel solo controla cuándo correr el análisis y
// muestra confianza/errores, igual que el patrón ya usado para cadencia.
function renderSkeletonCapture(s, videoElId) {
  const vp = state.videoPlayback;
  const busy = vp.detectingCadence || vp.detectingSkeleton;
  const hasFrames = Array.isArray(vp.skeletonFrames) && vp.skeletonFrames.length > 0;

  const captureBtn = el('button', {
    class: 'secondary-button', disabled: busy || !vp.objectUrl,
    onClick: () => analyzeFullSprint(s.id, videoElId),
  }, vp.detectingSkeleton ? 'Analizando…' : (hasFrames ? '🦴 Volver a capturar esqueleto' : '🦴 Capturar esqueleto completo'));

  const clearBtn = hasFrames ? el('button', { class: 'secondary-button', disabled: busy, onClick: () => clearSkeletonCapture() }, '🗑 Quitar esqueleto') : null;

  const progressNode = vp.detectingSkeleton ? el('div', { class: 'cadence-progress' }, [
    el('div', { class: 'cadence-progress-track' }, [el('div', { class: 'cadence-progress-fill', style: { width: vp.detectingSkeletonProgress + '%' } })]),
    el('span', { class: 'cadence-progress-label' }, `Capturando esqueleto… ${vp.detectingSkeletonProgress}%`),
  ]) : null;

  const confidenceBadge = (!vp.detectingSkeleton && hasFrames && vp.skeletonConfidence) ? el('div', { class: `confidence-badge confidence-${vp.skeletonConfidence}` },
    vp.skeletonConfidence === 'baja'
      ? '⚠ Confianza baja — el esqueleto puede saltar o desalinearse'
      : vp.skeletonConfidence === 'media'
        ? '● Confianza media — revisa visualmente antes de sacar conclusiones'
        : '✓ Confianza alta',
  ) : null;

  const errorNode = vp.skeletonError && !vp.detectingSkeleton ? el('div', { class: 'video-error' }, '⚠ ' + vp.skeletonError) : null;

  const resultNode = (!vp.detectingSkeleton && hasFrames) ? el('div', { class: 'calc-hint' },
    `Esqueleto capturado sobre ${vp.skeletonAnalyzedSeconds}s de video — dale play arriba para ver la animación superpuesta.`,
  ) : null;

  return el('div', { class: 'stride-calc-box' }, [
    el('div', { class: 'series-block-title' }, 'Esqueleto completo (Fase A — solo visual, sin calificación)'),
    el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '6px' } }, [captureBtn, clearBtn].filter(Boolean)),
    progressNode,
    confidenceBadge,
    errorNode,
    resultNode,
    el('p', { class: 'help-p', style: { marginTop: '2px', marginBottom: '4px', fontSize: '11.5px' } },
      'Rastrea cadera, rodillas, tobillos, hombros, codos, muñecas y pies (los mismos 15 segundos máximo que la detección de cadencia). Dibuja un muñeco de palitos sincronizado con la reproducción del video, sobre una capa oscura semitransparente para que se lea bien. Todavía no da ángulos ni calificaciones de técnica — eso vendría en una fase posterior. Requiere internet la primera vez que se usa.'),
  ].filter(Boolean));
}

export function renderLogScreen() {
  const form = state.logForm;
  if (!Array.isArray(form.trackSeries)) form.trackSeries = [];
  if (!Array.isArray(form.gymExercises)) form.gymExercises = [];
  if (form.showTrackSerieForm === undefined) form.showTrackSerieForm = false;
  if (form.showGymExForm === undefined) form.showGymExForm = false;
  if (!form.serieFormDist) form.serieFormDist = '100';
  if (!form.sessionDate) form.sessionDate = todayISO();

  function submit() {
    const errors = validateLogForm(form);
    if (errors.length > 0) { state.saveError = errors[0]; render(); return; }
    state.saveError = null;
    const isoDate = dateFieldToISO(form.sessionDate);
    let time100 = null, time200 = null;
    if (form.type === 'track' && form.trackSeries.length > 0) {
      const t100s = form.trackSeries.filter(s => s.dist === '100' && s.time).map(s => Number(s.time));
      const t200s = form.trackSeries.filter(s => s.dist === '200' && s.time).map(s => Number(s.time));
      if (t100s.length) time100 = Math.min(...t100s);
      if (t200s.length) time200 = Math.min(...t200s);
    }
    const gymExercisesWithPower = form.type === 'gym' ? form.gymExercises.map(e => {
      const rm = e.estimated1RM || avg1RM(Number(e.weight), Number(e.reps));
      const velocity = rm ? estimateVelocity(Number(e.weight), rm) : null;
      const power = velocity ? estimatePower(Number(e.weight), velocity) : null;
      return { ...e, velocity, power, estimated1RM: rm };
    }) : [];
    const session = {
      date: isoDate, type: form.type, rpe: Number(form.rpe), durationMin: Number(form.duration), notes: form.notes,
      trackSeries: form.type === 'track' ? [...form.trackSeries] : [],
      time100, time200,
      gymExercises: gymExercisesWithPower,
      gymSessionType: form.type === 'gym' ? (form.gymSessionType || 'fuerza') : null,
      estimated1RM: form.type === 'gym' && gymExercisesWithPower.length ? Math.max(...gymExercisesWithPower.map(e => e.estimated1RM || 0)) || null : null,
    };
    addSessionToCurrentAthlete(session);
    showToast('✓ Sesión registrada');
    state.logForm = {
      type: form.type, rpe: 5, duration: '', notes: '', sessionDate: todayISO(),
      trackSeries: [], showTrackSerieForm: false,
      serieFormDist: '100', serieFormTime: '', serieFormWind: '',
      serieFormReaction: '', serieFormStart: '',
      gymExercises: [], showGymExForm: false,
      gymFormExercise: '', gymFormWeight: '', gymFormReps: '',
      gymSessionType: form.gymSessionType || 'fuerza',
    };
    render();
  }

  const gapDays = registrationGapDays(state.sessions);
  let gapWarningNode = null;
  if (gapDays !== null && gapDays >= 3) gapWarningNode = el('div', { class: 'gap-warning' }, [el('span', { class: 'gap-warning-icon' }, '⚠'), el('div', { class: 'gap-warning-text' }, [el('strong', {}, `${gapDays} días sin registro`), 'El ratio de carga puede estar subestimado. Registra sesiones pasadas con la fecha correcta.'])]);

  // Fase 1.3 del roadmap (UI/UX movil): "registro rapido" — precarga el
  // formulario con los valores mas comunes en pista (serie de 100m, RPE 5)
  // para que el entrenador solo tenga que teclear el tiempo y guardar.
  const quickRegisterBtn = el('button', { class: 'secondary-button', style: { marginBottom: '10px' }, onClick: () => {
    state.logForm = {
      type: 'track', rpe: 5, duration: '15', notes: '', sessionDate: todayISO(),
      trackSeries: [], showTrackSerieForm: true,
      serieFormDist: '100', serieFormTime: '', serieFormWind: '',
      serieFormReaction: '', serieFormStart: '',
      gymExercises: [], showGymExForm: false,
      gymFormExercise: '', gymFormWeight: '', gymFormReps: '',
      gymSessionType: 'fuerza',
    };
    render();
  } }, '⚡ Registro rápido (100m, RPE 5)');

  const typeSelect = el('select', { oninput: e => { form.type = e.target.value; render(); } }, [
    el('option', { value: 'track', selected: form.type === 'track' }, 'Pista'),
    el('option', { value: 'gym', selected: form.type === 'gym' }, 'Gimnasio'),
    el('option', { value: 'field', selected: form.type === 'field' }, 'Campo (arena/agua)'),
  ]);
  typeSelect.value = form.type;
  const dateInput = el('input', { type: 'date', value: form.sessionDate, max: todayISO(), oninput: e => form.sessionDate = e.target.value });
  const durationInput = decimalInput({ value: form.duration, placeholder: '60', oninput: e => { form.duration = e.target.value; render(); } });
  const durV = validateNum(form.duration, 'duration');
  const rpeLabels = { 1:'Muy fácil',2:'Fácil',3:'Moderado fácil',4:'Moderado',5:'Moderado exigente',6:'Exigente',7:'Duro',8:'Muy duro',9:'Máximo tolerable',10:'Esfuerzo absoluto' };
  const rpeSlider = el('input', { type: 'range', min: '1', max: '10', value: form.rpe, oninput: e => { form.rpe = e.target.value; render(); } });
  const cardChildren = [field('Fecha de la sesión', dateInput), field('Tipo de sesión', typeSelect), fieldV('Duración total (minutos)', durationInput, form.duration ? durV : null), field(`RPE ${form.rpe}/10 — ${rpeLabels[form.rpe] || ''}`, rpeSlider)];

  if (form.type === 'track') {
    const seriesListNodes = form.trackSeries.map((s, i) => {
      const vel = calcVelocity(Number(s.dist), Number(s.time));
      const reactionBadge = s.reactionTime ? el('span', { class: 'reaction-badge' }, '⚡ ' + Number(s.reactionTime).toFixed(2) + 's') : null;
      const startBadge = s.startTime ? el('span', { class: 'reaction-badge', style: { borderColor: 'var(--red)' } }, '🚀 ' + Number(s.startTime).toFixed(2) + 's') : null;
      return el('div', { class: 'serie-row' }, [
        el('span', { class: 'serie-num' }, `S${i + 1}`),
        el('div', { class: 'serie-data' }, [el('span', {}, `${s.dist}m`), ` — `, el('span', {}, s.time ? `${s.time}s` : '—'), vel ? el('span', { class: 'serie-velocity' }, `(${vel.toFixed(2)} m/s)`) : null, reactionBadge, startBadge, s.wind ? el('span', { class: 'serie-wind' }, `viento ${s.wind > 0 ? '+' : ''}${s.wind} m/s`) : null]),
        el('button', { class: 'serie-delete', title: 'Eliminar serie', onClick: () => { form.trackSeries.splice(i, 1); render(); } }, '✕'),
      ]);
    });
    let serieFormNode = null;
    if (form.showTrackSerieForm) {
      const distSel = el('select', { oninput: e => { form.serieFormDist = e.target.value; render(); } }, [
        el('option', { value: '100', selected: form.serieFormDist === '100' }, '100m'),
        el('option', { value: '200', selected: form.serieFormDist === '200' }, '200m'),
        el('option', { value: '60', selected: form.serieFormDist === '60' }, '60m'),
        el('option', { value: '150', selected: form.serieFormDist === '150' }, '150m'),
        el('option', { value: '300', selected: form.serieFormDist === '300' }, '300m'),
      ]);
      distSel.value = form.serieFormDist;
      const timeIn = decimalInput({ value: form.serieFormTime, placeholder: '10.85', oninput: e => { form.serieFormTime = e.target.value; render(); } });
      const windIn = decimalInput({ value: form.serieFormWind, placeholder: '+0.0', oninput: e => form.serieFormWind = e.target.value });
      const reactionIn = decimalInput({ value: form.serieFormReaction, placeholder: '0.15', oninput: e => { form.serieFormReaction = e.target.value; render(); } });
      const startIn = decimalInput({ value: form.serieFormStart, placeholder: '0.30', oninput: e => { form.serieFormStart = e.target.value; render(); } });
      const tRule = form.serieFormDist === '200' ? 'time200' : 'time100';
      const tV = form.serieFormTime ? validateNum(form.serieFormTime, tRule) : { ok: true };
      const rV = form.serieFormReaction ? validateNum(form.serieFormReaction, 'reaction') : { ok: true };
      const sV = form.serieFormStart ? validateNum(form.serieFormStart, 'start') : { ok: true };
      serieFormNode = el('div', { class: 'serie-form' }, [
        el('div', { class: 'serie-form-title' }, `Serie ${form.trackSeries.length + 1}`),
        el('div', { class: 'row' }, [field('Distancia', distSel, true), fieldV('Tiempo (s)', timeIn, tV, true)]),
        el('div', { class: 'row' }, [fieldV('Reacción (s)', reactionIn, rV, true), fieldV('Salida (s)', startIn, sV, true)]),
        field('Viento (m/s, opcional)', windIn),
        el('button', { class: 'serie-confirm-btn', onClick: () => {
          if (!form.serieFormTime) return;
          const tRuleCheck = form.serieFormDist === '200' ? 'time200' : 'time100';
          if (!validateNum(form.serieFormTime, tRuleCheck).ok) return;
          if (form.serieFormReaction && !validateNum(form.serieFormReaction, 'reaction').ok) return;
          if (form.serieFormStart && !validateNum(form.serieFormStart, 'start').ok) return;
          form.trackSeries.push({ dist: form.serieFormDist, time: form.serieFormTime, wind: form.serieFormWind ? Number(form.serieFormWind) : null, reactionTime: form.serieFormReaction ? Number(form.serieFormReaction) : null, startTime: form.serieFormStart ? Number(form.serieFormStart) : null });
          form.serieFormTime = ''; form.serieFormWind = ''; form.serieFormReaction = ''; form.serieFormStart = '';
          render();
        } }, '+ Confirmar serie'),
      ]);
    }
    const seriesBlock = el('div', { class: 'series-block' }, [
      el('div', { class: 'series-block-title' }, `Series registradas (${form.trackSeries.length})`),
      form.trackSeries.length > 0 ? el('div', { class: 'series-list' }, seriesListNodes) : null,
      el('button', { class: 'add-serie-btn', onClick: () => { form.showTrackSerieForm = !form.showTrackSerieForm; render(); } }, [el('span', { style: { color: 'var(--red)', fontSize: '18px' } }, form.showTrackSerieForm ? '−' : '+'), form.showTrackSerieForm ? 'Cerrar' : 'Agregar serie']),
      serieFormNode,
    ]);
    cardChildren.push(seriesBlock);
  }

  if (form.type === 'gym') {
    const gymTypes = [{ id: 'fuerza', label: 'Fuerza máx.' }, { id: 'potencia', label: 'Potencia' }, { id: 'pliometria', label: 'Pliometría' }, { id: 'metabolico', label: 'Metabólico' }];
    if (!form.gymSessionType) form.gymSessionType = 'fuerza';
    const gymTypeSelector = el('div', { class: 'gym-type-selector' }, gymTypes.map(t => el('button', { class: 'gym-type-btn' + (form.gymSessionType === t.id ? ' active' : ''), onClick: () => { form.gymSessionType = t.id; render(); } }, t.label)));
    cardChildren.push(gymTypeSelector);
    const exListNodes = form.gymExercises.map((e, i) => {
      const velBadge = e.velocity ? el('span', { class: 'velocity-badge' }, e.velocity.toFixed(2) + ' m/s') : null;
      const powerBadge = e.power ? el('span', { class: 'power-badge' }, Math.round(e.power) + ' W') : null;
      const label = e.estimated1RM ? `${e.exercise || 'Ejercicio'} — ${e.weight}kg × ${e.reps} · 1RM≈${e.estimated1RM.toFixed(1)}kg` : `${e.exercise || 'Ejercicio'} — ${e.weight}kg × ${e.reps}`;
      return el('div', { class: 'serie-row' }, [el('span', { class: 'serie-num' }, `E${i + 1}`), el('div', { class: 'serie-data' }, [label, velBadge, powerBadge]), el('button', { class: 'serie-delete', title: 'Eliminar ejercicio', onClick: () => { form.gymExercises.splice(i, 1); render(); } }, '✕')]);
    });
    let gymFormNode = null;
    if (form.showGymExForm) {
      const exIn = el('input', { value: form.gymFormExercise, placeholder: 'Sentadilla, arrancada...', oninput: e => form.gymFormExercise = e.target.value });
      const wIn = decimalInput({ value: form.gymFormWeight, placeholder: '—', oninput: e => { form.gymFormWeight = e.target.value; render(); } });
      const rIn = el('input', { type: 'number', inputmode: 'numeric', value: form.gymFormReps, placeholder: '—', oninput: e => { form.gymFormReps = e.target.value; render(); } });
      const wV = form.gymFormWeight ? validateNum(form.gymFormWeight, 'gymWeight') : { ok: true };
      const rV = form.gymFormReps ? validateNum(form.gymFormReps, 'gymReps') : { ok: true };
      const est = form.gymFormWeight && form.gymFormReps ? avg1RM(Number(form.gymFormWeight), Number(form.gymFormReps)) : null;
      const vel = est ? estimateVelocity(Number(form.gymFormWeight), est) : null;
      const power = vel ? estimatePower(Number(form.gymFormWeight), vel) : null;
      gymFormNode = el('div', { class: 'serie-form' }, [
        el('div', { class: 'serie-form-title' }, `Ejercicio ${form.gymExercises.length + 1}`),
        field('Nombre del ejercicio', exIn),
        el('div', { class: 'row' }, [fieldV('Peso (kg)', wIn, wV, true), fieldV('Reps', rIn, rV, true)]),
        est ? el('div', { class: 'calc-hint' }, [`1RM est.: ${est.toFixed(1)} kg · `, vel ? `vel.≈${vel.toFixed(2)} m/s · ` : '', power ? `pot.≈${Math.round(power)} W` : '', el('span', { class: 'calc-hint-source' }, ' (Epley/Brzycki)')]) : null,
        el('button', { class: 'serie-confirm-btn', onClick: () => {
          if (!form.gymFormWeight || !form.gymFormReps) return;
          if (!validateNum(form.gymFormWeight, 'gymWeight').ok) return;
          if (!validateNum(form.gymFormReps, 'gymReps').ok) return;
          const rm = avg1RM(Number(form.gymFormWeight), Number(form.gymFormReps));
          const velocity = rm ? estimateVelocity(Number(form.gymFormWeight), rm) : null;
          const power = velocity ? estimatePower(Number(form.gymFormWeight), velocity) : null;
          form.gymExercises.push({ exercise: form.gymFormExercise || 'Ejercicio', weight: Number(form.gymFormWeight), reps: Number(form.gymFormReps), estimated1RM: rm, velocity, power });
          form.gymFormExercise = ''; form.gymFormWeight = ''; form.gymFormReps = '';
          render();
        } }, '+ Confirmar ejercicio'),
      ]);
    }
    const gymBlock = el('div', { class: 'series-block' }, [
      el('div', { class: 'series-block-title' }, `Ejercicios registrados (${form.gymExercises.length})`),
      form.gymExercises.length > 0 ? el('div', { class: 'series-list' }, exListNodes) : null,
      el('button', { class: 'add-serie-btn', onClick: () => { form.showGymExForm = !form.showGymExForm; render(); } }, [el('span', { style: { color: 'var(--red)', fontSize: '18px' } }, form.showGymExForm ? '−' : '+'), form.showGymExForm ? 'Cerrar' : 'Agregar ejercicio']),
      gymFormNode,
    ]);
    cardChildren.push(gymBlock);
  }

  const notesInput = el('input', { value: form.notes, placeholder: 'Sensaciones, condiciones...', oninput: e => form.notes = e.target.value });
  cardChildren.push(field('Notas (opcional)', notesInput), el('button', { class: 'primary-button', onClick: submit }, 'Registrar sesión'));
  const card = el('div', { class: 'card' }, cardChildren);

  const PAGE_SIZE = 10;
  const sortedSessions = [...state.sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalPages = Math.max(1, Math.ceil(sortedSessions.length / PAGE_SIZE));
  if (state.sessionPage >= totalPages) state.sessionPage = totalPages - 1;
  const pageSessions = sortedSessions.slice(state.sessionPage * PAGE_SIZE, (state.sessionPage + 1) * PAGE_SIZE);
  const gpxInitializers = [];
  const swipeInitializers = [];
  const videoInitializers = [];
  const sessionListNode = state.sessions.length === 0 ? emptyState('Todavía no hay sesiones registradas.') : el('div', {}, [
    el('div', { class: 'session-list' }, pageSessions.map(s => {
      const seriesCount = (s.trackSeries && s.trackSeries.length) || (s.gymExercises && s.gymExercises.length) || 0;
      const typeLabel = s.type === 'gym' ? ('Gimnasio' + (s.gymSessionType ? ' · ' + s.gymSessionType : '')) : s.type === 'track' ? 'Pista' : 'Campo';
      const detail = seriesCount > 0 ? ' · ' + seriesCount + ' ' + (s.type === 'gym' ? 'ejercicio' : 'serie') + (seriesCount !== 1 ? 's' : '') : '';
      const hasGpx = !!(s.gpxData && s.gpxData.trackPoints && s.gpxData.trackPoints.length > 1);
      // Fase 2.2 del roadmap: el detalle ya no se limita a sesiones con GPX
      // -- se puede expandir cualquier sesion, porque el video (y el
      // calculo de zancada) esta disponible para todas, no solo pista+GPX.
      const isExpanded = state.expandedSessionId === s.id;
      const isRecordingThis = state.recording.active && state.recording.sessionId === s.id;
      const row = el('div', {
        class: 'session-row has-gpx',
        style: { cursor: 'pointer' },
        onClick: () => {
          // Fase 1.3: si la fila esta "abierta" por el gesto de deslizar,
          // el primer tap solo la cierra (no dispara el expandir).
          if (row._swipeIsOpen && row._swipeIsOpen()) { row._swipeClose(); return; }
          // No se permite colapsar la fila mientras se esta grabando un
          // video para esta sesion (el <video> de vista previa perderia el
          // stream de camara).
          if (isRecordingThis) return;
          if (isExpanded) { state.expandedSessionId = null; }
          else { state.expandedSessionId = s.id; }
          render();
        },
      }, [
        el('div', { class: 'session-dot', style: { backgroundColor: DAY_COLORS[s.type] } }),
        el('div', { class: 'session-info' }, [
          el('div', { class: 'session-type' }, typeLabel + ' · RPE ' + s.rpe + detail + (hasGpx ? ' · 🗺️ GPX' : '') + (s.videoId ? ' · 🎥' : '')),
          el('div', { class: 'session-date' }, new Date(s.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + s.durationMin + ' min'),
        ]),
      ]);
      const deleteAction = el('button', { class: 'session-delete-action', onClick: () => confirmDeleteSession(s.id) }, '🗑 Eliminar');
      const rowWrap = el('div', { class: 'session-row-wrap' }, [deleteAction, row]);
      swipeInitializers.push(() => attachSwipeToDelete(row));
      if (!isExpanded) return rowWrap;

      let gpxCard = null;
      if (hasGpx) {
        const mapId = `gpx-map-${s.id}`, chartId = `gpx-chart-${s.id}`;
        const gd = s.gpxData;
        const km = (gd.distanceTotal / 1000).toFixed(2);
        const durLabel = gd.durationTotal ? `${Math.floor(gd.durationTotal / 60)} min ${gd.durationTotal % 60}s` : `${s.durationMin} min (estimado)`;
        const avgSpeed = gd.durationTotal ? (gd.distanceTotal / gd.durationTotal) : null;
        gpxCard = el('div', { class: 'chart-card', style: { marginTop: '8px' } }, [
          el('div', { style: { display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '10px' } }, [
            el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, 'Distancia'), el('div', { style: { fontSize: '16px', fontWeight: '700' } }, `${km} km`)]),
            el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, 'Duración'), el('div', { style: { fontSize: '16px', fontWeight: '700' } }, durLabel)]),
            avgSpeed ? el('div', {}, [el('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, 'Vel. promedio'), el('div', { style: { fontSize: '16px', fontWeight: '700' } }, `${avgSpeed.toFixed(2)} m/s`)]) : null,
          ]),
          el('div', { id: mapId, class: 'gpx-map' }),
          gd.speedPoints && gd.speedPoints.length > 1
            ? el('div', { class: 'chart-canvas-wrap', style: { marginTop: '10px' } }, [el('canvas', { id: chartId })])
            : el('div', { class: 'chart-empty', style: { marginTop: '10px' } }, 'El GPX no trae marcas de tiempo por punto, así que no se puede graficar la velocidad instantánea.'),
        ]);
        gpxInitializers.push(() => {
          renderGpxMap(mapId, gd.trackPoints);
          if (gd.speedPoints && gd.speedPoints.length > 1) renderGpxVelocityChart(chartId, gd.speedPoints);
        });
      }

      const videoCard = el('div', { class: 'chart-card', style: { marginTop: '8px' } }, [
        el('div', { class: 'series-block-title' }, 'Video'),
        renderVideoBlock(s, videoInitializers),
      ]);

      return el('div', {}, [rowWrap, gpxCard, videoCard]);
    })),
    totalPages > 1 ? el('div', { class: 'session-pagination' }, [el('button', { class: 'page-btn', disabled: state.sessionPage === 0, onClick: () => { state.sessionPage--; render(); } }, '← Anterior'), el('span', { class: 'page-info' }, (state.sessionPage + 1) + ' / ' + totalPages), el('button', { class: 'page-btn', disabled: state.sessionPage >= totalPages - 1, onClick: () => { state.sessionPage++; render(); } }, 'Siguiente →')]) : null,
  ]);
  if (gpxInitializers.length) requestAnimationFrame(() => gpxInitializers.forEach(fn => fn()));
  if (swipeInitializers.length) requestAnimationFrame(() => swipeInitializers.forEach(fn => fn()));
  if (videoInitializers.length) requestAnimationFrame(() => videoInitializers.forEach(fn => fn()));

  const confirmDeleteModal = state.confirmDeleteSessionId ? el('div', { class: 'modal-overlay' }, [
    el('div', { class: 'modal-box' }, [
      el('div', { class: 'modal-title' }, 'Eliminar sesión'),
      el('div', { class: 'modal-body' }, 'Esta sesión se eliminará permanentemente. Esta acción no se puede deshacer.'),
      el('div', { class: 'modal-actions' }, [
        el('button', { class: 'danger-button', onClick: () => executeDeleteSession(state.confirmDeleteSessionId) }, 'Eliminar'),
        el('button', { class: 'secondary-button', onClick: cancelDeleteSession }, 'Cancelar'),
      ]),
    ]),
  ]) : null;

  const children = [sectionLabel('03', 'Registrar sesión'), quickRegisterBtn];
  if (gapWarningNode) children.push(gapWarningNode);
  children.push(card, sectionLabel('—', `Últimas sesiones (${state.sessions.length})`), sessionListNode);
  if (confirmDeleteModal) children.push(confirmDeleteModal);
  return el('div', { class: 'screen' }, children);
}