// Minijuego «Carrera de planetas»: pulsa los planetas en orden lo más rápido posible.
import { h, shuffle, planetThumb } from '../utils/dom.js';
import { openModal } from '../ui/modal.js';
import { BODY_BY_ID, PLANET_IDS } from '../data/bodies.js';
import { progress, save } from '../utils/storage.js';
import { sfx } from '../utils/audio.js';
import { pad } from '../input/gamepad.js';
import { formatSeconds } from './common.js';

export const VARIANTS = {
  sol: { title: 'Ordénalos desde el Sol', hint: 'Del más cercano al Sol al más lejano', order: PLANET_IDS },
  tamano: { title: 'Del más pequeño al más grande', hint: 'Por su tamaño real (diámetro)', order: ['mercurio', 'marte', 'venus', 'tierra', 'neptuno', 'urano', 'saturno', 'jupiter'] },
};
const PENALTY = 2;
const MEDALS = [[12, '🥇', 'Oro'], [20, '🥈', 'Plata'], [32, '🥉', 'Bronce']];

export const raceKey = (variant, expert) => `${variant}${expert ? '-experto' : ''}`;

export function medalFor(time, expert) {
  const extra = expert ? 6 : 0;
  return MEDALS.find(([t]) => time <= t + extra) || null;
}

export function openRace({ onBack } = {}) {
  const body = h('div', { class: 'race' });
  let timer = 0;
  let cd = 0;
  const modal = openModal({ title: '🏁 Carrera de planetas', className: 'wide', body, onClose: () => { clearInterval(timer); clearInterval(cd); } });
  let expert = false;

  function intro() {
    const best = (v, x) => progress.games.race[raceKey(v, x)];
    const expertBtn = h('button', { class: `btn small ${expert ? 'cyan' : ''}`, onclick: () => { expert = !expert; intro(); } }, expert ? '🧠 Modo experto: SÍ (sin nombres)' : '🧠 Modo experto: no');
    body.replaceChildren(h('div', { class: 'game-card' },
      h('h3', null, '🏁 Carrera de planetas'),
      h('p', null, 'Pulsa los planetas en el orden correcto lo más rápido que puedas. Cada fallo suma 2 segundos.'),
      h('div', { class: 'race-variants' }, Object.entries(VARIANTS).map(([id, v], i) => h('button', { class: 'mission', 'data-gp-default': i === 0, onclick: () => play(id) },
        h('b', null, v.title), h('div', { class: 'note' }, v.hint),
        h('div', { class: 'note' }, best(id, expert) ? `Récord: ${formatSeconds(best(id, expert))}` : 'Sin récord todavía')))),
      h('div', { class: 'game-actions' },
        expertBtn,
        onBack ? h('button', { class: 'btn', onclick: () => { modal.close(); onBack(); } }, '← Minijuegos') : null)));
  }

  function play(variant) {
    const v = VARIANTS[variant];
    const order = v.order;
    let next = 0;
    let penalty = 0;
    let t0 = 0;
    let running = false;
    const slots = order.map(() => h('div', { class: 'race-slot' }));
    const clock = h('div', { class: 'race-clock' }, '0,0 s');
    const count = h('div', { class: 'race-count' }, '3');
    const buttons = shuffle(order).map((id) => {
      const b = BODY_BY_ID[id];
      const btn = h('button', { class: 'race-planet', disabled: true, onclick: () => pickPlanet(id, btn) }, planetThumb(b), expert ? null : h('span', null, b.short || b.name));
      return btn;
    });
    body.replaceChildren(
      h('div', { class: 'race-head' }, h('b', null, v.title), clock),
      h('div', { class: 'race-track' }, h('span', { class: 'sun-dot' }, variant === 'sol' ? '☀️' : '🔹'), slots),
      h('div', { class: 'race-grid' }, buttons),
      count);

    // Cuenta atrás 3-2-1
    let n = 3;
    sfx.click();
    clearInterval(cd);
    cd = setInterval(() => {
      n--;
      if (n > 0) { count.textContent = String(n); sfx.click(); return; }
      clearInterval(cd);
      count.textContent = '¡Ya!';
      setTimeout(() => count.remove(), 500);
      sfx.stamp();
      buttons.forEach((b) => { b.disabled = false; });
      buttons[0].focus({ preventScroll: true });
      running = true;
      t0 = performance.now();
      timer = setInterval(() => { clock.textContent = formatSeconds((performance.now() - t0) / 1000 + penalty); }, 100);
    }, 700);

    function pickPlanet(id, btn) {
      if (!running) return;
      if (id === order[next]) {
        sfx.click();
        const b = BODY_BY_ID[id];
        slots[next].replaceChildren(planetThumb(b), h('span', null, b.short || b.name));
        slots[next].classList.add('filled');
        btn.disabled = true;
        btn.classList.add('done');
        next++;
        if (next === order.length) { finish(); return; }
        // El foco pasa al botón libre más cercano
        const free = buttons.filter((x) => !x.disabled);
        const r = btn.getBoundingClientRect();
        free.sort((a, c) => {
          const ra = a.getBoundingClientRect(), rc = c.getBoundingClientRect();
          return Math.hypot(ra.x - r.x, ra.y - r.y) - Math.hypot(rc.x - r.x, rc.y - r.y);
        });
        free[0]?.focus({ preventScroll: true });
      } else {
        penalty += PENALTY;
        sfx.wrong();
        pad.rumble(0.6, 0.4, 200);
        btn.classList.remove('shake');
        void btn.offsetWidth;
        btn.classList.add('shake');
      }
    }

    function finish() {
      running = false;
      clearInterval(timer);
      const time = (performance.now() - t0) / 1000 + penalty;
      const key = raceKey(variant, expert);
      const prev = progress.games.race[key];
      const record = !prev || time < prev;
      if (record) progress.games.race[key] = Math.round(time * 10) / 10;
      const points = 100 + (record ? 100 : 0);
      progress.points += points;
      save();
      sfx.fanfare();
      const medal = medalFor(time, expert);
      body.replaceChildren(h('div', { class: 'game-card' },
        h('h3', null, record ? '🏆 ¡Nuevo récord!' : '¡Carrera terminada!'),
        h('div', { class: 'big-score' }, formatSeconds(time)),
        medal ? h('p', { class: 'medal-line' }, `${medal[1]} Medalla de ${medal[2]}`) : h('p', null, 'Sigue practicando para ganar una medalla (menos de 32 s).'),
        penalty ? h('p', { class: 'note' }, `Incluye ${penalty} s de penalización por fallos.`) : h('p', { class: 'note' }, '¡Sin ningún fallo!'),
        h('p', null, `Récord: ${formatSeconds(progress.games.race[key])}`),
        h('div', { class: 'pts' }, `+${points} puntos`),
        h('div', { class: 'game-actions' },
          h('button', { class: 'btn', onclick: intro }, '← Carreras'),
          h('button', { class: 'btn primary', 'data-gp-default': true, onclick: () => play(variant) }, '🔁 Otra vez'))));
    }
  }

  intro();
  return modal;
}
