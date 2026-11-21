// Sonidos sintetizados con WebAudio (sin archivos). Se activa con el primer gesto del usuario.
import { progress } from './storage.js';

let ctx = null;
let master = null;
let engine = null;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = progress.settings.sound ? 0.9 : 0;
  master.connect(ctx.destination);
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

export function setSound(on) {
  progress.settings.sound = on;
  if (master) master.gain.setTargetAtTime(on ? 0.9 : 0, ctx.currentTime, 0.05);
}

function tone(freq, start, dur, type = 'sine', vol = 0.18) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noiseBuffer(c, seconds = 2) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export const sfx = {
  click() { tone(660, 0, 0.08, 'triangle', 0.08); },
  correct() { tone(660, 0, 0.18); tone(880, 0.1, 0.22); tone(1320, 0.2, 0.3, 'sine', 0.12); },
  wrong() { tone(220, 0, 0.25, 'sawtooth', 0.08); tone(160, 0.12, 0.3, 'sawtooth', 0.08); },
  stamp() { tone(523, 0, 0.12, 'square', 0.06); tone(784, 0.08, 0.15, 'square', 0.06); tone(1046, 0.16, 0.35, 'triangle', 0.12); },
  fanfare() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.4, 'triangle', 0.13)); },
  alarm() { tone(880, 0, 0.12, 'square', 0.05); tone(660, 0.14, 0.12, 'square', 0.05); },
  warp() {
    const c = ensure();
    if (!c) return;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 3);
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2.5;
    const g = c.createGain();
    const t = c.currentTime;
    f.frequency.setValueAtTime(200, t);
    f.frequency.exponentialRampToValueAtTime(3000, t + 1.2);
    f.frequency.exponentialRampToValueAtTime(300, t + 2.8);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.6);
    g.gain.linearRampToValueAtTime(0, t + 2.9);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + 3);
  },
};

// Zumbido del motor: su volumen y tono dependen del acelerador.
export function updateEngine(throttle, turbo) {
  const c = ctx;
  if (!c || c.state !== 'running') return;
  if (!engine) {
    const o1 = c.createOscillator();
    const o2 = c.createOscillator();
    o1.type = 'sawtooth';
    o2.type = 'sawtooth';
    o1.frequency.value = 48;
    o2.frequency.value = 72.5;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 200;
    const g = c.createGain();
    g.gain.value = 0;
    o1.connect(f);
    o2.connect(f);
    f.connect(g).connect(master);
    o1.start();
    o2.start();
    engine = { o1, o2, f, g };
  }
  const t = c.currentTime;
  const a = Math.min(1, Math.abs(throttle));
  engine.g.gain.setTargetAtTime(0.012 + a * 0.05, t, 0.15);
  engine.f.frequency.setTargetAtTime(180 + a * 700 + (turbo ? 600 : 0), t, 0.2);
  engine.o1.frequency.setTargetAtTime(48 + a * 30 + (turbo ? 25 : 0), t, 0.2);
  engine.o2.frequency.setTargetAtTime(72.5 + a * 44 + (turbo ? 35 : 0), t, 0.2);
}

export function silenceEngine() {
  if (engine && ctx) engine.g.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
}
