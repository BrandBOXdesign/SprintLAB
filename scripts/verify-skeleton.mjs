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
    console.error(
      'Uso: node scripts/verify-skeleton.mjs <ruta-al-video> [--times 0.5,1.0,1.5]'
    );
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
    times = argv[timesIdx + 1]
      .split(',')
      .map(s => parseFloat(s.trim()))
      .filter(n => Number.isFinite(n));
  }

  return {
    videoPath: resolvedVideo,
    times
  };
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.m4v': 'video/mp4',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream'
};

function startServer(videoPath) {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        let filePath;

        if (req.url.startsWith('/__video__')) {
          filePath = videoPath;
        } else {
          const urlPath = decodeURIComponent(req.url.split('?')[0]);

          if (urlPath === '/') {
            filePath = path.join(PROJECT_ROOT, 'index.html');
          } else {
            filePath = path.join(PROJECT_ROOT, urlPath);
          }
        }

        const ext = path.extname(filePath).toLowerCase();
        const data = await readFile(filePath);

        // El servidor DEBE soportar peticiones Range (206): sin ellas Chromium no puede
        // hacer seek en un mp4 (duración mal detectada y "Target crashed" al saltar de instante).
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
        if (range && (range[1] !== '' || range[2] !== '')) {
          const total = data.length;
          let start = range[1] === '' ? total - Number(range[2]) : Number(range[1]);
          let end = range[1] === '' || range[2] === '' ? total - 1 : Number(range[2]);
          start = Math.max(0, start); end = Math.min(total - 1, end);
          if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${total}` }); res.end(); return; }
          res.writeHead(206, {
            'Content-Type': MIME[ext] || 'application/octet-stream',
            'Accept-Ranges': 'bytes',
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Content-Length': end - start + 1,
            'Cache-Control': 'no-store'
          });
          res.end(data.subarray(start, end + 1));
          return;
        }

        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Accept-Ranges': 'bytes',
          'Content-Length': data.length,
          'Cache-Control': 'no-store'
        });

        res.end(data);
      } catch (err) {
        res.writeHead(404);
        res.end(
          'not found: ' +
          req.url +
          ' -- ' +
          err.message
        );
      }
    });

    server.listen(PORT, () => resolve(server));
  });
}

/*
 * Fuerza el video a un instante concreto y espera a que el navegador
 * confirme que el seek terminó.
 *
 * Esto evita el problema de capturar repetidamente el mismo frame
 * aunque el análisis haya producido datos para distintos tiempos.
 */
async function seekVideoTo(page, targetTime) {
  const result = await page.evaluate(async (tt) => {
    const video = document.querySelector('video');

    if (!video) {
      throw new Error('No se encontró ningún elemento <video> en la página.');
    }

    if (!Number.isFinite(tt)) {
      throw new Error(`Tiempo inválido: ${tt}`);
    }

    const duration = Number.isFinite(video.duration)
      ? video.duration
      : null;

    const clampedTime = duration !== null
      ? Math.max(0, Math.min(tt, Math.max(0, duration - 0.001)))
      : Math.max(0, tt);

    /*
     * Si ya estamos prácticamente en el instante solicitado, no
     * dependemos exclusivamente de un evento seeked que podría no
     * dispararse.
     */
    const currentBefore = video.currentTime;

    if (Math.abs(currentBefore - clampedTime) > 0.001) {
      await new Promise((resolve, reject) => {
        let settled = false;

        const cleanup = () => {
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
        };

        const finish = () => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve();
        };

        const onSeeked = () => finish();

        const onError = () => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(
            new Error(
              `Error al hacer seek del video hacia ${clampedTime}s`
            )
          );
        };

        video.addEventListener('seeked', onSeeked, { once: true });
        video.addEventListener('error', onError, { once: true });

        video.currentTime = clampedTime;

        /*
         * Fallback de seguridad. Algunos navegadores pueden resolver
         * el seek sin entregar el evento esperado en determinados
         * estados.
         */
        setTimeout(() => finish(), 3000);
      });
    }

    /*
     * Esperamos un frame real de renderizado.
     */
    await new Promise(resolve => {
      if (typeof video.requestVideoFrameCallback === 'function') {
        video.requestVideoFrameCallback(() => resolve());
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      }
    });

    /*
     * Segundo frame para garantizar que canvas/video estén sincronizados.
     */
    await new Promise(resolve => {
      requestAnimationFrame(() => resolve());
    });

    return {
      requestedTime: tt,
      clampedTime,
      currentBefore,
      currentAfter: video.currentTime,
      readyState: video.readyState,
      duration: video.duration
    };
  }, targetTime);

  return result;
}

async function main() {
  const { videoPath, times } = parseArgs(process.argv);

  let chromium;

  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error(
      'ERROR: no se encontró el paquete "playwright". Instálalo primero con:'
    );
    console.error(
      '  npm install -D playwright && npx playwright install chromium'
    );
    process.exit(1);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(
    `Sirviendo el proyecto en http://localhost:${PORT} (video: ${videoPath})`
  );

  const server = await startServer(videoPath);

  const browser = await chromium.launch();

  let page = await browser.newPage({
    viewport: {
      width: 700,
      height: 500
    }
  });

  page.on('console', msg => {
    console.log(`[navegador:${msg.type()}]`, msg.text());
  });

  page.on('pageerror', err => {
    console.error(
      '[navegador:error-no-capturado]',
      err
    );
  });

  try {
    const harnessUrl =
      `http://localhost:${PORT}/test/visual/harness.html?video=/__video__`;

    console.log('Abriendo arnés:', harnessUrl);

    await page.goto(harnessUrl, {
      waitUntil: 'load'
    });

    console.log('Cargando metadata del video...');

    const meta = await page.evaluate(() =>
      window.__harness.loadVideo()
    );

    console.log('Metadata del video:', meta);

    console.log(
      'Corriendo análisis de esqueleto (modelo heavy -- puede tardar 1-3 minutos, es normal)...'
    );

    const analysisResult = await page.evaluate(() =>
      window.__harness.runAnalysis()
    );

    console.log(
      'Resultado del análisis:',
      analysisResult
    );

    // El "Target crashed" ocurría al hacer seek en la MISMA pestaña donde corrió MediaPipe
    // (memoria WASM + contexto WebGL ya usados). Se guardan los cuadros analizados, se cierra
    // esa pestaña y las capturas se hacen en una pestaña NUEVA con solo video y canvas.
    const analyzedFrames = await page.evaluate(() => window.__harness.frames);
    await page.close();
    page = await browser.newPage({ viewport: { width: 700, height: 500 } });
    page.on('console', msg => console.log(`[navegador:${msg.type()}]`, msg.text()));
    page.on('pageerror', err => console.error('[navegador:error-no-capturado]', err));
    await page.goto(harnessUrl, { waitUntil: 'load' });
    await page.evaluate(() => window.__harness.loadVideo());
    await page.evaluate((fr) => { window.__harness.frames = fr; }, analyzedFrames);

    const targetTimes =
      times && times.length > 0
        ? times
        : Array.from(
            { length: 5 },
            (_, i) =>
              +(
                meta.duration * (i + 1) / 6
              ).toFixed(2)
          );

    console.log(
      '\n=== INSTANTES DE CAPTURA ==='
    );

    console.log(
      targetTimes
        .map(t => `${t}s`)
        .join(' | ')
    );

    /*
     * Limpiamos capturas anteriores para evitar confundir resultados
     * de una ejecución previa con los de la actual.
     */
    const existingFiles = await import('node:fs/promises')
      .then(fs => fs.readdir(OUTPUT_DIR))
      .catch(() => []);

    for (const file of existingFiles) {
      if (
        file.startsWith('frame-') &&
        file.endsWith('.png')
      ) {
        await import('node:fs/promises')
          .then(fs =>
            fs.unlink(
              path.join(OUTPUT_DIR, file)
            )
          );
      }
    }

    const captureResults = [];

    for (const t of targetTimes) {
      if (t < 0 || t >= meta.duration) {
        console.warn(
          `Instante ${t}s fuera del rango del video ` +
          `(0 - ${meta.duration}s), se salta.`
        );
        continue;
      }

      console.log(
        `\n--- Captura solicitada: ${t}s ---`
      );

      /*
       * 1. Posicionar realmente el video.
       */
      const seekResult =
        await seekVideoTo(page, t);

      console.log(
        'Seek:',
        JSON.stringify(seekResult)
      );

      /*
       * 2. Dibujar el esqueleto correspondiente al instante.
       */
      const drawResult =
        await page.evaluate(
          async (tt) => {
            const result =
              await window.__harness.drawAt(tt);

            return {
              result,
              videoCurrentTime:
                document.querySelector('video')
                  ?.currentTime ?? null
            };
          },
          t
        );

      console.log(
        'Draw:',
        JSON.stringify(drawResult)
      );

      /*
       * 3. Capturar.
       */
      const outPath = path.join(
        OUTPUT_DIR,
        `frame-${t}s.png`
      );

      await page
        .locator('#stack')
        .screenshot({
          path: outPath
        });

      /*
       * 4. Verificación posterior a la captura.
       */
      const finalState =
        await page.evaluate(() => {
          const video =
            document.querySelector('video');

          return {
            currentTime:
              video?.currentTime ?? null,
            duration:
              video?.duration ?? null,
            readyState:
              video?.readyState ?? null
          };
        });

      console.log(
        'Estado final:',
        JSON.stringify(finalState)
      );

      console.log(
        `  guardado: ${outPath}`
      );

      captureResults.push({
        requested: t,
        actual:
          finalState.currentTime,
        output: outPath
      });
    }

    console.log(
      '\n=== VERIFICACIÓN DE TIEMPOS ==='
    );

    for (const item of captureResults) {
      const difference =
        Math.abs(
          item.actual - item.requested
        );

      console.log(
        `solicitado=${item.requested}s ` +
        `real=${item.actual.toFixed(3)}s ` +
        `diferencia=${difference.toFixed(3)}s`
      );
    }

    const uniqueTimes =
      new Set(
        captureResults.map(item =>
          item.actual.toFixed(3)
        )
      );

    if (
      captureResults.length >= 2 &&
      uniqueTimes.size === 1
    ) {
      console.error(
        '\n✘ ADVERTENCIA CRÍTICA: todas las capturas ' +
        'terminaron en el mismo instante de video.'
      );
      console.error(
        'El arnés no puede considerarse válido todavía.'
      );
    } else {
      console.log(
        '\n✔ Los instantes de video capturados son distintos.'
      );
    }

    console.log(
      '\n✔ Listo. Capturas en:',
      OUTPUT_DIR
    );

    console.log(
      'Estas capturas pueden utilizarse para revisión visual.'
    );
  } catch (err) {
    console.error(
      '\n✘ ERROR durante la verificación:',
      err
    );

    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
}

main();
