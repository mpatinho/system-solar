// Dibuja la Luna en una fase dada, tal y como se ve desde el hemisferio norte (España).
// alpha: 0 = luna nueva, π/2 = cuarto creciente, π = llena, 3π/2 = cuarto menguante.
import { loadImage } from './common.js';

export const PHASE_ANGLES = { nueva: 0, creciente: Math.PI / 2, llena: Math.PI, menguante: (3 * Math.PI) / 2 };

export function phaseName(alpha) {
  const a = ((alpha % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const deg = (a * 180) / Math.PI;
  if (deg < 12 || deg > 348) return 'Luna nueva';
  if (deg < 78) return 'Luna creciente (entre nueva y cuarto creciente)';
  if (deg <= 102) return 'Cuarto creciente';
  if (deg < 168) return 'Gibosa creciente (casi llena)';
  if (deg <= 192) return 'Luna llena';
  if (deg < 258) return 'Gibosa menguante';
  if (deg <= 282) return 'Cuarto menguante';
  return 'Luna menguante (casi nueva)';
}

export function drawMoonPhase(ctx, cx, cy, R, alpha) {
  const img = loadImage('2k_moon.jpg');
  const a = ((alpha % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  if (img.complete && img.naturalWidth) {
    ctx.drawImage(img, img.naturalWidth * 0.25, 0, img.naturalWidth * 0.5, img.naturalHeight, cx - R, cy - R, R * 2, R * 2);
  } else {
    ctx.fillStyle = '#bbb';
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  }
  // Sombra: en creciente la parte oscura está a la izquierda; en menguante, a la derecha.
  const waxing = a <= Math.PI;
  const k = waxing ? a : Math.PI * 2 - a;
  const c = Math.cos(k);
  ctx.translate(cx, cy);
  if (!waxing) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(4,6,12,0.93)';
  ctx.beginPath();
  ctx.arc(0, 0, R + 1, -Math.PI / 2, Math.PI / 2, true);
  ctx.ellipse(0, 0, Math.max(0.01, Math.abs(c) * (R + 1)), R + 1, 0, Math.PI / 2, -Math.PI / 2, c > 0);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
}
