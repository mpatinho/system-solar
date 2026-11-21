// Planetas: material realista, inclinación del eje, rotación, anillos, atmósfera y lunas.
import * as THREE from 'three';
import { tex } from './textures.js';
import { makeAtmosphere } from './atmosphere.js';
import { makeRockGeometry } from './rock.js';
import { makeSphereTexture } from '../utils/procTexture.js';
import { WORLD_VERTEX, OUTPUT_CHUNKS } from './shaders.js';
import { visualRotation } from './orbits.js';

const DEG = Math.PI / 180;

// ---------- Tierra: día/noche con luces de ciudades, océanos que brillan y nubes ----------
export function earthMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      dayMap: { value: tex('2k_earth_daymap.jpg') },
      nightMap: { value: tex('2k_earth_nightmap.jpg') },
      specMap: { value: tex('2k_earth_specular_map.jpg', { color: false }) },
      cloudMap: { value: tex('2k_earth_clouds.jpg', { color: false }) },
      cloudShift: { value: 0 },
    },
    vertexShader: WORLD_VERTEX,
    fragmentShader: /* glsl */ `
      uniform sampler2D dayMap, nightMap, specMap, cloudMap; uniform float cloudShift;
      varying vec2 vUv; varying vec3 vNormalW; varying vec3 vPosW;
      void main() {
        vec3 N = normalize(vNormalW);
        vec3 L = normalize(-vPosW);
        vec3 V = normalize(cameraPosition - vPosW);
        float ndl = dot(N, L);
        float dayF = smoothstep(-0.12, 0.22, ndl);
        vec3 day = texture2D(dayMap, vUv).rgb;
        vec3 night = texture2D(nightMap, vUv).rgb;
        float cloudShadow = texture2D(cloudMap, vUv + vec2(cloudShift - 0.003, 0.0)).r;
        vec3 dayCol = day * (max(ndl, 0.0) * 1.15 + 0.015) * (1.0 - cloudShadow * 0.35);
        vec3 nightCol = night * vec3(1.0, 0.82, 0.55) * 1.6 * (1.0 - cloudShadow * 0.7);
        vec3 col = mix(nightCol, dayCol, dayF);
        float spec = texture2D(specMap, vUv).r;
        vec3 H = normalize(L + V);
        col += vec3(1.0, 0.93, 0.8) * pow(max(dot(N, H), 0.0), 90.0) * spec * 0.3 * dayF;
        gl_FragColor = vec4(col, 1.0);
        ${OUTPUT_CHUNKS}
      }`,
  });
}

// ---------- Anillos (Saturno y Urano) con la sombra del planeta ----------
function ringMaterial(map, R, brightness = 1.1) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ringMap: { value: map }, center: { value: new THREE.Vector3() }, R: { value: R }, brightness: { value: brightness } },
    vertexShader: WORLD_VERTEX,
    fragmentShader: /* glsl */ `
      uniform sampler2D ringMap; uniform vec3 center; uniform float R; uniform float brightness;
      varying vec2 vUv; varying vec3 vPosW;
      void main() {
        vec4 t = texture2D(ringMap, vec2(vUv.x, 0.5));
        vec3 L = normalize(-center);
        vec3 toP = vPosW - center;
        float along = dot(toP, L);
        float shadow = 1.0;
        if (along < 0.0) shadow = smoothstep(R * 0.96, R * 1.04, length(toP - along * L));
        vec3 col = t.rgb * (0.06 + brightness * shadow);
        gl_FragColor = vec4(col, t.a);
        ${OUTPUT_CHUNKS}
      }`,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return mat;
}

function ringGeometry(inner, outer) {
  const geo = new THREE.RingGeometry(inner, outer, 192, 1);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
  }
  geo.rotateX(-Math.PI / 2);
  return geo;
}

function uranusRingTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 4;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 4);
  const rings = [[0.08, 0.012], [0.2, 0.01], [0.32, 0.012], [0.45, 0.01], [0.6, 0.014], [0.93, 0.03]];
  for (const [p, w] of rings) {
    g.fillStyle = 'rgba(190,200,210,0.55)';
    g.fillRect(p * 512, 0, Math.max(2, w * 512), 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeRings(kind, R) {
  if (kind === 'saturno') {
    const map = tex('2k_saturn_ring_alpha.png');
    const m = new THREE.Mesh(ringGeometry(R * 1.24, R * 2.27), ringMaterial(map, R, 1.15));
    m.onBeforeRender = () => m.parent.getWorldPosition(m.material.uniforms.center.value);
    return m;
  }
  const m = new THREE.Mesh(ringGeometry(R * 1.6, R * 2.05), ringMaterial(uranusRingTexture(), R, 0.7));
  m.onBeforeRender = () => m.parent.getWorldPosition(m.material.uniforms.center.value);
  return m;
}

// ---------- Lunas decorativas (Fobos, Ío, Titán…) ----------
let moonSeed = 11;
function makeMoon(def) {
  moonSeed += 7;
  let mesh;
  if (def.rock) {
    mesh = new THREE.Mesh(
      makeRockGeometry(moonSeed, 2, 0.32, [1.3, 0.9, 1]),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${def.colors[1].join(',')})`), roughness: 1, flatShading: true }),
    );
    mesh.scale.setScalar(def.radius);
  } else {
    const map = makeSphereTexture({ width: 256, height: 128, colors: def.colors, scale: 2.5, seed: moonSeed, craters: 18 });
    mesh = new THREE.Mesh(new THREE.SphereGeometry(def.radius, 32, 16), new THREE.MeshStandardMaterial({ map, roughness: 1 }));
  }
  const pivot = new THREE.Group();
  pivot.add(mesh);
  mesh.position.x = def.distance;
  const period = Math.max(5, 14 * Math.sqrt(Math.abs(def.periodDays))) * Math.sign(def.periodDays || 1);
  return { def, pivot, mesh, period, phase: Math.random() * Math.PI * 2 };
}

// ---------- Fábrica de planetas ----------
export function createPlanet(body) {
  const r = body.render;
  const orbitGroup = new THREE.Group(); // se coloca en la órbita
  const tiltGroup = new THREE.Group(); // eje inclinado
  tiltGroup.rotation.z = (r.tilt || 0) * DEG;
  orbitGroup.add(tiltGroup);

  let material;
  let clouds = null;
  if (body.id === 'tierra') {
    material = earthMaterial();
  } else if (body.id === 'pluton') {
    material = new THREE.MeshStandardMaterial({
      map: makeSphereTexture({ width: 512, height: 256, colors: [[70, 45, 35], [140, 100, 75], [200, 170, 140], [235, 225, 210]], scale: 2.6, seed: 5, contrast: 1.8, heart: true, craters: 10 }),
      roughness: 1,
    });
  } else {
    material = new THREE.MeshStandardMaterial({ map: tex(body.texture), roughness: body.group === 'gaseoso' ? 0.9 : 1, metalness: 0 });
  }
  const segs = r.radius > 3 ? 128 : 64;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r.radius, segs, segs / 2), material);
  mesh.name = body.id;
  tiltGroup.add(mesh);

  if (body.id === 'tierra') {
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(r.radius * 1.012, 96, 48),
      new THREE.MeshStandardMaterial({ color: 0xffffff, alphaMap: tex('2k_earth_clouds.jpg', { color: false }), transparent: true, depthWrite: false, roughness: 1, opacity: 0.95 }),
    );
    tiltGroup.add(clouds);
  }
  if (r.rings) tiltGroup.add(makeRings(r.rings, r.radius));
  if (r.atmosphere) tiltGroup.add(makeAtmosphere(r.radius, r.atmosphere));

  const moons = (r.moons || []).map(makeMoon);
  moons.forEach((m) => tiltGroup.add(m.pivot));

  const rotPeriod = visualRotation(r.rotationHours || 24) * (r.retro ? -1 : 1);
  const spinOffset = Math.random() * Math.PI * 2;

  return {
    body,
    group: orbitGroup,
    mesh,
    moons,
    radius: r.radius,
    update(simTime) {
      mesh.rotation.y = spinOffset + (simTime / rotPeriod) * Math.PI * 2;
      if (clouds) {
        clouds.rotation.y = mesh.rotation.y + simTime * 0.004;
        material.uniforms.cloudShift.value = -(simTime * 0.004) / (Math.PI * 2);
      }
      for (const m of moons) m.pivot.rotation.y = m.phase + (simTime / m.period) * Math.PI * 2;
    },
  };
}

// ---------- La Luna (siempre muestra la misma cara a la Tierra) ----------
export function createMoon(body) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(body.render.radius, 64, 32),
    new THREE.MeshStandardMaterial({ map: tex(body.texture), roughness: 1 }),
  );
  mesh.name = body.id;
  mesh.rotation.y = -Math.PI / 2;
  pivot.add(mesh);
  return { body, group: pivot, mesh, radius: body.render.radius, moons: [] };
}
