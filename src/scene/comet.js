// Cometa con coma brillante y dos colas (polvo e iones) que siempre apuntan lejos del Sol.
import * as THREE from 'three';
import { makeRockGeometry } from './rock.js';
import { makeGlowTexture } from '../utils/procTexture.js';
import { OUTPUT_CHUNKS } from './shaders.js';

const N = 2400;

export function createComet(body) {
  const group = new THREE.Group();
  const nucleus = new THREE.Mesh(
    makeRockGeometry(21, 2, 0.35, [1.6, 0.9, 1]),
    new THREE.MeshStandardMaterial({ color: 0x5b5651, roughness: 1, flatShading: true }),
  );
  nucleus.name = body.id;
  nucleus.scale.setScalar(body.render.radius);
  group.add(nucleus);

  const coma = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(), color: new THREE.Color(1.4, 1.8, 2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  group.add(coma);

  // Partículas de la cola (en coordenadas del mundo).
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const vel = new Float32Array(N * 3);
  const age = new Float32Array(N);
  const life = new Float32Array(N);
  const kind = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    age[i] = Math.random() * 4;
    life[i] = 2 + Math.random() * 2.5;
    kind[i] = i % 3 === 0 ? 1 : 0; // 1 = cola de iones (azul)
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute float aSize; attribute vec3 color; varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(aSize * (320.0 / -mv.z), 1.0, 90.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor * a, 1.0);
        ${OUTPUT_CHUNKS}
      }`,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const tail = new THREE.Points(geo, mat);
  tail.frustumCulled = false;

  const prev = new THREE.Vector3();
  const motion = new THREE.Vector3();
  const anti = new THREE.Vector3();
  let first = true;

  return {
    group,
    tail,
    mesh: nucleus,
    radius: body.render.radius,
    update(simTime, dt, position) {
      nucleus.rotation.y += dt * 0.3;
      nucleus.rotation.x += dt * 0.11;
      if (first) { prev.copy(position); first = false; }
      motion.subVectors(position, prev);
      prev.copy(position);
      const dist = position.length();
      const activity = THREE.MathUtils.clamp((300 - dist) / 230, 0.08, 1);
      coma.scale.setScalar(1.5 + activity * 5);
      coma.material.opacity = 0.35 + activity * 0.65;
      anti.copy(position).normalize();
      for (let i = 0; i < N; i++) {
        const j = i * 3;
        age[i] += dt;
        if (age[i] > life[i]) {
          age[i] = 0;
          const ion = kind[i] === 1;
          const speed = (ion ? 9 : 4.5) * (0.6 + Math.random() * 0.8) * activity;
          positions[j] = position.x + (Math.random() - 0.5) * 0.4;
          positions[j + 1] = position.y + (Math.random() - 0.5) * 0.4;
          positions[j + 2] = position.z + (Math.random() - 0.5) * 0.4;
          const spread = ion ? 0.25 : 0.9;
          vel[j] = anti.x * speed + (Math.random() - 0.5) * spread - (ion ? 0 : motion.x * 3);
          vel[j + 1] = anti.y * speed + (Math.random() - 0.5) * spread - (ion ? 0 : motion.y * 3);
          vel[j + 2] = anti.z * speed + (Math.random() - 0.5) * spread - (ion ? 0 : motion.z * 3);
          sizes[i] = (ion ? 0.5 : 0.9) * (0.6 + Math.random() * 0.8) * (0.4 + activity);
        }
        positions[j] += vel[j] * dt;
        positions[j + 1] += vel[j + 1] * dt;
        positions[j + 2] += vel[j + 2] * dt;
        const f = (1 - age[i] / life[i]) * activity;
        if (kind[i] === 1) { colors[j] = 0.25 * f; colors[j + 1] = 0.55 * f; colors[j + 2] = 1.3 * f; }
        else { colors[j] = 1.0 * f; colors[j + 1] = 0.9 * f; colors[j + 2] = 0.7 * f; }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.attributes.aSize.needsUpdate = true;
    },
  };
}
