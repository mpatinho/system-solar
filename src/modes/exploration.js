// Modo Exploración: vuelo libre; al acercarse a un astro aparece su ficha y se gana un sello.
import { h } from '../utils/dom.js';
import { progress, save } from '../utils/storage.js';
import { sfx } from '../utils/audio.js';
import { toast } from '../ui/modal.js';
import { state } from '../state.js';
import { BODIES } from '../data/bodies.js';

export function createExploration(game) {
  const { hud, info } = game;
  let zoneId = null;

  const refreshBadge = () => hud.setExtra(h('span', null, '🛂 ', Object.keys(progress.visited).length, '/', BODIES.length, ' sellos'));

  return {
    id: 'explore',
    enter() {
      hud.setMode('explore');
      hud.clearObjective();
      hud.setAnswerPrompt(null);
      game.setTarget(null);
      refreshBadge();
      zoneId = null;
    },
    exit() {
      info.hide();
    },
    onKey() {},
    update() {
      const near = game.near;
      if (state.autopilot) return;
      if (near.inZone) {
        const e = near.entry;
        if (zoneId !== e.id) {
          zoneId = e.id;
          info.clearDismissed(e.id);
        }
        if (!progress.visited[e.id]) {
          progress.visited[e.id] = Date.now();
          save();
          sfx.stamp();
          toast(`🛂 ¡Nuevo sello en tu pasaporte: ${e.body.name}!`, 'gold', 3500);
          refreshBadge();
        }
        if (!info.isDismissed(e.id) && info.currentId !== e.id && state.modals === 0) info.show(e.body, { visited: true });
      } else if (zoneId) {
        zoneId = null;
        info.hide();
        info.clearDismissed();
      }
    },
  };
}
