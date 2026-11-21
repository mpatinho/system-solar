// Lección: el Universo (galaxias, Vía Láctea, estrellas, constelaciones, año luz, exploración).
import { h } from '../../utils/dom.js';
import { makeCanvas, loop, label, starfield, openTabbedLesson } from './common.js';
import { rng } from '../../utils/noise.js';

function spiral(ctx, x, y, size, rot, { arms = 2, n = 700, color = [200, 210, 255], seed = 1, tilt = 1 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const t = r();
    const arm = Math.floor(r() * arms);
    const dist = t * size;
    const a = rot + arm * ((Math.PI * 2) / arms) + t * 4.2 + (r() - 0.5) * 0.6;
    const px = x + Math.cos(a) * dist + (r() - 0.5) * size * 0.08;
    const py = y + Math.sin(a) * dist * tilt + (r() - 0.5) * size * 0.08 * tilt;
    const b = 0.35 + (1 - t) * 0.65;
    ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${b * 0.8})`;
    ctx.fillRect(px, py, 1.4, 1.4);
  }
  const g = ctx.createRadialGradient(x, y, 0, x, y, size * 0.3);
  g.addColorStop(0, 'rgba(255,240,200,0.95)');
  g.addColorStop(1, 'rgba(255,220,160,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, size * 0.3, size * 0.3 * tilt, 0, 0, Math.PI * 2);
  ctx.fill();
}

function elliptical(ctx, x, y, rx, ry, seed = 2) {
  const r = rng(seed);
  for (let i = 0; i < 500; i++) {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 1.8);
    ctx.fillStyle = `rgba(255,220,170,${(1 - d) * 0.8})`;
    ctx.fillRect(x + Math.cos(a) * d * rx, y + Math.sin(a) * d * ry, 1.4, 1.4);
  }
}

function irregular(ctx, x, y, size, seed = 3) {
  const r = rng(seed);
  for (let i = 0; i < 400; i++) {
    const cx = x + (r() - 0.5) * size * 1.4, cy = y + (r() - 0.5) * size;
    ctx.fillStyle = `rgba(${150 + r() * 100},${170 + r() * 80},255,${0.3 + r() * 0.5})`;
    ctx.fillRect(cx + Math.sin(i) * size * 0.15, cy, 1.5, 1.5);
  }
}

const SLIDES = [
  {
    title: 'El Universo',
    text: [h('p', null, 'El ', h('b', null, 'Universo'), ' es ', h('b', null, 'todo lo que existe'), ': galaxias, estrellas, planetas, satélites, polvo, gas… y el espacio que hay entre ellos.'), h('p', null, 'Es inmenso: tiene miles de millones de galaxias y se formó hace unos 13.800 millones de años.')],
    draw(ctx, w, hh, t) {
      starfield(ctx, w, hh, 160, 21, t);
      const r = rng(5);
      for (let i = 0; i < 14; i++) {
        const x = r() * w, y = r() * hh, s = 12 + r() * 28;
        if (i % 3 === 0) elliptical(ctx, x, y, s, s * 0.6, i);
        else spiral(ctx, x, y, s, t * 0.1 + i, { n: 160, seed: i + 3, tilt: 0.4 + r() * 0.6, color: [180 + r() * 70, 190, 255] });
      }
    },
  },
  {
    title: 'Las galaxias',
    text: [h('p', null, 'Una ', h('b', null, 'galaxia'), ' es un grupo enorme de estrellas, gas y polvo que se mantienen juntos por la gravedad.'), h('p', null, 'Según su forma pueden ser ', h('b', null, 'espirales'), ', ', h('b', null, 'elípticas'), ' o ', h('b', null, 'irregulares'), '.')],
    draw(ctx, w, hh, t) {
      starfield(ctx, w, hh, 80, 22, t);
      spiral(ctx, w * 0.2, hh * 0.45, 80, t * 0.15, { seed: 7 });
      elliptical(ctx, w * 0.52, hh * 0.45, 70, 45);
      irregular(ctx, w * 0.82, hh * 0.45, 80);
      label(ctx, 'Espiral', w * 0.2, hh * 0.88);
      label(ctx, 'Elíptica', w * 0.52, hh * 0.88);
      label(ctx, 'Irregular', w * 0.82, hh * 0.88);
    },
  },
  {
    title: 'La Vía Láctea',
    text: [h('p', null, 'Nuestra galaxia se llama ', h('b', null, 'Vía Láctea'), '. Es una galaxia ', h('b', null, 'en espiral'), ' con miles de millones de estrellas.'), h('p', null, 'El ', h('b', null, 'Sistema Solar'), ' está en uno de sus brazos, ', h('b', null, 'lejos del centro'), '. En una noche muy oscura, sin luces de ciudad, la vemos como una franja blanquecina en el cielo.')],
    draw(ctx, w, hh, t) {
      starfield(ctx, w, hh, 60, 23, t);
      spiral(ctx, w / 2, hh / 2, 150, t * 0.05, { arms: 4, n: 2600, seed: 11, tilt: 0.8, color: [190, 205, 255] });
      const a = t * 0.05 + 1.9;
      const sx = w / 2 + Math.cos(a) * 95, sy = hh / 2 + Math.sin(a) * 95 * 0.8;
      ctx.strokeStyle = '#ffb547';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, 7 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
      label(ctx, '¡Aquí estamos! (Sistema Solar)', sx, sy - 22, { size: 13, color: '#ffb547', bg: 'rgba(0,0,0,0.6)' });
    },
  },
  {
    title: 'Las estrellas',
    text: [h('p', null, 'Las ', h('b', null, 'estrellas'), ' son enormes bolas de gases muy calientes que tienen ', h('b', null, 'luz propia'), '. El Sol es la estrella más cercana.'), h('p', null, 'Su ', h('b', null, 'color'), ' depende de su temperatura: las ', h('b', null, 'azules'), ' son las más calientes y las ', h('b', null, 'rojas'), ', las menos. El Sol es amarillo.')],
    draw(ctx, w, hh, t) {
      starfield(ctx, w, hh, 60, 24, t);
      const stars = [['Azul', '#8fb6ff', 26, 'muy caliente'], ['Blanca', '#f4f6ff', 22, ''], ['Amarilla (Sol)', '#ffe27a', 20, ''], ['Naranja', '#ffad5a', 18, ''], ['Roja', '#ff6a4a', 15, 'menos caliente']];
      stars.forEach(([name, col, r, note], i) => {
        const x = 70 + i * ((w - 140) / 4), y = hh * 0.45;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.25, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 2.6 * (1 + Math.sin(t * 3 + i) * 0.04), 0, Math.PI * 2);
        ctx.fill();
        label(ctx, name, x, hh * 0.78, { size: 13 });
        if (note) label(ctx, note, x, hh * 0.88, { size: 11, color: '#a7b9d6' });
      });
    },
  },
  {
    title: 'Las constelaciones',
    text: [h('p', null, 'Las ', h('b', null, 'constelaciones'), ' son grupos de estrellas que, vistas desde la Tierra, parecen formar figuras. Antiguamente servían para orientarse.'), h('p', null, 'La ', h('b', null, 'Estrella Polar'), ' (en la Osa Menor) siempre indica el ', h('b', null, 'norte'), '. Para encontrarla se usan las dos últimas estrellas del «carro» de la Osa Mayor.')],
    draw(ctx, w, hh, t) {
      starfield(ctx, w, hh, 120, 25, t);
      const groups = [
        { name: 'Osa Mayor', pts: [[60, 90], [110, 80], [150, 95], [190, 110], [200, 160], [260, 165], [265, 110]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
        { name: 'Casiopea', pts: [[480, 60], [510, 100], [545, 70], [580, 105], [615, 70]], lines: [[0, 1], [1, 2], [2, 3], [3, 4]] },
        { name: 'Orión', pts: [[430, 190], [520, 185], [455, 240], [475, 236], [495, 232], [440, 295], [525, 290]], lines: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]] },
      ];
      ctx.strokeStyle = 'rgba(120,180,255,0.6)';
      ctx.lineWidth = 1.5;
      for (const g of groups) {
        for (const [a, b] of g.lines) { ctx.beginPath(); ctx.moveTo(...g.pts[a]); ctx.lineTo(...g.pts[b]); ctx.stroke(); }
        for (const [x, y] of g.pts) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
        const cx = g.pts.reduce((s, p) => s + p[0], 0) / g.pts.length;
        const cy = Math.max(...g.pts.map((p) => p[1])) + 22;
        label(ctx, g.name, cx, cy, { size: 13, color: '#9fd0ff' });
      }
      // Estrella Polar
      const px = 270, py = 30;
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(255,181,71,0.6)';
      ctx.beginPath(); ctx.moveTo(265, 110); ctx.lineTo(px, py + 6); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath(); ctx.arc(px, py, 5 + Math.sin(t * 3), 0, Math.PI * 2); ctx.fill();
      label(ctx, 'Estrella Polar (norte)', px + 12, py, { size: 13, align: 'left', color: '#ffb547' });
    },
  },
  {
    title: 'El año luz',
    text: [h('p', null, 'Las distancias del Universo son tan grandes que no se miden en kilómetros, sino en ', h('b', null, 'años luz'), '.'), h('p', null, 'Un ', h('b', null, 'año luz'), ' es la ', h('b', null, 'distancia'), ' que recorre la luz en un año: ¡unos 9,5 billones de kilómetros! Ojo: aunque diga «año», mide distancia, no tiempo.'), h('p', null, 'La estrella más cercana después del Sol (Próxima Centauri) está a unos 4 años luz.')],
    draw(ctx, w, hh, t) {
      starfield(ctx, w, hh, 80, 26, t);
      const y = hh * 0.45;
      const g = ctx.createRadialGradient(60, y, 0, 60, y, 40);
      g.addColorStop(0, '#fff'); g.addColorStop(0.3, '#ffd36b'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(60, y, 40, 0, Math.PI * 2); ctx.fill();
      label(ctx, 'Sol', 60, y + 50, { size: 13 });
      ctx.fillStyle = '#2f7bff'; ctx.beginPath(); ctx.arc(160, y, 6, 0, Math.PI * 2); ctx.fill();
      label(ctx, 'Tierra: 8 minutos-luz', 160, y + 30, { size: 12 });
      const g2 = ctx.createRadialGradient(w - 60, y, 0, w - 60, y, 26);
      g2.addColorStop(0, '#fff'); g2.addColorStop(0.3, '#ff8a5a'); g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(w - 60, y, 26, 0, Math.PI * 2); ctx.fill();
      label(ctx, 'Próxima Centauri: 4,2 años luz', w - 90, y + 44, { size: 12 });
      const p = (t * 0.25) % 1;
      const x = 100 + p * (w - 200);
      ctx.fillStyle = '#fff6c0';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,246,192,0.5)';
      ctx.beginPath(); ctx.moveTo(x - 40, y); ctx.lineTo(x, y); ctx.stroke();
      label(ctx, 'rayo de luz (300.000 km por segundo)', x, y - 18, { size: 11, color: '#fff6c0' });
    },
  },
  {
    title: 'La exploración del espacio',
    text: [h('p', null, 'Gracias a los ', h('b', null, 'telescopios'), ', las ', h('b', null, 'sondas'), ' y los ', h('b', null, 'astronautas'), ' conocemos cada vez mejor el Universo.'), h('p', null, 'Los ', h('b', null, 'satélites artificiales'), ' son aparatos fabricados por las personas que giran alrededor de la Tierra: sirven para la televisión, el GPS o saber el tiempo que hará.')],
    draw(ctx, w, hh, t) {
      starfield(ctx, w, hh, 80, 27, t);
      const ev = [['1957', 'Sputnik 1: primer satélite artificial'], ['1961', 'Yuri Gagarin: primera persona en el espacio'], ['1969', 'Neil Armstrong pisa la Luna'], ['1977', 'Lanzamiento de las sondas Voyager'], ['1998', 'Pedro Duque: primer astronauta español'], ['2021', 'Telescopio espacial James Webb']];
      const y = hh * 0.5;
      ctx.strokeStyle = 'rgba(160,200,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(w - 30, y); ctx.stroke();
      ev.forEach(([year, txt], i) => {
        const x = 70 + i * ((w - 140) / (ev.length - 1));
        ctx.fillStyle = '#ffb547';
        ctx.beginPath(); ctx.arc(x, y, 6 + (Math.floor(t) % ev.length === i ? 3 : 0), 0, Math.PI * 2); ctx.fill();
        label(ctx, year, x, y + (i % 2 ? 26 : -26), { size: 14, color: '#ffb547' });
        const words = txt.split(':');
        label(ctx, words[0], x, y + (i % 2 ? 50 : -50), { size: 11 });
        if (words[1]) label(ctx, words[1].trim(), x, y + (i % 2 ? 66 : -66), { size: 11, color: '#a7b9d6' });
      });
    },
  },
];

function slidesTab(modal) {
  const c = makeCanvas(680, 340);
  let i = 0;
  const title = h('h3');
  const text = h('div');
  const dots = h('div', { class: 'dots' }, SLIDES.map(() => h('span')));
  const prev = h('button', { class: 'btn small', onclick: () => go(i - 1) }, '← Anterior');
  const next = h('button', { class: 'btn small primary', onclick: () => go(i + 1) }, 'Siguiente →');
  const go = (k) => {
    i = Math.max(0, Math.min(SLIDES.length - 1, k));
    title.textContent = SLIDES[i].title;
    text.replaceChildren(...SLIDES[i].text.map((n) => n.cloneNode(true)));
    [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
    prev.disabled = i === 0;
    next.disabled = i === SLIDES.length - 1;
  };
  const wrap = h('div', { class: 'demo' },
    h('div', null, c.canvas),
    h('div', { class: 'demo-text' }, title, text, h('div', { class: 'slides-nav' }, prev, dots, next)));
  go(0);
  const stop = loop(modal, (dt, t) => {
    c.ctx.fillStyle = '#02050d';
    c.ctx.fillRect(0, 0, c.w, c.h);
    SLIDES[i].draw(c.ctx, c.w, c.h, t);
  });
  return { el: wrap, dispose: stop };
}

export function open() {
  return openTabbedLesson('🌌 El Universo', [['El Universo', slidesTab]]);
}
