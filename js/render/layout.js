// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { backToAthletes, executeDeleteAthlete } from '../actions/athletes.js';
import { renderAthleteFormScreen, renderAthletesScreen } from './athletes.js';
import { renderDashboardScreen } from './dashboard.js';
import { renderHelpScreen } from './help.js';
import { renderProfileScreen } from './profile.js';
import { renderProgressScreen } from './progress.js';
import { renderLogScreen } from './sessions.js';
import { renderWeekScreen } from './weeklyplan.js';
import { state } from '../state/state.js';
import { el } from '../utils/helpers.js';
import { dismissNotification } from '../utils/notifications.js';

export function renderHeader() {
  const helpBtn = el('button', { class: 'header-help-btn', title: 'Ayuda', onClick: () => { state.showHelp = true; render(); } }, '❓');
  const athleteBtn = el('button', { class: 'header-athlete-btn', onClick: backToAthletes }, [
    el('div', { class: 'header-athlete-name' }, state.athlete ? state.athlete.name : '—'),
    el('div', { class: 'header-athlete-label' }, '← cambiar atleta'),
  ]);
  return el('header', { class: 'app-header' }, [
    el('div', { class: 'header-lane' }),
    el('div', { class: 'header-content' }, [
      el('div', { class: 'header-titles' }, [el('span', { class: 'header-eyebrow' }, '100 / 200 M'), el('h1', { class: 'header-title' }, 'SPRINT LAB')]),
      el('div', { class: 'header-actions' }, [helpBtn, athleteBtn]),
    ]),
    el('div', { class: 'header-lane' }),
  ]);
}

export function renderTabBar() {
  const tabs = [{ id: 'dashboard', label: 'Estado' }, { id: 'profile', label: 'Perfil' }, { id: 'week', label: 'Semana' }, { id: 'log', label: 'Registro' }, { id: 'progress', label: 'Progreso' }];
  return el('nav', { class: 'tab-bar' }, tabs.map(t => el('button', { class: 'tab-button' + (state.tab === t.id ? ' active' : ''), onClick: () => { state.tab = t.id; render(); } }, t.label)));
}

// Cada render() reconstruye TODO el DOM de #app desde cero (root.innerHTML
// = '' + reapendizado). Eso es simple y funcionó bien mientras render() no
// se llamaba en cada tecla, pero varios campos (duración, tiempos, etc.)
// SÍ llaman render() en cada oninput para mostrar validación en vivo -- y
// al reconstruirse el DOM, el <input> enfocado se destruye y se crea uno
// nuevo, perdiendo el foco. Por eso había que hacer clic de nuevo en cada
// tecla. Esta captura/restauración de foco es la solución general: en vez
// de parchar cada campo uno por uno, se resuelve una sola vez, aquí, para
// toda la app.
function captureFocus(root) {
  const active = document.activeElement;
  if (!active || !root.contains(active)) return null;
  if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement)) return null;
  const path = [];
  let node = active;
  while (node && node !== root) {
    const parent = node.parentElement;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.children, node));
    node = parent;
  }
  let selectionStart = null, selectionEnd = null;
  try { selectionStart = active.selectionStart; selectionEnd = active.selectionEnd; } catch { /* algunos tipos (number, date, email) no exponen selección */ }
  return { path, tag: active.tagName, selectionStart, selectionEnd };
}

function restoreFocus(root, captured) {
  if (!captured) return;
  let node = root;
  for (const idx of captured.path) {
    if (!node || !node.children || !node.children[idx]) return;
    node = node.children[idx];
  }
  if (!node || node.tagName !== captured.tag || typeof node.focus !== 'function') return;
  node.focus();
  if (captured.selectionStart !== null && typeof node.setSelectionRange === 'function') {
    try { node.setSelectionRange(captured.selectionStart, captured.selectionEnd); } catch { /* input types sin soporte de seleccion (number, date...) */ }
  }
}

export function render() {
  if (state.loading) {
    const root = document.getElementById('app');
    root.innerHTML = '';
    root.appendChild(el('div', { class: 'loading-screen' }, [el('div', { class: 'loading-text' }, 'CARGANDO')]));
    return;
  }
  if (state.view === 'athletes') { renderAthletesScreen(); return; }
  if (state.view === 'athlete-form') { renderAthleteFormScreen(); return; }
  if (state.view === 'app') {
    const root = document.getElementById('app');
    const focused = captureFocus(root);
    root.innerHTML = '';
    root.appendChild(renderHeader());
    if (state.showHelp) {
      const helpMain = el('main', {});
      helpMain.appendChild(renderHelpScreen());
      root.appendChild(helpMain);
      restoreFocus(root, focused);
      return;
    }
    // Notificaciones
    if (state.notifications.length > 0) {
      const banner = el('div', { class: 'notification-banner' }, state.notifications.map(n => {
        const dismissBtn = el('button', { class: 'dismiss', onClick: () => dismissNotification(n.id) }, '✕');
        return el('div', { class: `notification-item ${n.type}` }, [el('span', { class: 'msg' }, n.msg), dismissBtn]);
      }));
      root.appendChild(banner);
    }
    if (state.saveError) root.appendChild(el('div', { class: 'error-banner' }, [state.saveError, el('button', { class: 'error-dismiss', onClick: () => { state.saveError = null; render(); } }, '✕')]));
    if (state.confirmDelete) {
      const a = state.athletes.find(x => x.id === state.confirmDelete) || state.athlete;
      const overlay = el('div', { class: 'modal-overlay' }, [
        el('div', { class: 'modal-box' }, [
          el('div', { class: 'modal-title' }, 'Eliminar atleta'),
          el('div', { class: 'modal-body' }, `Se eliminarán permanentemente el perfil y todas las sesiones de ${a ? a.name : 'este atleta'}. Esta acción no se puede deshacer.`),
          el('div', { class: 'modal-actions' }, [
            el('button', { class: 'danger-button', onClick: () => { executeDeleteAthlete(state.confirmDelete); backToAthletes(); } }, 'Eliminar'),
            el('button', { class: 'secondary-button', onClick: () => { state.confirmDelete = null; render(); } }, 'Cancelar'),
          ]),
        ]),
      ]);
      root.appendChild(overlay);
    }
    const main = el('main', {});
    if (state.tab === 'dashboard') main.appendChild(renderDashboardScreen());
    if (state.tab === 'profile') main.appendChild(renderProfileScreen());
    if (state.tab === 'week') main.appendChild(renderWeekScreen());
    if (state.tab === 'log') main.appendChild(renderLogScreen());
    if (state.tab === 'progress') main.appendChild(renderProgressScreen());
    root.appendChild(main);
    root.appendChild(renderTabBar());
    restoreFocus(root, focused);
    return;
  }
}

