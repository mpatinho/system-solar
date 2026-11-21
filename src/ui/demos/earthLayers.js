// Lección: capas de la Tierra (atmósfera, hidrosfera, geosfera con su interior, biosfera).
import { h } from '../../utils/dom.js';
import { makeCanvas, loop, loadImage, label, starfield, openTabbedLesson } from './common.js';

const LAYERS = {
  atmosfera: { name: 'Atmósfera', color: '#7fc8ff', text: 'Capa de aire que rodea la Tierra. Contiene el oxígeno que respiramos, nos protege de los rayos peligrosos del Sol y de muchos meteoritos (que arden al atravesarla), y en ella se forman las nubes y la lluvia.' },
  hidrosfera: { name: 'Hidrosfera', color: '#2f7bff', text: 'Es toda el agua de la Tierra: océanos, mares, ríos, lagos, aguas subterráneas y el hielo de los polos. Cubre casi tres cuartas partes de la superficie: por eso la llamamos «planeta azul».' },
  geosfera: { name: 'Geosfera', color: '#b07a4a', text: 'Es la parte sólida de la Tierra, formada por rocas y minerales. Por dentro tiene tres capas: la corteza (donde vivimos, la más fina), el manto (rocas muy calientes) y el núcleo (en el centro, la más caliente).' },
  biosfera: { name: 'Biosfera', color: '#4ade80', text: 'Está formada por todos los seres vivos (personas, animales, plantas, hongos…) y los lugares donde viven. Ocupa partes de la atmósfera, la hidrosfera y la geosfera.' },
  corteza: { name: 'Corteza', color: '#8b5a2b', text: 'La capa exterior y más delgada de la geosfera. Sobre ella están los continentes y el fondo de los océanos.' },
  manto: { name: 'Manto', color: '#e2703a', text: 'La capa intermedia. Es muy gruesa y está formada por rocas muy calientes, algunas medio fundidas (el magma de los volcanes viene de aquí).' },
  nucleo: { name: 'Núcleo', color: '#ffd04a', text: 'El centro de la Tierra, formado sobre todo por hierro. Es la capa más caliente: ¡tanto como la superficie del Sol!' },
};

function layersTab(modal) {
  const c = makeCanvas(460, 420);
  let selected = 'atmosfera';
  const title = h('h3');
  const desc = h('p');
  const buttons = h('div', { class: 'demo-controls' });
  const select = (id) => {
    selected = id;
    title.textContent = LAYERS[id].name;
    title.style.color = LAYERS[id].color;
    desc.textContent = LAYERS[id].text;
    [...buttons.children].forEach((b) => b.classList.toggle('active', b.dataset.id === id));
  };
  for (const id of Object.keys(LAYERS)) {
    const b = h('button', { class: 'btn small', 'data-id': id, onclick: () => select(id) }, LAYERS[id].name);
    buttons.append(b);
  }
  const wrap = h('div', { class: 'demo' },
    h('div', null, c.canvas),
    h('div', { class: 'demo-text' },
      h('p', null, 'Toca cada capa para saber cómo es:'),
      buttons, title, desc,
      h('div', { class: 'callout' }, h('b', null, 'Para recordar: '), 'atmósfera = aire · hidrosfera = agua · geosfera = rocas · biosfera = seres vivos.')));
  const earth = loadImage('2k_earth_daymap.jpg');
  const cx = 230, cy = 215, R = 150;
  const stop = loop(modal, (dt, time) => {
    const ctx = c.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.fillStyle = '#02050d';
    ctx.fillRect(0, 0, c.w, c.h);
    starfield(ctx, c.w, c.h, 60, 8, time);
    // Atmósfera
    const ag = ctx.createRadialGradient(cx, cy, R, cx, cy, R + 28);
    ag.addColorStop(0, `rgba(127,200,255,${selected === 'atmosfera' ? 0.55 + pulse * 0.3 : 0.4})`);
    ag.addColorStop(1, 'rgba(127,200,255,0)');
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 28, 0, Math.PI * 2);
    ctx.fill();
    // Mitad derecha: superficie con textura (hidrosfera y biosfera); mitad izquierda: corte del interior
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
    ctx.clip();
    if (earth.complete && earth.naturalWidth) ctx.drawImage(earth, earth.naturalWidth * 0.3, 0, earth.naturalWidth * 0.5, earth.naturalHeight, cx - R, cy - R, R * 2, R * 2);
    if (selected === 'hidrosfera') { ctx.fillStyle = `rgba(47,123,255,${0.2 + pulse * 0.25})`; ctx.fillRect(cx, cy - R, R, R * 2); }
    ctx.restore();
    // Corte: corteza, manto y núcleo
    const geoSel = ['geosfera', 'corteza', 'manto', 'nucleo'].includes(selected);
    const ring = (r, color, id) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, Math.PI / 2, (3 * Math.PI) / 2);
      ctx.closePath();
      ctx.fill();
      if (selected === id || (selected === 'geosfera' && id !== 'none')) {
        ctx.strokeStyle = `rgba(255,255,255,${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    };
    ring(R, LAYERS.corteza.color, 'corteza');
    ring(R - 12, LAYERS.manto.color, 'manto');
    ring(R * 0.45, LAYERS.nucleo.color, 'nucleo');
    if (!geoSel) {
      ctx.fillStyle = 'rgba(2,5,13,0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy, R, Math.PI / 2, (3 * Math.PI) / 2);
      ctx.fill();
    }
    // Biosfera: seres vivos sobre la superficie
    const life = ['🌳', '🐘', '🐟', '🦅', '🌻', '🐋'];
    ctx.font = `${selected === 'biosfera' ? 22 + pulse * 6 : 18}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    life.forEach((e, i) => {
      const a = -Math.PI / 2 + 0.3 + i * 0.5;
      ctx.fillText(e, cx + Math.cos(a) * (R + 4), cy + Math.sin(a) * (R + 4));
    });
    label(ctx, 'Corteza', cx - R - 2, cy - R * 0.75, { size: 12, align: 'right', color: '#f3d2b0' });
    label(ctx, 'Manto', cx - R * 0.7, cy + 10, { size: 13, color: '#fff' });
    label(ctx, 'Núcleo', cx - R * 0.22, cy, { size: 13, color: '#3a2500' });
    label(ctx, 'Atmósfera', cx + R * 0.5, cy - R - 16, { size: 12, color: '#bfe4ff' });
  });
  select('atmosfera');
  return { el: wrap, dispose: stop };
}

export function open() {
  return openTabbedLesson('🧅 Capas de la Tierra', [['Capas de la Tierra', layersTab]]);
}
