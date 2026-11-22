// Punto de entrada: monta la escena, la nave, la interfaz y el bucle principal.
import './ui/styles.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { state, on } from './state.js';
import { progress, save } from './utils/storage.js';
import { h } from './utils/dom.js';
import { unlockAudio, updateEngine, silenceEngine, sfx } from './utils/audio.js';
import { createRenderer } from './scene/renderer.js';
import { createPerfMonitor } from './scene/perf.js';
import { createSkybox } from './scene/skybox.js';
import { createSolarSystem } from './scene/solarSystem.js';
import { manager } from './scene/textures.js';
import { createShip } from './ship/ship.js';
import { ShipControls } from './ship/controls.js';
import { ChaseCamera } from './ship/camera.js';
import { Autopilot } from './ship/autopilot.js';
import { pad } from './input/gamepad.js';
import { createUiNav } from './input/uiNav.js';
import { createHud } from './ui/hud.js';
import { createLabels } from './ui/labels.js';
import { createFlares } from './ui/flares.js';
import { createInfoPanel } from './ui/infoPanel.js';
import { openLesson } from './ui/demos/index.js';
import { closeTopModal, closeAllModals, modalOpen, topModal, toast, flash } from './ui/modal.js';
import { showMainMenu, openDestinations, openPassport, openStudySheet, openLessonsList, openOptions, openHelp, openPauseMenu, openReviewFor } from './ui/screens.js';
import { openHangar } from './ui/hangar.js';
import { openGames } from './games/index.js';
import { startDaily, dailyStatus } from './modes/daily.js';
import { currentStyle, newUnlocks } from './ship/styles.js';
import { createExploration } from './modes/exploration.js';
import { createAdventure } from './modes/adventure.js';
import { runQuiz } from './ui/quiz.js';
import { QUESTION_BY_ID } from './data/questions.js';

const settings = progress.settings;
const TIER_NAMES = { alta: 'Alta', media: 'Media', baja: 'Baja' };

// ---------- Escena ----------
const canvas = document.getElementById('scene');
const { renderer, scene, camera, applyQuality, render, info: renderInfo, softwareRendering } = createRenderer(canvas);
const perf = createPerfMonitor({
  startTier: softwareRendering ? 'baja' : settings.autoTier || 'media',
  onChange: ({ tier }) => {
    if (settings.quality !== 'auto') return;
    settings.autoTier = tier;
    save();
    applySettings();
  },
});
const currentTier = () => (settings.quality === 'auto' ? perf.tier : settings.quality);

scene.add(new THREE.AmbientLight(0xbfd4ff, 0.05));
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const sky = createSkybox(settings.quality);
scene.add(sky.mesh);
const system = createSolarSystem(scene, { quality: currentTier(), envMap });
system.setViewer(camera.position);

const ship = createShip(envMap, currentStyle(progress));
scene.add(ship.root, ship.trail);
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
const uiNav = createUiNav(pad);
const fpsEl = h('div', { id: 'fps', class: 'hidden', 'aria-hidden': 'true' });
document.getElementById('app').append(fpsEl);

let target = null;
const game = {
  system, ship, controls, chase, autopilot, hud, info, camera,
  near: { entry: null, inZone: false, distance: Infinity },
  setTarget(e) { target = e; },
  hyperjump,
  openDaily,
};
const modes = { explore: createExploration(game), adventure: createAdventure(game) };
let mode = null;

function hyperjump(id) {
  const entry = system.get(id);
  if (!entry || autopilot.active) return;
  info.hide();
  sfx.warp();
  pad.rumble(0.25, 0.6, 350);
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
    case 'opciones': openOptions({ onChange: applySettings, perfInfo, install }); break;
    case 'reto': openDaily(); break;
    case 'hangar': openHangar({ onStyle: (s) => ship.setStyle(s) }); break;
    case 'juegos': openGames(); break;
    case 'ayuda': openHelp(); break;
    case 'menu': goToMenu(); break;
    default:
  }
}

// ---------- Reto del día, hangar y avisos ----------
function openDaily() {
  if (autopilot.active) return;
  startDaily({ onReview: (q) => openReviewFor(q), onClose: () => { if (state.mode === 'menu') goToMenu(); } });
}

// Lo que se desbloquea en el hangar se anuncia una sola vez.
let unlockTimer = 0;
function checkUnlocks() {
  const news = newUnlocks(progress);
  if (!news.length) return;
  progress.hangar.seen.push(...news.map((n) => n.key));
  save();
  const one = news[0];
  toast(news.length === 1 ? `🎁 ¡Nuevo en el hangar: ${one.category.title.toLowerCase()} «${one.item.name}»!` : `🎁 ¡Tienes ${news.length} cosas nuevas en el hangar! 🛠️`, 'gold', 4500);
}
on('progress', () => {
  clearTimeout(unlockTimer);
  unlockTimer = setTimeout(() => { checkUnlocks(); if (state.mode === 'menu') refreshMenu(); }, 500);
});

// ---------- Instalar como app (PWA) ----------
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
window.addEventListener('appinstalled', () => { installPrompt = null; toast('📲 ¡Instalada! Ya tienes el icono en el escritorio.', 'ok', 4000); });
const install = {
  available: () => !!installPrompt,
  installed: () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true,
  async prompt() { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice.catch(() => {}); installPrompt = null; },
};
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => { /* sin certificado válido: sin modo app */ }));
}

function perfInfo() {
  const i = renderInfo();
  const fps = perf.fps ? `${Math.round(perf.fps)} fps · ` : '';
  return `Ahora: ${fps}${i.width}×${i.height} · ${TIER_NAMES[i.tier]}${settings.quality === 'auto' ? ' (automática)' : ''}`;
}

let applied = '';
function applySettings() {
  const tier = currentTier();
  const scale = settings.quality === 'auto' ? perf.scale : 1;
  const key = `${tier}|${scale}`;
  if (key !== applied) {
    applied = key;
    applyQuality(tier, scale);
    system.setQuality(tier);
    perf.reset();
  }
  sky.setQuality(settings.quality);
  system.orbitLines.visible = settings.orbits;
  controls.invertY = !!settings.invertY;
  fpsEl.classList.toggle('hidden', !settings.showFps);
  ship.setStyle(currentStyle(progress)); // por si se ha borrado el progreso
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
  if (!dailyReminded && !dailyStatus().done) {
    dailyReminded = true;
    setTimeout(() => toast('🔥 ¡Aún no has hecho el reto de hoy! Pulsa «🔥 Reto» arriba.', 'gold', 5000), 1500);
  }
}
let dailyReminded = false;

// Vuelve a dibujar el menú principal (puntos, racha…) sin cerrar las ventanas abiertas.
function refreshMenu() {
  if (!menuEl?.isConnected) return;
  const old = menuEl;
  menuEl = buildMenu();
  old.replaceWith(menuEl);
}

function buildMenu() {
  return showMainMenu({
    onExplore: () => startMode('explore'),
    onAdventure: () => startMode('adventure'),
    onOptions: () => openOptions({ onChange: applySettings, perfInfo, install, onClose: () => { if (state.mode === 'menu') goToMenu(); } }),
    onDaily: openDaily,
    onHangar: () => openHangar({ onStyle: (s) => ship.setStyle(s), onClose: () => { if (state.mode === 'menu') goToMenu(); } }),
    onGames: openGames,
  });
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
  menuEl = buildMenu();
}

// ---------- Teclado ----------
window.addEventListener('keydown', (e) => {
  unlockAudio();
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === 'Escape') {
    if (closeTopModal()) return;
    if (info.currentId) { info.dismiss(); return; }
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

// ---------- Mando ----------
let panelNav = false; // X: el foco entra en la ficha del astro
function navRoot() {
  const m = topModal();
  if (m) return m.el;
  if (menuEl?.isConnected) return menuEl;
  if (panelNav && info.el?.isConnected) return info.el;
  panelNav = false;
  return null;
}

// Devuelve true si el mando está manejando un menú (y no la nave).
function gamepadFrame(dt, inGame) {
  pad.poll(dt);
  if (!pad.connected) return false;
  const root = navRoot();
  uiNav.update(dt, root, { onBack: root && root === info.el ? () => { panelNav = false; } : undefined });
  if (root) {
    if (pad.pressed('A') || pad.pressed('B')) unlockAudio();
    return true;
  }
  if (!inGame) return false;
  if (pad.pressed('A') || pad.pressed('START')) unlockAudio();
  if (pad.pressed('START')) { openPauseMenu({ mode: state.mode, onAction: handleButton }); return true; }
  if (pad.pressed('SELECT')) { openHelp(); return true; }
  if (pad.pressed('Y') && !autopilot.active) { openDestinations((id) => hyperjump(id)); return true; }
  if (pad.pressed('A')) mode?.onKey('KeyE');
  if (pad.pressed('B') && info.currentId) info.dismiss();
  if (pad.pressed('X')) {
    if (info.el) panelNav = true;
    else if (state.mode === 'explore') toast('Acércate a un astro para ver su ficha', '', 1800);
  }
  if (pad.pressed('R3')) chase.reset();
  chase.look(pad.rx, pad.ry, dt);
  if (pad.held('UP')) chase.zoom(Math.exp(-dt * 1.6));
  if (pad.held('DOWN')) chase.zoom(Math.exp(dt * 1.6));
  return false;
}

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
        pad.rumble(0.9, 0.5, 300);
      }
    }
  }
}

// ---------- Bucle principal ----------
const clock = new THREE.Clock();
let elapsed = 0;
let lastRender = -1;
let fpsTimer = 0;
let started = false;
function frame() {
  const rawDt = clock.getDelta();
  const dt = Math.min(0.05, rawDt);
  elapsed += dt;
  const inGame = state.mode !== 'menu';
  const timeScale = inGame ? settings.timeScale : 1;
  state.simTime += dt * timeScale;

  const padInMenu = gamepadFrame(dt, inGame);

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
    const c = controls.update(dt, padInMenu ? null : pad);
    power = 0.15 + Math.min(1.4, c.throttle * (c.turbo ? 1.5 : 1));
    turbo = c.turbo;
    collide(elapsed);
  }
  ship.setThrust(power, elapsed, dt);

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

  // Con una ventana abierta delante, la escena se pinta a ~20 fps: la interfaz va más suelta.
  const throttled = modalOpen();
  if (!throttled || elapsed - lastRender >= 0.05) {
    render();
    lastRender = elapsed;
  }
  perf.tick(rawDt, { measure: started && !throttled && !document.hidden, auto: settings.quality === 'auto' });

  if (settings.showFps) {
    fpsTimer -= dt;
    if (fpsTimer <= 0) {
      fpsTimer = 0.5;
      const i = renderInfo();
      fpsEl.textContent = `${perf.fps ? Math.round(perf.fps) : '…'} fps · ${i.width}×${i.height} · ${TIER_NAMES[i.tier]}`;
    }
  }
  requestAnimationFrame(frame);
}

// ---------- Carga ----------
const progressBar = document.getElementById('loading-progress');
const loadingText = document.getElementById('loading-text');
manager.onProgress = (url, loaded, total) => {
  progressBar.style.width = `${Math.round((loaded / total) * 100)}%`;
  loadingText.textContent = `Cargando texturas reales de la NASA… ${loaded}/${total}`;
};
function start() {
  if (started) return;
  started = true;
  placeShipNear('tierra');
  chase.distance = 3.2;
  applySettings();
  document.getElementById('loading').classList.add('done');
  goToMenu();
  setTimeout(checkUnlocks, 2500);
  if (softwareRendering) {
    toast('⚠️ El navegador está dibujando sin la tarjeta gráfica y todo irá lento. Activa la «aceleración por hardware» en su configuración.', 'bad', 9000);
  }
  // Para depurar desde la consola del navegador
  window.__juego = {
    system, ship, controls, autopilot, state, hyperjump, startMode, progress, openLesson, pad, perf, renderInfo, chase,
    probarPreguntas: (ids) => runQuiz({ title: 'Prueba', questions: ids.map((id) => QUESTION_BY_ID[id]), shields: 3, onFinish: () => {}, onFly: (q, r) => r(q.answer) }),
  };
}
manager.onLoad = start;
manager.onError = (url) => console.warn('No se pudo cargar', url);
setTimeout(start, 15000); // por si alguna textura tarda demasiado
applySettings();
requestAnimationFrame(frame);
