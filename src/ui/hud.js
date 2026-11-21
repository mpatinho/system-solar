// HUD: velocidad, astro cercano, botones, objetivo de misión y flecha hacia el objetivo.
import * as THREE from 'three';
import { h } from '../utils/dom.js';

export function createHud({ onButton }) {
  const root = document.getElementById('hud');
  root.replaceChildren();
  const modeEl = h('span', { class: 'mode' });
  const extraEl = h('span');
  const badge = h('div', { class: 'hud-badge' }, modeEl, extraEl);
  const buttons = h('div', { class: 'hud-buttons' });
  const btn = (id, label, title) => h('button', { class: 'btn small', title, onclick: (e) => { e.currentTarget.blur(); onButton(id); } }, label);
  const BUTTONS = {
    destinos: btn('destinos', '🧭 Destinos', 'Viajar a un astro (M)'),
    misiones: btn('misiones', '🎯 Misiones', 'Ver las misiones'),
    pasaporte: btn('pasaporte', '🛂 Pasaporte', 'Tus sellos de viaje (P)'),
    lecciones: btn('lecciones', '📖 Lecciones', 'Lecciones interactivas (L)'),
    chuleta: btn('chuleta', '📚 Chuleta', 'Resumen para estudiar'),
    opciones: btn('opciones', '⚙️', 'Opciones'),
    ayuda: btn('ayuda', '❓', 'Controles (H)'),
    menu: btn('menu', '🏠', 'Menú principal'),
  };
  root.append(h('div', { class: 'hud-top' }, badge, buttons));

  const speedVal = h('span');
  const speedFill = h('div', { class: 'speed-fill' });
  const speed = h('div', { class: 'speed' }, h('div', { class: 'speed-label' }, h('span', null, 'VELOCIDAD'), speedVal), h('div', { class: 'speed-bar' }, speedFill));
  const nearest = h('div', { class: 'nearest' });
  root.append(h('div', { class: 'hud-bottom' }, speed, nearest));
  root.append(h('div', { class: 'scale-note' }, 'ℹ️ Tamaños y distancias reducidos para poder viajar (los datos de las fichas son los reales)'));
  const hint = h('div', { class: 'hint' }, h('span', { class: 'kbd' }, 'W'), ' acelerar · ', h('span', { class: 'kbd' }, 'A'), h('span', { class: 'kbd' }, 'D'), ' girar · ', h('span', { class: 'kbd' }, '↑'), h('span', { class: 'kbd' }, '↓'), ' morro · ', h('span', { class: 'kbd' }, 'M'), ' destinos · ', h('span', { class: 'kbd' }, 'H'), ' ayuda');
  root.append(hint);
  root.append(h('div', { class: 'crosshair' }));

  const objective = h('div', { class: 'objective hidden' });
  root.append(objective);
  const answerPrompt = h('div', { class: 'answer-prompt hidden' });
  root.append(answerPrompt);
  const arrowWrap = h('div', { class: 'target-arrow hidden' });
  arrowWrap.innerHTML = '<svg class="arrow" viewBox="0 0 44 44"><path d="M22 4 L36 34 L22 27 L8 34 Z" fill="#ffb547" stroke="#2a1300" stroke-width="2"/></svg>';
  const arrowLabel = h('div', { class: 'tlabel' });
  arrowWrap.append(arrowLabel);
  root.append(arrowWrap);
  const targetBox = h('div', { class: 'target-box hidden' });
  root.append(targetBox);

  let lastNearest = '';
  const v = new THREE.Vector3();
  const camDir = new THREE.Vector3();

  return {
    show(on) { root.classList.toggle('hidden', !on); },
    setMode(mode) {
      modeEl.textContent = mode === 'adventure' ? '🚀 MODO AVENTURA' : '🔭 MODO EXPLORACIÓN';
      const ids = mode === 'adventure'
        ? ['misiones', 'destinos', 'lecciones', 'chuleta', 'opciones', 'ayuda', 'menu']
        : ['destinos', 'pasaporte', 'lecciones', 'chuleta', 'opciones', 'ayuda', 'menu'];
      buttons.replaceChildren(...ids.map((id) => BUTTONS[id]));
    },
    setExtra(...nodes) { extraEl.replaceChildren(...nodes); },
    update({ speed: s, max, turbo, near, autopilot }) {
      const pct = Math.min(100, (Math.abs(s) / max) * 100);
      speedFill.style.width = `${pct}%`;
      speedFill.classList.toggle('turbo', !!turbo);
      const label = autopilot ? '⚡ HIPERSALTO' : turbo ? `🔥 TURBO ${Math.round(Math.abs(s) * 1000).toLocaleString('es-ES')} km/s` : `${Math.round(Math.abs(s) * 1000).toLocaleString('es-ES')} km/s`;
      if (speedVal.textContent !== label) speedVal.textContent = label;
      let txt = '';
      if (near?.entry) {
        const name = near.entry.body.name;
        txt = near.inZone ? `📍 Estás junto a: ${name}` : `🔭 Astro más cercano: ${name}`;
      }
      if (txt !== lastNearest) {
        lastNearest = txt;
        nearest.replaceChildren(txt, h('small', null, near?.inZone ? 'Pulsa M para viajar a otro sitio' : 'Acércate para ver su ficha, o pulsa M para un hipersalto'));
      }
    },
    setObjective(title, q, sub) {
      objective.classList.remove('hidden');
      objective.replaceChildren(h('div', { class: 't' }, title), h('div', { class: 'q' }, q), sub ? h('div', { class: 'sub' }, sub) : null);
    },
    clearObjective() { objective.classList.add('hidden'); },
    setAnswerPrompt(text, onClick) {
      if (!text) { answerPrompt.classList.add('hidden'); answerPrompt.dataset.text = ''; return; }
      if (answerPrompt.dataset.text === text) return;
      answerPrompt.dataset.text = text;
      answerPrompt.classList.remove('hidden');
      answerPrompt.replaceChildren(h('span', null, text), h('button', { class: 'btn small primary', onclick: onClick }, 'Elegir (E)'));
    },
    // Flecha en el borde de la pantalla o círculo alrededor del objetivo.
    updateTarget(entry, camera, shipPos) {
      if (!entry) { arrowWrap.classList.add('hidden'); targetBox.classList.add('hidden'); return; }
      v.copy(entry.position).project(camera);
      camera.getWorldDirection(camDir);
      const inFront = camDir.dot(v.clone().set(entry.position.x - camera.position.x, entry.position.y - camera.position.y, entry.position.z - camera.position.z)) > 0;
      const onScreen = inFront && Math.abs(v.x) < 0.9 && Math.abs(v.y) < 0.85;
      if (onScreen) {
        arrowWrap.classList.add('hidden');
        targetBox.classList.remove('hidden');
        const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
        const fovPx = innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
        const r = Math.max(18, Math.min(220, (entry.radius / Math.max(0.1, camera.position.distanceTo(entry.position))) * fovPx * 1.25));
        Object.assign(targetBox.style, { left: `${x - r}px`, top: `${y - r}px`, width: `${r * 2}px`, height: `${r * 2}px` });
      } else {
        targetBox.classList.add('hidden');
        arrowWrap.classList.remove('hidden');
        let dx = v.x, dy = v.y;
        if (!inFront) { dx = -dx; dy = -dy; }
        const a = Math.atan2(dy, dx);
        // Margen mayor abajo y arriba para no tapar los paneles del HUD
        const cx = innerWidth / 2, cy = innerHeight / 2 - 10;
        const mx = innerWidth / 2 - 80;
        const myUp = cy - 170, myDown = innerHeight - cy - 150;
        const sy = Math.sin(a);
        const k = Math.min(mx / Math.abs(Math.cos(a) || 1e-3), (sy > 0 ? myUp : myDown) / Math.abs(sy || 1e-3));
        const x = cx + Math.cos(a) * k, y = cy - sy * k;
        arrowWrap.style.left = `${x}px`;
        arrowWrap.style.top = `${y}px`;
        arrowWrap.querySelector('.arrow').style.transform = `rotate(${-a + Math.PI / 2}rad)`;
        arrowLabel.textContent = `${entry.body.short || entry.body.name}${inFront ? '' : ' (detrás de ti: gira la nave)'}`;
      }
    },
  };
}
