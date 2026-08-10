// Fase 2.1 del roadmap: visualización del mapa de una sesión importada desde GPX.
// Usa Leaflet (variable global `L`, cargada por CDN en index.html).

const _maps = {}; // containerId -> instancia de L.Map, para poder destruirla al re-renderizar

export function destroyMap(containerId) {
  if (_maps[containerId]) {
    _maps[containerId].remove();
    delete _maps[containerId];
  }
}

// `trackPoints` es el arreglo { lat, lon, ele, time, distance } guardado en
// session.gpxData.trackPoints por importGPX() (ver services/imports.js).
export function renderGpxMap(containerId, trackPoints) {
  destroyMap(containerId);
  const el = document.getElementById(containerId);
  if (!el || typeof L === 'undefined' || !trackPoints || trackPoints.length < 2) return;

  const map = L.map(containerId, { attributionControl: true });
  _maps[containerId] = map;

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  const latlngs = trackPoints.map(p => [p.lat, p.lon]);
  const line = L.polyline(latlngs, { color: '#D9A441', weight: 4, opacity: 0.9 }).addTo(map);
  L.circleMarker(latlngs[0], { radius: 6, color: '#5A8F5A', fillColor: '#5A8F5A', fillOpacity: 1 }).addTo(map).bindTooltip('Inicio');
  L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color: '#C8332A', fillColor: '#C8332A', fillOpacity: 1 }).addTo(map).bindTooltip('Fin');

  map.fitBounds(line.getBounds(), { padding: [20, 20] });
}
