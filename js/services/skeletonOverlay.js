// Fase A del roadmap de "sprint lab": dibuja el "muñeco de palitos"
// (esqueleto capturado por analyzeFullSkeleton en poseDetection.js) sobre
// un <canvas> superpuesto al <video>, sincronizado con video.currentTime.
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

/** Busca el cuadro capturado mas cercano a t (vecino mas cercano, sin interpolar -- suficiente para Fase A). */
function findNearestFrame(frames, t) {
  if (!frames || frames.length === 0) return null;
  if (t <= frames[0].t) return frames[0];
  if (t >= frames[frames.length - 1].t) return frames[frames.length - 1];
  let lo = 0, hi = frames.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].t <= t) lo = mid; else hi = mid;
  }
  return (t - frames[lo].t) <= (frames[hi].t - t) ? frames[lo] : frames[hi];
}

function drawSkeleton(ctx, connections, frame, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (!frame) return;
  const pts = frame.pts;
  ctx.lineWidth = Math.max(2, w * 0.006);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(61, 220, 132, 0.9)';
  for (const [a, b] of connections) {
    const pa = pts[a], pb = pts[b];
    if (!pa || !pb) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 221, 51, 0.95)';
  const r = Math.max(2.5, w * 0.007);
  for (const key of Object.keys(pts)) {
    const p = pts[key];
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
    ctx.fill();
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
 */
export function startSkeletonOverlayLoop(videoElId, canvasElId, getFrames, connections) {
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
      drawSkeleton(ctx, connections, findNearestFrame(frames, video.currentTime), w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
