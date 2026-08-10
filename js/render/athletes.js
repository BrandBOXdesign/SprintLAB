// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { backToAthletes, executeDeleteAthlete, openNewAthleteForm, saveNewAthlete, selectAthlete } from '../actions/athletes.js';
import { cancelRestoreBackup, confirmRestoreBackup, importBackupJSON } from '../services/imports.js';
import { DB } from '../db/db.js';
import { render } from './layout.js';
import { state } from '../state/state.js';
import { acuteChronicRatio, ratioStatus } from '../utils/calculations.js';
import { decimalInput, el, field, initials, sectionLabel } from '../utils/helpers.js';

export function renderAthletesScreen() {
  const root = document.getElementById('app');
  root.innerHTML = '';
  const screen = el('div', { class: 'athletes-screen' }, [
    el('div', { class: 'athletes-hero' }, [el('div', { class: 'athletes-hero-eyebrow' }, '100 / 200 M'), el('h1', { class: 'athletes-hero-title' }, 'SPRINT LAB')]),
  ]);
  if (state.athletes.length > 0) {
    screen.appendChild(sectionLabel('—', `Atletas (${state.athletes.length})`));
    const list = el('div', { class: 'athletes-list' });
    state.athletes.forEach(a => {
      const sessions = DB.getSessions(a.id);
      const sessionCount = sessions.length;
      const ratio = acuteChronicRatio(sessions);
      const rStatus = ratioStatus(ratio);
      const card = el('button', { class: 'athlete-card', onClick: () => selectAthlete(a.id) }, [
        el('div', { class: 'athlete-avatar' }, initials(a.name)),
        el('div', { class: 'athlete-info' }, [
          el('div', { class: 'athlete-name' }, a.name),
          el('div', { class: 'athlete-meta' }, [a.level ? a.level.charAt(0).toUpperCase() + a.level.slice(1) : 'Sin nivel', a.age ? ' · ' + a.age + ' años' : '', a.time100 ? ' · 100m: ' + a.time100 + 's' : ''].join('')),
          el('div', { class: 'athlete-sessions' }, [
            ratio !== null ? el('span', { class: 'athlete-ratio-dot', style: { backgroundColor: rStatus.color }, title: 'Ratio carga: ' + ratio.toFixed(2) + ' — ' + rStatus.label }) : null,
            sessionCount + ' sesión' + (sessionCount !== 1 ? 'es' : '') + ' registrada' + (sessionCount !== 1 ? 's' : ''),
          ]),
        ]),
        el('div', { class: 'athlete-chevron' }, '›'),
      ]);
      list.appendChild(card);
    });
    screen.appendChild(list);
  } else screen.appendChild(el('p', { class: 'helper-text', style: { textAlign: 'center', padding: '20px 0' } }, 'No hay atletas registrados todavía. Agrega el primero.'));
  const newBtn = el('button', { class: 'new-athlete-btn', onClick: openNewAthleteForm }, [el('span', { class: 'new-athlete-plus' }, '+'), el('span', {}, 'Nuevo atleta')]);
  screen.appendChild(newBtn);

  // Restaurar desde Backup JSON (manual o el respaldo automático completo)
  // vive aquí también, y no solo dentro de Estado, porque este es el único
  // lugar de la app al que se puede llegar sin tener ya un atleta cargado
  // -- justo el escenario real de "perdí todo, reinstalé la app".
  const restoreFileInput = el('input', { type: 'file', id: 'file-input-restore-athletes', accept: '.json', style: { display: 'none' }, onchange: (e) => { const file = e.target.files[0]; if (file) importBackupJSON(file); e.target.value = ''; } });
  const restoreBtn = el('button', { class: 'secondary-button', style: { marginTop: '10px' }, onClick: () => document.getElementById('file-input-restore-athletes').click() }, '♻️ Restaurar desde Backup JSON');
  screen.appendChild(restoreBtn);
  screen.appendChild(restoreFileInput);

  if (state.pendingRestore) {
    const p = state.pendingRestore;
    const body = p.isMulti
      ? (p.isOverwrite
          ? `Este es un respaldo automático con ${p.entries.length} atleta(s). Ya existen ${p.overwriteNames.length} de ellos en esta instalación (${p.overwriteNames.join(', ')}) — sus datos actuales se reemplazarán por completo. El resto se agregará como nuevo. Esta acción no se puede deshacer.`
          : `Este es un respaldo automático con ${p.entries.length} atleta(s), ninguno existe todavía en esta instalación — se agregarán todos como nuevos.`)
      : (p.isOverwrite
          ? `Ya existe un atleta llamado "${p.existingName}" con este mismo identificador. Restaurar reemplazará TODOS sus datos actuales con lo que hay en este archivo. Esta acción no se puede deshacer.`
          : `Se restaurará "${p.data.athlete.name}" como atleta nuevo, con ${(p.data.sessions || []).length} sesiones incluidas en el backup.`);
    screen.appendChild(el('div', { class: 'modal-overlay' }, [
      el('div', { class: 'modal-box' }, [
        el('div', { class: 'modal-title' }, p.isOverwrite ? '⚠️ Sobrescribir datos existentes' : 'Restaurar desde backup'),
        el('div', { class: 'modal-body' }, body),
        el('div', { class: 'modal-actions' }, [
          el('button', { class: 'danger-button', onClick: confirmRestoreBackup }, 'Restaurar'),
          el('button', { class: 'secondary-button', onClick: cancelRestoreBackup }, 'Cancelar'),
        ]),
      ]),
    ]));
  }
  if (state.confirmDelete) {
    const a = state.athletes.find(x => x.id === state.confirmDelete);
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
    screen.appendChild(overlay);
  }
  root.appendChild(screen);
}

export function renderAthleteFormScreen() {
  const root = document.getElementById('app');
  root.innerHTML = '';
  const f = state.athleteForm;
  const screen = el('div', { class: 'screen', style: { paddingTop: '20px' } });
  const back = el('button', { class: 'secondary-button', style: { marginBottom: '20px', textAlign: 'left', width: 'auto', padding: '8px 14px' }, onClick: () => { state.view = 'athletes'; render(); } }, '← Volver');
  screen.appendChild(back);
  screen.appendChild(sectionLabel('—', 'Nuevo atleta'));
  if (state.saveError) screen.appendChild(el('div', { class: 'error-banner', style: { margin: '0 0 14px' } }, [state.saveError, el('button', { class: 'error-dismiss', onClick: () => { state.saveError = null; render(); } }, '✕')]));
  const nameInput = el('input', { value: f.name, placeholder: 'Nombre completo del atleta', oninput: e => f.name = e.target.value });
  const ageInput = el('input', { type: 'number', value: f.age, placeholder: '—', oninput: e => f.age = e.target.value });
  const weightInput = decimalInput({ value: f.weight, placeholder: '—', oninput: e => f.weight = e.target.value });
  const t100 = decimalInput({ value: f.time100, placeholder: '—', oninput: e => f.time100 = e.target.value });
  const t200 = decimalInput({ value: f.time200, placeholder: '—', oninput: e => f.time200 = e.target.value });
  const levelSel = el('select', { oninput: e => f.level = e.target.value }, [
    el('option', { value: 'principiante', selected: f.level === 'principiante' }, 'Principiante'),
    el('option', { value: 'intermedio', selected: f.level === 'intermedio' }, 'Intermedio'),
    el('option', { value: 'avanzado', selected: f.level === 'avanzado' }, 'Avanzado'),
  ]);
  levelSel.value = f.level;
  const card = el('div', { class: 'card' }, [
    field('Nombre', nameInput),
    el('div', { class: 'row' }, [field('Edad', ageInput, true), field('Peso (kg)', weightInput, true)]),
    el('div', { class: 'row' }, [field('100m base (s)', t100, true), field('200m base (s)', t200, true)]),
    field('Nivel', levelSel),
    el('button', { class: 'primary-button', onClick: saveNewAthlete }, 'Crear atleta'),
  ]);
  screen.appendChild(card);
  root.appendChild(screen);
}

