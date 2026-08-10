// Proceso principal de Electron. Levanta un mini-servidor HTTP local que
// sirve los archivos de la app (necesario porque los ES Modules de
// js/app.js no funcionan bajo file://, el mismo problema de CORS que ya
// viste con Live Server). Luego abre una ventana apuntando a ese servidor.
const { app, BrowserWindow, session, screen, ipcMain, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const PORT = 47812;

// Fase 6.3 del roadmap: respaldo automatico local. Se guarda FUERA de la
// carpeta de la app (en app.getPath('userData'), la ruta estandar de
// Electron para datos de usuario -- en Windows algo como
// %APPDATA%/sprint-lab/backups) para que sobreviva a una reinstalacion o
// actualizacion de la app, que sí borraría la carpeta del programa.
const MAX_AUTO_BACKUPS = 14; // ~2 semanas de respaldos diarios
function getBackupsDir() {
  const dir = path.join(app.getPath('userData'), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function pruneOldBackups(dir) {
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('sprintlab-auto-backup-') && f.endsWith('.json'))
    .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
  for (const old of files.slice(MAX_AUTO_BACKUPS)) {
    try { fs.unlinkSync(path.join(dir, old.name)); } catch (e) { console.error('No se pudo borrar backup viejo:', old.name, e); }
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.gpx': 'application/gpx+xml',
};

function startLocalServer() {
  const root = __dirname;
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(root, urlPath);
    // Evita salir de la carpeta del proyecto (seguridad basica).
    if (!filePath.startsWith(root)) { res.writeHead(403); res.end('Prohibido'); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('No encontrado: ' + urlPath); return; }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
  server.listen(PORT, '127.0.0.1');
  return server;
}

function createWindow() {
  // La app tiene un layout fijo tipo "movil" (#app: max-width 480px). Una
  // ventana grande genérica (ej. 1280x860) deja la interfaz chiquita y
  // perdida en medio de espacio vacío. En vez de eso, la ventana se ajusta
  // al ancho real del contenido y se pega a 10px del borde de la pantalla.
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const APP_CONTENT_WIDTH = 480;
  const EDGE_MARGIN = 10;
  const winWidth = Math.min(APP_CONTENT_WIDTH + 40, screenW - EDGE_MARGIN * 2); // +40: márgen para que no se sienta pegado al borde interno
  const winHeight = screenH - EDGE_MARGIN * 2;

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: EDGE_MARGIN,
    y: EDGE_MARGIN,
    minWidth: 400,
    minHeight: 500,
    icon: path.join(__dirname, 'assets', 'icons', 'sprint_lab.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadURL(`http://127.0.0.1:${PORT}/index.html`);
}

app.whenReady().then(() => {
  // Fase 2.2 del roadmap: video local con getUserMedia. Electron suele
  // autorizar 'media' (camara/microfono) por defecto sin un handler propio,
  // pero se deja explicito aqui para no depender de ese comportamiento
  // implicito y para poder ver en consola si algun sistema operativo llega
  // a bloquear el acceso a nivel de SO (eso Electron no lo puede forzar).
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') { callback(true); return; }
    callback(false);
  });

  // Fase 6.3: respaldo automatico -- guardar, listar, abrir carpeta.
  ipcMain.handle('sprintlab:save-backup', (event, filename, jsonString) => {
    try {
      const dir = getBackupsDir();
      // Nombre de archivo saneado (por si acaso) -- solo debe llegar el que
      // genera services/autoBackup.js, pero no cuesta nada ser explicito.
      const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
      fs.writeFileSync(path.join(dir, safeName), jsonString, 'utf-8');
      pruneOldBackups(dir);
      return { ok: true, path: path.join(dir, safeName) };
    } catch (e) {
      console.error('Error guardando respaldo automático:', e);
      return { ok: false, error: String(e) };
    }
  });

  ipcMain.handle('sprintlab:list-backups', () => {
    try {
      const dir = getBackupsDir();
      return fs.readdirSync(dir)
        .filter(f => f.startsWith('sprintlab-auto-backup-') && f.endsWith('.json'))
        .map(f => ({ name: f, mtime: fs.statSync(path.join(dir, f)).mtime.toISOString() }))
        .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
    } catch (e) {
      console.error('Error listando respaldos automáticos:', e);
      return [];
    }
  });

  ipcMain.handle('sprintlab:open-backups-folder', () => {
    shell.openPath(getBackupsDir());
    return { ok: true };
  });

  startLocalServer();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
