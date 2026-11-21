// Carga de texturas con progreso.
import * as THREE from 'three';

THREE.Cache.enabled = true;
export const manager = new THREE.LoadingManager();
const loader = new THREE.TextureLoader(manager);
const cache = new Map();
const BASE = `${import.meta.env.BASE_URL}textures/`;

export function tex(name, { color = true } = {}) {
  const key = `${name}|${color}`;
  if (cache.has(key)) return cache.get(key);
  const t = loader.load(BASE + name);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

export const textureUrl = (name) => BASE + name;
