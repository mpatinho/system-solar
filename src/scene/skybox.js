// Fondo de estrellas con la Vía Láctea (textura real 8k/4k).
import * as THREE from 'three';
import { tex } from './textures.js';

export function createSkybox(quality) {
  const mat = new THREE.MeshBasicMaterial({
    map: tex(quality === 'alta' ? '8k_stars_milky_way.jpg' : '4k_stars_milky_way.jpg'),
    side: THREE.BackSide,
    depthWrite: false,
    color: new THREE.Color(0.75, 0.75, 0.8),
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(6000, 64, 32), mat);
  mesh.rotation.set(THREE.MathUtils.degToRad(62), 0, THREE.MathUtils.degToRad(-30));
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  let current = quality === 'alta' ? 'alta' : 'media';
  return {
    mesh,
    follow(camera) { mesh.position.copy(camera.position); },
    // La textura de 8k solo con la calidad «Alta» elegida a mano (ocupa mucha memoria de vídeo).
    setQuality(q) {
      const next = q === 'alta' ? 'alta' : 'media';
      if (next === current) return;
      current = next;
      mat.map = tex(next === 'alta' ? '8k_stars_milky_way.jpg' : '4k_stars_milky_way.jpg');
      mat.needsUpdate = true;
    },
  };
}
