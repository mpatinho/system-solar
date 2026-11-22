// Pantallas y ventanas: menú principal, destinos, pasaporte, chuleta, lecciones, opciones, ayuda y créditos.
import { h, planetThumb } from '../utils/dom.js';
import { openModal } from './modal.js';
import { BODIES, BODY_BY_ID } from '../data/bodies.js';
import { CONCEPT_GROUPS, MNEMONIC } from '../data/concepts.js';
import { LESSONS, openLesson } from './demos/index.js';
import { progress, save, rankFor, resetProgress } from '../utils/storage.js';
import { setSound } from '../utils/audio.js';
import { formatNota } from '../utils/dom.js';
import { glyph } from '../input/gamepad.js';

const ORDER = ['sol', 'mercurio', 'venus', 'tierra', 'luna', 'marte', 'cinturon', 'jupiter', 'saturno', 'urano', 'neptuno', 'pluton', 'cometa', 'voyager'];
const ordered = () => ORDER.map((id) => BODY_BY_ID[id]);

// ---------- Menú principal ----------
export function showMainMenu({ onExplore, onAdventure, onOptions = () => openOptions({}) }) {
  const ui = document.getElementById('ui');
  const visited = Object.keys(progress.visited).length;
  const rank = rankFor(progress.points);
  const best = progress.exams.length ? Math.max(...progress.exams.map((e) => e.nota)) : null;
  const el = h('div', { class: 'menu' },
    h('div', { class: 'menu-card' },
      h('h1', { class: 'menu-title' }, 'Explorador del ', h('span', null, 'Sistema Solar')),
      h('p', { class: 'menu-sub' }, 'Pilota tu nave, descubre los planetas y prepara tu examen de 5.º'),
      h('div', { class: 'menu-modes' },
        h('button', { class: 'mode-card', onclick: () => { el.remove(); onExplore(); } },
          h('div', { class: 'icon' }, '🔭'), h('h3', null, 'Exploración'), h('p', null, 'Viaja libremente y aprende todo lo que entra en el examen.')),
        h('button', { class: 'mode-card', onclick: () => { el.remove(); onAdventure(); } },
          h('div', { class: 'icon' }, '🚀'), h('h3', null, 'Aventura'), h('p', null, 'Cumple misiones respondiendo preguntas como las del examen.'))),
      h('div', { class: 'menu-row' },
        h('button', { class: 'btn', onclick: () => openStudySheet() }, '📚 Chuleta de estudio'),
        h('button', { class: 'btn', onclick: () => openLessonsList() }, '📖 Lecciones'),
        h('button', { class: 'btn', onclick: () => onOptions() }, '⚙️ Opciones'),
        h('button', { class: 'btn', onclick: () => openCredits() }, 'ℹ️ Créditos')),
      h('div', { class: 'menu-progress' },
        h('span', null, rank.medal, ' Rango: ', h('b', null, rank.name)),
        h('span', null, '🛂 Sellos: ', h('b', null, `${visited}/${BODIES.length}`)),
        h('span', null, '⭐ Puntos: ', h('b', null, progress.points.toLocaleString('es-ES'))),
        best !== null ? h('span', null, '📝 Mejor examen: ', h('b', null, formatNota(best))) : null)));
  ui.append(el);
  return el;
}

// ---------- Destinos (hipersalto) ----------
export function openDestinations(onPick) {
  const m = openModal({
    title: '🧭 ¿Adónde quieres viajar?',
    className: 'wide',
    body: h('div', null,
      h('p', { class: 'note' }, 'Elige un destino y tu nave hará un hipersalto hasta allí.'),
      h('div', { class: 'grid-cards' }, ordered().map((b) => h('button', { class: 'dest-card', onclick: () => { m.close(); onPick(b.id); } },
        planetThumb(b), h('b', null, b.short || b.name), h('small', null, progress.visited[b.id] ? '✓ visitado' : b.kind === 'planeta' ? `Planeta ${b.order}` : kindName(b.kind)))))),
  });
  return m;
}

function kindName(kind) {
  return { estrella: 'Estrella', satelite: 'Satélite', cinturon: 'Asteroides', 'planeta-enano': 'Planeta enano', cometa: 'Cometa', sonda: 'Sonda espacial' }[kind] || kind;
}

// ---------- Pasaporte ----------
export function openPassport() {
  const got = Object.keys(progress.visited).length;
  const m = openModal({
    title: `🛂 Pasaporte espacial · ${got}/${BODIES.length} sellos`,
    className: 'wide',
    body: h('div', null,
      h('p', { class: 'note' }, 'Consigues un sello cada vez que visitas un astro en el modo Exploración. Pulsa un sello conseguido para repasar su ficha.'),
      h('div', { class: 'stamps' }, ordered().map((b) => {
        const has = !!progress.visited[b.id];
        return h('button', { class: `stamp ${has ? 'got' : 'locked'}`, onclick: () => { if (has) openBodyCard(b); } },
          planetThumb(b), h('b', null, b.short || b.name), h('small', null, has ? `✓ ${new Date(progress.visited[b.id]).toLocaleDateString('es-ES')}` : '¿? Sin visitar'));
      }))),
  });
  return m;
}

export function bodyCard(b) {
  return h('div', { class: 'sheet-card' },
    h('h4', null, planetThumb(b), b.name),
    h('ul', null, b.exam.map((t) => h('li', null, t))));
}

export function openBodyCard(b) {
  return openModal({
    title: b.name,
    className: 'narrow',
    body: h('div', null,
      h('p', { style: { color: 'var(--accent)', fontWeight: 700, marginTop: 0 } }, b.subtitle),
      h('table', { class: 'facts' }, h('tbody', null, b.facts.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, v))))),
      h('div', { class: 'exam-box' }, h('h4', null, '📌 Para el examen'), h('ul', null, b.exam.map((t) => h('li', null, t)))),
      h('div', { class: 'curio-box' }, h('h4', null, '💡 Curiosidad'), h('p', null, b.curiosity))),
  });
}

// Repaso rápido según las etiquetas de una pregunta (se abre encima del cuestionario).
const TAG_BODY = { sol: 'sol', mercurio: 'mercurio', venus: 'venus', tierra: 'tierra', luna: 'luna', marte: 'marte', asteroides: 'cinturon', jupiter: 'jupiter', saturno: 'saturno', urano: 'urano', neptuno: 'neptuno', pluton: 'pluton', universo: 'voyager' };
export function openReviewFor(q) {
  const tag = q.tags.find((t) => TAG_BODY[t]);
  if (tag) return openBodyCard(BODY_BY_ID[TAG_BODY[tag]]);
  const group = CONCEPT_GROUPS.find((g) => g.id === 'sistema');
  return openModal({ title: group.title, className: 'narrow', body: h('div', null, conceptCards(group)) });
}

function conceptCards(group) {
  return h('div', { class: 'sheet-body' }, group.items.map((it) => h('div', { class: 'sheet-card' }, h('h4', null, it.term), h('p', null, it.text))));
}

// ---------- Chuleta de estudio (imprimible) ----------
export function openStudySheet() {
  const planets = ['mercurio', 'venus', 'tierra', 'marte', 'jupiter', 'saturno', 'urano', 'neptuno'].map((id) => BODY_BY_ID[id]);
  const val = (b, key) => (b.facts.find(([k]) => k.startsWith(key)) || [, '—'])[1];
  const short = (s) => s.split(/[.:(]/)[0].trim();
  const body = h('div', { class: 'sheet' },
    h('h3', null, '🪐 El orden de los planetas'),
    h('div', { class: 'mnemo' }, MNEMONIC.phrase.split(' ').map((w, i) => [h('b', null, w[0]), w.slice(1), ' '])),
    h('p', { style: { textAlign: 'center' } }, MNEMONIC.planets.join(' · ')),
    h('div', { style: { overflowX: 'auto' } },
      h('table', { class: 'table-planets' },
        h('thead', null, h('tr', null, ['Planeta', 'Tipo', 'Día (rotación)', 'Año (traslación)', 'Satélites', 'Lo más importante'].map((t) => h('th', null, t)))),
        h('tbody', null, planets.map((b) => h('tr', null,
          h('td', null, h('b', null, b.name)),
          h('td', null, b.group === 'rocoso' ? 'Rocoso (interior)' : 'Gaseoso (exterior)'),
          h('td', null, short(val(b, 'Día'))),
          h('td', null, short(val(b, 'Año'))),
          h('td', null, short(val(b, 'Satélites'))),
          h('td', null, b.exam[0])))))),
    h('p', { class: 'note' }, 'Nota: el número de satélites cambia a menudo porque los astrónomos descubren lunas nuevas. Si tu libro pone otra cifra, usa la de tu libro.'),
    CONCEPT_GROUPS.map((g) => [h('h3', null, g.title), conceptCards(g)]),
    h('h3', null, '🔭 Todos los astros'),
    h('div', { class: 'sheet-body' }, ordered().map(bodyCard)),
  );
  const m = openModal({
    title: '📚 Chuleta de estudio',
    className: 'wide',
    body,
    foot: [h('button', { class: 'btn', onclick: () => { m.back.classList.add('printing'); window.print(); m.back.classList.remove('printing'); } }, '🖨️ Imprimir'), h('button', { class: 'btn primary', onclick: () => m.close() }, 'Cerrar')],
  });
  return m;
}

// ---------- Lista de lecciones ----------
export function openLessonsList() {
  const m = openModal({
    title: '📖 Lecciones interactivas',
    body: h('div', { class: 'mission-list' }, Object.entries(LESSONS).map(([id, l]) => h('button', { class: 'mission', onclick: () => { m.close(); openLesson(id); } },
      h('span', { style: { fontSize: '34px' } }, l.icon),
      h('span', { class: 'txt' }, h('b', null, l.title), h('small', null, l.desc))))),
  });
  return m;
}

// ---------- Opciones ----------
export function openOptions({ onChange = () => {}, perfInfo } = {}) {
  const s = progress.settings;
  const seg = (options, value, set) => {
    const wrap = h('div', { class: 'seg' });
    const draw = (cur) => wrap.replaceChildren(...options.map(([v, label]) => h('button', { class: v === cur ? 'on' : '', onclick: (e) => { set(v); save(); draw(v); onChange(); wrap.children[options.findIndex((o) => o[0] === v)]?.focus(); e.stopPropagation(); } }, label)));
    draw(value);
    return wrap;
  };
  const row = (label, control, note) => h('div', { class: 'opt-row' }, h('span', null, label, note ? h('small', { class: 'opt-note' }, note) : null), control);
  let confirmReset = false;
  const resetBtn = h('button', { class: 'btn small', onclick: () => {
    if (!confirmReset) { confirmReset = true; resetBtn.textContent = '¿Seguro? Pulsa otra vez'; return; }
    resetProgress();
    resetBtn.textContent = 'Progreso borrado ✓';
    onChange();
  } }, 'Borrar progreso');
  const perfNote = h('small', { class: 'opt-note' });
  const refreshPerf = () => { if (perfInfo) perfNote.textContent = perfInfo(); };
  refreshPerf();
  const timer = setInterval(refreshPerf, 1000);
  return openModal({
    title: '⚙️ Opciones',
    className: 'narrow',
    onClose: () => clearInterval(timer),
    body: h('div', null,
      h('div', { class: 'opt-row' },
        h('span', null, 'Calidad gráfica', perfNote),
        seg([['auto', 'Automática'], ['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']], s.quality, (v) => { s.quality = v; })),
      row('Mostrar FPS', seg([[true, 'Sí'], [false, 'No']], !!s.showFps, (v) => { s.showFps = v; }), 'Imágenes por segundo (para comprobar la fluidez)'),
      row('Stick del mando hacia arriba', seg([[false, 'Sube el morro'], [true, 'Baja el morro']], !!s.invertY, (v) => { s.invertY = v; })),
      row('Sonido', seg([[true, 'Sí'], [false, 'No']], s.sound, (v) => setSound(v))),
      row('Órbitas', seg([[true, 'Ver'], [false, 'Ocultar']], s.orbits, (v) => { s.orbits = v; })),
      row('Nombres de los astros', seg([[true, 'Ver'], [false, 'Ocultar']], s.labels, (v) => { s.labels = v; })),
      row('Velocidad del tiempo', seg([[0, '⏸'], [1, '×1'], [10, '×10'], [50, '×50']], s.timeScale, (v) => { s.timeScale = v; })),
      row('Progreso (sellos, puntos, notas)', resetBtn)),
  });
}

// ---------- Pausa (botón ☰ del mando) ----------
export function openPauseMenu({ mode, onAction }) {
  const items = mode === 'adventure'
    ? [['misiones', '🎯 Misiones'], ['destinos', '🧭 Destinos (hipersalto)'], ['lecciones', '📖 Lecciones'], ['chuleta', '📚 Chuleta'], ['opciones', '⚙️ Opciones'], ['ayuda', '❓ Controles'], ['menu', '🏠 Menú principal']]
    : [['destinos', '🧭 Destinos (hipersalto)'], ['pasaporte', '🛂 Pasaporte'], ['lecciones', '📖 Lecciones'], ['chuleta', '📚 Chuleta'], ['opciones', '⚙️ Opciones'], ['ayuda', '❓ Controles'], ['menu', '🏠 Menú principal']];
  const m = openModal({
    title: '⏸ Pausa',
    className: 'narrow',
    body: h('div', { class: 'pause-list' },
      h('button', { class: 'mission', 'data-gp-default': true, onclick: () => m.close() }, '▶ Continuar'),
      items.map(([id, label]) => h('button', { class: 'mission', onclick: () => { m.close(); onAction(id); } }, label))),
  });
  return m;
}

// ---------- Ayuda ----------
export function openHelp() {
  const k = (t) => h('span', { class: 'kbd' }, t);
  const g = (...names) => h('span', null, names.flatMap((n, i) => (i ? [' ', glyph(n)] : [glyph(n)])));
  const padAvailable = typeof navigator.getGamepads === 'function';
  return openModal({
    title: '❓ Cómo pilotar la nave',
    className: 'narrow',
    body: h('div', null,
      h('h3', { class: 'help-title' }, '🎮 Con mando'),
      padAvailable
        ? h('div', { class: 'help-grid' },
          h('span', null, g('LS')), h('span', null, 'Stick izquierdo: girar y subir/bajar el morro'),
          h('span', null, g('RT')), h('span', null, 'Acelerar (cuanto más aprietas, más rápido)'),
          h('span', null, g('LT')), h('span', null, 'Frenar / marcha atrás'),
          h('span', null, g('RB')), h('span', null, 'Turbo (mantener)'),
          h('span', null, g('LB')), h('span', null, 'Freno total'),
          h('span', null, g('RS'), ' ', g('R3')), h('span', null, 'Stick derecho: mirar alrededor · clic: cámara detrás'),
          h('span', null, g('DPAD')), h('span', null, 'Cruceta ↑ ↓: acercar / alejar la cámara'),
          h('span', null, g('Y')), h('span', null, 'Destinos: hipersalto a cualquier astro'),
          h('span', null, g('A')), h('span', null, 'Elegir astro (misiones de vuelo) · aceptar en los menús'),
          h('span', null, g('X')), h('span', null, 'Usar la ficha del astro (escuchar, lecciones)'),
          h('span', null, g('B')), h('span', null, 'Cerrar / volver'),
          h('span', null, g('START')), h('span', null, 'Pausa: misiones, pasaporte, lecciones, opciones…'),
          h('span', null, g('SELECT')), h('span', null, 'Esta ayuda'))
        : h('p', { class: 'note' }, '⚠️ El mando solo funciona si la web se abre por https:// (o en localhost).'),
      h('p', { class: 'note' }, 'En los menús: cruceta para moverte, ', glyph('A'), ' para pulsar, ', glyph('B'), ' para volver y ', glyph('LB'), ' ', glyph('RB'), ' para cambiar de pestaña. Si el mando no responde, pulsa cualquier botón para que el navegador lo detecte.'),
      h('h3', { class: 'help-title' }, '⌨️ Con teclado y ratón'),
      h('div', { class: 'help-grid' },
        h('span', null, k('W')), h('span', null, 'Acelerar'),
        h('span', null, k('S')), h('span', null, 'Frenar / marcha atrás'),
        h('span', null, k('A'), ' ', k('D')), h('span', null, 'Girar a izquierda / derecha (también ', k('←'), ' ', k('→'), ')'),
        h('span', null, k('↑'), ' ', k('↓')), h('span', null, 'Subir / bajar el morro'),
        h('span', null, k('Shift')), h('span', null, 'Turbo (mantener junto con W)'),
        h('span', null, k('Espacio')), h('span', null, 'Freno total'),
        h('span', null, k('M')), h('span', null, 'Destinos: hipersalto a cualquier astro'),
        h('span', null, k('E')), h('span', null, 'Elegir astro (en las misiones de vuelo)'),
        h('span', null, k('P'), ' ', k('L')), h('span', null, 'Pasaporte · Lecciones'),
        h('span', null, '🖱️'), h('span', null, 'Arrastra para mirar alrededor · rueda para acercar/alejar la cámara'),
        h('span', null, k('Esc')), h('span', null, 'Cerrar ventanas'))),
    foot: [h('button', { class: 'btn primary', onclick: (e) => e.target.closest('.modal-back').querySelector('.modal-close').click() }, '¡Entendido!')],
  });
}

// ---------- Créditos ----------
export function openCredits() {
  return openModal({
    title: 'ℹ️ Créditos',
    className: 'narrow',
    body: h('div', { class: 'credits' },
      h('p', null, 'Texturas de los planetas, el Sol, la Luna y la Vía Láctea: ', h('a', { href: 'https://www.solarsystemscope.com/textures/', target: '_blank', rel: 'noopener' }, 'Solar System Scope'), ' (licencia CC BY 4.0), basadas en imágenes de la NASA.'),
      h('p', null, 'Datos de los planetas: NASA Planetary Fact Sheet (redondeados para Primaria).'),
      h('p', null, 'Gráficos 3D con ', h('a', { href: 'https://threejs.org', target: '_blank', rel: 'noopener' }, 'three.js'), '. Plutón, las lunas pequeñas, la nave y los sonidos están generados por el propio programa.'),
      h('p', null, 'Para escala real de tamaños y distancias, mira la lección «Tamaños y distancias».')),
  });
}
