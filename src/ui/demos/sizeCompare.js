// Lección: tamaños y distancias reales (en el juego están comprimidos para poder viajar).
import { h } from '../../utils/dom.js';
import { makeCanvas, loop, loadImage, drawSphere, label, starfield, openTabbedLesson } from './common.js';

const PLANETS = [
  { name: 'Mercurio', d: 4879, au: 0.39, tex: '2k_mercury.jpg' },
  { name: 'Venus', d: 12104, au: 0.72, tex: '2k_venus_atmosphere.jpg' },
  { name: 'Tierra', d: 12742, au: 1, tex: '2k_earth_daymap.jpg' },
  { name: 'Marte', d: 6779, au: 1.52, tex: '2k_mars.jpg' },
  { name: 'Júpiter', d: 142984, au: 5.2, tex: '2k_jupiter.jpg' },
  { name: 'Saturno', d: 116464, au: 9.54, tex: '2k_saturn.jpg', rings: true },
  { name: 'Urano', d: 50724, au: 19.2, tex: '2k_uranus.jpg' },
  { name: 'Neptuno', d: 49244, au: 30.1, tex: '2k_neptune.jpg' },
];

function sizesTab(modal) {
  const c = makeCanvas(900, 300);
  const wrap = h('div', null, c.canvas,
    h('div', { class: 'demo-text', style: { marginTop: '12px' } },
      h('p', null, 'Estos son los ', h('b', null, 'tamaños reales comparados'), '. El Sol es tan enorme que solo cabe un trocito de su borde a la izquierda: ¡su diámetro es 109 veces el de la Tierra!'),
      h('div', { class: 'callout' }, '🏀 Si el Sol fuera un balón de baloncesto, la Tierra sería un granito de 2 milímetros, Júpiter una canica de 2,5 cm… ¡y Neptuno estaría a casi 800 metros del balón!'),
      h('p', { class: 'note' }, 'En la nave hemos encogido las distancias y agrandado los planetas pequeños para que puedas viajar entre ellos sin tardar años.')));
  const sun = loadImage('2k_sun.jpg');
  const imgs = PLANETS.map((p) => loadImage(p.tex));
  const scale = 135 / 142984; // Júpiter mide 135 px de diámetro
  const stop = loop(modal, (dt, time) => {
    const ctx = c.ctx;
    ctx.fillStyle = '#02050d';
    ctx.fillRect(0, 0, c.w, c.h);
    starfield(ctx, c.w, c.h, 100, 12, time);
    const sunR = (1392700 * scale) / 2;
    drawSphere(ctx, sun, -sunR + 50, 140, sunR, { shade: 0.1, glow: 'rgba(255,170,60,0.35)' });
    label(ctx, 'Sol', 24, 270, { size: 14, color: '#ffcf8a' });
    let x = 78;
    PLANETS.forEach((p, i) => {
      const r = Math.max(1.2, (p.d * scale) / 2);
      x += r + (i === 0 ? 8 : i < 4 ? 30 : 14) + (p.rings ? r * 1.15 : 0);
      if (p.rings) {
        ctx.strokeStyle = 'rgba(220,200,160,0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, 140, r * 2.1, r * 0.45, -0.25, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawSphere(ctx, imgs[i], x, 140, r, { shade: 0.6 });
      const ly = i < 4 ? 200 + i * 20 : i % 2 ? 230 : 255;
      if (i < 4) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, 140 + r + 3); ctx.lineTo(x, ly - 8); ctx.stroke(); }
      label(ctx, p.name, x, ly, { size: 12 });
      x += r + (p.rings ? r * 1.15 : 0);
    });
  });
  return { el: wrap, dispose: stop };
}

function distancesTab(modal) {
  const c = makeCanvas(900, 260);
  const wrap = h('div', null, c.canvas,
    h('div', { class: 'demo-text', style: { marginTop: '12px' } },
      h('p', null, 'Estas son las ', h('b', null, 'distancias reales al Sol'), ' (a escala). Fíjate en lo juntos que están los planetas interiores y lo lejos que quedan los exteriores.'),
      h('div', { class: 'callout' }, '💡 La luz del Sol tarda 8 minutos en llegar a la Tierra… y unas 4 horas en llegar a Neptuno.')));
  const sun = loadImage('2k_sun.jpg');
  const imgs = PLANETS.map((p) => loadImage(p.tex));
  const x0 = 40, x1 = 870, maxAu = 31;
  const stop = loop(modal, (dt, time) => {
    const ctx = c.ctx;
    ctx.fillStyle = '#02050d';
    ctx.fillRect(0, 0, c.w, c.h);
    starfield(ctx, c.w, c.h, 80, 13, time);
    const y = 120;
    ctx.strokeStyle = 'rgba(160,200,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    // Cinturón de asteroides
    const bx0 = x0 + (2.2 / maxAu) * (x1 - x0), bx1 = x0 + (3.3 / maxAu) * (x1 - x0);
    ctx.fillStyle = 'rgba(180,160,140,0.35)';
    ctx.fillRect(bx0, y - 10, bx1 - bx0, 20);
    label(ctx, 'Cinturón', (bx0 + bx1) / 2, y + 62, { size: 11, color: '#c9b8a6' });
    drawSphere(ctx, sun, x0, y, 16, { shade: 0.1, glow: 'rgba(255,170,60,0.6)' });
    label(ctx, 'Sol', x0, y + 34, { size: 12, color: '#ffcf8a' });
    PLANETS.forEach((p, i) => {
      const x = x0 + (p.au / maxAu) * (x1 - x0);
      drawSphere(ctx, imgs[i], x, y, i >= 4 ? 8 : 5, { shade: 0.5 });
      const up = i % 2 === 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + (up ? -10 : 10));
      ctx.lineTo(x, y + (up ? -38 - (i < 4 ? i * 14 : 0) : 30 + (i < 4 ? i * 12 : 0)));
      ctx.stroke();
      label(ctx, p.name, x, y + (up ? -48 - (i < 4 ? i * 14 : 0) : 40 + (i < 4 ? i * 12 : 0)), { size: 12 });
    });
    label(ctx, '← más cerca del Sol', x0 + 10, 230, { size: 12, align: 'left', color: '#a7b9d6' });
    label(ctx, 'más lejos del Sol →', x1, 230, { size: 12, align: 'right', color: '#a7b9d6' });
  });
  return { el: wrap, dispose: stop };
}

export function open() {
  return openTabbedLesson('📏 Tamaños y distancias reales', [
    ['Tamaños', sizesTab],
    ['Distancias', distancesTab],
  ]);
}
