// Sonda Voyager 1 (modelo sencillo) con baliza parpadeante para encontrarla.
import * as THREE from 'three';
import { makeGlowTexture } from '../utils/procTexture.js';

export function createProbe(body, envMap) {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xcfd3da, metalness: 0.8, roughness: 0.35, envMap, envMapIntensity: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.9, roughness: 0.3, envMap, envMapIntensity: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.4, roughness: 0.6, envMap, envMapIntensity: 0.3 });

  const dishProfile = [];
  for (let i = 0; i <= 12; i++) {
    const x = (i / 12) * 1.8;
    dishProfile.push(new THREE.Vector2(x, x * x * 0.12));
  }
  const dish = new THREE.Mesh(new THREE.LatheGeometry(dishProfile, 48), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, metalness: 0.2, roughness: 0.5, side: THREE.DoubleSide, envMap, envMapIntensity: 0.4 }));
  dish.rotation.x = Math.PI / 2;
  dish.position.z = 0.3;
  group.add(dish);
  const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.45, 10), gold);
  bus.rotation.x = Math.PI / 2;
  bus.position.z = -0.1;
  group.add(bus);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 5, 8), metal);
  boom.rotation.z = Math.PI / 2;
  boom.position.set(2.2, 0, -0.1);
  group.add(boom);
  const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 12), dark);
  rtg.rotation.z = Math.PI / 2;
  rtg.position.set(-1.6, -0.3, -0.1);
  group.add(rtg);
  const rtgArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), metal);
  rtgArm.rotation.z = Math.PI / 2;
  rtgArm.position.set(-0.9, -0.3, -0.1);
  group.add(rtgArm);
  const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 8, 6), metal);
  mag.rotation.z = 0.9;
  mag.position.set(-2.4, 1.8, -0.1);
  group.add(mag);
  group.scale.setScalar(0.55);

  const beacon = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(), color: new THREE.Color(2.5, 2.2, 1.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  beacon.scale.setScalar(3);
  const root = new THREE.Group();
  root.add(group, beacon);
  root.position.set(...body.render.fixed);
  group.lookAt(0, 0, 0); // la antena apunta hacia la Tierra (más o menos hacia el Sol)

  return {
    group: root,
    mesh: bus,
    radius: body.render.radius,
    update(simTime, dt, time) {
      const blink = (Math.sin(time * 3) + 1) / 2;
      beacon.material.opacity = 0.25 + blink * 0.75;
      beacon.scale.setScalar(2 + blink * 2);
      group.rotation.z += dt * 0.05;
    },
  };
}
