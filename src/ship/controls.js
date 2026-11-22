// Pilotaje arcade con teclado (W/S acelerar/frenar, A/D girar, ↑/↓ morro, Shift turbo, Espacio freno)
// y con mando (stick izquierdo, RT/LT, RB turbo, LB freno).
import * as THREE from 'three';
import { inputBlocked } from '../state.js';

const UP = new THREE.Vector3(0, 1, 0);

export class ShipControls {
  constructor(ship) {
    this.ship = ship;
    this.keys = new Set();
    this.speed = 0;
    this.maxSpeed = 22;
    this.turboSpeed = 75;
    this.yawVel = 0;
    this.pitchVel = 0;
    this.bank = 0;
    this.enabled = true;
    this.turbo = false;
    this.invertY = false;
    this.forward = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && !inputBlocked()) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  key(...codes) { return codes.some((c) => this.keys.has(c)); }

  stop() { this.speed = 0; this.yawVel = 0; this.pitchVel = 0; }

  // pad: estado del mando (o null si no se debe usar en este fotograma).
  update(dt, pad = null) {
    const root = this.ship.root;
    const active = this.enabled && !inputBlocked();
    const g = active && pad?.connected ? pad : null;
    const fwd = active && this.key('KeyW');
    const back = active && this.key('KeyS');
    const left = active && this.key('KeyA', 'ArrowLeft');
    const right = active && this.key('KeyD', 'ArrowRight');
    const up = active && this.key('ArrowUp');
    const down = active && this.key('ArrowDown');
    const brake = active && (this.key('Space') || !!g?.held('LB'));
    const padTurbo = !!g?.held('RB');
    this.turbo = active && (this.key('ShiftLeft', 'ShiftRight') || padTurbo);
    // Con el mando, RB acelera a tope en turbo sin tener que apretar RT a la vez.
    const accel = Math.max(fwd ? 1 : 0, g ? g.value('RT') : 0, padTurbo ? 1 : 0);
    const decel = Math.max(back ? 1 : 0, g ? g.value('LT') : 0);

    const top = this.turbo ? this.turboSpeed : this.maxSpeed;
    if (this.speed > top) this.speed = Math.max(top, this.speed - 40 * dt); // al soltar el turbo
    else if (accel > 0) this.speed = Math.min(top, this.speed + (this.turbo ? 45 : 14) * accel * dt);
    if (decel > 0) this.speed = Math.max(-6, this.speed - 18 * decel * dt);
    if (brake) this.speed *= Math.exp(-dt * 4);
    if (brake && Math.abs(this.speed) < 0.05) this.speed = 0;

    const clamp1 = (x) => Math.max(-1, Math.min(1, x));
    const yawTarget = clamp1((left ? 1 : 0) - (right ? 1 : 0) - (g ? g.lx : 0));
    const pitchTarget = clamp1((up ? 1 : 0) - (down ? 1 : 0) + (g ? (this.invertY ? g.ly : -g.ly) : 0));
    const k = 1 - Math.exp(-dt * 6);
    this.yawVel += (yawTarget * 1.25 - this.yawVel) * k;
    this.pitchVel += (pitchTarget * 1.0 - this.pitchVel) * k;

    root.rotateOnAxis(UP, this.yawVel * dt);
    root.rotateX(this.pitchVel * dt);

    // Autonivelado: mantiene las alas paralelas al plano de las órbitas (más fácil para pilotar).
    this.forward.set(0, 0, -1).applyQuaternion(root.quaternion);
    const right3 = this._v.set(1, 0, 0).applyQuaternion(root.quaternion);
    if (Math.abs(this.forward.y) < 0.92) {
      const desiredRight = new THREE.Vector3().crossVectors(this.forward, UP).normalize();
      const angle = Math.atan2(new THREE.Vector3().crossVectors(right3, desiredRight).dot(this.forward), right3.dot(desiredRight));
      root.rotateOnAxis(new THREE.Vector3(0, 0, -1), angle * Math.min(1, dt * 2.5));
    }

    // Inclinación visual al girar
    this.bank += (this.yawVel * 0.45 - this.bank) * k;
    this.ship.model.rotation.z = this.bank;
    this.ship.model.rotation.x = -this.pitchVel * 0.12;

    root.position.addScaledVector(this.forward, this.speed * dt);
    return { throttle: Math.abs(this.speed) / this.maxSpeed, turbo: this.turbo && this.speed > this.maxSpeed };
  }
}
