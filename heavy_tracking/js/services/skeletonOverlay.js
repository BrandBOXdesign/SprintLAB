// Fase A del roadmap de "sprint lab": dibuja el "muñeco de palitos"
// (esqueleto capturado por analyzeFullSkeleton en poseDetection.js) sobre
// un <canvas> superpuesto al <video>, sincronizado con video.currentTime.
// Se dibuja tambien una capa negra semitransparente (20% opacidad) debajo
// del esqueleto para que las lineas se lean bien sin importar el color del
// fondo del video -- solo aparece cuando hay un cuadro capturado para
// mostrar; si todavia no se ha corrido el analisis, el video se ve normal.
//
// IMPORTANTE (bug corregido): el <video> usa object-fit:contain (ver
// components.css), asi que su contenido real puede quedar mas chico que
// la caja del elemento, centrado, con barras negras a los lados o
// arriba/abajo si el aspect ratio del clip no coincide con el contenedor
// (tipico con video vertical de celular). Los landmarks de MediaPipe estan
// normalizados respecto al FRAME NATIVO del video, no respecto a la caja
// completa del <video> -- por eso el dibujo pasa por computeContainRect()
// antes de posicionar cualquier punto, en vez de escalar directo contra el
// ancho/alto del canvas. Sin esto, el esqueleto se desalinea del corredor
// cada vez que hay letterboxing (justo el bug reportado).
//
// OJO con el patron de esta app: render() en layout.js reconstruye TODO el
// DOM de #app desde cero en cada llamada (ver comentario ahi). Eso significa
// que cualquier referencia directa a un nodo <canvas> o <video> capturada
// en un closure queda obsoleta en cuanto el usuario escribe una letra en
// cualquier campo de la pantalla. Por eso este loop NUNCA guarda una
// referencia a los nodos: en cada frame de animacion vuelve a buscarlos por
// id con document.getElementById(). Si en algun momento el id ya no existe
// (el usuario navego a otra sesion, borro el video, etc.) el loop se
// detiene solo -- no hace falta cancelarlo desde afuera.
const runningLoops = new Set();

const MAX_INTERP_GAP = 0.25; // segundos. Si entre dos cuadros capturados hay
// un hueco mas grande que esto (la deteccion se perdio varios cuadros
// seguidos -- oclusion, corredor salio del encuadre, etc.), no interpolamos
// en linea recta entre ellos porque el "salto" real del cuerpo no fue una
// linea recta. Mejor mostrar el cuadro mas cercano y aceptar un salto visible
// que inventar un movimiento fantasma que no ocurrio.

/**
 * Interpola linealmente entre los dos cuadros capturados que rodean a t.
 * Esto es lo que le da fluidez a la animacion: sin esto, el esqueleto salta
 * en escalones cada ~66ms (la cadencia de muestreo de analyzeFullSkeleton),
 * que es perceptible incluso a simple vista.
 */
function interpolateFrames(frames, t) {
  if (!frames || frames.length === 0) return null;
  if (t <= frames[0].t) return frames[0];
  if (t >= frames[frames.length - 1].t) return frames[frames.length - 1];
  let lo = 0, hi = frames.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= t) lo = mid; else hi = mid;
  }
  const fa = frames[lo], fb = frames[hi];
  const span = fb.t - fa.t;
  const ratio = span > 0 ? (t - fa.t) / span : 0;
  if (span > MAX_INTERP_GAP) return ratio < 0.5 ? fa : fb;

  const pts = {};
  const keys = new Set([...Object.keys(fa.pts), ...Object.keys(fb.pts)]);
  for (const k of keys) {
    const pa = fa.pts[k], pb = fb.pts[k];
    if (pa && pb) {
      pts[k] = {
        x: pa.x + (pb.x - pa.x) * ratio,
        y: pa.y + (pb.y - pa.y) * ratio,
        visibility: Math.min(pa.visibility, pb.visibility),
        // si CUALQUIERA de los dos extremos venia marcado "suspect" (por
        // la fase de heavy tracking en poseDetection.js), el punto
        // interpolado hereda esa marca -- sigue siendo una posicion poco
        // confiable aunque el promedio con el otro extremo "diluya" el
        // numero.
        suspect: !!(pa.suspect || pb.suspect),
      };
    } else if (pa && ratio < 0.5) {
      pts[k] = pa; // el punto desapareció a mitad de camino -- se sostiene el último valor conocido en vez de cortar de golpe
    } else if (pb && ratio >= 0.5) {
      pts[k] = pb;
    }
  }
  // Las metricas (angulos, altura de rodilla) son por-cuadro, no por-punto
  // -- en vez de interpolarlas (mezclar dos angulos linealmente no es
  // necesariamente mas correcto que mostrar el mas cercano, y es mas
  // simple), se toman del cuadro capturado mas cercano a t.
  const metrics = ratio < 0.5 ? fa.metrics : fb.metrics;
  return { t, pts, metrics };
}

/**
 * Con object-fit:contain, el contenido real del video (sin distorsión)
 * queda centrado dentro de la caja del <video>, con barras negras a los
 * lados o arriba/abajo si el aspect ratio del clip no coincide con el de
 * la caja. Los landmarks de MediaPipe estan normalizados (0-1) respecto al
 * FRAME NATIVO del video, no respecto a la caja completa -- asi que hay
 * que mapearlos dentro de ese rectangulo interno, no directo contra
 * canvasW/canvasH, o el esqueleto queda desalineado del corredor (esto es
 * justo lo que causaba el desfase reportado).
 */
function computeContainRect(canvasW, canvasH, videoW, videoH) {
  if (!videoW || !videoH) return { x: 0, y: 0, w: canvasW, h: canvasH };
  const canvasAR = canvasW / canvasH;
  const videoAR = videoW / videoH;
  let w, h;
  if (videoAR > canvasAR) {
    // el clip es relativamente mas ancho que la caja -> el ancho manda, barras arriba/abajo
    w = canvasW;
    h = canvasW / videoAR;
  } else {
    // el clip es relativamente mas alto (tipico de video vertical de celular) -> el alto manda, barras a los lados
    h = canvasH;
    w = canvasH * videoAR;
  }
  return { x: (canvasW - w) / 2, y: (canvasH - h) / 2, w, h };
}

function drawSkeleton(ctx, connections, frame, canvasW, canvasH, contentRect) {
  ctx.clearRect(0, 0, canvasW, canvasH);
  if (!frame) return;

  const { x: ox, y: oy, w, h } = contentRect;

  // Capa oscura semitransparente para que el esqueleto se lea bien sobre
  // cualquier video, sin taparlo del todo (20% opacidad). Solo sobre el
  // rectangulo real de contenido, no sobre las barras negras del letterbox.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(ox, oy, w, h);

  const pts = frame.pts;
  ctx.lineWidth = Math.max(2, w * 0.006);
  ctx.lineCap = 'round';
  for (const [a, b] of connections) {
    const pa = pts[a], pb = pts[b];
    if (!pa || !pb) continue;
    // Naranja si cualquiera de los dos extremos de esta línea viene
    // marcado "suspect" (congelado por un salto anómalo, o corregido por
    // un intercambio de identidad izquierda/derecha) -- verde normal en
    // el resto. Es una señal visual para el entrenador, no solo un dato
    // interno: le dice "en este tramo, confía menos en el ángulo/altura
    // mostrados".
    const suspect = pa.suspect || pb.suspect;
    ctx.strokeStyle = suspect ? 'rgba(217, 164, 65, 0.9)' : 'rgba(61, 220, 132, 0.9)';
    ctx.beginPath();
    ctx.moveTo(ox + pa.x * w, oy + pa.y * h);
    ctx.lineTo(ox + pb.x * w, oy + pb.y * h);
    ctx.stroke();
  }
  const r = Math.max(2.5, w * 0.007);
  for (const key of Object.keys(pts)) {
    const p = pts[key];
    ctx.fillStyle = p.suspect ? 'rgba(217, 164, 65, 0.95)' : 'rgba(255, 221, 51, 0.95)';
    ctx.beginPath();
    ctx.arc(ox + p.x * w, oy + p.y * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Ids fijos de cada campo del panel de metricas (ver renderSkeletonMetricsPanel
// en render/sessions.js, que crea estos spans UNA vez via el() -- el loop de
// abajo solo actualiza su textContent en cada cuadro, nunca reconstruye el
// DOM, por la misma razon que el canvas: forzar un render() completo en cada
// cuadro de animacion (~60/seg) reconstruiria TODO #app 60 veces por
// segundo, no solo este panel.
const METRIC_FIELDS = ['kneeAngleL', 'kneeAngleR', 'hipAngleL', 'hipAngleR', 'elbowAngleL', 'elbowAngleR', 'trunkInclination', 'kneeHeightL', 'kneeHeightR'];

function fmtMetric(v) {
  return (typeof v === 'number' && isFinite(v)) ? v.toFixed(1) : '—';
}

function updateMetricsPanel(sessionId, metrics) {
  for (const field of METRIC_FIELDS) {
    const el = document.getElementById(`metric-${field}-${sessionId}`);
    if (el) el.textContent = fmtMetric(metrics ? metrics[field] : null);
  }
}

/**
 * Arranca (si no esta ya corriendo) el loop de dibujo para un par
 * video/canvas identificados por id. Idempotente: llamarlo de nuevo con el
 * mismo canvasId mientras ya esta corriendo no hace nada.
 *
 * @param {string} videoElId
 * @param {string} canvasElId
 * @param {() => Array<{t:number, pts:Object}> | null} getFrames  se llama en cada frame de animacion; debe devolver los frames vigentes (o null) leyendo el estado actual, nunca un valor capturado de antemano
 * @param {Array<[number,number]>} connections
 * @param {string} [sessionId]  si se da, tambien actualiza el panel de metricas biomecanicas de esa sesion en cada cuadro (ver METRIC_FIELDS arriba)
 */
export function startSkeletonOverlayLoop(videoElId, canvasElId, getFrames, connections, sessionId) {
  if (runningLoops.has(canvasElId)) return;
  runningLoops.add(canvasElId);

  function tick() {
    const canvas = document.getElementById(canvasElId);
    const video = document.getElementById(videoElId);
    if (!canvas || !video) {
      runningLoops.delete(canvasElId);
      return; // el bloque ya no esta en pantalla -- el loop se auto-cierra aqui
    }
    const rect = video.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const frames = getFrames();
    const ctx = canvas.getContext('2d');
    if (frames && frames.length > 0) {
      const contentRect = computeContainRect(w, h, video.videoWidth, video.videoHeight);
      const currentFrame = interpolateFrames(frames, video.currentTime);
      drawSkeleton(ctx, connections, currentFrame, w, h, contentRect);
      if (sessionId) updateMetricsPanel(sessionId, currentFrame && currentFrame.metrics);
    } else {
      ctx.clearRect(0, 0, w, h);
      if (sessionId) updateMetricsPanel(sessionId, null);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
