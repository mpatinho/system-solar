// Geometría de roca irregular (asteroides, núcleo del cometa, lunas pequeñas).
import * as THREE from 'three';
import { fbm } from '../utils/noise.js';

export function makeRockGeometry(seed = 1, detail = 2, roughness = 0.38, stretch = [1, 1, 1]) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const n = fbm(v.x * 1.6 + seed, v.y * 1.6 + seed * 2, v.z * 1.6 - seed, seed, 4);
    const r = 1 + (n - 0.5) * 2 * roughness;
    pos.setXYZ(i, v.x * r * stretch[0], v.y * r * stretch[1], v.z * r * stretch[2]);
  }
  geo.computeVertexNormals();
  return geo;
}
