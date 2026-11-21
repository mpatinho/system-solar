// Mini escena 3D (para «¿qué planeta es este?» y la lección de rotación).
import * as THREE from 'three';
import { BODY_BY_ID } from '../../data/bodies.js';
import { createPlanet, createMoon } from '../../scene/planets.js';
import { tex } from '../../scene/textures.js';
import { makeGlowTexture } from '../../utils/procTexture.js';

export function createMini3D(canvas, bodyId, { width = 360, height = 300, viewAngle = 55, spin = 1, distanceFactor = 3.3 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02040a);
  scene.add(new THREE.AmbientLight(0xffffff, 0.08));
  const light = new THREE.PointLight(0xfff4e6, 3.6, 0, 0);
  scene.add(light);
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.05, 1000);

  const body = BODY_BY_ID[bodyId];
  const D = 60;
  let obj;
  let update = () => {};
  if (bodyId === 'sol') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(2, 64, 32), new THREE.MeshBasicMaterial({ map: tex('2k_sun.jpg'), color: new THREE.Color(1.6, 1.3, 1.0) }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(), color: new THREE.Color(1, 0.6, 0.25), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(7);
    obj = new THREE.Group();
    obj.add(m, glow);
    obj.position.set(D, 0, 0);
    update = (t) => { m.rotation.y = t * 0.1; };
    camera.position.set(D, 0.6, 9);
  } else {
    const p = bodyId === 'luna' ? createMoon(body) : createPlanet(body);
    obj = p.group;
    obj.position.set(D, 0, 0);
    const r = p.radius;
    const dist = r * (body.render.rings === 'saturno' ? 6.2 : distanceFactor);
    const ang = THREE.MathUtils.degToRad(viewAngle);
    camera.position.set(D - Math.cos(ang) * dist, r * 0.55, Math.sin(ang) * dist);
    update = (t) => { p.update?.(t * 8 * spin); if (bodyId === 'luna') p.mesh.rotation.y = -Math.PI / 2 + t * 0.2; };
  }
  scene.add(obj);
  camera.lookAt(obj.position);

  let raf = 0;
  let disposed = false;
  const start = performance.now();
  const frame = () => {
    if (disposed) return;
    update((performance.now() - start) / 1000);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  frame();
  return {
    scene,
    camera,
    renderer,
    object: obj,
    setUpdate(fn) { update = fn; },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
