// Nave espacial procedural: fuselaje metálico, cabina de cristal, alas, motores con llama.
import * as THREE from 'three';
import { OUTPUT_CHUNKS } from '../scene/shaders.js';

export function createShip(envMap) {
  const root = new THREE.Group(); // marco de vuelo (morro hacia −Z)
  const model = new THREE.Group(); // modelo visual (se inclina al girar)
  root.add(model);

  const hull = new THREE.MeshStandardMaterial({ color: 0xc9d0da, metalness: 0.6, roughness: 0.32, envMap, envMapIntensity: 0.35, emissive: 0x05070b });
  const accent = new THREE.MeshStandardMaterial({ color: 0xf05a14, metalness: 0.35, roughness: 0.4, envMap, envMapIntensity: 0.3, emissive: 0x0a0300 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x3a4250, metalness: 0.8, roughness: 0.35, envMap, envMapIntensity: 0.35 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0d2a4a, metalness: 0.1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, envMap, envMapIntensity: 0.8, emissive: 0x06182c });

  // Fuselaje (torno): de la cola (abajo) al morro (arriba) y girado para que el morro mire a −Z.
  const profile = [[0, -0.5], [0.1, -0.49], [0.14, -0.4], [0.16, -0.15], [0.155, 0.12], [0.12, 0.32], [0.065, 0.47], [0.02, 0.55], [0, 0.56]].map(([r, y]) => new THREE.Vector2(r, y));
  const fuselageGeo = new THREE.LatheGeometry(profile, 40);
  fuselageGeo.rotateX(-Math.PI / 2);
  const fuselage = new THREE.Mesh(fuselageGeo, hull);
  model.add(fuselage);

  // Franja de color
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.162, 0.05, 40, 1, true), accent);
  band.rotation.x = Math.PI / 2;
  band.position.z = 0.02;
  model.add(band);
  const noseBand = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.142, 0.04, 40, 1, true), accent);
  noseBand.rotation.x = Math.PI / 2;
  noseBand.position.z = -0.3;
  model.add(noseBand);

  // Cabina
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 16), glass);
  canopy.scale.set(0.95, 0.7, 2.1);
  canopy.position.set(0, 0.1, -0.16);
  model.add(canopy);

  // Alas (forma en flecha), extruidas y colocadas en horizontal.
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0.1, 0.16);
  wingShape.lineTo(0.66, -0.2);
  wingShape.lineTo(0.68, -0.31);
  wingShape.lineTo(0.1, -0.36);
  wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
  wingGeo.rotateX(-Math.PI / 2);
  wingGeo.translate(0, -0.03, 0);
  const wingR = new THREE.Mesh(wingGeo, hull);
  const wingL = new THREE.Mesh(wingGeo, hull);
  wingL.scale.x = -1;
  model.add(wingR, wingL);
  // Puntas de ala de color
  const tipGeo = new THREE.BoxGeometry(0.035, 0.05, 0.2);
  const tipR = new THREE.Mesh(tipGeo, accent);
  tipR.position.set(0.675, -0.01, 0.25);
  const tipL = tipR.clone();
  tipL.position.x = -0.675;
  model.add(tipR, tipL);

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
  model.add(new THREE.Mesh(finGeo, accent));

  // Motores
  const engineGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.34, 24);
  engineGeo.rotateX(Math.PI / 2);
  const nozzleGeo = new THREE.CylinderGeometry(0.075, 0.06, 0.06, 24, 1, true);
  nozzleGeo.rotateX(Math.PI / 2);
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.9, 2.2) });
  const flameMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, power: { value: 0.3 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float time; uniform float power; varying vec2 vUv;
      void main(){
        // clamp: con MSAA el borde del cono puede dar vUv.y < 0, y pow(negativo) = NaN (el bloom lo vuelve un cuadrado negro).
        float along = clamp(vUv.y, 0.0, 1.0);
        float flick = 0.85 + 0.15 * sin(time * 40.0 + vUv.x * 30.0);
        vec3 core = vec3(0.9, 1.4, 3.2);
        vec3 edge = vec3(0.2, 0.5, 2.0);
        vec3 col = mix(edge, core, along) * pow(along, 1.6) * power * 1.3 * flick;
        gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
        ${OUTPUT_CHUNKS}
      }`,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const flames = [];
  for (const x of [-0.24, 0.24]) {
    const eng = new THREE.Mesh(engineGeo, darkMetal);
    eng.position.set(x, -0.03, 0.27);
    model.add(eng);
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.18), hull);
    pylon.position.set(x * 0.6, -0.03, 0.25);
    model.add(pylon);
    const nozzle = new THREE.Mesh(nozzleGeo, darkMetal);
    nozzle.position.set(x, -0.03, 0.47);
    model.add(nozzle);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.058, 24), glowMat);
    glow.position.set(x, -0.03, 0.455);
    model.add(glow);
    // Llama: cono que apunta hacia atrás (+Z)
    const flameGeo = new THREE.ConeGeometry(0.055, 1, 20, 1, true);
    flameGeo.translate(0, -0.5, 0);
    flameGeo.rotateX(-Math.PI / 2);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(x, -0.03, 0.47);
    model.add(flame);
    flames.push(flame);
  }

  // Luces de navegación (roja a babor, verde a estribor)
  const navR = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 3, 0.6) }));
  navR.position.set(0.69, 0.02, 0.2);
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.3, 0.3) }));
  navL.position.set(-0.69, 0.02, 0.2);
  model.add(navR, navL);

  // Luz suave propia para que la nave se vea también en el lado oscuro de los planetas
  const fill = new THREE.PointLight(0x9cc4ff, 0.25, 4, 2);
  fill.position.set(0, 1.2, 1.5);
  root.add(fill);

  return {
    root,
    model,
    setThrust(power, time) {
      flameMat.uniforms.power.value = power;
      flameMat.uniforms.time.value = time;
      for (const f of flames) f.scale.set(1, 1, 0.15 + power * 1.4);
      const blink = Math.sin(time * 4) > 0.6 ? 1 : 0.15;
      navR.material.color.setRGB(0.3 * blink, 3 * blink, 0.6 * blink);
      navL.material.color.setRGB(3 * blink, 0.3 * blink, 0.3 * blink);
    },
  };
}
