// Modo Exploración: vuelo libre; al acercarse a un astro aparece su ficha y se gana un sello.
import { h } from '../utils/dom.js';
import { progress, save } from '../utils/storage.js';
import { sfx } from '../utils/audio.js';
import { toast } from '../ui/modal.js';
import { state } from '../state.js';
import { BODIES } from '../data/bodies.js';
import { createProximityInfo } from './proximity.js';

export function createExploration(game) {
  const { hud, info } = game;
  const proximity = createProximityInfo(info);

  const refreshBadge = () => hud.setExtra(h('span', null, '🛂 ', Object.keys(progress.visited).length, '/', BODIES.length, ' sellos'));

  return {
    id: 'explore',
    enter() {
      hud.setMode('explore');
      hud.clearObjective();
      hud.setAnswerPrompt(null);
      game.setTarget(null);
      refreshBadge();
      proximity.reset();
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
        if (!progress.visited[e.id]) {
          progress.visited[e.id] = Date.now();
          save();
          sfx.stamp();
          toast(`🛂 ¡Nuevo sello en tu pasaporte: ${e.body.name}!`, 'gold', 3500);
          refreshBadge();
        }
      }
      proximity.update(near, { canShow: state.modals === 0 });
    },
  };
}
