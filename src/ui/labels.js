// Etiquetas con el nombre de cada astro, proyectadas sobre la escena 3D.
import * as THREE from 'three';
import { h } from '../utils/dom.js';

export function createLabels(container, system, camera, onClick) {
  const v = new THREE.Vector3();
  const up = new THREE.Vector3();
  const world = new THREE.Vector3();
  const items = system.list.map((e) => {
    const el = h('div', { class: 'label', title: `Hipersalto a ${e.body.name}` }, e.body.short || e.body.name);
    el.addEventListener('click', (ev) => { ev.stopPropagation(); onClick(e); });
    container.append(el);
    return { e, el, shown: true, visited: false, hl: false };
  });
  const minors = system.minorLabels.map((m) => {
    const el = h('div', { class: 'label minor' }, m.name);
    container.append(el);
    return { m, el, shown: true };
  });

  function place(item, world, offset, show) {
    if (show) {
      v.copy(world).addScaledVector(up, offset).project(camera);
      if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) show = false;
    }
    if (show !== item.shown) { item.el.style.display = show ? '' : 'none'; item.shown = show; }
    if (show) {
      const x = (v.x * 0.5 + 0.5) * innerWidth;
      const y = (-v.y * 0.5 + 0.5) * innerHeight;
      item.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  return {
    update(enabled, visited, highlightId) {
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      for (const it of items) {
        const d = camera.position.distanceTo(it.e.position);
        let show = enabled && d > it.e.radius * 2.2;
        if (it.e.id === 'luna' && d > 140) show = false;
        place(it, it.e.position, it.e.radius * 1.15 + d * 0.012, show);
        const vis = !!visited[it.e.id];
        if (vis !== it.visited) { it.visited = vis; it.el.classList.toggle('visited', vis); }
        const hl = highlightId === it.e.id;
        if (hl !== it.hl) { it.hl = hl; it.el.style.borderColor = hl ? '#ffb547' : ''; }
      }
      for (const it of minors) {
        it.m.object.getWorldPosition(world);
        const d = camera.position.distanceTo(world);
        place(it, world, it.m.radius * 1.3 + d * 0.01, enabled && d < 70);
      }
    },
  };
}
