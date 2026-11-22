// Modo Aventura: misiones encadenadas; se vuela hasta el objetivo y se responden preguntas.
import { h, planetThumb, formatNota } from '../utils/dom.js';
import { openModal, toast } from '../ui/modal.js';
import { runQuiz } from '../ui/quiz.js';
import { showMissionResult, showExamResult, stars } from '../ui/results.js';
import { openReviewFor } from '../ui/screens.js';
import { QUESTIONS, QUESTION_BY_ID } from '../data/questions.js';
import { BODY_BY_ID } from '../data/bodies.js';
import { progress, save, rankFor, pendingWrongIds } from '../utils/storage.js';
import { pick } from '../utils/pick.js';
import { dailyStatus } from './daily.js';
import { createProximityInfo } from './proximity.js';
import { sfx } from '../utils/audio.js';
import { state } from '../state.js';

export const MISSIONS = [
  { id: 'sol', title: 'El Sol, nuestra estrella', target: 'sol', tags: ['sol'] },
  { id: 'mercurio', title: 'Mercurio, el más rápido', target: 'mercurio', tags: ['mercurio'] },
  { id: 'venus', title: 'Venus, el planeta ardiente', target: 'venus', tags: ['venus'] },
  { id: 'tierra', title: 'La Tierra y sus movimientos', target: 'tierra', tags: ['tierra'] },
  { id: 'luna', title: 'La Luna: fases y eclipses', target: 'luna', tags: ['luna'] },
  { id: 'marte', title: 'Marte, el planeta rojo', target: 'marte', tags: ['marte'] },
  { id: 'cinturon', title: 'Asteroides, cometas y meteoritos', target: 'cinturon', tags: ['asteroides'] },
  { id: 'jupiter', title: 'Júpiter, el gigante', target: 'jupiter', tags: ['jupiter'] },
  { id: 'saturno', title: 'Saturno y sus anillos', target: 'saturno', tags: ['saturno'] },
  { id: 'urano', title: 'Urano, el planeta tumbado', target: 'urano', tags: ['urano'] },
  { id: 'neptuno', title: 'Neptuno, el más lejano', target: 'neptuno', tags: ['neptuno'] },
  { id: 'pluton', title: 'Plutón y los planetas enanos', target: 'pluton', tags: ['pluton'] },
  { id: 'universo', title: 'Más allá: el Universo', target: 'voyager', tags: ['universo'] },
  { id: 'repaso', title: 'Repaso de todo el Sistema Solar', target: 'sol', tags: ['general'] },
  { id: 'examen', title: 'EXAMEN FINAL', target: 'tierra', exam: true },
];

function missionQuestions(m) {
  const pool = QUESTIONS.filter((q) => q.type !== 'vuelo' && q.tags.some((t) => m.tags.includes(t)));
  const qs = pick(pool, 4);
  const fly = pick(QUESTIONS.filter((q) => q.type === 'vuelo' && q.answer !== m.target), 1);
  qs.splice(Math.min(2, qs.length), 0, ...fly);
  return qs;
}

function examQuestions() {
  const slots = [['sol'], ['mercurio', 'venus'], ['tierra'], ['tierra'], ['luna'], ['marte', 'asteroides'], ['jupiter', 'saturno'], ['urano', 'neptuno', 'pluton'], ['universo'], ['general']];
  const chosen = [];
  const usedTypes = {};
  for (const tags of slots) {
    const pool = QUESTIONS.filter((q) => q.type !== 'vuelo' && q.tags.some((t) => tags.includes(t)) && !chosen.includes(q));
    const fresh = pool.filter((q) => (usedTypes[q.type] || 0) < 2);
    const [q] = pick(fresh.length ? fresh : pool, 1);
    if (q) { chosen.push(q); usedTypes[q.type] = (usedTypes[q.type] || 0) + 1; }
  }
  return chosen;
}

export function createAdventure(game) {
  const { hud } = game;
  let phase = 'idle'; // idle | flying | quiz | fly-question
  let mission = null;
  let flyQ = null;
  const proximity = createProximityInfo(game.info);

  const badge = () => {
    const r = rankFor(progress.points);
    hud.setExtra(h('span', null, r.medal, ' ', r.name, ' · ⭐ ', progress.points.toLocaleString('es-ES')));
  };

  function openBoard() {
    phase = 'idle';
    game.setTarget(null);
    hud.clearObjective();
    hud.setAnswerPrompt(null);
    const r = rankFor(progress.points);
    const nextIdx = MISSIONS.findIndex((m) => !m.exam && !(progress.missions[m.id]?.stars > 0));
    const wrong = pendingWrongIds().filter((id) => QUESTION_BY_ID[id] && QUESTION_BY_ID[id].type !== 'vuelo');
    const best = progress.exams.length ? Math.max(...progress.exams.map((e) => e.nota)) : null;
    const modal = openModal({
      title: '🎯 Misiones de la Academia Espacial',
      className: 'wide',
      body: h('div', null,
        h('div', { class: 'rank-box' },
          h('span', { class: 'medal' }, r.medal),
          h('div', { style: { flex: 1 } },
            h('b', null, r.name), ' · ', `${progress.points.toLocaleString('es-ES')} puntos`,
            r.next ? h('div', { class: 'note' }, `Siguiente rango: ${r.next.name} (${r.next.min.toLocaleString('es-ES')} puntos)`) : h('div', { class: 'note' }, '¡Rango máximo!'),
            h('div', { class: 'rank-progress' }, h('div', { style: { width: `${Math.round(r.pct * 100)}%` } })))),
        game.openDaily ? h('button', { class: 'mission daily-mission', style: { marginBottom: '10px' }, onclick: () => { modal.close(); game.openDaily(); } },
          h('b', null, '🔥 Reto del día'), h('div', { class: 'note' }, dailyStatus().done ? `¡Hecho hoy! Racha de ${dailyStatus().streak} ${dailyStatus().streak === 1 ? 'día' : 'días'}. Puedes repetirlo para repasar.` : '8 preguntas de lo que más te cuesta. ¡No pierdas la racha!')) : null,
        wrong.length ? h('button', { class: 'mission', style: { marginBottom: '10px', borderColor: '#f87171' }, onclick: () => { modal.close(); startReview(wrong); } },
          h('span', { class: 'num' }, '🔁'),
          h('span', { class: 'txt' }, h('b', null, `Repaso de fallos (${wrong.length})`), h('small', null, 'Vuelve a practicar las preguntas que has fallado. ¡Sin escudos!'))) : null,
        h('div', { class: 'mission-list' }, MISSIONS.map((m, i) => {
          const body = BODY_BY_ID[m.target];
          const st = progress.missions[m.id]?.stars || 0;
          return h('button', { class: `mission ${i === nextIdx ? 'next' : ''}`, 'data-gp-default': i === nextIdx, onclick: () => { modal.close(); briefing(m); } },
            h('span', { class: 'num' }, m.exam ? '📝' : i + 1),
            planetThumb(body),
            h('span', { class: 'txt' }, h('b', null, m.title),
              h('small', null, m.exam ? `10 preguntas de todo el tema, nota sobre 10${best !== null ? ` · Mejor nota: ${formatNota(best)}` : ''}` : `Destino: ${body.name} · 5 preguntas${i === nextIdx ? ' · ¡Siguiente recomendada!' : ''}`)),
            m.exam ? null : stars(st));
        }))),
    });
    return modal;
  }

  function briefing(m) {
    mission = m;
    const body = BODY_BY_ID[m.target];
    const text = m.exam
      ? ['Cadete, ha llegado el momento: el ', h('b', null, 'examen final'), ' de la Academia Espacial. Vuela hasta ', h('b', null, 'la Tierra'), ' y responde a 10 preguntas de todo el tema. Como en el cole, la nota será sobre 10 y al final verás la corrección.']
      : ['Cadete, tu misión es investigar ', h('b', null, body.name), '. Vuela hasta allí siguiendo la ', h('b', null, 'flecha naranja'), ' (o usa el hipersalto con ', h('span', { class: 'kbd' }, 'M'), ') y responde a las preguntas del Mando Espacial.', h('br'), h('br'), 'Tienes ', h('b', null, '3 escudos 🛡️'), ': cada fallo te quita uno. ¡Que no se te acaben!'];
    const md = openModal({
      title: m.exam ? '📝 Examen final' : `Misión: ${m.title}`,
      className: 'narrow',
      body: h('div', { class: 'briefing' }, h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '10px' } }, planetThumb(body), h('span', { class: 'who' }, '📡 Mando Espacial:')), h('p', null, ...text)),
      foot: [
        h('button', { class: 'btn', onclick: () => { md.close(); openBoard(); } }, '← Misiones'),
        h('button', { class: 'btn primary big', onclick: () => { md.close(); launch(); } }, '🚀 ¡Despegar!'),
      ],
    });
  }

  function launch() {
    phase = 'flying';
    const entry = game.system.get(mission.target);
    game.setTarget(entry);
    hud.setObjective(mission.exam ? 'Examen final' : 'Misión en curso', `Vuela hasta ${BODY_BY_ID[mission.target].name}`, 'Sigue la flecha naranja · M = hipersalto');
  }

  function startQuiz() {
    phase = 'quiz';
    game.setTarget(null);
    hud.clearObjective();
    game.controls.stop();
    const m = mission;
    const before = rankFor(progress.points).name;
    if (m.exam) {
      runQuiz({
        title: '📝 Examen final',
        questions: examQuestions(),
        exam: true,
        onAbort: openBoard,
        onFinish: ({ results }) => {
          const nota = Math.round((results.reduce((s, r) => s + r.score, 0) / results.length) * 100) / 10;
          progress.exams.push({ date: Date.now(), nota });
          progress.points += Math.round(nota * 50);
          save();
          badge();
          rankToast(before);
          showExamResult({ results, nota, onBoard: openBoard, onRetry: () => briefing(m) });
        },
      });
      return;
    }
    runQuiz({
      title: `🎯 ${m.title}`,
      questions: missionQuestions(m),
      shields: 3,
      onFly: (q, resolve) => startFlyQuestion(q, resolve),
      onReview: (q) => openReviewFor(q),
      onAbort: openBoard,
      onFinish: ({ results, shieldsLeft, failed }) => {
        const lost = 3 - shieldsLeft;
        const starsWon = failed ? 0 : lost === 0 ? 3 : lost === 1 ? 2 : 1;
        const points = results.reduce((s, r) => s + Math.round(r.score * 100), 0) + starsWon * 100;
        progress.points += points;
        const prev = progress.missions[m.id]?.stars || 0;
        progress.missions[m.id] = { stars: Math.max(prev, starsWon) };
        save();
        badge();
        const after = rankFor(progress.points).name;
        const idx = MISSIONS.indexOf(m);
        const next = MISSIONS[idx + 1];
        phase = 'idle';
        showMissionResult({
          mission: m, results, failed, starsWon, points,
          rankUp: after !== before ? after : null,
          onBoard: openBoard,
          onRetry: () => briefing(m),
          onNext: next ? () => briefing(next) : null,
        });
      },
    });
  }

  function startReview(ids) {
    const qs = ids.map((id) => QUESTION_BY_ID[id]).slice(0, 8);
    phase = 'quiz';
    runQuiz({
      title: '🔁 Repaso de fallos',
      questions: qs,
      shields: 0,
      onReview: (q) => openReviewFor(q),
      onAbort: openBoard,
      onFinish: ({ results }) => {
        const ok = results.filter((r) => r.correct).length;
        progress.points += ok * 50;
        save();
        badge();
        toast(`🔁 Repaso terminado: ${ok}/${results.length} correctas (+${ok * 50} puntos)`, 'ok', 4000);
        openBoard();
      },
    });
  }

  function rankToast(before) {
    const after = rankFor(progress.points).name;
    if (after !== before) toast(`🎉 ¡Nuevo rango: ${after}!`, 'gold', 4000);
  }

  function startFlyQuestion(q, resolve) {
    phase = 'fly-question';
    flyQ = { q, resolve };
    hud.setObjective('🛸 Pregunta de vuelo', q.q, 'Pilota hasta el astro correcto y pulsa E cuando estés cerca');
  }

  function answerFly(id) {
    if (!flyQ) return;
    const { resolve } = flyQ;
    flyQ = null;
    phase = 'quiz';
    hud.clearObjective();
    hud.setAnswerPrompt(null);
    game.controls.stop();
    resolve(id);
  }

  return {
    id: 'adventure',
    openBoard,
    enter() {
      hud.setMode('adventure');
      badge();
      game.info.hide();
      proximity.reset();
      openBoard();
    },
    exit() {
      game.info.hide();
      phase = 'idle';
      flyQ = null;
      game.setTarget(null);
      hud.clearObjective();
      hud.setAnswerPrompt(null);
    },
    onKey(code) {
      if (code === 'KeyE' && phase === 'fly-question' && game.near.inZone && !state.autopilot) {
        sfx.click();
        answerFly(game.near.entry.id);
      }
    },
    update() {
      const near = game.near;
      if (phase === 'flying' && !state.autopilot && near.inZone && near.entry.id === mission.target && state.modals === 0) {
        sfx.stamp();
        toast(`📡 ¡Has llegado a ${BODY_BY_ID[mission.target].name}! Atento a las preguntas…`, 'ok');
        startQuiz();
      }
      if (phase === 'fly-question') {
        if (near.inZone && !state.autopilot) hud.setAnswerPrompt(`¿Elegir ${near.entry.body.name}?`, () => answerFly(near.entry.id));
        else hud.setAnswerPrompt(null);
      }
      // Fichas también en Aventura, salvo durante las preguntas (para no copiar) y al llegar al objetivo de la misión.
      const asking = phase === 'quiz' || phase === 'fly-question' || (phase === 'flying' && near.entry?.id === mission?.target);
      if (!state.autopilot) proximity.update(near, { canShow: state.modals === 0, hidden: asking });
    },
  };
}
