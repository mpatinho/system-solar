// Minijuego «Lluvia de respuestas»: caen asteroides con respuestas y hay que atrapar el correcto con la nave.
import { h, shuffle } from '../utils/dom.js';
import { openModal } from '../ui/modal.js';
import { reviewList } from '../ui/results.js';
import { QUESTIONS } from '../data/questions.js';
import { progress, save, recordAnswer } from '../utils/storage.js';
import { sfx } from '../utils/audio.js';
import { pad, keyOr } from '../input/gamepad.js';
import { findItem } from '../ship/styles.js';
import { createCanvas, createKeys, setCapture, wrapText, roundRect } from './common.js';

const W = 760, H = 460;
const SHIP_Y = H - 48;
const LIVES = 3;

// Preguntas que caben en un asteroide: test con respuestas cortas y verdadero/falso.
export function asteroidPool() {
  return QUESTIONS.filter((q) => (q.type === 'test' && q.options.every((o) => o.length <= 26)) || q.type === 'vf');
}

function roundFor(q) {
  if (q.type === 'vf') {
    return { q, text: `¿Verdadero o falso? ${q.q}`, answers: shuffle([{ label: 'Verdadero', ok: q.answer === true }, { label: 'Falso', ok: q.answer === false }]), correct: q.answer ? 'Verdadero' : 'Falso' };
  }
  const wrong = shuffle(q.options.map((o, i) => ({ label: o, ok: i === q.answer })).filter((a) => !a.ok)).slice(0, 2);
  return { q, text: q.q, answers: shuffle([{ label: q.options[q.answer], ok: true }, ...wrong]), correct: q.options[q.answer] };
}

export function openAsteroids({ onBack } = {}) {
  const { canvas, ctx } = createCanvas(W, H);
  const screen = h('div', { class: 'game-screen' });
  let playing = false;
  let raf = 0;
  const keys = createKeys(() => playing);
  const modal = openModal({
    title: '☄️ Lluvia de respuestas',
    className: 'wide game',
    body: h('div', { class: 'game-wrap' }, canvas, screen),
    onClose: () => { playing = false; cancelAnimationFrame(raf); keys.dispose(); },
  });
  const paint = findItem('paint', progress.hangar?.paint);
  const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.6 + 0.3, v: Math.random() * 30 + 10 }));

  let deck = [];
  let round = null;
  let rocks = [];
  let shipX = W / 2;
  let pointerX = null;
  let lives = LIVES, score = 0, combo = 0, level = 0;
  let wait = 0; // pausa (lectura o mensaje)
  let message = null;
  let sparks = [];
  const results = [];

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointerX = ((e.clientX - r.left) / r.width) * W;
  });

  function nextRound() {
    if (!deck.length) deck = shuffle(asteroidPool());
    round = roundFor(deck.pop());
    level++;
    const n = round.answers.length;
    const lanes = shuffle(Array.from({ length: n }, (_, i) => ((i + 0.5) / n) * W));
    rocks = round.answers.map((a, i) => ({ ...a, x: lanes[i], y: 120, r: 30 + Math.random() * 6, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 1.5, seed: Math.random() * 100 }));
    wait = 1.4 + Math.min(2.2, round.text.length * 0.025);
    message = null;
  }

  function finishRound(ok, label) {
    recordAnswer(round.q.id, ok);
    results.push({ q: round.q, correct: ok, score: ok ? 1 : 0, answerText: round.correct });
    if (ok) {
      combo++;
      const gained = 100 + (combo - 1) * 25 + Math.min(100, level * 5);
      score += gained;
      sfx.correct();
      message = { text: `¡Correcto! +${gained}`, color: '#4ade80', t: 0.9 };
    } else {
      combo = 0;
      lives--;
      sfx.wrong();
      pad.rumble(0.7, 0.5, 260);
      message = { text: label ? `¡Uy! La correcta era: ${round.correct}` : `¡Se escapó! Era: ${round.correct}`, color: '#f87171', t: 2.0 };
    }
    rocks = [];
    wait = message.t;
    round.done = true;
  }

  function burst(x, y, color) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 160;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.6 + Math.random() * 0.4, color });
    }
  }

  function update(dt) {
    // Movimiento de la nave: teclado, mando o ratón.
    let dir = 0;
    if (keys.held('ArrowLeft', 'KeyA') || pad.held('LEFT')) dir -= 1;
    if (keys.held('ArrowRight', 'KeyD') || pad.held('RIGHT')) dir += 1;
    if (Math.abs(pad.lx) > 0.05) dir += pad.lx;
    dir = Math.max(-1, Math.min(1, dir));
    if (dir) { shipX += dir * 460 * dt; pointerX = null; } else if (pointerX !== null) shipX += (pointerX - shipX) * Math.min(1, dt * 10);
    shipX = Math.max(30, Math.min(W - 30, shipX));

    for (const s of stars) { s.y += s.v * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } }
    sparks = sparks.filter((p) => (p.t -= dt) > 0);
    for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; }

    if (keys.hit('Escape') || pad.pressed('B') || pad.pressed('START')) { gameOver(); return; }

    if (wait > 0) {
      wait -= dt;
      if (message) message.t -= dt;
      if (wait <= 0) {
        if (round?.done) { if (lives <= 0) { gameOver(); return; } nextRound(); }
      }
      if (!round?.done) return; // leyendo la pregunta: los asteroides esperan
      return;
    }
    const speed = Math.min(170, 52 + level * 5);
    for (const r of rocks) {
      r.y += speed * dt;
      r.rot += r.spin * dt;
      if (Math.hypot(r.x - shipX, r.y - SHIP_Y) < r.r + 24) {
        burst(r.x, r.y, r.ok ? '#4ade80' : '#f87171');
        finishRound(r.ok, r.label);
        return;
      }
    }
    if (rocks.length && rocks.every((r) => r.y - r.r > H + 10)) finishRound(false, null);
  }

  function drawRock(r) {
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(r.rot);
    const g = ctx.createRadialGradient(-r.r * 0.3, -r.r * 0.3, r.r * 0.2, 0, 0, r.r);
    g.addColorStop(0, '#a89c8c');
    g.addColorStop(1, '#4a4038');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rr = r.r * (0.85 + 0.15 * Math.sin(r.seed + i * 2.3));
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(Math.cos(r.seed + i * 2) * r.r * 0.45, Math.sin(r.seed + i * 3) * r.r * 0.45, r.r * 0.14, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // Etiqueta con la respuesta
    ctx.font = '700 15px Nunito, sans-serif';
    const tw = ctx.measureText(r.label).width + 18;
    roundRect(ctx, r.x - tw / 2, r.y + r.r + 4, tw, 24, 12);
    ctx.fillStyle = 'rgba(8,14,32,0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,180,255,0.5)';
    ctx.stroke();
    ctx.fillStyle = '#eaf2ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(r.label, r.x, r.y + r.r + 16);
  }

  function drawShip() {
    ctx.save();
    ctx.translate(shipX, SHIP_Y);
    const fl = 14 + Math.random() * 8;
    ctx.fillStyle = '#58c4ff';
    ctx.beginPath(); ctx.moveTo(-8, 16); ctx.lineTo(0, 16 + fl); ctx.lineTo(8, 16); ctx.fill();
    ctx.fillStyle = paint.hull;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(10, 4); ctx.lineTo(26, 14); ctx.lineTo(10, 16); ctx.lineTo(-10, 16); ctx.lineTo(-26, 14); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = paint.accent;
    ctx.fillRect(-26, 10, 6, 6); ctx.fillRect(20, 10, 6, 6);
    ctx.fillStyle = '#0d2a4a';
    ctx.beginPath(); ctx.ellipse(0, -6, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#02040c');
    bg.addColorStop(1, '#0b1530');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) { ctx.fillStyle = `rgba(255,255,255,${0.3 + s.s * 0.3})`; ctx.fillRect(s.x, s.y, s.s, s.s); }
    // Pregunta
    if (round) {
      roundRect(ctx, 12, 10, W - 24, 78, 14);
      ctx.fillStyle = 'rgba(8,14,32,0.9)';
      ctx.fill();
      ctx.strokeStyle = '#ffb547';
      ctx.stroke();
      ctx.font = '800 19px Nunito, sans-serif';
      ctx.fillStyle = '#eaf2ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lines = wrapText(ctx, round.text, W - 60, 3);
      lines.forEach((l, i) => ctx.fillText(l, W / 2, 49 + (i - (lines.length - 1) / 2) * 22));
    }
    for (const r of rocks) drawRock(r);
    for (const p of sparks) { ctx.globalAlpha = Math.min(1, p.t * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }
    ctx.globalAlpha = 1;
    drawShip();
    // Marcador
    ctx.font = '800 16px Nunito, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#eaf2ff';
    ctx.fillText(`${'🛡️'.repeat(Math.max(0, lives))}`, 14, H - 12);
    ctx.textAlign = 'right';
    ctx.fillText(`⭐ ${score.toLocaleString('es-ES')}${combo > 1 ? `  ·  racha ×${combo}` : ''}`, W - 14, H - 12);
    if (message && message.t > 0) {
      ctx.font = '800 22px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = message.color;
      ctx.fillText(message.text, W / 2, H / 2);
    } else if (round && !round.done && wait > 0) {
      ctx.font = '700 17px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffb547';
      ctx.fillText('¡Atento! Atrapa la respuesta correcta…', W / 2, H / 2 + 40);
    }
  }

  let last = 0;
  function loop(now) {
    if (!playing) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (!modal.suspended) update(dt);
    if (playing) draw();
    raf = requestAnimationFrame(loop);
  }

  function start() {
    lives = LIVES; score = 0; combo = 0; level = 0; results.length = 0; sparks = []; deck = [];
    shipX = W / 2;
    screen.replaceChildren();
    screen.classList.add('hidden');
    playing = true;
    setCapture(modal, true);
    keys.clearHits();
    nextRound();
    last = 0;
    raf = requestAnimationFrame(loop);
  }

  function gameOver() {
    playing = false;
    cancelAnimationFrame(raf);
    setCapture(modal, false);
    const g = progress.games.asteroids;
    const record = score > (g.best || 0);
    g.best = Math.max(g.best || 0, score);
    g.plays = (g.plays || 0) + 1;
    const points = Math.round(score / 10);
    progress.points += points;
    save();
    if (record && score > 0) sfx.fanfare(); else sfx.click();
    const ok = results.filter((r) => r.correct).length;
    const wrong = results.filter((r) => !r.correct);
    screen.classList.remove('hidden');
    screen.replaceChildren(h('div', { class: 'game-card' },
      h('h3', null, record && score > 0 ? '🏆 ¡Nuevo récord!' : '¡Fin de la partida!'),
      h('div', { class: 'big-score' }, score.toLocaleString('es-ES')),
      h('p', null, `Has acertado ${ok} de ${results.length} · Récord: ${g.best.toLocaleString('es-ES')}`),
      h('div', { class: 'pts' }, `+${points} puntos de rango`),
      wrong.length ? h('div', { class: 'game-review' }, h('h4', null, 'Repasa:'), reviewList(wrong)) : null,
      h('div', { class: 'game-actions' },
        onBack ? h('button', { class: 'btn', onclick: () => { modal.close(); onBack(); } }, '🕹️ Minijuegos') : null,
        h('button', { class: 'btn primary', 'data-gp-default': true, onclick: start }, '🔁 Jugar otra vez'))));
  }

  function intro() {
    draw();
    screen.replaceChildren(h('div', { class: 'game-card' },
      h('h3', null, '☄️ Lluvia de respuestas'),
      h('p', null, 'Lee la pregunta y mueve la nave para atrapar el asteroide con la respuesta correcta. Si fallas o se te escapan todos, pierdes un escudo.'),
      h('p', { class: 'note' }, 'Mover: ', keyOr('← →', 'LS'), ' · Salir: ', keyOr('Esc', 'B'), ' · También con el ratón.'),
      h('p', null, `Récord: ${(progress.games.asteroids.best || 0).toLocaleString('es-ES')} puntos`),
      h('div', { class: 'game-actions' },
        onBack ? h('button', { class: 'btn', onclick: () => { modal.close(); onBack(); } }, '← Minijuegos') : null,
        h('button', { class: 'btn primary big', 'data-gp-default': true, onclick: start }, '▶ ¡A jugar!'))));
  }

  intro();
  return { modal, start, get state() { return { playing, lives, score, level, rocks, shipX, round, wait }; } };
}
