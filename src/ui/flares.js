// Destellos de lente cuando el Sol está en pantalla y no lo tapa ningún planeta.
import * as THREE from 'three';
import { h } from '../utils/dom.js';

const GHOSTS = [
  { t: 0.0, size: 260, color: 'rgba(255,220,170,0.28)' },
  { t: 0.35, size: 60, color: 'rgba(120,200,255,0.22)' },
  { t: 0.62, size: 26, color: 'rgba(255,180,120,0.35)' },
  { t: 1.0, size: 110, color: 'rgba(140,255,200,0.12)' },
  { t: 1.35, size: 44, color: 'rgba(255,140,220,0.18)' },
  { t: 1.75, size: 160, color: 'rgba(120,160,255,0.10)' },
];

export function createFlares(container, camera, system) {
  const els = GHOSTS.map((g) => {
    const el = h('div', { class: 'flare' });
    el.style.width = el.style.height = `${g.size}px`;
    el.style.background = `radial-gradient(circle, ${g.color} 0%, ${g.color.replace(/[\d.]+\)$/, '0)')} 70%)`;
    container.append(el);
    return el;
  });
  const v = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const oc = new THREE.Vector3();
  let current = 0;

  function occluded() {
    dir.copy(system.get('sol').position).sub(camera.position);
    const dist = dir.length();
    dir.divideScalar(dist);
    for (const e of system.list) {
      if (e.id === 'sol' || e.radius < 0.3) continue;
      oc.subVectors(e.position, camera.position);
      const tca = oc.dot(dir);
      if (tca < 0 || tca > dist) continue;
      const d2 = oc.lengthSq() - tca * tca;
      if (d2 < e.radius * e.radius) return true;
    }
    return false;
  }

  return {
    update(dt) {
      v.copy(system.get('sol').position).project(camera);
      let target = 0;
      if (v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 && !occluded()) {
        target = 1 - Math.min(1, Math.hypot(v.x, v.y) * 0.75);
      }
      current += (target - current) * Math.min(1, dt * 8);
      const sx = (v.x * 0.5 + 0.5) * innerWidth, sy = (-v.y * 0.5 + 0.5) * innerHeight;
      const cx = innerWidth / 2, cy = innerHeight / 2;
      els.forEach((el, i) => {
        const g = GHOSTS[i];
        el.style.opacity = current.toFixed(3);
        el.style.left = `${sx + (cx - sx) * g.t * 2}px`;
        el.style.top = `${sy + (cy - sy) * g.t * 2}px`;
      });
    },
  };
}
