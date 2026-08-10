// Script de verificacion visual: corre el analisis de esqueleto REAL (el
// mismo codigo de la app, sin duplicar nada) sobre un video que le pases,
// y guarda capturas de pantalla del canvas en varios instantes -- para
// mandarselas a Claude y que las revise con sus propios "ojos" (la
// herramienta view() acepta imagenes) en vez de razonar a ciegas sobre el
// codigo, que es como se construyo todo hasta ahora.
//
// PRIMERA VEZ QUE SE CORRE ESTE SCRIPT: nunca se probo (Claude no tiene
// navegador en su sandbox). Si algo sale mal, manda la salida CRUDA de la
// terminal completa antes que nada -- vamos a depurar el arnes mismo
// antes de confiar en lo que produce.
//
// Uso:
//   npm install -D playwright        (una sola vez)
//   npx playwright install chromium  (una sola vez, descarga el navegador)
//   node scripts/verify-skeleton.mjs "C:\ruta\a\tu\video.mp4"
//   node scripts/verify-skeleton.mjs "C:\ruta\a\tu\video.mp4" --times 0.5,1.2,2.0
//
// Salida: test/visual/output/frame-<segundos>s.png (uno por cada instante)

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'test', 'visual', 'output');
const PORT = 8934;

function parseArgs(argv) {
  const videoPath = argv[2];
  if (!videoPath) {
    console.error('Uso: node scripts/verify-skeleton.mjs <ruta-al-video> [--times 0.5,1.0,1.5]');
    process.exit(1);
  }
  const resolvedVideo = path.resolve(videoPath);
  if (!existsSync(resolvedVideo)) {
    console.error(`ERROR: no existe el archivo de video: ${resolvedVideo}`);
    process.exit(1);
  }
  let times = null;
  const timesIdx = argv.indexOf('--times');
  if (timesIdx !== -1 && argv[timesIdx + 1]) {
    times = argv[timesIdx + 1].split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  }
  return { videoPath: resolvedVideo, times };
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm' };

function startServer(videoPath) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        let filePath;
        if (req.url.startsWith('/__video__')) {
          filePath = videoPath;
        } else {
          const urlPath = decodeURIComponent(req.url.split('?')[0]);
          filePath = path.join(PROJECT_ROOT, urlPath);
        }
        const ext = path.extname(filePath);
        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Accept-Ranges': 'bytes' });
        res.end(data);
      } catch (err) {
        res.writeHead(404);
        res.end('not found: ' + req.url + ' -- ' + err.message);
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function main() {
  const { videoPath, times } = parseArgs(process.argv);

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error('ERROR: no se encontro el paquete "playwright". Instalalo primero con:');
    console.error('  npm install -D playwright && npx playwright install chromium');
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`Sirviendo el proyecto en http://localhost:${PORT} (video: ${videoPath})`);
  const server = await startServer(videoPath);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 700, height: 500 } });

  // Reenviar TODO lo que pase en la pagina (console.log, errores) a la
  // terminal de Node -- es la unica forma de que Claude, sin navegador,
  // pueda ver que salio mal si algo falla.
  page.on('console', msg => console.log(`[navegador:${msg.type()}]`, msg.text()));
  page.on('pageerror', err => console.error('[navegador:error-no-capturado]', err));

  try {
    const harnessUrl = `http://localhost:${PORT}/test/visual/harness.html?video=/__video__`;
    console.log('Abriendo arnes:', harnessUrl);
    await page.goto(harnessUrl, { waitUntil: 'load' });

    console.log('Cargando metadata del video...');
    const meta = await page.evaluate(() => window.__harness.loadVideo());
    console.log('Metadata del video:', meta);

    console.log('Corriendo analisis de esqueleto (modelo heavy -- puede tardar 1-3 minutos, es normal)...');
    const analysisResult = await page.evaluate(() => window.__harness.runAnalysis());
    console.log('Resultado del analisis:', analysisResult);

    const targetTimes = times && times.length > 0
      ? times
      : Array.from({ length: 5 }, (_, i) => +(meta.duration * (i + 1) / 6).toFixed(2)); // 5 instantes repartidos en el clip

    for (const t of targetTimes) {
      if (t > meta.duration) { console.warn(`Instante ${t}s excede la duracion del video (${meta.duration}s), se salta.`); continue; }
      console.log(`Dibujando y capturando t=${t}s...`);
      await page.evaluate((tt) => window.__harness.drawAt(tt), t);
      const outPath = path.join(OUTPUT_DIR, `frame-${t}s.png`);
      await page.locator('#stack').screenshot({ path: outPath });
      console.log(`  guardado: ${outPath}`);
    }

    console.log('\n✔ Listo. Capturas en:', OUTPUT_DIR);
    console.log('Subilas a la conversacion con Claude para que las revise.');
  } catch (err) {
    console.error('\n✘ ERROR durante la verificacion:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
}

main();
