// Fase 2.2 del roadmap: video local por sesion (sin nube). Grabacion con
// getUserMedia + MediaRecorder, almacenamiento del blob en IndexedDB
// (js/db/videoDb.js), y solo la referencia (videoId) en la sesion que ya
// vive en localStorage via DB.
import { DB } from '../db/db.js';
import { VideoDB } from '../db/videoDb.js';
import { render } from '../render/layout.js';
import { state } from '../state/state.js';
import { calcVelocity } from '../utils/calculations.js';
import { showToast } from '../utils/notifications.js';
import { analyzeFullSkeleton, analyzeStrideCadence } from '../services/poseDetection.js';

function pickSupportedMimeType() {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return null;
  for (const c of candidates) { if (MediaRecorder.isTypeSupported(c)) return c; }
  return null;
}

let recordingTimerHandle = null;
function stopRecordingTimer() { if (recordingTimerHandle) { clearInterval(recordingTimerHandle); recordingTimerHandle = null; } }
function startRecordingTimer() {
  stopRecordingTimer();
  recordingTimerHandle = setInterval(() => {
    if (!state.recording.active) { stopRecordingTimer(); return; }
    state.recording.elapsedSec = Math.floor((Date.now() - state.recording.startedAt) / 1000);
    render();
  }, 1000);
}

function resetRecordingState(error, sessionId) {
  state.recording = { active: false, sessionId: error ? (sessionId || null) : null, stream: null, mediaRecorder: null, chunks: [], startedAt: null, elapsedSec: 0, error: error || null };
}

export async function startVideoRecording(sessionId) {
  if (state.recording.active) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    state.recording.error = 'Este entorno no expone acceso a cámara/micrófono (getUserMedia no disponible).';
    render();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const mimeType = pickSupportedMimeType();
    const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks = [];
    mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => finalizeRecording(sessionId, chunks, mediaRecorder.mimeType || mimeType || 'video/webm');
    mediaRecorder.start();
    state.recording = { active: true, sessionId, stream, mediaRecorder, chunks, startedAt: Date.now(), elapsedSec: 0, error: null };
    startRecordingTimer();
    render();
  } catch (err) {
    resetRecordingState('No se pudo acceder a la cámara/micrófono: ' + (err && err.message ? err.message : 'permiso denegado.'), sessionId);
    render();
  }
}

export function stopVideoRecording() {
  const rec = state.recording;
  if (!rec.active || !rec.mediaRecorder) return;
  rec.mediaRecorder.stop();
  rec.stream.getTracks().forEach(t => t.stop());
}

export function cancelVideoRecording() {
  const rec = state.recording;
  if (rec.mediaRecorder && rec.active) {
    rec.mediaRecorder.ondataavailable = null;
    rec.mediaRecorder.onstop = null; // evita que se dispare el guardado
    try { rec.mediaRecorder.stop(); } catch { /* ya estaba detenido */ }
  }
  if (rec.stream) rec.stream.getTracks().forEach(t => t.stop());
  stopRecordingTimer();
  resetRecordingState(null);
  render();
}

async function finalizeRecording(sessionId, chunks, mimeType) {
  stopRecordingTimer();
  if (chunks.length === 0) {
    resetRecordingState('La grabación quedó vacía (0 bytes). Intenta de nuevo.', sessionId);
    render();
    return;
  }
  const blob = new Blob(chunks, { type: mimeType });
  const videoId = 'vid-' + Date.now();
  let error = null;
  try {
    await VideoDB.saveVideo(videoId, blob);
    const session = state.sessions.find(s => s.id === sessionId);
    if (session) {
      session.videoId = videoId;
      session.videoMarkers = [];
      DB.saveSessions(state.currentAthleteId, state.sessions);
      showToast('✓ Video guardado');
    }
  } catch (err) {
    error = 'No se pudo guardar el video en el almacenamiento local: ' + (err && err.message ? err.message : 'error desconocido.');
  }
  resetRecordingState(error, sessionId);
  render();
}

// Subida de un archivo de video externo (celular, WhatsApp, USB, etc.).
// Útil cuando la app corre en una PC sin cámara utilizable para el
// entrenamiento: el entrenador graba con el celular y luego "sube" ese
// archivo, que se guarda igual que uno grabado en vivo (mismo IndexedDB,
// mismo flujo de reproducción/marcadores/zancada).
export async function uploadVideoFile(sessionId, file) {
  if (!file) return;
  if (!file.type || !file.type.startsWith('video/')) {
    state.recording.error = 'El archivo elegido no parece ser un video (' + (file.type || 'tipo desconocido') + ').';
    state.recording.sessionId = sessionId;
    render();
    return;
  }
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) return;
  const videoId = 'vid-' + Date.now();
  try {
    await VideoDB.saveVideo(videoId, file);
    session.videoId = videoId;
    session.videoMarkers = [];
    DB.saveSessions(state.currentAthleteId, state.sessions);
    state.recording.error = null;
    showToast('✓ Video subido');
  } catch (err) {
    state.recording.error = 'No se pudo guardar el video subido: ' + (err && err.message ? err.message : 'error desconocido.');
    state.recording.sessionId = sessionId;
  }
  render();
}

export async function loadVideoForPlayback(sessionId) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session || !session.videoId) return;
  if (state.videoPlayback.sessionId === sessionId && (state.videoPlayback.objectUrl || state.videoPlayback.loading)) return;
  releaseVideoPlayback();
  state.videoPlayback.sessionId = sessionId;
  state.videoPlayback.loading = true;
  render();
  try {
    const record = await VideoDB.getVideo(session.videoId);
    if (!record || !record.blob) {
      state.videoPlayback.error = 'El video no se encontró en el almacenamiento local (¿se limpió el almacenamiento del navegador?).';
    } else {
      state.videoPlayback.objectUrl = URL.createObjectURL(record.blob);
    }
  } catch (err) {
    state.videoPlayback.error = 'No se pudo leer el video: ' + (err && err.message ? err.message : 'error desconocido.');
  }
  state.videoPlayback.loading = false;
  render();
}

export function releaseVideoPlayback() {
  if (state.videoPlayback.objectUrl) URL.revokeObjectURL(state.videoPlayback.objectUrl);
  state.videoPlayback = {
    sessionId: null, objectUrl: null, loading: false, error: null,
    markerLabelInput: '', strideFreqInput: '', strideSerieIndex: '',
    strideManualDist: '', strideManualTime: '',
    detectingCadence: false, detectingCadenceProgress: 0, lastConfidence: null, cadenceError: null,
    skeletonFrames: null, detectingSkeleton: false, detectingSkeletonProgress: 0,
    skeletonConfidence: null, skeletonAnalyzedSeconds: null,
    skeletonVideoWidth: null, skeletonVideoHeight: null, skeletonError: null,
  };
}

export async function deleteSessionVideo(sessionId) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session || !session.videoId) return;
  const videoId = session.videoId;
  if (state.videoPlayback.sessionId === sessionId) releaseVideoPlayback();
  try { await VideoDB.deleteVideo(videoId); } catch (err) { console.error('Error borrando video de IndexedDB:', err); }
  session.videoId = null;
  session.videoMarkers = [];
  session.strideData = null;
  DB.saveSessions(state.currentAthleteId, state.sessions);
  showToast('Video eliminado');
  render();
}

export function addVideoMarker(sessionId, timeSeconds, label) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session || typeof timeSeconds !== 'number' || isNaN(timeSeconds)) return;
  if (!Array.isArray(session.videoMarkers)) session.videoMarkers = [];
  session.videoMarkers.push({ id: 'mk-' + Date.now(), time: timeSeconds, label: (label || '').trim() || `Marca ${session.videoMarkers.length + 1}` });
  session.videoMarkers.sort((a, b) => a.time - b.time);
  DB.saveSessions(state.currentAthleteId, state.sessions);
  render();
}

export function deleteVideoMarker(sessionId, markerId) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session || !Array.isArray(session.videoMarkers)) return;
  session.videoMarkers = session.videoMarkers.filter(m => m.id !== markerId);
  DB.saveSessions(state.currentAthleteId, state.sessions);
  render();
}

// Longitud de zancada = velocidad / frecuencia de zancada. La velocidad se
// obtiene con la misma calcVelocity() ya usada en el resto de la app
// (dist/tiempo), a partir de una serie de pista ya registrada o de una
// distancia/tiempo manual (para sesiones de campo/gimnasio o series sueltas
// vistas en el video pero no cargadas como serie formal). La frecuencia de
// zancada la cuenta el entrenador manualmente viendo el video (zancadas por
// segundo); no se detecta automáticamente.
export function saveStrideEstimation(sessionId, { distance, time, strideFrequency }) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) return null;
  const dist = Number(distance), t = Number(time), freq = Number(strideFrequency);
  const velocity = calcVelocity(dist, t);
  if (!velocity || !freq || freq <= 0) return null;
  const strideLength = velocity / freq;
  session.strideData = { distance: dist, time: t, strideFrequency: freq, velocity, strideLength, computedAt: Date.now() };
  DB.saveSessions(state.currentAthleteId, state.sessions);
  render();
  return session.strideData;
}

// Deteccion automatica de cadencia de zancada con MediaPipe Pose (ver
// js/services/poseDetection.js). Solo RELLENA el campo de frecuencia -- el
// entrenador sigue teniendo que darle a "Calcular longitud de zancada" para
// confirmar, nunca se autoguarda. Requiere internet la primera vez (carga
// el runtime WASM y el modelo de pose desde CDN); esto es una excepcion
// deliberada a la regla de "todo el video es local" del resto de esta
// funcionalidad -- ver aviso en la UI.
export async function detectStrideCadence(sessionId, videoElId) {
  const vp = state.videoPlayback;
  if (vp.detectingCadence || vp.detectingSkeleton) return; // ya hay un analisis en curso, ignora clics repetidos
  const videoEl = document.getElementById(videoElId);
  if (!videoEl) {
    vp.cadenceError = 'No se encontró el reproductor de video en pantalla.';
    render();
    return;
  }
  vp.detectingCadence = true;
  vp.detectingCadenceProgress = 0;
  vp.cadenceError = null;
  vp.lastConfidence = null;
  render();
  try {
    const result = await analyzeStrideCadence(videoEl, {
      onProgress: pct => { vp.detectingCadenceProgress = pct; render(); },
    });
    vp.strideFreqInput = String(result.stepsPerSecond);
    vp.lastConfidence = result.confidence;
    if (result.confidence === 'baja') {
      showToast('⚠ Detección poco confiable — revisa el número a mano');
    } else {
      showToast(`✓ Cadencia detectada: ${result.stepsPerSecond} zancadas/s`);
    }
  } catch (err) {
    vp.cadenceError = 'No se pudo analizar el video: ' + (err && err.message ? err.message : 'error desconocido.') +
      ' Puedes seguir escribiendo la frecuencia a mano.';
  }
  vp.detectingCadence = false;
  render();
}

// Fase A del roadmap de "sprint lab" (analisis de forma de carrera):
// captura el esqueleto completo del video (cadera, rodillas, tobillos,
// hombros, codos, muñecas, pies) con MediaPipe Pose -- ver
// js/services/poseDetection.js#analyzeFullSkeleton. Los resultados quedan
// en vp.skeletonFrames y de ahi los toma js/services/skeletonOverlay.js
// para dibujar el "muñeco de palitos" sincronizado sobre el video, sin
// necesidad de re-analizar cada vez que el entrenador reproduce el clip.
// Igual que la deteccion de cadencia, requiere internet la primera vez
// (carga el runtime WASM y el modelo desde CDN); el resto del video es
// 100% local.
export async function analyzeFullSprint(sessionId, videoElId) {
  const vp = state.videoPlayback;
  if (vp.detectingCadence || vp.detectingSkeleton) return; // ya hay un analisis en curso, ignora clics repetidos
  const videoEl = document.getElementById(videoElId);
  if (!videoEl) {
    vp.skeletonError = 'No se encontró el reproductor de video en pantalla.';
    render();
    return;
  }
  vp.detectingSkeleton = true;
  vp.detectingSkeletonProgress = 0;
  vp.skeletonError = null;
  render();
  try {
    const result = await analyzeFullSkeleton(videoEl, {
      onProgress: pct => { vp.detectingSkeletonProgress = pct; render(); },
    });
    if (!result.frames || result.frames.length === 0) {
      vp.skeletonFrames = null;
      vp.skeletonError = 'No se detectó ninguna persona con suficiente claridad en el video analizado.';
    } else {
      vp.skeletonFrames = result.frames;
      vp.skeletonConfidence = result.confidence;
      vp.skeletonAnalyzedSeconds = result.analyzedSeconds;
      vp.skeletonVideoWidth = result.videoWidth;
      vp.skeletonVideoHeight = result.videoHeight;
      if (result.confidence === 'baja') {
        showToast('⚠ Detección poco confiable — el esqueleto puede verse errático');
      } else {
        showToast(`✓ Esqueleto capturado: ${result.analyzedSeconds}s analizados`);
      }
    }
  } catch (err) {
    vp.skeletonError = 'No se pudo analizar el video: ' + (err && err.message ? err.message : 'error desconocido.');
  }
  vp.detectingSkeleton = false;
  render();
}

export function clearSkeletonCapture() {
  const vp = state.videoPlayback;
  vp.skeletonFrames = null;
  vp.skeletonConfidence = null;
  vp.skeletonAnalyzedSeconds = null;
  vp.skeletonVideoWidth = null;
  vp.skeletonVideoHeight = null;
  vp.skeletonError = null;
  render();
}
