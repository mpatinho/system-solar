// Hangar: personalizar la nave (modelo, pintura, llama y estela) con vista previa 3D.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { h } from '../utils/dom.js';
import { openModal, toast } from './modal.js';
import { progress, save } from '../utils/storage.js';
import { sfx } from '../utils/audio.js';
import { createShip } from '../ship/ship.js';
import { CATEGORIES, currentStyle, isUnlocked, reqText } from '../ship/styles.js';

function createPreview(canvas, style) {
  const W = 460, H = 300;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050a18);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.AmbientLight(0xbfd4ff, 0.35));
  const key = new THREE.DirectionalLight(0xfff4e6, 2.4);
  key.position.set(3, 4, 2);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6fa8ff, 1.2);
  rim.position.set(-3, 1, -3);
  scene.add(rim);
  // Suelo del hangar: un disco con brillo
  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), new THREE.MeshStandardMaterial({ color: 0x18223d, metalness: 0.6, roughness: 0.5, envMap: env, envMapIntensity: 0.3 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = -0.32;
  scene.add(pad);
  const ship = createShip(env, style);
  scene.add(ship.root, ship.trail);
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.05, 50);
  camera.position.set(1.7, 0.9, 2.2);
  camera.lookAt(0, -0.05, 0);
  let raf = 0;
  let disposed = false;
  let last = performance.now();
  const start = last;
  const frame = (now) => {
    if (disposed) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - start) / 1000;
    ship.root.rotation.y = t * 0.5;
    ship.setThrust(0.75 + Math.sin(t * 2) * 0.15, t, dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    setStyle: (s) => ship.setStyle(s),
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ship.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

function swatch(key, item) {
  if (key === 'model') return h('span', { class: 'sw sw-icon' }, item.icon);
  if (key === 'paint') return h('span', { class: 'sw', style: { background: `linear-gradient(135deg, ${item.hull} 0 58%, ${item.accent} 58% 100%)` } });
  const rgb = (c) => `rgb(${c.map((v) => Math.round(Math.min(1, v / 3.2) * 255)).join(',')})`;
  if (item.rainbow) return h('span', { class: 'sw sw-rainbow' });
  if (key === 'flame') return h('span', { class: 'sw', style: { background: `radial-gradient(circle at 50% 35%, #fff 0 12%, ${rgb(item.core)} 30%, ${rgb(item.edge)} 75%)` } });
  if (!item.color) return h('span', { class: 'sw sw-icon' }, '∅');
  return h('span', { class: 'sw sw-dots', style: { color: rgb(item.color.map((v) => v * 1.8)) } }, '✦✦✦');
}

export function openHangar({ onStyle = () => {}, onClose } = {}) {
  const style = currentStyle(progress);
  const canvas = h('canvas', { class: 'hangar-canvas', width: 460, height: 300 });
  const preview = createPreview(canvas, style);
  const tabs = h('div', { class: 'lesson-tabs' });
  const grid = h('div', { class: 'hangar-grid' });
  const counter = h('div', { class: 'note' });
  let cat = CATEGORIES[0];

  const total = CATEGORIES.reduce((n, c) => n + c.items.length, 0);
  const unlockedCount = () => CATEGORIES.reduce((n, c) => n + c.items.filter((i) => isUnlocked(i, progress)).length, 0);

  function drawGrid() {
    counter.textContent = `Desbloqueado: ${unlockedCount()} de ${total}. ¡Juega, haz el reto del día y sube de rango para conseguir más!`;
    grid.replaceChildren(...cat.items.map((item) => {
      const open = isUnlocked(item, progress);
      const on = style[cat.key] === item.id;
      return h('button', {
        class: `hangar-item ${on ? 'on' : ''} ${open ? '' : 'locked'}`,
        'data-gp-default': on,
        onclick: (e) => choose(item, e.currentTarget),
      },
      swatch(cat.key, item),
      h('span', { class: 'name' }, item.name),
      h('span', { class: 'req' }, open ? (on ? '✓ Puesto' : 'Elegir') : `🔒 ${reqText(item.req)}`));
    }));
  }

  function choose(item, btn) {
    if (!isUnlocked(item, progress)) {
      sfx.wrong?.();
      toast(`🔒 ${reqText(item.req)}`, '', 2600);
      return;
    }
    style[cat.key] = item.id;
    progress.hangar[cat.key] = item.id;
    save();
    sfx.click?.();
    preview.setStyle(style);
    onStyle({ ...style });
    const idx = [...grid.children].indexOf(btn);
    drawGrid();
    grid.children[idx]?.focus({ preventScroll: true });
  }

  function selectTab(i) {
    cat = CATEGORIES[i];
    [...tabs.children].forEach((b, j) => b.classList.toggle('active', i === j));
    drawGrid();
  }
  CATEGORIES.forEach((c, i) => tabs.append(h('button', { class: 'btn small', onclick: () => selectTab(i) }, c.title)));
  selectTab(0);

  return openModal({
    title: '🛠️ Hangar: personaliza tu nave',
    className: 'wide',
    onClose: () => { preview.dispose(); onClose?.(); },
    body: h('div', { class: 'hangar' },
      h('div', { class: 'hangar-view' }, canvas),
      h('div', { class: 'hangar-side' }, tabs, grid, counter)),
  });
}
