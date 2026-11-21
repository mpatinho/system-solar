// Cinturón de asteroides (miles de rocas instanciadas) y cinturón de Kuiper (puntos helados).
import * as THREE from 'three';
import { makeRockGeometry } from './rock.js';
import { rng } from '../utils/noise.js';
import { visualPeriod } from './orbits.js';

export function createAsteroidBelt({ inner = 172, outer = 214, count = 3000 } = {}) {
  const group = new THREE.Group();
  const rand = rng(42);
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  const mat = new THREE.MeshStandardMaterial({ color: 0x8c8378, roughness: 1, flatShading: true });
  const variants = [makeRockGeometry(3, 1, 0.4), makeRockGeometry(8, 1, 0.45, [1.4, 0.8, 1]), makeRockGeometry(15, 1, 0.35, [1, 0.7, 1.3])];
  const meshes = variants.map((g) => {
    const m = new THREE.InstancedMesh(g, mat, Math.ceil(count / variants.length));
    m.frustumCulled = false;
    return m;
  });
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  meshes.forEach((m, k) => {
    for (let i = 0; i < m.count; i++) {
      const rr = inner + (outer - inner) * (0.5 + gauss() * 0.5);
      const a = rand() * Math.PI * 2;
      dummy.position.set(Math.cos(a) * rr, gauss() * 4, -Math.sin(a) * rr);
      dummy.rotation.set(rand() * 6.3, rand() * 6.3, rand() * 6.3);
      const s = 0.06 + Math.pow(rand(), 3) * 0.55;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      const shade = 0.75 + rand() * 0.5;
      color.setRGB(shade * (0.95 + k * 0.03), shade * 0.92, shade * 0.86);
      m.setColorAt(i, color);
    }
    group.add(m);
  });
  const fullCounts = meshes.map((m) => m.count);
  const period = visualPeriod(1682);

  return {
    group,
    setDensity(fraction) {
      meshes.forEach((m, i) => { m.count = Math.floor(fullCounts[i] * fraction); });
    },
    update(simTime) { group.rotation.y = (simTime / period) * Math.PI * 2; },
  };
}

export function createKuiperBelt({ inner = 585, outer = 760, count = 4000 } = {}) {
  const rand = rng(7);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const rr = inner + (outer - inner) * rand();
    const a = rand() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * rr;
    pos[i * 3 + 1] = (rand() - 0.5) * 50;
    pos[i * 3 + 2] = -Math.sin(a) * rr;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9fb6c8, size: 0.35, sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false }));
  const period = visualPeriod(90000);
  return { group: pts, update(simTime) { pts.rotation.y = (simTime / period) * Math.PI * 2; } };
}
