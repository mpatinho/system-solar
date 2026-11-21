// Utilidades para las lecciones: lienzos nítidos, imágenes y bucles de animación.
import { textureUrl } from '../../scene/textures.js';

const images = new Map();
export function loadImage(name) {
  if (images.has(name)) return images.get(name);
  const img = new Image();
  img.src = textureUrl(name);
  images.set(name, img);
  return img;
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = w * dpr;
  c.height = h * dpr;
  c.style.aspectRatio = `${w} / ${h}`;
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  return { canvas: c, ctx, w, h };
}

// Bucle de animación que se detiene al cerrar la ventana.
export function loop(modal, fn) {
  let last = performance.now();
  let raf = 0;
  const step = (now) => {
    if (modal.closed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    fn(dt, now / 1000);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

// Dibuja un astro como esfera usando su textura (franja central) con sombreado.
export function drawSphere(ctx, img, x, y, r, { lightX = -0.6, lightY = -0.4, shade = 0.85, glow = null } = {}) {
  ctx.save();
  if (glow) {
    const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.8);
    g.addColorStop(0, glow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  if (img && img.complete && img.naturalWidth) {
    const sw = img.naturalWidth * 0.5, sh = img.naturalHeight;
    ctx.drawImage(img, img.naturalWidth * 0.25, 0, sw, sh, x - r, y - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = '#888';
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (shade > 0) {
    const g = ctx.createRadialGradient(x + lightX * r * 0.6, y + lightY * r * 0.6, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, 'rgba(255,255,255,0.08)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${shade})`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

export function starfield(ctx, w, h, n = 120, seed = 1, time = 0) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = rnd() * 1.3 + 0.2;
    const tw = 0.6 + 0.4 * Math.sin(time * (1 + rnd() * 2) + i);
    ctx.fillStyle = `rgba(255,255,255,${(0.35 + rnd() * 0.5) * tw})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function label(ctx, text, x, y, { color = '#eaf2ff', size = 14, align = 'center', weight = 700, bg = null } = {}) {
  ctx.font = `${weight} ${size}px Nunito, system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (bg) {
    const w = ctx.measureText(text).width + 12;
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(x0 - (align === 'left' ? 6 : 0), y - size * 0.8, w, size * 1.6, 6);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function arrow(ctx, x1, y1, x2, y2, color = '#ffb547', width = 2) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 9 * Math.cos(a - 0.4), y2 - 9 * Math.sin(a - 0.4));
  ctx.lineTo(x2 - 9 * Math.cos(a + 0.4), y2 - 9 * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fill();
}

// Ventana de lección con pestañas. Cada pestaña es una función (modal) => { el, dispose }.
import { h } from '../../utils/dom.js';
import { openModal } from '../modal.js';

export function openTabbedLesson(title, tabs, { initial = 0 } = {}) {
  let current = null;
  const modal = openModal({ title, body: h('div'), className: 'wide', onClose: () => current?.dispose?.() });
  const bar = h('div', { class: 'lesson-tabs' });
  const content = h('div');
  const select = (i) => {
    current?.dispose?.();
    current = tabs[i][1](modal);
    content.replaceChildren(current.el);
    [...bar.children].forEach((b, j) => b.classList.toggle('active', i === j));
  };
  tabs.forEach(([name], i) => bar.append(h('button', { class: 'btn small', onclick: () => select(i) }, name)));
  modal.setBody(tabs.length > 1 ? [bar, content] : [content]);
  select(initial);
  return modal;
}
