// Cámara en tercera persona: sigue a la nave suavemente. Arrastrar con el ratón (o el stick derecho) la orbita;
// rueda (o cruceta ↑/↓) = zoom.
import * as THREE from 'three';

export class ChaseCamera {
  constructor(camera, ship, dom) {
    this.camera = camera;
    this.ship = ship;
    this.distance = 2.6;
    this.yaw = 0;
    this.pitch = 0.12;
    this.dragging = false;
    this.smoothQ = new THREE.Quaternion();
    this.fovBoost = 0;
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._off = new THREE.Vector3();
    this._look = new THREE.Vector3();
    this._up = new THREE.Vector3();
    let lx = 0, ly = 0;
    dom.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      this.dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      dom.setPointerCapture?.(e.pointerId);
    });
    dom.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.yaw -= (e.clientX - lx) * 0.006;
      this.pitch = THREE.MathUtils.clamp(this.pitch + (e.clientY - ly) * 0.005, -1.2, 1.3);
      lx = e.clientX;
      ly = e.clientY;
    });
    const end = () => { this.dragging = false; };
    dom.addEventListener('pointerup', end);
    dom.addEventListener('pointercancel', end);
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.distance = THREE.MathUtils.clamp(this.distance * Math.exp(e.deltaY * 0.001), 1.4, 40);
    }, { passive: false });
  }

  snap() { this.smoothQ.copy(this.ship.root.quaternion); }

  // Stick derecho: mirar alrededor. Mientras se usa, la cámara no vuelve sola detrás de la nave.
  look(x, y, dt) {
    this.padLook = Math.abs(x) + Math.abs(y) > 0.01;
    if (!this.padLook) return;
    this.yaw -= x * dt * 2.4;
    this.pitch = THREE.MathUtils.clamp(this.pitch + y * dt * 1.8, -1.2, 1.3);
  }

  zoom(factor) { this.distance = THREE.MathUtils.clamp(this.distance * factor, 1.4, 40); }

  reset() { this.yaw = 0; this.pitch = 0.12; }

  update(dt, speed) {
    const root = this.ship.root;
    // Si la nave va rápido y no se está arrastrando, la cámara vuelve poco a poco detrás.
    if (!this.dragging && !this.padLook && Math.abs(speed) > 2) {
      const k = 1 - Math.exp(-dt * 1.2);
      this.yaw += (0 - this.yaw) * k;
      this.pitch += (0.12 - this.pitch) * k;
    }
    this.smoothQ.slerp(root.quaternion, 1 - Math.exp(-dt * 5));
    this._q.setFromEuler(this._e.set(-this.pitch, this.yaw, 0, 'YXZ'));
    const q = this._q.premultiply(this.smoothQ);
    this._off.set(0, 0.22 * this.distance, this.distance).applyQuaternion(q);
    this.camera.position.copy(root.position).add(this._off);
    this._up.set(0, 1, 0).applyQuaternion(this.smoothQ);
    this.camera.up.copy(this._up);
    this._look.set(0, 0.25, -1.5).applyQuaternion(this.smoothQ).add(root.position);
    this.camera.lookAt(this._look);
    const fov = 60 + Math.min(1, Math.max(0, (speed - 20) / 60)) * 14 + this.fovBoost;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov += (fov - this.camera.fov) * (1 - Math.exp(-dt * 4));
      this.camera.updateProjectionMatrix();
    }
  }
}
