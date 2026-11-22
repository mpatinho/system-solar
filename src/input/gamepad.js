// Mando (Gamepad API): se lee una vez por fotograma. Zonas muertas, pulsaciones, repetición y vibración.
// Mapeo «standard» (Chrome, Edge, Firefox en Windows) y respaldo para Firefox en Linux (driver xpad).
import { h } from '../utils/dom.js';
import { toast } from '../ui/modal.js';

const NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'L3', 'R3', 'UP', 'DOWN', 'LEFT', 'RIGHT'];
const DEADZONE = 0.2;
const NAV_DELAY = 0.38;
const NAV_REPEAT = 0.12;

function radial(x, y) {
  const m = Math.hypot(x, y);
  if (m < DEADZONE) return [0, 0];
  const k = Math.min(1, (m - DEADZONE) / (1 - DEADZONE)) / m;
  return [x * k, y * k];
}

class Pad {
  constructor() {
    this.supported = typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function';
    this.connected = false;
    this.index = -1;
    this.cur = Object.fromEntries(NAMES.map((n) => [n, 0]));
    this.prev = { ...this.cur };
    this.lx = 0; this.ly = 0; this.rx = 0; this.ry = 0;
    this.mode = 'kbm'; // 'kbm' (teclado y ratón) o 'pad'
    this.triggerSeen = [false, false];
    this.navDir = null;
    this.navTime = 0;
    this.navFired = null;
    if (!this.supported) return;
    window.addEventListener('gamepadconnected', (e) => {
      toast(`🎮 Mando conectado: ¡ya puedes pilotar con él! (botón ☰ = pausa)`, 'ok', 3200);
      if (this.index < 0) this.index = e.gamepad.index;
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.index === this.index) { this.index = -1; this.connected = false; this.setMode('kbm'); }
      toast('🎮 Mando desconectado', '', 2400);
    });
    // Volver al modo teclado/ratón en cuanto se usan.
    window.addEventListener('keydown', () => this.setMode('kbm'), true);
    window.addEventListener('pointerdown', () => this.setMode('kbm'), true);
    let lx = -1, ly = -1;
    this.mouseTravel = 0;
    window.addEventListener('pointermove', (e) => {
      if (lx >= 0 && this.mode === 'pad') {
        this.mouseTravel += Math.hypot(e.clientX - lx, e.clientY - ly);
        if (this.mouseTravel > 40) this.setMode('kbm');
      }
      lx = e.clientX; ly = e.clientY;
    }, true);
  }

  setMode(m) {
    if (this.mode === m) return;
    this.mode = m;
    this.mouseTravel = 0;
    document.body.classList.toggle('gp-mode', m === 'pad');
  }

  get active() { return this.mode === 'pad'; }

  poll(dt = 0.016) {
    Object.assign(this.prev, this.cur);
    if (!this.supported) return;
    let gp = null;
    let list = [];
    try { list = navigator.getGamepads() || []; } catch { list = []; }
    if (this.index >= 0) gp = list[this.index];
    if (!gp || !gp.connected) {
      gp = [...list].find((g) => g && g.connected && g.mapping === 'standard') || [...list].find((g) => g && g.connected) || null;
      this.index = gp ? gp.index : -1;
    }
    this.connected = !!gp;
    if (!gp) {
      for (const n of NAMES) this.cur[n] = 0;
      this.lx = this.ly = this.rx = this.ry = 0;
      return;
    }
    const b = (i) => (gp.buttons[i] ? gp.buttons[i].value || (gp.buttons[i].pressed ? 1 : 0) : 0);
    const ax = (i) => gp.axes[i] || 0;
    let lx, ly, rx, ry;
    if (gp.mapping === 'standard' || gp.axes.length < 6) {
      NAMES.forEach((n, i) => { this.cur[n] = b(i); });
      [lx, ly, rx, ry] = [ax(0), ax(1), ax(2), ax(3)];
    } else {
      // Firefox en Linux (xpad): gatillos y cruceta son ejes.
      const trig = (axisIdx, k) => {
        const v = ax(axisIdx);
        if (v !== 0) this.triggerSeen[k] = true;
        return this.triggerSeen[k] ? Math.max(0, (v + 1) / 2) : 0;
      };
      Object.assign(this.cur, {
        A: b(0), B: b(1), X: b(2), Y: b(3), LB: b(4), RB: b(5), SELECT: b(6), START: b(7), L3: b(9), R3: b(10),
        LT: trig(2, 0), RT: trig(5, 1),
        LEFT: ax(6) < -0.5 ? 1 : 0, RIGHT: ax(6) > 0.5 ? 1 : 0, UP: ax(7) < -0.5 ? 1 : 0, DOWN: ax(7) > 0.5 ? 1 : 0,
      });
      [lx, ly, rx, ry] = [ax(0), ax(1), ax(3), ax(4)];
    }
    [this.lx, this.ly] = radial(lx, ly);
    [this.rx, this.ry] = radial(rx, ry);
    for (const n of ['LT', 'RT']) if (this.cur[n] < 0.06) this.cur[n] = 0;

    const busy = NAMES.some((n) => this.cur[n] > 0.5) || Math.hypot(this.lx, this.ly) > 0.5 || Math.hypot(this.rx, this.ry) > 0.5;
    if (busy) this.setMode('pad');
    this.updateNav(dt);
  }

  value(name) { return this.cur[name] || 0; }
  held(name) { return this.value(name) > 0.5; }
  pressed(name) { return this.cur[name] > 0.5 && this.prev[name] <= 0.5; }

  // Dirección para navegar por menús (cruceta o stick izquierdo) con repetición al mantener.
  updateNav(dt) {
    let dir = null;
    if (this.held('UP')) dir = 'up';
    else if (this.held('DOWN')) dir = 'down';
    else if (this.held('LEFT')) dir = 'left';
    else if (this.held('RIGHT')) dir = 'right';
    else if (Math.hypot(this.lx, this.ly) > 0.55) {
      dir = Math.abs(this.lx) > Math.abs(this.ly) ? (this.lx > 0 ? 'right' : 'left') : (this.ly > 0 ? 'down' : 'up');
    }
    this.navFired = null;
    if (dir !== this.navDir) {
      this.navDir = dir;
      this.navTime = 0;
      this.navFired = dir;
    } else if (dir) {
      this.navTime += dt;
      if (this.navTime >= NAV_DELAY) {
        this.navTime -= NAV_REPEAT;
        this.navFired = dir;
      }
    }
  }

  nav() { return this.navFired; }

  rumble(strong = 0.5, weak = 0.5, ms = 200) {
    if (!this.connected || !this.active) return;
    try {
      const gp = navigator.getGamepads()[this.index];
      gp?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak })?.catch?.(() => {});
    } catch {
      /* sin vibración */
    }
  }
}

export const pad = new Pad();

// Botones del mando de Xbox, dibujados con sus colores.
const LABELS = { A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', START: '☰', SELECT: '⧉', L3: 'L3', R3: 'R3', LS: 'L', RS: 'R', DPAD: '✚' };
export function glyph(name) {
  return h('span', { class: `gp-btn gp-${name.toLowerCase()}` }, LABELS[name] || name);
}

// Muestra la tecla con teclado/ratón y el botón con mando (el CSS oculta uno de los dos).
export function keyOr(key, button) {
  return [h('span', { class: 'kbd-only' }, h('span', { class: 'kbd' }, key)), h('span', { class: 'gp-only' }, glyph(button))];
}
