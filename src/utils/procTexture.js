// Texturas procedurales para astros sin foto (Plutón, lunas pequeñas, núcleo del cometa).
import * as THREE from 'three';
import { fbm, rng } from './noise.js';

function samplePalette(colors, t) {
  t = Math.min(0.9999, Math.max(0, t));
  const f = t * (colors.length - 1);
  const i = Math.floor(f);
  const k = f - i;
  const a = colors[i], b = colors[Math.min(colors.length - 1, i + 1)];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function heartShape(x, y) {
  // Curva del corazón: (x² + y² − 1)³ − x²·y³ < 0
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y;
}

export function makeSphereTexture({ width = 512, height = 256, colors, scale = 3, seed = 1, contrast = 1.6, craters = 0, heart = false }) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(width, height);
  const d = img.data;
  for (let y = 0; y < height; y++) {
    const lat = (0.5 - (y + 0.5) / height) * Math.PI;
    const cl = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < width; x++) {
      const lon = ((x + 0.5) / width) * Math.PI * 2;
      const px = cl * Math.cos(lon), pz = cl * Math.sin(lon);
      let n = fbm(px * scale + 10, sl * scale + 10, pz * scale + 10, seed, 5);
      n = Math.min(1, Math.max(0, (n - 0.5) * contrast + 0.5));
      let [r, g, b] = samplePalette(colors, n);
      if (heart) {
        // Llanura helada con forma de corazón (Tombaugh Regio) centrada en lon=π, lat≈+15°
        let dl = lon - Math.PI;
        const hx = (dl * cl) / 0.42;
        const hy = (lat - 0.22) / 0.42 + 0.15;
        const hv = heartShape(hx * 1.1, hy * 1.1);
        if (hv < 0.05) {
          const k = Math.min(1, (0.05 - hv) * 6);
          r = r + (246 - r) * k * 0.9;
          g = g + (238 - g) * k * 0.9;
          b = b + (222 - b) * k * 0.9;
        }
      }
      const i = (y * width + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (craters) {
    const rand = rng(seed * 97 + 3);
    for (let c = 0; c < craters; c++) {
      const cx = rand() * width, cy = height * (0.15 + rand() * 0.7), rr = 2 + rand() * rand() * 14;
      const grd = ctx.createRadialGradient(cx, cy, rr * 0.2, cx, cy, rr);
      grd.addColorStop(0, 'rgba(0,0,0,0.28)');
      grd.addColorStop(0.75, 'rgba(0,0,0,0.12)');
      grd.addColorStop(0.9, 'rgba(255,255,255,0.18)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rr, rr * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// Textura radial suave (halos, destellos, partículas).
export function makeGlowTexture(size = 256, stops = [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
