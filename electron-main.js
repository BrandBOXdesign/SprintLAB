// Proceso principal de Electron. Levanta un mini-servidor HTTP local que
// sirve los archivos de la app (necesario porque los ES Modules de
// js/app.js no funcionan bajo file://, el mismo problema de CORS que ya
// viste con Live Server). Luego abre una ventana apuntando a ese servidor.
const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const PORT = 47812;

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
  '.wasm': 'application/wasm',
  '.task': 'application/octet-stream',
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
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 400,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icons', 'sprint_lab.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
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
  startLocalServer();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
