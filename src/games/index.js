// Pantalla de minijuegos.
import { h } from '../utils/dom.js';
import { openModal } from '../ui/modal.js';
import { progress } from '../utils/storage.js';
import { openAsteroids } from './asteroids.js';
import { openRace, VARIANTS, raceKey } from './race.js';
import { formatSeconds } from './common.js';

export function openGames() {
  const g = progress.games;
  const raceBest = Object.keys(VARIANTS).map((v) => g.race[raceKey(v, false)]).filter(Boolean);
  const m = openModal({
    title: '🕹️ Minijuegos',
    className: 'narrow',
    body: h('div', { class: 'mission-list' },
      h('button', { class: 'mission', 'data-gp-default': true, onclick: () => { m.close(); openAsteroids({ onBack: openGames }); } },
        h('b', null, '☄️ Lluvia de respuestas'),
        h('div', { class: 'note' }, 'Atrapa con tu nave el asteroide con la respuesta correcta.'),
        h('div', { class: 'note' }, g.asteroids.best ? `Récord: ${g.asteroids.best.toLocaleString('es-ES')} puntos` : 'Sin récord todavía')),
      h('button', { class: 'mission', onclick: () => { m.close(); openRace({ onBack: openGames }); } },
        h('b', null, '🏁 Carrera de planetas'),
        h('div', { class: 'note' }, 'Ordena los planetas contrarreloj: desde el Sol o por tamaño.'),
        h('div', { class: 'note' }, raceBest.length ? `Mejor tiempo: ${formatSeconds(Math.min(...raceBest))}` : 'Sin récord todavía'))),
  });
  return m;
}
