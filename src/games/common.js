// Utilidades de los minijuegos: canvas nítido, teclado propio y modo «captura» del mando.

// Canvas a escala del dispositivo; se dibuja en coordenadas lógicas W×H.
export function createCanvas(W, H) {
  const canvas = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.className = 'game-canvas';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas, ctx, W, H };
}

// Teclas mantenidas y pulsadas mientras juegas. Con «capturing» activo, las teclas no llegan al resto del juego
// (Esc no cierra la ventana: lo gestiona el minijuego).
export function createKeys(isCapturing) {
  const held = new Set();
  const hits = new Set();
  const onDown = (e) => {
    if (!isCapturing()) return;
    if (!held.has(e.code)) hits.add(e.code);
    held.add(e.code);
    e.preventDefault();
    e.stopPropagation();
  };
  const onUp = (e) => { held.delete(e.code); };
  window.addEventListener('keydown', onDown, true);
  window.addEventListener('keyup', onUp, true);
  return {
    held: (...codes) => codes.some((c) => held.has(c)),
    hit: (...codes) => { const r = codes.some((c) => hits.has(c)); codes.forEach((c) => hits.delete(c)); return r; },
    clearHits: () => hits.clear(),
    dispose() { window.removeEventListener('keydown', onDown, true); window.removeEventListener('keyup', onUp, true); },
  };
}

// Mientras se juega, la navegación de menús con el mando se desactiva (ver uiNav.js).
export function setCapture(modal, on) {
  modal.el.toggleAttribute('data-gp-capture', on);
}

// Parte un texto en líneas que quepan en maxWidth.
export function wrapText(ctx, text, maxWidth, maxLines = 3) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+\S*$/, '')}…`;
  }
  return lines;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const formatSeconds = (s) => `${s.toFixed(1).replace('.', ',')} s`;
