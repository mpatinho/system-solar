// Punto de entrada: monta la escena, la nave, la interfaz y el bucle principal.
import './ui/styles.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { state } from './state.js';
import { progress, save } from './utils/storage.js';
import { unlockAudio, updateEngine, silenceEngine, sfx } from './utils/audio.js';
import { createRenderer } from './scene/renderer.js';
import { createSkybox } from './scene/skybox.js';
import { createSolarSystem } from './scene/solarSystem.js';
import { manager } from './scene/textures.js';
import { createShip } from './ship/ship.js';
import { ShipControls } from './ship/controls.js';
import { ChaseCamera } from './ship/camera.js';
import { Autopilot } from './ship/autopilot.js';
import { createHud } from './ui/hud.js';
import { createLabels } from './ui/labels.js';
import { createFlares } from './ui/flares.js';
import { createInfoPanel } from './ui/infoPanel.js';
import { openLesson } from './ui/demos/index.js';
import { closeTopModal, closeAllModals, modalOpen, toast, flash } from './ui/modal.js';
import { showMainMenu, openDestinations, openPassport, openStudySheet, openLessonsList, openOptions, openHelp } from './ui/screens.js';
import { createExploration } from './modes/exploration.js';
import { createAdventure } from './modes/adventure.js';
import { runQuiz } from './ui/quiz.js';
import { QUESTION_BY_ID } from './data/questions.js';

const settings = progress.settings;

// ---------- Escena ----------
const canvas = document.getElementById('scene');
const { renderer, scene, camera, applyQuality, render } = createRenderer(canvas, settings.quality);
scene.add(new THREE.AmbientLight(0xbfd4ff, 0.05));
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const sky = createSkybox(settings.quality);
scene.add(sky.mesh);
const system = createSolarSystem(scene, { quality: settings.quality, envMap });

const ship = createShip(envMap);
scene.add(ship.root);
const controls = new ShipControls(ship);
const chase = new ChaseCamera(camera, ship, canvas);
const autopilot = new Autopilot(ship, controls, chase, camera);

// ---------- Interfaz ----------
const info = createInfoPanel({ onLesson: (id) => openLesson(id) });
const hud = createHud({ onButton: handleButton });
const labels = createLabels(document.getElementById('labels'), system, camera, (entry) => {
  if (state.mode !== 'menu' && !modalOpen()) hyperjump(entry.id);
});
const flares = createFlares(document.getElementById('flares'), camera, system);

let target = null;
const game = {
  system, ship, controls, chase, autopilot, hud, info, camera,
  near: { entry: null, inZone: false, distance: Infinity },
  setTarget(e) { target = e; },
  hyperjump,
};
const modes = { explore: createExploration(game), adventure: createAdventure(game) };
let mode = null;

function hyperjump(id) {
  const entry = system.get(id);
  if (!entry || autopilot.active) return;
  info.hide();
  sfx.warp();
  state.autopilot = true;
  autopilot.start(entry, system, () => {
    state.autopilot = false;
    flash();
  });
}

function handleButton(id) {
  if (autopilot.active && id !== 'menu') return;
  switch (id) {
    case 'destinos': openDestinations((bodyId) => hyperjump(bodyId)); break;
    case 'misiones': modes.adventure.openBoard(); break;
    case 'pasaporte': openPassport(); break;
    case 'lecciones': openLessonsList(); break;
    case 'chuleta': openStudySheet(); break;
    case 'opciones': openOptions({ onChange: applySettings }); break;
    case 'ayuda': openHelp(); break;
    case 'menu': goToMenu(); break;
    default:
  }
}

function applySettings() {
  applyQuality(settings.quality);
  sky.setQuality(settings.quality);
  system.setQuality(settings.quality);
  system.orbitLines.visible = settings.orbits;
}

// ---------- Posición inicial: junto a la Tierra ----------
function placeShipNear(id) {
  system.update(state.simTime, 0, 0);
  const entry = system.get(id);
  const p = autopilot.arrivalPoint(entry, system, new THREE.Vector3());
  ship.root.position.copy(p);
  ship.root.quaternion.copy(autopilot.lookAtQuat(p, entry.position));
  controls.stop();
  chase.snap();
}

// ---------- Modos ----------
let menuEl = null;
function startMode(name) {
  closeAllModals();
  menuEl?.remove();
  menuEl = null;
  mode?.exit();
  state.mode = name;
  mode = modes[name];
  hud.show(true);
  unlockAudio();
  mode.enter();
  if (!settings.helpSeen) {
    settings.helpSeen = true;
    save();
    openHelp();
  }
}

function goToMenu() {
  closeAllModals();
  autopilot.cancel();
  state.autopilot = false;
  mode?.exit();
  mode = null;
  state.mode = 'menu';
  hud.show(false);
  info.hide();
  silenceEngine();
  menuEl?.remove();
  menuEl = showMainMenu({
    onExplore: () => startMode('explore'),
    onAdventure: () => startMode('adventure'),
  });
}

// ---------- Teclado ----------
window.addEventListener('keydown', (e) => {
  unlockAudio();
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === 'Escape') {
    if (closeTopModal()) return;
    if (info.currentId) { info.hide(); return; }
    return;
  }
  if (state.mode === 'menu' || modalOpen() || e.repeat) return;
  switch (e.code) {
    case 'KeyM': if (!autopilot.active) openDestinations((id) => hyperjump(id)); break;
    case 'KeyP': if (state.mode === 'explore') openPassport(); break;
    case 'KeyL': openLessonsList(); break;
    case 'KeyH': openHelp(); break;
    default: mode?.onKey(e.code);
  }
});
window.addEventListener('pointerdown', unlockAudio);

// ---------- Colisiones ----------
let lastWarn = 0;
const tmp = new THREE.Vector3();
function collide(time) {
  for (const e of system.list) {
    if (e.id === 'voyager' || e.id === 'cometa') continue;
    tmp.subVectors(ship.root.position, e.position);
    const d = tmp.length();
    if (d < e.collide) {
      ship.root.position.copy(e.position).addScaledVector(tmp.normalize(), e.collide);
      if (controls.speed > 0) controls.speed = Math.min(controls.speed, 2);
      if (time - lastWarn > 4) {
        lastWarn = time;
        const b = e.body;
        const msg = e.id === 'sol'
          ? '🔥 ¡Demasiado calor! El Sol está a 5.500 °C: los escudos térmicos te alejan.'
          : b.group === 'gaseoso'
            ? `⚠️ ${b.name} es gaseoso: ¡no tiene suelo donde aterrizar!`
            : `⚠️ ¡Cuidado! Casi chocas con ${b.short || b.name}.`;
        toast(msg, 'bad', 3200);
        sfx.alarm();
      }
    }
  }
}

// ---------- Bucle principal ----------
const clock = new THREE.Clock();
let elapsed = 0;
function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  elapsed += dt;
  const inGame = state.mode !== 'menu';
  const timeScale = inGame ? settings.timeScale : 1;
  state.simTime += dt * timeScale;

  system.update(state.simTime, dt, elapsed);
  system.orbitLines.visible = settings.orbits;

  // La nave «viaja» con el astro cercano para no quedarse atrás mientras orbita.
  game.near = system.nearest(ship.root.position);
  const near = game.near.entry;
  if (near && near.id !== 'sol' && !autopilot.active && game.near.distance < near.zone * 1.3) ship.root.position.add(near.delta);

  let power = 0.15;
  let turbo = false;
  const ap = autopilot.update(dt);
  if (ap) {
    power = ap.thrust;
  } else if (inGame) {
    const c = controls.update(dt);
    power = 0.15 + Math.min(1.4, c.throttle * (c.turbo ? 1.5 : 1));
    turbo = c.turbo;
    collide(elapsed);
  }
  ship.setThrust(power, elapsed);

  if (!inGame) {
    chase.yaw += dt * 0.08; // giro lento de cámara en el menú
    chase.pitch = 0.18;
  }
  chase.update(dt, inGame ? controls.speed : 0);
  sky.follow(camera);

  labels.update(inGame && settings.labels, progress.visited, target?.id);
  flares.update(dt);
  if (inGame) {
    hud.update({ speed: autopilot.active ? controls.turboSpeed : controls.speed, max: controls.turboSpeed, turbo, near: game.near, autopilot: autopilot.active });
    hud.updateTarget(target && !modalOpen() ? target : null, camera, ship.root.position);
    mode?.update(dt);
    updateEngine(ap ? 1 : Math.abs(controls.speed) / controls.maxSpeed, turbo || !!ap);
  }
  render();
  requestAnimationFrame(frame);
}

// ---------- Carga ----------
const progressBar = document.getElementById('loading-progress');
const loadingText = document.getElementById('loading-text');
manager.onProgress = (url, loaded, total) => {
  progressBar.style.width = `${Math.round((loaded / total) * 100)}%`;
  loadingText.textContent = `Cargando texturas reales de la NASA… ${loaded}/${total}`;
};
let started = false;
function start() {
  if (started) return;
  started = true;
  placeShipNear('tierra');
  chase.distance = 3.2;
  applySettings();
  document.getElementById('loading').classList.add('done');
  goToMenu();
  // Para depurar desde la consola del navegador
  window.__juego = {
    system, ship, controls, autopilot, state, hyperjump, startMode, progress, openLesson,
    probarPreguntas: (ids) => runQuiz({ title: 'Prueba', questions: ids.map((id) => QUESTION_BY_ID[id]), shields: 3, onFinish: () => {}, onFly: (q, r) => r(q.answer) }),
  };
}
manager.onLoad = start;
manager.onError = (url) => console.warn('No se pudo cargar', url);
setTimeout(start, 15000); // por si alguna textura tarda demasiado
requestAnimationFrame(frame);
