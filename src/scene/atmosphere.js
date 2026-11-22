// Halo atmosférico: brillo en el borde del planeta, más intenso en el lado iluminado.
import * as THREE from 'three';
import { WORLD_VERTEX, OUTPUT_CHUNKS } from './shaders.js';

export function makeAtmosphere(radius, { color = [0.4, 0.6, 1], intensity = 1, thickness = 0.06 } = {}) {
  const Ra = radius * (1 + thickness);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      center: { value: new THREE.Vector3() },
      R: { value: radius },
      Ra: { value: Ra },
      color: { value: new THREE.Color(...color) },
      intensity: { value: intensity },
    },
    vertexShader: WORLD_VERTEX,
    fragmentShader: /* glsl */ `
      uniform vec3 center; uniform float R; uniform float Ra; uniform vec3 color; uniform float intensity;
      varying vec3 vPosW;
      void main() {
        vec3 rd = normalize(vPosW - cameraPosition);
        vec3 oc = center - cameraPosition;
        float tca = dot(oc, rd);
        if (tca < 0.0) discard;
        vec3 closest = cameraPosition + rd * tca;
        float h = length(closest - center);
        float a;
        if (h < R) {
          if (!gl_FrontFacing) discard;
          a = pow(h / R, 7.0) * 0.55;
        } else {
          if (gl_FrontFacing) discard;
          float t = clamp((h - R) / (Ra - R), 0.0, 1.0);
          a = pow(1.0 - t, 2.3);
        }
        vec3 n = normalize(closest - center + vec3(1e-6)); // evita normalize(0) = NaN
        vec3 L = normalize(-center);
        float lit = smoothstep(-0.35, 0.55, dot(n, L));
        gl_FragColor = vec4(color * a * lit * intensity, 1.0);
        ${OUTPUT_CHUNKS}
      }`,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(Ra, 64, 32), mat);
  mesh.onBeforeRender = () => mesh.getWorldPosition(mat.uniforms.center.value);
  return mesh;
}
