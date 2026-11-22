// Nave espacial procedural con tres modelos (caza, cohete y platillo), pinturas, llamas y estela.
import * as THREE from 'three';
import { OUTPUT_CHUNKS } from '../scene/shaders.js';
import { DEFAULT_STYLE, findItem } from './styles.js';

// ---------- Llama de los motores ----------
function makeFlameMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      power: { value: 0.3 },
      core: { value: new THREE.Vector3(0.9, 1.4, 3.2) },
      edge: { value: new THREE.Vector3(0.2, 0.5, 2.0) },
      rainbow: { value: 0 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float time; uniform float power; uniform vec3 core; uniform vec3 edge; uniform float rainbow;
      varying vec2 vUv;
      vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      void main(){
        // clamp: con MSAA el borde del cono puede dar vUv.y < 0, y pow(negativo) = NaN (el bloom lo vuelve un cuadrado negro).
        float along = clamp(vUv.y, 0.0, 1.0);
        float flick = 0.85 + 0.15 * sin(time * 40.0 + vUv.x * 30.0);
        vec3 c1 = core;
        vec3 c2 = edge;
        if (rainbow > 0.5) {
          vec3 hc = hue(fract(time * 0.3 + along * 0.7));
          c1 = hc * 3.0 + 0.4;
          c2 = hc * 1.6;
        }
        vec3 col = mix(c2, c1, along) * pow(along, 1.6) * power * 1.3 * flick;
        gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
        ${OUTPUT_CHUNKS}
      }`,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

// ---------- Estela (partículas en coordenadas del mundo) ----------
const TRAIL_N = 320;
function makeTrail() {
  const positions = new Float32Array(TRAIL_N * 3);
  const colors = new Float32Array(TRAIL_N * 3);
  const sizes = new Float32Array(TRAIL_N);
  const vel = new Float32Array(TRAIL_N * 3);
  const age = new Float32Array(TRAIL_N).fill(99);
  const life = new Float32Array(TRAIL_N).fill(1);
  const hueOf = new Float32Array(TRAIL_N);
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
        gl_PointSize = clamp(aSize * (320.0 / max(0.01, -mv.z)), 1.0, 40.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = 1.0 - smoothstep(0.0, 0.5, d);
        gl_FragColor = vec4(max(vColor * a, vec3(0.0)), 1.0);
        ${OUTPUT_CHUNKS}
      }`,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.visible = false;
  let next = 0;
  let carry = 0;
  let def = null;
  const tmpColor = new THREE.Color();
  return {
    points,
    set(trailDef) {
      def = trailDef && trailDef.id !== 'ninguna' ? trailDef : null;
      points.visible = !!def;
      age.fill(99);
    },
    // emitters: posiciones de los motores en el mundo; back: dirección hacia atrás de la nave.
    update(dt, time, power, emitters, back) {
      if (!def || dt <= 0) return;
      carry += dt * (40 + power * 160);
      while (carry >= 1 && emitters.length) {
        carry -= 1;
        const i = next;
        next = (next + 1) % TRAIL_N;
        const e = emitters[i % emitters.length];
        const j = i * 3;
        positions[j] = e.x + (Math.random() - 0.5) * 0.05;
        positions[j + 1] = e.y + (Math.random() - 0.5) * 0.05;
        positions[j + 2] = e.z + (Math.random() - 0.5) * 0.05;
        const sp = 0.8 + Math.random() * 0.8;
        vel[j] = back.x * sp + (Math.random() - 0.5) * 0.3;
        vel[j + 1] = back.y * sp + (Math.random() - 0.5) * 0.3;
        vel[j + 2] = back.z * sp + (Math.random() - 0.5) * 0.3;
        age[i] = 0;
        life[i] = def.life * (0.7 + Math.random() * 0.6);
        sizes[i] = def.size * (0.6 + Math.random() * 0.8);
        hueOf[i] = (time * 0.25) % 1;
      }
      for (let i = 0; i < TRAIL_N; i++) {
        const j = i * 3;
        if (age[i] >= life[i]) { colors[j] = colors[j + 1] = colors[j + 2] = 0; continue; }
        age[i] += dt;
        positions[j] += vel[j] * dt;
        positions[j + 1] += vel[j + 1] * dt;
        positions[j + 2] += vel[j + 2] * dt;
        const f = Math.max(0, 1 - age[i] / life[i]);
        if (def.rainbow) {
          tmpColor.setHSL((hueOf[i] + age[i] * 0.4) % 1, 1, 0.6);
          colors[j] = tmpColor.r * 1.8 * f; colors[j + 1] = tmpColor.g * 1.8 * f; colors[j + 2] = tmpColor.b * 1.8 * f;
        } else {
          colors[j] = def.color[0] * f; colors[j + 1] = def.color[1] * f; colors[j + 2] = def.color[2] * f;
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.attributes.aSize.needsUpdate = true;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

// ---------- Modelos (morro hacia −Z) ----------
function navLight(color, x, y, z, r = 0.018) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(...color) }));
  mesh.position.set(x, y, z);
  return { mesh, color };
}

function buildCaza(m) {
  const g = new THREE.Group();
  const profile = [[0, -0.5], [0.1, -0.49], [0.14, -0.4], [0.16, -0.15], [0.155, 0.12], [0.12, 0.32], [0.065, 0.47], [0.02, 0.55], [0, 0.56]].map(([r, y]) => new THREE.Vector2(r, y));
  const fuselageGeo = new THREE.LatheGeometry(profile, 40);
  fuselageGeo.rotateX(-Math.PI / 2);
  g.add(new THREE.Mesh(fuselageGeo, m.hull));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.162, 0.05, 40, 1, true), m.accent);
  band.rotation.x = Math.PI / 2;
  band.position.z = 0.02;
  const noseBand = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.142, 0.04, 40, 1, true), m.accent);
  noseBand.rotation.x = Math.PI / 2;
  noseBand.position.z = -0.3;
  g.add(band, noseBand);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 16), m.glass);
  canopy.scale.set(0.95, 0.7, 2.1);
  canopy.position.set(0, 0.1, -0.16);
  g.add(canopy);
  // Alas en flecha
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0.1, 0.16);
  wingShape.lineTo(0.66, -0.2);
  wingShape.lineTo(0.68, -0.31);
  wingShape.lineTo(0.1, -0.36);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
  wingGeo.rotateX(-Math.PI / 2);
  wingGeo.translate(0, -0.03, 0);
  const wingR = new THREE.Mesh(wingGeo, m.hull);
  const wingL = new THREE.Mesh(wingGeo, m.hull);
  wingL.scale.x = -1;
  g.add(wingR, wingL);
  const tipGeo = new THREE.BoxGeometry(0.035, 0.05, 0.2);
  const tipR = new THREE.Mesh(tipGeo, m.accent);
  tipR.position.set(0.675, -0.01, 0.25);
  const tipL = new THREE.Mesh(tipGeo, m.accent);
  tipL.position.set(-0.675, -0.01, 0.25);
  g.add(tipR, tipL);
  // Aleta de cola
  const finShape = new THREE.Shape();
  finShape.moveTo(-0.46, 0.06);
  finShape.lineTo(-0.2, 0.06);
  finShape.lineTo(-0.36, 0.3);
  finShape.lineTo(-0.47, 0.3);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
  finGeo.rotateY(Math.PI / 2);
  finGeo.translate(-0.009, 0, 0);
  g.add(new THREE.Mesh(finGeo, m.accent));
  // Motores
  const engineGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.34, 24);
  engineGeo.rotateX(Math.PI / 2);
  const nozzleGeo = new THREE.CylinderGeometry(0.075, 0.06, 0.06, 24, 1, true);
  nozzleGeo.rotateX(Math.PI / 2);
  const engines = [];
  for (const x of [-0.24, 0.24]) {
    const eng = new THREE.Mesh(engineGeo, m.darkMetal);
    eng.position.set(x, -0.03, 0.27);
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.18), m.hull);
    pylon.position.set(x * 0.6, -0.03, 0.25);
    const nozzle = new THREE.Mesh(nozzleGeo, m.darkMetal);
    nozzle.position.set(x, -0.03, 0.47);
    g.add(eng, pylon, nozzle);
    engines.push({ x, y: -0.03, z: 0.47, r: 0.058 });
  }
  const lights = [navLight([0.3, 3, 0.6], 0.69, 0.02, 0.2), navLight([3, 0.3, 0.3], -0.69, 0.02, 0.2)];
  return { group: g, engines, lights };
}

function buildCohete(m) {
  const g = new THREE.Group();
  const profile = [[0, -0.5], [0.12, -0.5], [0.16, -0.42], [0.175, -0.15], [0.17, 0.15], [0.145, 0.33], [0.095, 0.47], [0.0, 0.47]].map(([r, y]) => new THREE.Vector2(r, y));
  const bodyGeo = new THREE.LatheGeometry(profile, 48);
  bodyGeo.rotateX(-Math.PI / 2);
  g.add(new THREE.Mesh(bodyGeo, m.hull));
  // Punta de color
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.096, 0.22, 48), m.accent);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.58;
  g.add(nose);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.178, 0.178, 0.06, 48, 1, true), m.accent);
  band.rotation.x = Math.PI / 2;
  band.position.z = 0.1;
  g.add(band);
  // Ojos de buey
  for (const z of [-0.2, 0.0]) {
    const win = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 12), m.glass);
    win.scale.set(1, 1, 0.35);
    win.position.set(0, 0.165, z);
    win.rotation.x = -Math.PI / 2;
    g.add(win);
  }
  // Cuatro aletas en X
  const finShape = new THREE.Shape();
  finShape.moveTo(0.14, 0.12);
  finShape.lineTo(0.36, 0.34);
  finShape.lineTo(0.37, 0.56);
  finShape.lineTo(0.15, 0.44);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
  finGeo.rotateX(Math.PI / 2);
  finGeo.translate(0, 0.01, 0);
  const lights = [];
  [0, 1, 2, 3].forEach((k) => {
    const fin = new THREE.Mesh(finGeo, m.accent);
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    fin.rotation.z = a;
    g.add(fin);
    if (k === 0 || k === 2) {
      const tip = new THREE.Vector3(0.37, 0, 0.5).applyAxisAngle(new THREE.Vector3(0, 0, 1), a);
      lights.push(navLight(k === 0 ? [0.3, 3, 0.6] : [3, 0.3, 0.3], tip.x, tip.y, tip.z, 0.02));
    }
  });
  // Tobera
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.1, 32, 1, true), m.darkMetal);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.z = 0.53;
  g.add(nozzle);
  return { group: g, engines: [{ x: 0, y: 0, z: 0.58, r: 0.115 }], lights };
}

function buildPlatillo(m) {
  const g = new THREE.Group();
  const profile = [[0, -0.1], [0.25, -0.09], [0.48, -0.035], [0.56, 0], [0.48, 0.04], [0.25, 0.075], [0, 0.085]].map(([r, y]) => new THREE.Vector2(r, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 64), m.hull));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.022, 12, 72), m.accent);
  rim.rotation.x = Math.PI / 2;
  g.add(rim);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), m.glass);
  dome.position.y = 0.06;
  g.add(dome);
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.06, 32), m.darkMetal);
  belly.position.y = -0.11;
  g.add(belly);
  // Luces del borde (parpadean alternas)
  const lights = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    lights.push(navLight(k % 2 ? [3, 2.4, 0.4] : [0.4, 2.6, 3], Math.cos(a) * 0.56, 0.0, Math.sin(a) * 0.56, 0.022));
  }
  // Dos propulsores traseros
  const engines = [];
  const housingGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.16, 20);
  housingGeo.rotateX(Math.PI / 2);
  for (const x of [-0.17, 0.17]) {
    const hsg = new THREE.Mesh(housingGeo, m.darkMetal);
    hsg.position.set(x, -0.02, 0.5);
    g.add(hsg);
    engines.push({ x, y: -0.02, z: 0.58, r: 0.05 });
  }
  return { group: g, engines, lights };
}

const BUILDERS = { caza: buildCaza, cohete: buildCohete, platillo: buildPlatillo };

function disposeTree(obj) {
  obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.isMesh && o.material?.isMeshBasicMaterial && o.userData.own) o.material.dispose(); });
}

export function createShip(envMap, style = DEFAULT_STYLE) {
  const root = new THREE.Group(); // marco de vuelo (morro hacia −Z)
  const model = new THREE.Group(); // modelo visual (se inclina al girar)
  root.add(model);

  const mats = {
    hull: new THREE.MeshStandardMaterial({ color: 0xc9d0da, metalness: 0.6, roughness: 0.32, envMap, envMapIntensity: 0.35, emissive: 0x05070b }),
    accent: new THREE.MeshStandardMaterial({ color: 0xf05a14, metalness: 0.35, roughness: 0.4, envMap, envMapIntensity: 0.3, emissive: 0x0a0300 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x3a4250, metalness: 0.8, roughness: 0.35, envMap, envMapIntensity: 0.35 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0d2a4a, metalness: 0.1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, envMap, envMapIntensity: 0.8, emissive: 0x06182c }),
  };
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.9, 2.2) });
  const flameMat = makeFlameMaterial();
  const trail = makeTrail();

  // Luz suave propia para que la nave se vea también en el lado oscuro de los planetas
  const fill = new THREE.PointLight(0x9cc4ff, 0.25, 4, 2);
  fill.position.set(0, 1.2, 1.5);
  root.add(fill);

  let built = null;
  let current = { ...DEFAULT_STYLE };
  let flameDef = findItem('flame', 'azul');

  function build(modelId) {
    if (built) { model.remove(built.group); disposeTree(built.group); }
    const b = (BUILDERS[modelId] || buildCaza)(mats);
    const flames = [];
    for (const e of b.engines) {
      const glow = new THREE.Mesh(new THREE.CircleGeometry(e.r, 24), glowMat);
      glow.position.set(e.x, e.y, e.z - 0.015);
      const flameGeo = new THREE.ConeGeometry(e.r * 0.95, 1, 20, 1, true);
      flameGeo.translate(0, -0.5, 0);
      flameGeo.rotateX(-Math.PI / 2);
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(e.x, e.y, e.z);
      flame.userData.r = e.r;
      b.group.add(glow, flame);
      flames.push(flame);
    }
    for (const l of b.lights) { l.mesh.userData.own = true; b.group.add(l.mesh); }
    model.add(b.group);
    built = { ...b, flames };
  }

  function setStyle(s = {}) {
    const next = {};
    for (const k of Object.keys(DEFAULT_STYLE)) next[k] = s[k] ?? DEFAULT_STYLE[k];
    if (!built || next.model !== current.model) build(next.model);
    const paint = findItem('paint', next.paint);
    mats.hull.color.set(paint.hull);
    mats.accent.color.set(paint.accent);
    mats.hull.metalness = paint.metalness ?? 0.6;
    mats.hull.roughness = paint.roughness ?? 0.32;
    flameDef = findItem('flame', next.flame);
    const u = flameMat.uniforms;
    u.rainbow.value = flameDef.rainbow ? 1 : 0;
    if (!flameDef.rainbow) {
      u.core.value.set(...flameDef.core);
      u.edge.value.set(...flameDef.edge);
      glowMat.color.setRGB(flameDef.core[0] * 0.45, flameDef.core[1] * 0.6, flameDef.core[2] * 0.7);
    }
    trail.set(findItem('trail', next.trail));
    current = next;
  }

  const emitters = [];
  const back = new THREE.Vector3();
  const tmpColor = new THREE.Color();
  setStyle(style);

  return {
    root,
    model,
    trail: trail.points,
    get style() { return { ...current }; },
    setStyle,
    setThrust(power, time, dt = 0) {
      flameMat.uniforms.power.value = power;
      flameMat.uniforms.time.value = time;
      for (const f of built.flames) f.scale.set(1, 1, 0.15 + power * 1.4);
      if (flameDef.rainbow) {
        tmpColor.setHSL((time * 0.3) % 1, 1, 0.6);
        glowMat.color.setRGB(tmpColor.r * 2, tmpColor.g * 2, tmpColor.b * 2);
      }
      // Luces de navegación: parpadeo (en el platillo, alternas)
      built.lights.forEach((l, i) => {
        const on = built.lights.length > 2 ? Math.sin(time * 5 + i * Math.PI) > 0 : Math.sin(time * 4) > 0.6;
        const k = on ? 1 : 0.15;
        l.mesh.material.color.setRGB(l.color[0] * k, l.color[1] * k, l.color[2] * k);
      });
      // Estela
      if (trail.points.visible) {
        model.updateWorldMatrix(true, false);
        emitters.length = 0;
        for (const e of built.engines) emitters.push(new THREE.Vector3(e.x, e.y, e.z + 0.05).applyMatrix4(model.matrixWorld));
        back.set(0, 0, 1).transformDirection(model.matrixWorld);
        trail.update(dt, time, power, emitters, back);
      }
    },
    dispose() {
      disposeTree(model);
      Object.values(mats).forEach((mm) => mm.dispose());
      glowMat.dispose();
      flameMat.dispose();
      trail.dispose();
    },
  };
}
