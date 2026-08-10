// Punto de entrada de la aplicacion. Se carga como <script type="module" src="js/app.js">
// desde index.html. Importa el arranque (loadAll) y lo ejecuta.
import { loadAll } from './actions/athletes.js';
import { initAuthListener } from './actions/auth.js';
import { runAutoBackupIfDue } from './services/autoBackup.js';

loadAll();
initAuthListener();

// Fase 6.3: respaldo automatico local (todos los atletas, cada 24h). Se
// revisa al arrancar y luego cada hora -- así no depende de que la app se
// quede abierta 24h seguidas para que corra el primero. No hace nada si
// no hay puente de Electron disponible (ver services/autoBackup.js).
runAutoBackupIfDue();
setInterval(runAutoBackupIfDue, 60 * 60 * 1000);
