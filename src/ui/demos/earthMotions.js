// Lección: movimientos de la Tierra (rotación, traslación y estaciones, año bisiesto).
import * as THREE from 'three';
import { h } from '../../utils/dom.js';
import { makeCanvas, loop, loadImage, drawSphere, label, starfield, arrow, openTabbedLesson } from './common.js';
import { createMini3D } from './mini3d.js';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function rotationTab(modal) {
  const canvas = h('canvas');
  const status = h('div', { class: 'callout' });
  let playing = true;
  const playBtn = h('button', { class: 'btn small', onclick: () => { playing = !playing; playBtn.textContent = playing ? '⏸ Pausa' : '▶ Girar'; } }, '⏸ Pausa');
  const slider = h('input', { type: 'range', min: 0, max: 24, step: 0.1, value: 12 });
  slider.addEventListener('input', () => { playing = false; playBtn.textContent = '▶ Girar'; });
  const wrap = h('div', { class: 'demo' },
    h('div', null, canvas, h('div', { class: 'demo-controls' }, playBtn, h('span', null, 'Hora en España:'), slider)),
    h('div', { class: 'demo-text' },
      h('h3', null, 'Rotación: el día y la noche'),
      h('p', null, 'La Tierra gira sobre su ', h('b', null, 'eje'), ' (una línea imaginaria de polo a polo) y tarda ', h('b', null, '24 horas'), ' en dar una vuelta completa. Es el movimiento de ', h('b', null, 'rotación'), '.'),
      h('p', null, 'La mitad que mira al Sol tiene ', h('b', null, 'día'), ' y la otra mitad, ', h('b', null, 'noche'), '. Gira de ', h('b', null, 'oeste a este'), ': por eso el Sol «sale» por el este y se pone por el oeste.'),
      status,
      h('p', { class: 'note' }, 'Fíjate en el punto rojo: es España. Las luces amarillas son las ciudades de noche.'),
    ));

  const mini = createMini3D(canvas, 'tierra', { width: 520, height: 400, viewAngle: 90, distanceFactor: 3.6 });
  const earthGroup = mini.object;
  const tilt = earthGroup.children[0];
  const mesh = tilt.children[0];
  const clouds = tilt.children[1];
  // Eje de rotación
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 6, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.2, 0.4) }));
  tilt.add(axis);
  // Marca en España (lat 40° N, lon 4° O)
  const lat = THREE.MathUtils.degToRad(40), phi = THREE.MathUtils.degToRad(-4 + 180);
  const r = 2.03;
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.2, 0.2) }));
  marker.position.set(-Math.cos(phi) * Math.cos(lat) * r, Math.sin(lat) * r, Math.sin(phi) * Math.cos(lat) * r);
  mesh.add(marker);
  const tagCanvas = document.createElement('canvas');
  tagCanvas.width = 256; tagCanvas.height = 64;
  const tg = tagCanvas.getContext('2d');
  tg.font = 'bold 40px Nunito, sans-serif'; tg.textAlign = 'center'; tg.textBaseline = 'middle';
  tg.lineWidth = 8; tg.strokeStyle = 'rgba(0,0,0,0.8)'; tg.strokeText('España', 128, 32);
  tg.fillStyle = '#ff6b6b'; tg.fillText('España', 128, 32);
  const tagTex = new THREE.CanvasTexture(tagCanvas);
  tagTex.colorSpace = THREE.SRGBColorSpace;
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex, depthTest: false, transparent: true }));
  tag.scale.set(1.2, 0.3, 1);
  tag.position.copy(marker.position).multiplyScalar(1.18);
  mesh.add(tag);
  // Vista desde encima del hemisferio norte (como en los libros): se ve la mitad de día y la de noche.
  mini.camera.position.set(earthGroup.position.x + 0.6, 8.6, 3.4);
  mini.camera.lookAt(earthGroup.position);
  // Hora 12:00 → España mirando al Sol (−X)
  const spainAngle = Math.atan2(marker.position.z, marker.position.x);
  let hour = 12;
  const n = new THREE.Vector3();
  const sunDir = new THREE.Vector3();
  mini.setUpdate(() => {});
  const stop = loop(modal, (dt) => {
    if (playing) { hour = (hour + dt * 2) % 24; slider.value = hour.toFixed(1); }
    else hour = parseFloat(slider.value);
    // Ángulo de giro: a las 12 h, España apunta al Sol; la Tierra gira de oeste a este (sentido antihorario visto desde el norte).
    mesh.rotation.y = spainAngle - Math.PI + ((hour - 12) / 24) * Math.PI * 2;
    clouds.rotation.y = mesh.rotation.y;
    marker.getWorldPosition(n);
    earthGroup.getWorldPosition(sunDir);
    n.sub(sunDir).normalize();
    sunDir.negate().normalize();
    const d = n.dot(sunDir);
    const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60);
    const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    let txt;
    if (d > 0.12) txt = `☀️ Son las ${time}: en España es de DÍA (su lado de la Tierra mira al Sol).`;
    else if (d < -0.12) txt = `🌙 Son las ${time}: en España es de NOCHE (su lado no recibe la luz del Sol).`;
    else txt = hour < 12 ? `🌅 Son las ${time}: está AMANECIENDO en España.` : `🌇 Son las ${time}: está ATARDECIENDO en España.`;
    if (status.textContent !== txt) status.textContent = txt;
  });
  return { el: wrap, dispose: () => { stop(); mini.dispose(); } };
}

function seasonsTab(modal) {
  const { canvas, ctx, w, h: H } = makeCanvas(560, 380);
  const info = h('div', { class: 'callout' });
  let playing = true;
  let t = 0.47; // fracción del año (0 = 1 de enero)
  const playBtn = h('button', { class: 'btn small', onclick: () => { playing = !playing; playBtn.textContent = playing ? '⏸ Pausa' : '▶ Mover'; } }, '⏸ Pausa');
  const slider = h('input', { type: 'range', min: 0, max: 1, step: 0.001, value: t });
  slider.addEventListener('input', () => { playing = false; playBtn.textContent = '▶ Mover'; t = parseFloat(slider.value); });
  const wrap = h('div', { class: 'demo' },
    h('div', null, canvas, h('div', { class: 'demo-controls' }, playBtn, h('span', null, 'Mes:'), slider)),
    h('div', { class: 'demo-text' },
      h('h3', null, 'Traslación y estaciones'),
      h('p', null, 'La Tierra gira alrededor del Sol siguiendo una órbita y tarda ', h('b', null, '365 días y 6 horas'), ': es la ', h('b', null, 'traslación'), ' y dura un año.'),
      h('p', null, 'Su eje está ', h('b', null, 'inclinado'), ' y siempre apunta hacia el mismo sitio. Por eso, durante el año, cada hemisferio recibe los rayos del Sol más directos (', h('b', null, 'verano'), ') o más inclinados (', h('b', null, 'invierno'), ').'),
      info,
      h('p', { class: 'note' }, '¡Ojo! Las estaciones NO se deben a que la Tierra esté más cerca o más lejos del Sol.'),
    ));
  const sun = loadImage('2k_sun.jpg');
  const earth = loadImage('2k_earth_daymap.jpg');
  const cx = w / 2, cy = H / 2 + 10, rx = 205, ry = 120;
  const tiltX = Math.sin(THREE.MathUtils.degToRad(23.4)), tiltY = Math.cos(THREE.MathUtils.degToRad(23.4));
  // Solsticio de junio (t≈0.47) a la izquierda del Sol: el polo norte se inclina hacia él.
  const angleFor = (tt) => Math.PI + (tt - 0.47) * Math.PI * 2;
  const seasonsN = (tt) => {
    const d = tt * 365;
    if (d >= 79 && d < 172) return ['Primavera', 'Otoño'];
    if (d >= 172 && d < 265) return ['Verano', 'Invierno'];
    if (d >= 265 && d < 355) return ['Otoño', 'Primavera'];
    return ['Invierno', 'Verano'];
  };
  const marks = [
    { tt: 0.47, txt: '21 de junio' },
    { tt: 0.725, txt: '23 de septiembre' },
    { tt: 0.97, txt: '21 de diciembre' },
    { tt: 0.22, txt: '20 de marzo' },
  ];
  const stop = loop(modal, (dt, time) => {
    if (playing) { t = (t + dt * 0.045) % 1; slider.value = t; }
    ctx.fillStyle = '#02050d';
    ctx.fillRect(0, 0, w, H);
    starfield(ctx, w, H, 90, 3, time);
    ctx.strokeStyle = 'rgba(160,200,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (const m of marks) {
      const a = angleFor(m.tt);
      const x = cx + Math.cos(a) * rx, y = cy - Math.sin(a) * ry;
      label(ctx, m.txt, x, y + (Math.sin(a) > 0 ? -26 : 30), { size: 12, color: '#a7b9d6' });
    }
    const a = angleFor(t);
    const ex = cx + Math.cos(a) * rx, ey = cy - Math.sin(a) * ry;
    const behind = Math.sin(a) > 0;
    const drawEarth = () => {
      const r = 22 + (behind ? -3 : 3);
      // Lado iluminado hacia el Sol
      const lx = (cx - ex), ly = (cy - ey);
      const len = Math.hypot(lx, ly) || 1;
      drawSphere(ctx, earth, ex, ey, r, { lightX: lx / len, lightY: ly / len, shade: 0.95, glow: 'rgba(80,150,255,0.35)' });
      ctx.strokeStyle = '#ffd36b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex - tiltX * r * 1.6, ey + tiltY * r * 1.6);
      ctx.lineTo(ex + tiltX * r * 1.6, ey - tiltY * r * 1.6);
      ctx.stroke();
      label(ctx, 'N', ex + tiltX * r * 1.9, ey - tiltY * r * 1.9, { size: 12, color: '#ffd36b' });
    };
    if (behind) drawEarth();
    drawSphere(ctx, sun, cx, cy, 42, { shade: 0.15, glow: 'rgba(255,170,60,0.55)' });
    label(ctx, 'Sol', cx, cy + 58, { size: 13, color: '#ffcf8a' });
    if (!behind) drawEarth();
    arrow(ctx, cx + rx - 8, cy - 40, cx + rx - 40, cy - ry + 18, 'rgba(255,181,71,0.6)', 1.5);
    const day = Math.floor(t * 365);
    const month = MONTHS[Math.min(11, Math.floor(t * 12))];
    const [n, s] = seasonsN(t);
    const txt = `📅 Mes: ${month} (día ${day + 1} del año) · Hemisferio norte (España): ${n} · Hemisferio sur (Argentina): ${s}`;
    if (info.textContent !== txt) info.textContent = txt;
  });
  return { el: wrap, dispose: stop };
}

function leapTab() {
  const years = [
    ['2025', '365 días', '+ 6 horas'],
    ['2026', '365 días', '+ 6 horas'],
    ['2027', '365 días', '+ 6 horas'],
    ['2028', '366 días', '¡+ 1 día! (29 de febrero)'],
  ];
  const el = h('div', { class: 'demo-text' },
    h('h3', null, 'El año bisiesto'),
    h('p', null, 'La traslación dura 365 días ', h('b', null, 'y 6 horas'), '. Los calendarios tienen días enteros, así que esas 6 horas se van guardando…'),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', margin: '14px 0' } },
      years.map(([y, d, extra], i) => h('div', { class: 'sheet-card', style: { textAlign: 'center', borderColor: i === 3 ? '#ffb547' : '' } },
        h('div', { style: { fontFamily: 'var(--font-title)', fontSize: '26px', fontWeight: 800 } }, y),
        h('div', null, d),
        h('div', { style: { color: i === 3 ? '#ffb547' : '#58c4ff', fontWeight: 800 } }, extra)))),
    h('div', { class: 'callout' }, '6 horas + 6 horas + 6 horas + 6 horas = 24 horas = ', h('b', null, '1 día'), '. Por eso, ', h('b', null, 'cada 4 años'), ' hay un ', h('b', null, 'año bisiesto'), ' de ', h('b', null, '366 días'), ': febrero tiene 29 días.'),
  );
  return { el, dispose: () => {} };
}

export function open() {
  return openTabbedLesson('🌍 Movimientos de la Tierra', [
    ['Rotación: día y noche', rotationTab],
    ['Traslación y estaciones', seasonsTab],
    ['Año bisiesto', leapTab],
  ]);
}
