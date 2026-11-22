// Calidad automática: mide los fps y ajusta la resolución interna y el nivel de calidad.
import { TIERS } from './renderer.js';

const WINDOW = 2; // segundos por medición
const MIN_SCALE = 0.6;

export function createPerfMonitor({ startTier = 'media', onChange }) {
  let tier = TIERS.includes(startTier) ? startTier : 'media';
  let maxTierIdx = TIERS.length - 1; // si se baja de nivel, no se vuelve a subir en esta sesión
  let scale = 1;
  let ceiling = 1;
  let frames = 0, time = 0, fps = 0, cooldown = 2, goodTime = 0;

  function change(next) {
    onChange?.({ tier, scale, ...next });
    cooldown = 3;
    goodTime = 0;
  }

  return {
    get tier() { return tier; },
    get scale() { return scale; },
    get fps() { return fps; },
    // Olvida la medición en curso (tras un cambio de calidad, ventanas, carga…).
    reset() { frames = 0; time = 0; cooldown = Math.max(cooldown, 1); },
    // dt: segundos reales del fotograma. auto: si la calidad automática está activa.
    tick(dt, { measure = true, auto = true } = {}) {
      if (!measure || dt > 0.25 || dt <= 0) { frames = 0; time = 0; return; }
      frames++;
      time += dt;
      if (time < WINDOW) return;
      fps = frames / time;
      const elapsed = time;
      frames = 0;
      time = 0;
      cooldown -= elapsed;
      if (!auto || cooldown > 0) return;
      const idx = TIERS.indexOf(tier);
      if (fps < 45) {
        if (scale > MIN_SCALE + 0.01) {
          ceiling = Math.max(MIN_SCALE, scale - 0.05);
          scale = Math.max(MIN_SCALE, scale - 0.15);
          change({ reason: 'scale' });
        } else if (fps < 40 && idx > 0) {
          maxTierIdx = idx - 1;
          tier = TIERS[idx - 1];
          scale = 1;
          ceiling = 1;
          change({ reason: 'tier' });
        }
      } else if (fps > 57) {
        goodTime += elapsed;
        if (scale < ceiling - 0.01 && goodTime >= 6) {
          scale = Math.min(ceiling, scale + 0.1);
          change({ reason: 'scale' });
        } else if (scale >= 0.99 && idx < maxTierIdx && goodTime >= 10) {
          tier = TIERS[idx + 1];
          change({ reason: 'tier' });
        }
      } else {
        goodTime = 0;
      }
    },
  };
}
