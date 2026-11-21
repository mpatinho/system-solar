// Lección: fases de la Luna. Se arrastra la Luna alrededor de la Tierra y se ve cómo se vería desde España.
import { h } from '../../utils/dom.js';
import { makeCanvas, loop, loadImage, drawSphere, label, starfield, openTabbedLesson } from './common.js';
import { drawMoonPhase, phaseName } from './phaseDraw.js';

function phasesTab(modal) {
  const top = makeCanvas(400, 400);
  const view = makeCanvas(220, 220);
  const nameEl = h('div', { style: { fontFamily: 'var(--font-title)', fontSize: '22px', fontWeight: 800, color: '#ffb547', textAlign: 'center', margin: '6px 0' } });
  let theta = Math.PI * 1.5; // ángulo de la Luna alrededor de la Tierra (π = luna nueva, hacia el Sol)
  let playing = true;
  const playBtn = h('button', { class: 'btn small', onclick: () => { playing = !playing; playBtn.textContent = playing ? '⏸ Pausa' : '▶ Mover la Luna'; } }, '⏸ Pausa');
  const jump = (name, th) => h('button', { class: 'btn small', onclick: () => { playing = false; playBtn.textContent = '▶ Mover la Luna'; theta = th; } }, name);
  const wrap = h('div', { class: 'demo' },
    h('div', null, top.canvas,
      h('div', { class: 'demo-controls' }, playBtn, jump('🌑 Nueva', Math.PI), jump('🌓 C. creciente', Math.PI * 1.5), jump('🌕 Llena', 0), jump('🌗 C. menguante', Math.PI * 0.5)),
      h('p', { class: 'note' }, 'Arrastra la Luna con el ratón para moverla por su órbita.')),
    h('div', { class: 'demo-text' },
      h('h3', null, 'Así se ve desde España:'),
      h('div', { style: { display: 'grid', placeItems: 'center' } }, view.canvas),
      nameEl,
      h('p', null, 'La Luna ', h('b', null, 'no tiene luz propia'), ': el Sol ilumina siempre la mitad que mira hacia él. Según dónde esté la Luna en su órbita, desde la Tierra vemos más o menos parte iluminada.'),
      h('div', { class: 'callout' }, '🤥 ', h('b', null, '«La Luna es mentirosa»'), ': cuando tiene forma de ', h('b', null, 'C'), ' está ', h('b', null, 'decreciendo'), ' (menguante) y cuando tiene forma de ', h('b', null, 'D'), ' está ', h('b', null, 'creciendo'), '.'),
      h('p', { class: 'note' }, 'Un ciclo completo de fases dura unos 29 días y medio.'),
    ));
  const W = top.w, H = top.h, cx = W / 2, cy = H / 2, orbitR = 140;
  const earthImg = loadImage('2k_earth_daymap.jpg');
  let dragging = false;
  const setFromEvent = (e) => {
    const r = top.canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W - cx;
    const y = ((e.clientY - r.top) / r.height) * H - cy;
    theta = Math.atan2(-y, x);
  };
  top.canvas.addEventListener('pointerdown', (e) => { dragging = true; playing = false; playBtn.textContent = '▶ Mover la Luna'; setFromEvent(e); top.canvas.setPointerCapture(e.pointerId); });
  top.canvas.addEventListener('pointermove', (e) => { if (dragging) setFromEvent(e); });
  top.canvas.addEventListener('pointerup', () => { dragging = false; });

  const stop = loop(modal, (dt, time) => {
    if (playing) theta = (theta + dt * 0.35) % (Math.PI * 2);
    const ctx = top.ctx;
    ctx.fillStyle = '#02050d';
    ctx.fillRect(0, 0, W, H);
    starfield(ctx, W, H, 70, 9, time);
    // Rayos del Sol (desde la izquierda)
    for (let i = 0; i < 7; i++) {
      const y = 40 + i * 53;
      const g = ctx.createLinearGradient(0, 0, 70, 0);
      g.addColorStop(0, 'rgba(255,200,90,0.9)');
      g.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(70, y);
      ctx.stroke();
    }
    label(ctx, '☀ Luz del Sol', 10, 18, { align: 'left', size: 13, color: '#ffcf8a' });
    ctx.strokeStyle = 'rgba(160,200,255,0.3)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Tierra con día (izquierda) y noche (derecha)
    drawSphere(ctx, earthImg, cx, cy, 34, { lightX: -1, lightY: 0, shade: 0.95, glow: 'rgba(80,150,255,0.3)' });
    label(ctx, 'Tierra', cx, cy + 50, { size: 13 });
    // Luna: mitad iluminada mirando al Sol (izquierda)
    const mx = cx + Math.cos(theta) * orbitR, my = cy - Math.sin(theta) * orbitR;
    const mr = 16;
    ctx.fillStyle = '#20232b';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e6e0';
    ctx.beginPath();
    ctx.arc(mx, my, mr, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.fill();
    ctx.strokeStyle = dragging ? '#ffb547' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx, my, mr + 4, 0, Math.PI * 2);
    ctx.stroke();
    label(ctx, 'Luna', mx, my - 28, { size: 13, color: '#ffb547' });
    // Línea de visión desde la Tierra
    ctx.strokeStyle = 'rgba(255,181,71,0.35)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(mx, my);
    ctx.stroke();

    // Vista desde la Tierra
    const alpha = theta - Math.PI; // 0 = nueva (Luna entre la Tierra y el Sol)
    const v = view.ctx;
    v.fillStyle = '#02050d';
    v.fillRect(0, 0, view.w, view.h);
    starfield(v, view.w, view.h, 30, 4, time);
    drawMoonPhase(v, view.w / 2, view.h / 2, 90, alpha);
    const name = phaseName(alpha);
    if (nameEl.textContent !== name) nameEl.textContent = name;
  });
  return { el: wrap, dispose: stop };
}

function cycleTab(modal) {
  const c = makeCanvas(720, 230);
  const names = ['Luna nueva', 'Creciente', 'Cuarto creciente', 'Gibosa creciente', 'Luna llena', 'Gibosa menguante', 'Cuarto menguante', 'Menguante'];
  const main = [0, 2, 4, 6];
  const wrap = h('div', null,
    c.canvas,
    h('div', { class: 'demo-text', style: { marginTop: '12px' } },
      h('p', null, 'Las ', h('b', null, '4 fases principales'), ' (las que suelen preguntar en el examen) están resaltadas: ', h('b', null, 'luna nueva → cuarto creciente → luna llena → cuarto menguante'), '. Entre una y otra pasa más o menos una semana.'),
      h('div', { class: 'callout' }, 'Truco: C = «Cae» (decrece, menguante) · D = «Desarrolla» (crece, creciente). ¡La Luna es mentirosa!')));
  const stop = loop(modal, (dt, time) => {
    const ctx = c.ctx;
    ctx.fillStyle = '#02050d';
    ctx.fillRect(0, 0, c.w, c.h);
    starfield(ctx, c.w, c.h, 60, 5, time);
    for (let i = 0; i < 8; i++) {
      const x = 50 + i * 88, y = 100;
      const isMain = main.includes(i);
      if (isMain) {
        ctx.strokeStyle = '#ffb547';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x - 42, 30, 84, 160, 12);
        ctx.stroke();
      }
      drawMoonPhase(ctx, x, y, 30, (i / 8) * Math.PI * 2);
      label(ctx, names[i], x, 160, { size: isMain ? 13 : 11, color: isMain ? '#ffb547' : '#a7b9d6' });
      if (i < 7) label(ctx, '→', x + 44, y, { size: 16, color: '#58c4ff' });
    }
  });
  return { el: wrap, dispose: stop };
}

export function open() {
  return openTabbedLesson('🌓 Fases de la Luna', [
    ['Mueve la Luna', phasesTab],
    ['El ciclo completo', cycleTab],
  ]);
}
