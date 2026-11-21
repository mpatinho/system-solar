// Hipersalto automático hasta un astro, con efecto de estrellas estiradas.
import * as THREE from 'three';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function makeWarpStreaks(camera) {
  const N = 320;
  const pos = new Float32Array(N * 6);
  const base = [];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 2 + Math.random() * 14;
    base.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, z: -Math.random() * 120 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.8, 1.0, 1.7), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.visible = false;
  camera.add(lines);
  return {
    update(dt, intensity) {
      lines.visible = intensity > 0.01;
      if (!lines.visible) return;
      mat.opacity = intensity * 0.7;
      const len = 2 + intensity * 30;
      for (let i = 0; i < N; i++) {
        const b = base[i];
        b.z += dt * (80 + intensity * 400);
        if (b.z > -1) b.z = -120;
        pos.set([b.x, b.y, b.z, b.x, b.y, b.z - len], i * 6);
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

export class Autopilot {
  constructor(ship, controls, chase, camera) {
    this.ship = ship;
    this.controls = controls;
    this.chase = chase;
    this.active = false;
    this.streaks = makeWarpStreaks(camera);
    this.intensity = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._arrive = new THREE.Vector3();
    this._start = new THREE.Vector3();
    this._tmp = new THREE.Vector3();
  }

  // Punto de llegada: delante del lado iluminado del astro (o al otro lado de su planeta, para la Luna).
  arrivalPoint(entry, system, out) {
    const p = entry.position;
    if (entry.id === 'sol') {
      out.copy(this.ship.root.position).normalize();
      if (out.lengthSq() < 0.5) out.set(0, 0.2, 1).normalize();
      return out.multiplyScalar(entry.arrive).add(p);
    }
    let dir;
    if (entry.body.parent) dir = this._tmp.subVectors(p, system.get(entry.body.parent).position).normalize();
    else if (p.lengthSq() > 1) dir = this._tmp.copy(p).negate().normalize();
    else dir = this._tmp.set(0, 0, 1);
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), entry.body.parent ? 0.4 : 0.65);
    dir.y += 0.22;
    dir.normalize();
    return out.copy(dir).multiplyScalar(entry.arrive).add(p);
  }

  start(entry, system, onDone) {
    this.entry = entry;
    this.system = system;
    this.onDone = onDone;
    this.active = true;
    this.phase = 'align';
    this.t = 0;
    this.controls.enabled = false;
    this.controls.stop();
    this._start.copy(this.ship.root.position);
    const dist = this._start.distanceTo(entry.position);
    this.duration = THREE.MathUtils.clamp(dist / 220, 1.3, 3.6);
  }

  cancel() {
    if (!this.active) return;
    this.active = false;
    this.controls.enabled = true;
    this.chase.fovBoost = 0;
  }

  lookAtQuat(from, to) {
    this._m.lookAt(from, to, new THREE.Vector3(0, 1, 0));
    return this._q.setFromRotationMatrix(this._m);
  }

  update(dt) {
    const root = this.ship.root;
    if (!this.active) {
      this.intensity = Math.max(0, this.intensity - dt * 2);
      this.streaks.update(dt, this.intensity);
      return null;
    }
    this.t += dt;
    const target = this.entry.position;
    let thrust = 0.3;
    if (this.phase === 'align') {
      root.quaternion.slerp(this.lookAtQuat(root.position, target), 1 - Math.exp(-dt * 6));
      if (this.t > 0.7) { this.phase = 'warp'; this.t = 0; this._start.copy(root.position); }
    } else if (this.phase === 'warp') {
      const p = Math.min(1, this.t / this.duration);
      this.arrivalPoint(this.entry, this.system, this._arrive);
      root.position.lerpVectors(this._start, this._arrive, easeInOut(p));
      root.quaternion.slerp(this.lookAtQuat(root.position, target), 1 - Math.exp(-dt * 8));
      this.intensity = Math.sin(p * Math.PI);
      this.chase.fovBoost = this.intensity * 35;
      thrust = 0.6 + this.intensity * 1.2;
      if (p >= 1) { this.phase = 'arrive'; this.t = 0; }
    } else if (this.phase === 'arrive') {
      this.arrivalPoint(this.entry, this.system, this._arrive);
      root.position.copy(this._arrive);
      root.quaternion.slerp(this.lookAtQuat(root.position, target), 1 - Math.exp(-dt * 6));
      this.intensity = Math.max(0, this.intensity - dt * 3);
      this.chase.fovBoost = this.intensity * 35;
      if (this.t > 0.5) {
        this.active = false;
        this.controls.enabled = true;
        this.chase.fovBoost = 0;
        const cb = this.onDone;
        this.onDone = null;
        cb?.(this.entry);
      }
    }
    this.streaks.update(dt, this.intensity);
    return { thrust, warp: this.intensity };
  }
}
