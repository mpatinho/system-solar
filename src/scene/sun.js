// El Sol: superficie animada (HDR para el bloom), corona y luz.
import * as THREE from 'three';
import { tex } from './textures.js';
import { SIMPLEX_3D, WORLD_VERTEX, OUTPUT_CHUNKS } from './shaders.js';
import { makeGlowTexture } from '../utils/procTexture.js';

export function createSun(radius) {
  const group = new THREE.Group();
  const uniforms = { map: { value: tex('2k_sun.jpg') }, time: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: WORLD_VERTEX,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float time;
      varying vec2 vUv; varying vec3 vNormalW; varying vec3 vPosW;
      ${SIMPLEX_3D}
      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vPosW);
        float n1 = snoise(N * 6.0 + vec3(0.0, time * 0.05, 0.0));
        float n2 = snoise(N * 22.0 - vec3(time * 0.12));
        vec2 uv = vUv + vec2(n1, n2) * 0.004;
        vec3 col = texture2D(map, uv).rgb;
        col *= 0.85 + 0.25 * n1 + 0.15 * n2;
        float mu = clamp(dot(N, V), 0.0, 1.0);
        col *= mix(0.55, 1.0, pow(mu, 0.45));
        col = col * vec3(1.25, 1.0, 0.75) * 1.9;
        gl_FragColor = vec4(col, 1.0);
        ${OUTPUT_CHUNKS}
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), mat);
  group.add(mesh);

  const glowTex = makeGlowTexture(256, [
    [0, 'rgba(255,240,210,1)'],
    [0.18, 'rgba(255,190,90,0.75)'],
    [0.4, 'rgba(255,140,40,0.22)'],
    [1, 'rgba(255,100,20,0)'],
  ]);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.2, 0.9, 0.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  corona.scale.setScalar(radius * 5.2);
  group.add(corona);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.28, 0.18, 0.09), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.setScalar(radius * 14);
  group.add(halo);

  // Luz del Sol: sin atenuación con la distancia para que los planetas lejanos también se vean.
  const light = new THREE.PointLight(0xfff4e6, 3.4, 0, 0);
  group.add(light);

  return {
    group,
    mesh,
    update(time) {
      uniforms.time.value = time;
      mesh.rotation.y = time * 0.01;
    },
  };
}
