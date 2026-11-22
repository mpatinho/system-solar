// Monta todo el Sistema Solar y ofrece consultas (astro más cercano, posiciones…).
import * as THREE from 'three';
import { BODIES, BODY_BY_ID } from '../data/bodies.js';
import { Orbit, visualPeriod } from './orbits.js';
import { createSun } from './sun.js';
import { createPlanet, createMoon } from './planets.js';
import { createAsteroidBelt, createKuiperBelt } from './asteroidBelt.js';
import { createComet } from './comet.js';
import { createProbe } from './probe.js';

const SPECIAL_ZONES = { cinturon: 22, cometa: 16, voyager: 16 };
const SPECIAL_ARRIVE = { cinturon: 7, cometa: 7, voyager: 7 };

export function createSolarSystem(scene, { quality = 'alta', envMap } = {}) {
  const entries = new Map();
  const orbitLines = new THREE.Group();
  scene.add(orbitLines);
  const minorLabels = [];

  function addEntry(body, parts, update) {
    const radius = parts.radius;
    const e = {
      id: body.id,
      body,
      radius,
      group: parts.group,
      mesh: parts.mesh,
      position: new THREE.Vector3(),
      delta: new THREE.Vector3(),
      zone: body.id === 'sol' ? radius * 3.5 : SPECIAL_ZONES[body.id] || Math.max(radius * 5 + 5, 8),
      arrive: body.id === 'sol' ? radius * 3 : SPECIAL_ARRIVE[body.id] || radius * 3 + 2.5,
      collide: body.id === 'sol' ? radius * 1.5 : radius * 1.2 + 0.5,
      update,
    };
    entries.set(body.id, e);
    return e;
  }

  // Sol
  const sun = createSun(BODY_BY_ID.sol.render.radius);
  scene.add(sun.group);
  addEntry(BODY_BY_ID.sol, { radius: BODY_BY_ID.sol.render.radius, group: sun.group, mesh: sun.mesh }, (t, dt, time) => sun.update(time));

  // Planetas, Ceres (cinturón) y Plutón
  for (const body of BODIES) {
    if (['sol', 'luna', 'cometa', 'voyager'].includes(body.id)) continue;
    const r = body.render;
    const p = createPlanet(body);
    scene.add(p.group);
    const o = r.orbit || {};
    const orbit = new Orbit({ a: r.distance, e: o.e || 0, inc: o.inc || 0, node: o.node || 0, peri: o.peri || 0, period: visualPeriod(r.orbitDays), phase: r.phase || 0 });
    if (body.id !== 'cinturon') orbitLines.add(orbit.makeLine(body.id === 'pluton' ? 0xc9b8a6 : 0x9fc3ff, body.id === 'pluton' ? 0.16 : 0.2));
    const e = addEntry(body, p, (t) => {
      orbit.position(t, e.position);
      p.group.position.copy(e.position);
      p.update(t);
    });
    for (const m of p.moons) minorLabels.push({ name: m.def.name, object: m.mesh, radius: m.def.radius });
  }

  // Luna (alrededor de la Tierra, siempre con la misma cara hacia ella)
  const earth = entries.get('tierra');
  const moonBody = BODY_BY_ID.luna;
  const moon = createMoon(moonBody);
  scene.add(moon.group);
  const moonPeriod = visualPeriod(moonBody.render.orbitDays);
  const moonEntry = addEntry(moonBody, moon, (t) => {
    const a = moonBody.render.phase + (t / moonPeriod) * Math.PI * 2;
    const d = moonBody.render.distance;
    moonEntry.position.set(earth.position.x + Math.cos(a) * d, earth.position.y + Math.sin(a) * 0.35, earth.position.z - Math.sin(a) * d);
    moon.group.position.copy(moonEntry.position);
    moon.group.lookAt(earth.position);
  });

  // Cinturones
  const DENSITY = { alta: 1, media: 0.5, baja: 0.25 };
  const belt = createAsteroidBelt({ count: 3600 });
  belt.setDensity(DENSITY[quality] ?? 0.5);
  scene.add(belt.group);
  const kuiper = createKuiperBelt();
  scene.add(kuiper.group);

  // Cometa Halley
  const cometBody = BODY_BY_ID.cometa;
  const comet = createComet(cometBody);
  scene.add(comet.group, comet.tail);
  const co = cometBody.render.orbit;
  const cometOrbit = new Orbit({ ...co, period: cometBody.render.periodSeconds, phase: cometBody.render.phase });
  orbitLines.add(cometOrbit.makeLine(0xffc98a, 0.12, 720));
  const cometEntry = addEntry(cometBody, comet, (t, dt) => {
    cometOrbit.position(t, cometEntry.position);
    comet.group.position.copy(cometEntry.position);
    comet.update(t, dt, cometEntry.position, viewer);
  });

  // Voyager 1
  const probe = createProbe(BODY_BY_ID.voyager, envMap);
  scene.add(probe.group);
  const probeEntry = addEntry(BODY_BY_ID.voyager, probe, (t, dt, time) => probe.update(t, dt, time));
  probeEntry.position.copy(probe.group.position);

  const list = [...entries.values()];
  const tmp = new THREE.Vector3();
  let viewer = null; // posición de la cámara (para ahorrar trabajo en lo que está lejos)

  return {
    entries,
    list,
    orbitLines,
    minorLabels,
    get(id) { return entries.get(id); },
    setQuality(q) {
      belt.setDensity(DENSITY[q] ?? 0.5);
      comet.setDetail(DENSITY[q] ?? 0.5);
    },
    setViewer(v) { viewer = v; },
    update(simTime, dt, time) {
      for (const e of list) {
        tmp.copy(e.position);
        e.update(simTime, dt, time);
        e.delta.subVectors(e.position, tmp);
      }
      belt.update(simTime);
      kuiper.update(simTime);
    },
    // Astro más cercano en proporción a su «zona» de información.
    nearest(pos) {
      let best = null, bestScore = Infinity;
      for (const e of list) {
        const d = pos.distanceTo(e.position);
        const score = d / e.zone;
        if (score < bestScore) { bestScore = score; best = e; }
      }
      return { entry: best, inZone: bestScore < 1, distance: best ? pos.distanceTo(best.position) : Infinity };
    },
    occluders() { return list.filter((e) => e.id !== 'sol' && e.mesh).map((e) => e.mesh); },
  };
}
