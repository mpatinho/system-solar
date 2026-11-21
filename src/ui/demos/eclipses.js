// Lección: eclipses de Sol y de Luna (vista lateral con sombras + cómo se ve desde la Tierra).
import { h } from '../../utils/dom.js';
import { makeCanvas, loop, loadImage, drawSphere, label, starfield, openTabbedLesson } from './common.js';

function eclipseTab(kind) {
  return (modal) => {
    const side = makeCanvas(620, 260);
    const view = makeCanvas(220, 220);
    let p = 0;
    let playing = true;
    const playBtn = h('button', { class: 'btn small', onclick: () => { playing = !playing; playBtn.textContent = playing ? '⏸ Pausa' : '▶ Animar'; } }, '⏸ Pausa');
    const slider = h('input', { type: 'range', min: 0, max: 1, step: 0.001, value: 0 });
    slider.addEventListener('input', () => { playing = false; playBtn.textContent = '▶ Animar'; p = parseFloat(slider.value); });
    const solar = kind === 'sol';
    const text = solar
      ? [h('h3', null, 'Eclipse de Sol'),
        h('p', null, 'La ', h('b', null, 'Luna'), ' se coloca ', h('b', null, 'entre el Sol y la Tierra'), ' y tapa el Sol. Su sombra cae sobre una pequeña parte de la Tierra: allí se hace de noche durante unos minutos.'),
        h('div', { class: 'callout' }, 'Orden: ', h('b', null, 'Sol – Luna – Tierra'), '. Solo puede pasar en ', h('b', null, 'luna nueva'), '.'),
        h('p', { class: 'note' }, '⚠️ Nunca mires un eclipse de Sol sin gafas especiales homologadas.')]
      : [h('h3', null, 'Eclipse de Luna'),
        h('p', null, 'La ', h('b', null, 'Tierra'), ' se coloca ', h('b', null, 'entre el Sol y la Luna'), '. La sombra de la Tierra cubre la Luna, que se ve oscura y de color rojizo.'),
        h('div', { class: 'callout' }, 'Orden: ', h('b', null, 'Sol – Tierra – Luna'), '. Solo puede pasar en ', h('b', null, 'luna llena'), '.'),
        h('p', { class: 'note' }, 'Los eclipses de Luna se pueden mirar sin peligro.')];
    const wrap = h('div', { class: 'demo' },
      h('div', null, side.canvas, h('div', { class: 'demo-controls' }, playBtn, slider)),
      h('div', { class: 'demo-text' }, ...text, h('h3', { style: { marginTop: '10px' } }, 'Visto desde la Tierra:'), h('div', { style: { display: 'grid', placeItems: 'center' } }, view.canvas)));
    const sunImg = loadImage('2k_sun.jpg');
    const earthImg = loadImage('2k_earth_daymap.jpg');
    const moonImg = loadImage('2k_moon.jpg');
    const W = side.w, H = side.h, cy = H / 2;
    const stop = loop(modal, (dt, time) => {
      if (playing) { p = (p + dt * 0.12) % 1; slider.value = p; }
      const offset = (p - 0.5) * 2; // −1 … 1 (0 = alineados)
      const ctx = side.ctx;
      ctx.fillStyle = '#02050d';
      ctx.fillRect(0, 0, W, H);
      starfield(ctx, W, H, 80, 6, time);
      const sunX = 40, earthX = solar ? 520 : 330, moonX = solar ? 380 : 520;
      const moonY = cy + offset * 70;
      // Sombra (cono) del cuerpo que está en medio
      const casterX = solar ? moonX : earthX;
      const casterY = solar ? moonY : cy;
      const casterR = solar ? 11 : 30;
      const len = solar ? 150 : 330;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.moveTo(casterX, casterY - casterR);
      ctx.lineTo(casterX + len, casterY);
      ctx.lineTo(casterX, casterY + casterR);
      ctx.closePath();
      ctx.fill();
      const g = ctx.createLinearGradient(casterX, 0, casterX + len, 0);
      g.addColorStop(0, 'rgba(10,10,20,0.75)');
      g.addColorStop(1, 'rgba(10,10,20,0)');
      ctx.fillStyle = g;
      ctx.fill();
      // Rayos
      ctx.strokeStyle = 'rgba(255,200,90,0.15)';
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(sunX + 60, cy + i * 18);
        ctx.lineTo(W, cy + i * 30);
        ctx.stroke();
      }
      drawSphere(ctx, sunImg, sunX - 20, cy, 80, { shade: 0.1, glow: 'rgba(255,170,60,0.5)' });
      label(ctx, 'Sol', sunX + 10, cy + 100, { size: 14, color: '#ffcf8a' });
      drawSphere(ctx, earthImg, earthX, cy, 30, { lightX: -1, lightY: 0, shade: 0.9, glow: 'rgba(80,150,255,0.3)' });
      label(ctx, 'Tierra', earthX, cy + 48, { size: 13 });
      // La Luna en la sombra de la Tierra se vuelve rojiza
      const inShadow = !solar && Math.abs(offset) < 0.32;
      drawSphere(ctx, moonImg, moonX, moonY, 11, { lightX: -1, lightY: 0, shade: 0.9 });
      if (inShadow) {
        ctx.fillStyle = `rgba(120,30,10,${0.75 * (1 - Math.abs(offset) / 0.32)})`;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 11, 0, Math.PI * 2);
        ctx.fill();
      }
      label(ctx, 'Luna', moonX, moonY - 22, { size: 12, color: '#ffb547' });
      if (solar && Math.abs(offset) < 0.12) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.beginPath();
        ctx.ellipse(earthX - 27, cy + offset * 30, 4, 9, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Vista desde la Tierra
      const v = view.ctx;
      const vx = view.w / 2, vy = view.h / 2;
      if (solar) {
        const cover = 1 - Math.min(1, Math.abs(offset) / 0.5);
        const sky = Math.max(0, 1 - cover * 1.2);
        v.fillStyle = `rgb(${10 + 60 * sky},${20 + 110 * sky},${40 + 170 * sky})`;
        v.fillRect(0, 0, view.w, view.h);
        if (cover > 0.95) {
          const cg = v.createRadialGradient(vx, vy, 50, vx, vy, 100);
          cg.addColorStop(0, 'rgba(255,255,255,0.9)');
          cg.addColorStop(1, 'rgba(255,255,255,0)');
          v.fillStyle = cg;
          v.fillRect(0, 0, view.w, view.h);
        }
        drawSphere(v, sunImg, vx, vy, 56, { shade: 0.05, glow: 'rgba(255,190,80,0.6)' });
        v.fillStyle = '#05060a';
        v.beginPath();
        v.arc(vx + offset * 130, vy - offset * 20, 57, 0, Math.PI * 2);
        v.fill();
      } else {
        v.fillStyle = '#02050d';
        v.fillRect(0, 0, view.w, view.h);
        starfield(v, view.w, view.h, 40, 2, time);
        drawSphere(v, moonImg, vx, vy, 70, { shade: 0.2 });
        // Sombra de la Tierra que avanza
        const sx = vx + offset * 200;
        const sg = v.createRadialGradient(sx, vy, 60, sx, vy, 130);
        sg.addColorStop(0, 'rgba(110,25,5,0.85)');
        sg.addColorStop(0.6, 'rgba(60,10,0,0.6)');
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        v.save();
        v.beginPath();
        v.arc(vx, vy, 70, 0, Math.PI * 2);
        v.clip();
        v.fillStyle = sg;
        v.fillRect(0, 0, view.w, view.h);
        v.restore();
      }
    });
    return { el: wrap, dispose: stop };
  };
}

export function open() {
  return openTabbedLesson('🌑 Eclipses', [
    ['Eclipse de Sol', eclipseTab('sol')],
    ['Eclipse de Luna', eclipseTab('luna')],
  ]);
}
