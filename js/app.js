// Punto de entrada de la aplicacion. Se carga como <script type="module" src="js/app.js">
// desde index.html. Importa el arranque (loadAll) y lo ejecuta.
import { loadAll } from './actions/athletes.js';
import { initAuthListener } from './actions/auth.js';
import { render } from './render/layout.js';
import { state } from './state/state.js';

// DB.safeSet avisa aqui cuando localStorage se llena (QuotaExceededError).
window.addEventListener('sl:storage-error', () => {
  state.saveError = 'No se pudo guardar: el almacenamiento del navegador está lleno. Descarga un Backup JSON y elimina datos o videos antiguos.';
  render();
});

loadAll();
initAuthListener();
