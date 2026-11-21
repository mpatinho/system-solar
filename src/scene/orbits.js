// Órbitas (Kepler) y escala de tiempo comprimida.
import * as THREE from 'three';

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;

// Un año terrestre dura 240 s a velocidad ×1. Los periodos se comprimen con raíz cuadrada
// para que los planetas lejanos también se muevan (en la ficha se dan los datos reales).
export const EARTH_YEAR_SECONDS = 240;
export const visualPeriod = (days) => EARTH_YEAR_SECONDS * Math.sqrt(Math.abs(days) / 365.25);
export const visualRotation = (hours) => Math.min(600, Math.max(8, 30 * Math.sqrt(hours / 24)));

export class Orbit {
  constructor({ a, e = 0, inc = 0, node = 0, peri = 0, period, phase = 0 }) {
    Object.assign(this, { a, e, period, phase });
    this.rot = new THREE.Matrix4()
      .makeRotationY(node * DEG)
      .multiply(new THREE.Matrix4().makeRotationX(inc * DEG))
      .multiply(new THREE.Matrix4().makeRotationY(peri * DEG));
  }

  pointAtE(E, target) {
    const x = this.a * (Math.cos(E) - this.e);
    const y = this.a * Math.sqrt(1 - this.e * this.e) * Math.sin(E);
    return target.set(x, 0, -y).applyMatrix4(this.rot);
  }

  position(t, target) {
    const M = this.phase + (TWO_PI * t) / this.period;
    let E = M;
    if (this.e > 0) for (let i = 0; i < 8; i++) E -= (E - this.e * Math.sin(E) - M) / (1 - this.e * Math.cos(E));
    return this.pointAtE(E, target);
  }

  makeLine(color = 0x9fc3ff, opacity = 0.22, segments = 360) {
    const pts = [];
    for (let i = 0; i < segments; i++) pts.push(this.pointAtE((i / segments) * TWO_PI, new THREE.Vector3()));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    return new THREE.LineLoop(geo, mat);
  }
}
