// Fase 2.2 del roadmap: almacenamiento LOCAL de video (sin nube, por
// decisión explícita). Se usa IndexedDB en vez de localStorage porque los
// videos son blobs potencialmente grandes (varios MB por clip) y
// localStorage tiene un límite de ~5-10MB por origen, insuficiente incluso
// para un solo clip corto. Aquí solo vive el blob; la sesión guardada por
// DB (js/db/db.js, en localStorage) solo guarda el id de referencia
// (session.videoId), igual que ya hace con el resto de sus datos.

const DB_NAME = 'sprintlab-videos';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB no está disponible en este navegador.')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export const VideoDB = {
  /** Guarda (o reemplaza) un blob de video bajo el id dado. */
  async saveVideo(id, blob, meta = {}) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ id, blob, mimeType: blob.type, createdAt: Date.now(), ...meta });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },
  /** Devuelve el registro completo ({ id, blob, mimeType, createdAt }) o null si no existe. */
  async getVideo(id) {
    if (!id) return null;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },
  async deleteVideo(id) {
    if (!id) return true;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  },
};
