// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
import { loadAll, selectAthlete } from '../actions/athletes.js';
import { DB } from '../db/db.js';
import { render } from '../render/layout.js';
import { state } from '../state/state.js';
import { avg1RM, estimatePower, estimateVelocity } from '../utils/calculations.js';
import { todayISO } from '../utils/helpers.js';

import { showToast } from '../utils/notifications.js';

// ------------------------------------------------------------------
// Restaurar desde Backup JSON (la mitad que faltaba: exportProfileJSON()
// en exports.js genera el archivo, pero hasta ahora no habia manera de
// volver a cargarlo -- un backup que no se puede restaurar no protege
// nada). Es una operacion potencialmente destructiva (puede sobrescribir
// a un atleta existente), asi que pide confirmacion con el modal propio
// de la app antes de tocar nada en DB.
// ------------------------------------------------------------------
export function importBackupJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    let data;
    try { data = JSON.parse(e.target.result); }
    catch { showToast('El archivo no es JSON válido.'); return; }

    // El respaldo automático (services/autoBackup.js) guarda TODOS los
    // atletas juntos en un solo archivo (data.athletes: [...]), a
    // diferencia del backup manual de exportProfileJSON (un solo atleta,
    // data.athlete). Se detecta la forma y se restaura como corresponda.
    if (data && Array.isArray(data.athletes)) {
      const validEntries = data.athletes.filter(a => a && a.athlete && a.athlete.id && Array.isArray(a.sessions));
      if (!validEntries.length) { showToast('Este archivo no parece un respaldo automático de Sprint Lab.'); return; }
      const existingIds = DB.getAthleteIds();
      const overwriteNames = validEntries.filter(a => existingIds.includes(a.athlete.id)).map(a => a.athlete.name);
      state.pendingRestore = { isMulti: true, entries: validEntries, isOverwrite: overwriteNames.length > 0, overwriteNames };
      render();
      return;
    }

    if (!data || typeof data !== 'object' || !data.athlete || !data.athlete.id || !Array.isArray(data.sessions)) {
      showToast('Este archivo no parece un Backup JSON de Sprint Lab.');
      return;
    }
    const existingIds = DB.getAthleteIds();
    const isOverwrite = existingIds.includes(data.athlete.id);
    const existingAthlete = isOverwrite ? DB.getAthlete(data.athlete.id) : null;
    state.pendingRestore = { isMulti: false, data, isOverwrite, existingName: existingAthlete ? existingAthlete.name : null };
    render();
  };
  reader.readAsText(file);
}

function restoreOneAthlete(entry) {
  const id = entry.athlete.id;
  DB.saveAthlete(id, entry.athlete);
  DB.saveSessions(id, entry.sessions || []);
  if (entry.model) DB.saveModel(id, entry.model);
  if (entry.clinicalNotes) DB.saveClinicalNotes(id, entry.clinicalNotes);
  if (entry.weeklyPlan) DB.saveWeeklyPlan(id, entry.weeklyPlan);
  if (entry.customPhases) DB.saveCustomPhases(id, entry.customPhases);
  if (entry.competitions) DB.saveCompetitions(id, entry.competitions);
  return id;
}

export function confirmRestoreBackup() {
  const pending = state.pendingRestore;
  if (!pending) return;

  if (pending.isMulti) {
    const ids = DB.getAthleteIds();
    for (const entry of pending.entries) {
      const id = restoreOneAthlete(entry);
      if (!ids.includes(id)) ids.push(id);
    }
    DB.saveAthleteIds(ids);
    state.pendingRestore = null;
    showToast(`Se restauraron ${pending.entries.length} atleta${pending.entries.length === 1 ? '' : 's'}`);
    loadAll(); // recarga la lista completa y vuelve a la pantalla de Atletas
    return;
  }

  const { data } = pending;
  const id = restoreOneAthlete(data);
  const ids = DB.getAthleteIds();
  if (!ids.includes(id)) { ids.push(id); DB.saveAthleteIds(ids); }
  state.pendingRestore = null;
  showToast(pending.isOverwrite ? 'Atleta restaurado (datos anteriores reemplazados)' : 'Atleta restaurado como nuevo');
  selectAthlete(id); // recarga todo el estado desde DB, igual que al abrir un atleta
}

export function cancelRestoreBackup() {
  state.pendingRestore = null;
  render();
}

export function importCSV(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) { showToast('El archivo CSV está vacío o no tiene encabezados.'); return; }
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';
    const headers = firstLine.split(separator).map(h => h.trim().toLowerCase());
    const idx = { fecha: headers.indexOf('fecha'), tipo: headers.indexOf('tipo'), subtipo_gym: headers.indexOf('subtipo gym'), duracion: headers.indexOf('duración (min)'), rpe: headers.indexOf('rpe'), carga: headers.indexOf('carga (rpe×min)'), mejor100: headers.indexOf('mejor 100m (s)'), mejor200: headers.indexOf('mejor 200m (s)'), series_pista: headers.indexOf('series pista'), ejercicios_gym: headers.indexOf('ejercicios gimnasio'), notas: headers.indexOf('notas') };
    if (idx.fecha === -1 || idx.tipo === -1 || idx.duracion === -1 || idx.rpe === -1) { showToast('El CSV debe tener al menos columnas: Fecha, Tipo, Duración (min), RPE'); return; }
    const sessionsToAdd = [];
    let errorCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(separator).map(c => c.trim());
      if (cols.length < 4) continue;
      try {
        const dateStr = cols[idx.fecha];
        let dateISO = '';
        if (dateStr.includes('/')) { const parts = dateStr.split('/'); if (parts.length === 3) dateISO = `${parts[2]}-${parts[1]}-${parts[0]}`; }
        else if (dateStr.includes('-')) dateISO = dateStr;
        else continue;
        if (!dateISO) continue;
        const tipo = cols[idx.tipo].toLowerCase();
        const typeMap = { 'gimnasio': 'gym', 'pista': 'track', 'campo': 'field' };
        const type = typeMap[tipo] || 'track';
        const duration = parseFloat(cols[idx.duracion]);
        if (isNaN(duration) || duration <= 0) continue;
        const rpe = parseInt(cols[idx.rpe]);
        if (isNaN(rpe) || rpe < 1 || rpe > 10) continue;
        const notes = idx.notas !== -1 ? cols[idx.notas] : '';
        let trackSeries = [];
        if (idx.series_pista !== -1 && cols[idx.series_pista]) {
          const seriesItems = cols[idx.series_pista].split(';').map(s => s.trim()).filter(s => s);
          seriesItems.forEach(item => {
            const parts = item.split('/');
            if (parts.length >= 2) {
              const dist = parseInt(parts[0].replace('m', ''));
              const time = parseFloat(parts[1].replace('s', ''));
              let wind = null;
              if (parts.length >= 3) { const windStr = parts[2].replace('viento', '').trim(); wind = parseFloat(windStr); }
              if (!isNaN(dist) && !isNaN(time) && time > 0) trackSeries.push({ dist: String(dist), time: String(time), wind: wind });
            }
          });
        }
        let gymExercises = [];
        if (idx.ejercicios_gym !== -1 && cols[idx.ejercicios_gym]) {
          const gymItems = cols[idx.ejercicios_gym].split(';').map(s => s.trim()).filter(s => s);
          gymItems.forEach(item => {
            const match = item.match(/(.+?)\s+(\d+)kg×(\d+)/);
            if (match) {
              const exercise = match[1].trim();
              const weight = parseFloat(match[2]);
              const reps = parseInt(match[3]);
              if (!isNaN(weight) && !isNaN(reps) && weight > 0 && reps > 0) {
                const rm = avg1RM(weight, reps);
                const velocity = rm ? estimateVelocity(weight, rm) : null;
                const power = velocity ? estimatePower(weight, velocity) : null;
                gymExercises.push({ exercise, weight, reps, estimated1RM: rm, velocity, power });
              }
            }
          });
        }
        const session = {
          date: dateISO, type, rpe, durationMin: duration, notes,
          trackSeries: type === 'track' ? trackSeries : [],
          time100: null, time200: null,
          gymExercises: type === 'gym' ? gymExercises : [],
          gymSessionType: type === 'gym' ? (cols[idx.subtipo_gym] || 'fuerza') : null,
          estimated1RM: type === 'gym' && gymExercises.length > 0 ? Math.max(...gymExercises.map(e => e.estimated1RM || 0)) || null : null,
        };
        if (type === 'track' && trackSeries.length > 0) {
          const t100s = trackSeries.filter(s => s.dist === '100' && s.time).map(s => parseFloat(s.time));
          const t200s = trackSeries.filter(s => s.dist === '200' && s.time).map(s => parseFloat(s.time));
          if (t100s.length) session.time100 = Math.min(...t100s);
          if (t200s.length) session.time200 = Math.min(...t200s);
        }
        sessionsToAdd.push(session);
      } catch (err) { errorCount++; }
    }
    if (sessionsToAdd.length === 0) { showToast('No se pudo importar ninguna sesión. Verifica el formato del CSV.'); return; }
    const newSessions = [...state.sessions, ...sessionsToAdd];
    state.sessions = newSessions;
    DB.saveSessions(state.currentAthleteId, newSessions);
    render();
    showToast(`✅ Se importaron ${sessionsToAdd.length} sesiones. ${errorCount > 0 ? `(${errorCount} filas con errores)` : ''}`);
  };
  reader.readAsText(file, 'UTF-8');
}

// Fase 2.1 del roadmap: importar una salida de pista/campo desde un archivo
// GPX (reloj GPS / app de running). Crea UNA sesión tipo "field" con los
// puntos de la ruta (para el mapa) y la velocidad instantánea (para la
// gráfica), usando la librería GPXParser ya cargada por CDN (variable global
// `gpxParser`, ver index.html).
export function importGPX(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const gpx = new gpxParser();
      gpx.parse(e.target.result);
      if (!gpx.tracks || gpx.tracks.length === 0) { showToast('El archivo GPX no contiene ninguna pista (track).'); return; }
      const track = gpx.tracks[0];
      const points = track.points || [];
      if (points.length < 2) { showToast('La pista GPX no tiene suficientes puntos.'); return; }

      const distanceTotal = track.distance && track.distance.total ? track.distance.total : 0; // metros
      const cumul = track.distance && track.distance.cumul ? track.distance.cumul : [];
      const hasTime = points.every(p => !!p.time);

      const trackPoints = points.map((p, i) => ({
        lat: p.lat, lon: p.lon,
        ele: p.ele != null ? p.ele : null,
        time: hasTime ? new Date(p.time).toISOString() : null,
        distance: cumul[i] != null ? cumul[i] : null,
      }));

      let durationTotal = null;
      const speedPoints = [];
      if (hasTime) {
        const t0 = new Date(trackPoints[0].time).getTime();
        const t1 = new Date(trackPoints[trackPoints.length - 1].time).getTime();
        durationTotal = Math.max(0, Math.round((t1 - t0) / 1000)); // segundos
        for (let i = 1; i < trackPoints.length; i++) {
          const dt = (new Date(trackPoints[i].time).getTime() - new Date(trackPoints[i - 1].time).getTime()) / 1000;
          const dd = (trackPoints[i].distance || 0) - (trackPoints[i - 1].distance || 0);
          if (dt > 0.2) speedPoints.push({ distance: trackPoints[i].distance || 0, time: trackPoints[i].time, speed: Math.max(0, dd / dt) });
        }
      }

      const dateISO = hasTime ? trackPoints[0].time.slice(0, 10) : todayISO();
      // Estimacion burda de duracion si el GPX no trae timestamps (raro, pero posible):
      // ~5 min/km como valor de referencia, editable despues por el entrenador.
      const durationMin = durationTotal !== null ? Math.max(1, Math.round(durationTotal / 60)) : Math.max(1, Math.round((distanceTotal / 1000) * 5));

      const session = {
        id: Date.now(),
        date: dateISO, type: 'field', rpe: 5, durationMin,
        notes: `Importado desde GPX · ${(distanceTotal / 1000).toFixed(2)} km`,
        trackSeries: [], time100: null, time200: null,
        gymExercises: [], gymSessionType: null, estimated1RM: null,
        gpxData: { distanceTotal, durationTotal, trackPoints, speedPoints },
      };
      const newSessions = [...state.sessions, session];
      state.sessions = newSessions;
      DB.saveSessions(state.currentAthleteId, newSessions);
      render();
      showToast(`✅ Sesión GPX importada · ${(distanceTotal / 1000).toFixed(2)} km`);
    } catch (err) {
      console.error(err);
      showToast('No se pudo leer el archivo GPX. Verifica que sea un archivo .gpx válido.');
    }
  };
  reader.readAsText(file, 'UTF-8');
}

// Fase 2.2 del roadmap: importar una sesion desde un archivo .FIT (relojes
// Garmin/Polar/etc). El paquete "fit-file-parser" NO trae una version lista
// para <script> de navegador (es CommonJS puro, usa require()/exports, se
// verifico descargando el paquete real de npm) -- por eso se importa aqui
// como modulo ES real via el servicio +esm de jsDelivr, en vez de un
// <script> global como las demas librerias de este proyecto.
//
// Nota de honestidad: los nombres de campo (`position_lat`, `total_distance`,
// etc.) son los estandar del protocolo FIT de Garmin, pero no se pudo
// verificar byte-a-byte contra un archivo .fit real dentro de este entorno.
// Si al probarlo con un archivo real de tu reloj algun dato no aparece,
// revisa en la consola del navegador el objeto `data` completo (se loguea
// abajo) para ver los nombres exactos que tu dispositivo produce.
export async function importFIT(file) {
  try {
    const { default: FitParser } = await import('https://cdn.jsdelivr.net/npm/fit-file-parser@1.9.0/+esm');
    const buffer = await file.arrayBuffer();
    const parser = new FitParser({ force: true, speedUnit: 'm/s', lengthUnit: 'm', temperatureUnit: 'celsius', mode: 'cascade' });

    parser.parse(buffer, (error, data) => {
      if (error) { console.error('Error al parsear FIT:', error); showToast('No se pudo leer el archivo FIT.'); return; }
      console.log('Sprint Lab: datos crudos del FIT (para depuración):', data);

      const session = (data.sessions && data.sessions[0]) || {};
      const laps = session.laps || [];
      const records = laps.flatMap(l => l.records || []);

      const distanceTotal = Number(session.total_distance) || 0; // metros
      const durationTotal = Number(session.total_elapsed_time) || null; // segundos
      const dateISO = session.start_time ? new Date(session.start_time).toISOString().slice(0, 10) : todayISO();

      // Semicirculos -> grados, por si esta version de la libreria no los
      // convierte sola (deteccion defensiva: un grado real nunca pasa de 180).
      const toDeg = v => (Math.abs(v) > 180 ? v * (180 / Math.pow(2, 31)) : v);
      const trackPoints = records
        .filter(r => r.position_lat != null && r.position_long != null)
        .map(r => ({
          lat: toDeg(r.position_lat), lon: toDeg(r.position_long),
          ele: r.altitude != null ? r.altitude : null,
          time: r.timestamp ? new Date(r.timestamp).toISOString() : null,
          distance: r.distance != null ? r.distance : null,
        }));

      const speedPoints = records
        .filter(r => r.speed != null && r.distance != null)
        .map(r => ({ distance: r.distance, time: r.timestamp ? new Date(r.timestamp).toISOString() : null, speed: r.speed }));

      const durationMin = durationTotal ? Math.max(1, Math.round(durationTotal / 60)) : Math.max(1, Math.round((distanceTotal / 1000) * 5));
      const newSession = {
        id: Date.now(),
        date: dateISO, type: 'field', rpe: 5, durationMin,
        notes: `Importado desde FIT · ${(distanceTotal / 1000).toFixed(2)} km`,
        trackSeries: [], time100: null, time200: null,
        gymExercises: [], gymSessionType: null, estimated1RM: null,
        gpxData: trackPoints.length > 1 ? { distanceTotal, durationTotal, trackPoints, speedPoints } : null,
        fitRaw: { avgHeartRate: session.avg_heart_rate || null, avgCadence: session.avg_cadence || null, avgPower: session.avg_power || null },
      };
      const newSessions = [...state.sessions, newSession];
      state.sessions = newSessions;
      DB.saveSessions(state.currentAthleteId, newSessions);
      render();
      showToast(`✅ Sesión FIT importada · ${(distanceTotal / 1000).toFixed(2)} km`);
    });
  } catch (err) {
    console.error(err);
    showToast('No se pudo cargar el lector de archivos FIT (revisa tu conexión a internet).');
  }
}
