// Renderizador, cámara y posprocesado (bloom HDR).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function createRenderer(canvas, quality = 'alta') {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 12000);
  scene.add(camera);

  const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.5, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let pixelRatio = 1;
  function applyQuality(q) {
    pixelRatio = q === 'alta' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    renderer.setPixelRatio(pixelRatio);
    composer.setPixelRatio(pixelRatio);
    bloom.enabled = true;
    bloom.resolution.set(innerWidth * (q === 'alta' ? 1 : 0.5), innerHeight * (q === 'alta' ? 1 : 0.5));
    resize();
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  applyQuality(quality);

  return {
    renderer,
    scene,
    camera,
    composer,
    bloom,
    applyQuality,
    render: () => composer.render(),
  };
}
