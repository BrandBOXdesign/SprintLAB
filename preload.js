// Puente de contextBridge para el proceso "renderer" (la app web de
// verdad). Con contextIsolation:true (ver electron-main.js) el renderer NO
// tiene acceso a Node ni a Electron directamente -- por diseño, es la
// misma razon por la que un sitio web normal no puede leer tu disco duro.
// Este archivo expone, a propósito, solo 3 funciones muy acotadas para el
// respaldo automático (Fase 6.3 del roadmap), nada de acceso genérico al
// sistema de archivos.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sprintlabDesktop', {
  // Guarda un respaldo completo (JSON en texto) con el nombre dado, en una
  // carpeta fija fuera de la carpeta de la app (ver electron-main.js).
  saveAutoBackup: (filename, jsonString) => ipcRenderer.invoke('sprintlab:save-backup', filename, jsonString),
  // Lista los respaldos automáticos existentes (nombre + fecha), para
  // mostrarle al entrenador que sí está pasando de verdad.
  listAutoBackups: () => ipcRenderer.invoke('sprintlab:list-backups'),
  // Abre la carpeta de respaldos en el explorador de archivos del sistema.
  openBackupsFolder: () => ipcRenderer.invoke('sprintlab:open-backups-folder'),
});
