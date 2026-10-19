// Auto-generado a partir de index_-_copia.html durante la modularizacion (2026-07-04)
// Fecha LOCAL (YYYY-MM-DD). toISOString() usa UTC y de noche, en zonas con
// offset negativo (ej. México), devolvía el día siguiente.
export function todayISO() { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }

export function dateFieldToISO(dateStr) { return dateStr ? new Date(dateStr + 'T12:00:00').toISOString() : new Date().toISOString(); }

export function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k === 'class') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') node.innerHTML = v;
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => { if (c === null || c === undefined || c === false) return; node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c); });
  return node;
}

export function sectionLabel(n, title) { return el('div', { class: 'section-label' }, [el('span', { class: 'section-number' }, n), el('span', { class: 'section-title' }, title), el('span', { class: 'section-rule' })]); }

export function field(labelText, inputNode, half) { return el('div', { class: 'field' + (half ? ' half' : '') }, [el('label', { class: 'field-label' }, labelText), inputNode]); }

// NOTA: `fieldV` se usaba en renderLogScreen (pestaña "Registro") pero nunca
// se definió en el HTML original -> lanzaba "fieldV is not defined" al abrir
// esa pestaña. Se añade aquí usando las clases .field-error / .field-warn /
// .input-error / .input-warn que ya existían en el CSS pero no se usaban.
export function fieldV(labelText, inputNode, validation, half) {
  if (validation && !validation.ok) inputNode.classList.add('input-error');
  else if (validation && validation.warn) inputNode.classList.add('input-warn');
  const children = [el('label', { class: 'field-label' }, labelText), inputNode];
  if (validation && !validation.ok && validation.error) children.push(el('div', { class: 'field-error' }, validation.error));
  else if (validation && validation.warn) children.push(el('div', { class: 'field-warn' }, validation.warn));
  return el('div', { class: 'field' + (half ? ' half' : '') }, children);
}

export function emptyState(text) { return el('div', { class: 'empty-state' }, text); }

// Fase 1.3 del roadmap (UI/UX movil): gesto "deslizar para eliminar".
// Manipula el DOM directamente con eventos touch (no pasa por render(), que
// seria demasiado lento en cada touchmove). `rowEl` es el elemento que se
// desliza, `revealWidth` cuanto se descubre atras al deslizar por completo.
// Si el usuario ya lo tiene abierto y vuelve a tocar la fila (sin deslizar),
// se cierra en vez de disparar el click normal de la fila (por ejemplo,
// abrir el detalle de un GPX).
export function attachSwipeToDelete(rowEl, revealWidth = 84) {
  let startX = 0, dx = 0, dragging = false, open = false;
  rowEl.style.touchAction = 'pan-y';
  const close = () => { rowEl.style.transition = 'transform 0.18s ease'; rowEl.style.transform = 'translateX(0)'; open = false; };
  rowEl.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX; dx = 0; dragging = true; rowEl.style.transition = 'none';
  }, { passive: true });
  rowEl.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    dx = e.touches[0].clientX - startX;
    if (open) dx -= revealWidth;
    if (dx > 0) dx = 0;
    if (dx < -revealWidth) dx = -revealWidth;
    rowEl.style.transform = `translateX(${dx}px)`;
  }, { passive: true });
  rowEl.addEventListener('touchend', () => {
    dragging = false;
    rowEl.style.transition = 'transform 0.18s ease';
    if (dx <= -revealWidth / 2) { rowEl.style.transform = `translateX(-${revealWidth}px)`; open = true; }
    else close();
  });
  rowEl._swipeIsOpen = () => open;
  rowEl._swipeClose = close;
  return rowEl;
}

export function initials(name) { return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(); }

// Corrige un problema real de type="number" en Electron/Chromium: solo
// acepta "." como separador decimal sin importar el idioma, y bloquea ","
// directamente al escribir. Aquí se usa type="text" con inputmode="decimal"
// (mismo teclado numérico en móvil/tablet) y se limpia el valor en cada
// tecleo: solo dígitos, un "-" inicial opcional, y un solo separador
// decimal, normalizando "," a "." (que es lo que ya esperan Number(),
// calcVelocity(), etc. en el resto de la app). El resto de atributos
// (placeholder, class, disabled, title, style...) se pasan tal cual.
export function decimalInput(attrs = {}) {
  const { oninput, ...rest } = attrs;
  return el('input', {
    type: 'text',
    inputmode: 'decimal',
    ...rest,
    oninput: (e) => {
      let v = e.target.value.replace(/[^0-9.,-]/g, '');
      const negative = v.startsWith('-');
      v = (negative ? '-' : '') + v.replace(/-/g, '');
      v = v.replace(',', '.');
      const firstDot = v.indexOf('.');
      if (firstDot !== -1) v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
      if (e.target.value !== v) e.target.value = v;
      if (oninput) oninput(e);
    },
  });
}
