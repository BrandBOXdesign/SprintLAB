// Punto de entrada de la aplicacion. Se carga como <script type="module" src="js/app.js">
// desde index.html. Importa el arranque (loadAll) y lo ejecuta.
import { loadAll } from './actions/athletes.js';
import { initAuthListener } from './actions/auth.js';

loadAll();
initAuthListener();
