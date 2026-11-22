// Renderizador, cámara y posprocesado (bloom HDR) con niveles de calidad y presupuesto de píxeles.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// maxPixels limita la resolución interna: en pantallas 4K/6K no se renderizan 20 millones de píxeles.
export const PRESETS = {
  alta: { maxPixels: 2560 * 1440, dprCap: 2, msaa: 4, bloom: 1 },
  media: { maxPixels: 1920 * 1080, dprCap: 1.5, msaa: 2, bloom: 0.5 },
  baja: { maxPixels: 1280 * 720, dprCap: 1, msaa: 0, bloom: 0 },
};
export const TIERS = ['baja', 'media', 'alta'];

export function createRenderer(canvas) {
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
  // EffectComposer llama a setSize con la resolución completa: aquí se aplica la escala del bloom.
  let bloomScale = 1;
  const bloomSetSize = bloom.setSize.bind(bloom);
  bloom.setSize = (w, h) => bloomSetSize(Math.max(2, Math.round(w * bloomScale)), Math.max(2, Math.round(h * bloomScale)));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let preset = PRESETS.alta;
  let tier = 'alta';
  let dynamicScale = 1;
  let pixelRatio = 1;

  function setSamples(n) {
    for (const rt of [composer.renderTarget1, composer.renderTarget2]) {
      if (rt.samples !== n) {
        rt.samples = n;
        rt.dispose(); // se vuelve a crear con el nuevo MSAA en el siguiente fotograma
      }
    }
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const budget = Math.sqrt(preset.maxPixels / Math.max(1, w * h));
    pixelRatio = Math.max(0.25, Math.min(dpr, preset.dprCap, budget) * dynamicScale);
    renderer.setPixelRatio(pixelRatio);
    composer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  function applyQuality(name, scale = 1) {
    tier = PRESETS[name] ? name : 'alta';
    preset = PRESETS[tier];
    dynamicScale = scale;
    bloomScale = preset.bloom || 1;
    bloom.enabled = preset.bloom > 0;
    setSamples(preset.msaa);
    resize();
  }

  // ¿El navegador está pintando sin tarjeta gráfica? (SwiftShader, llvmpipe…)
  function gpuName() {
    try {
      const gl = renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
    } catch {
      return '';
    }
  }
  const gpu = gpuName();
  const softwareRendering = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu);

  applyQuality('alta');

  return {
    renderer,
    scene,
    camera,
    composer,
    bloom,
    applyQuality,
    softwareRendering,
    gpu,
    info: () => ({ tier, scale: dynamicScale, width: renderer.domElement.width, height: renderer.domElement.height, pixelRatio, msaa: composer.renderTarget1.samples, bloom: bloom.enabled }),
    render: () => composer.render(),
  };
}
