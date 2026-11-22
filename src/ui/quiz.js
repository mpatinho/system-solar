// Motor de preguntas: muestra cada pregunta, corrige, da explicaciones y gestiona escudos.
import { h } from '../utils/dom.js';
import { openModal } from './modal.js';
import { RENDERERS, questionTitle } from './questions/index.js';
import { TYPE_LABELS } from '../data/questions.js';
import { BODY_BY_ID } from '../data/bodies.js';
import { recordAnswer, save } from '../utils/storage.js';
import { sfx } from '../utils/audio.js';
import { pad, keyOr } from '../input/gamepad.js';

export function runQuiz({ title, questions, shields = 3, exam = false, onFly, onReview, onFinish, onAbort }) {
  let i = 0;
  let shieldsLeft = shields;
  const useShields = !exam && shields > 0;
  let current = null;
  let primary = null;
  const results = [];
  const modal = openModal({ title, body: h('div'), closable: false });

  const onKey = (e) => {
    if (modal.suspended || modal.closed) return;
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'Enter' && primary && !primary.disabled) { e.preventDefault(); primary.click(); return; }
    if (current?.onKey && e.key.length === 1) current.onKey(e.key);
  };
  window.addEventListener('keydown', onKey);

  const cleanup = () => {
    window.removeEventListener('keydown', onKey);
    current?.dispose?.();
    current = null;
  };

  function finish() {
    cleanup();
    modal.close();
    onFinish({ results, shieldsLeft, failed: useShields && shieldsLeft <= 0 });
  }

  function exitButton() {
    const b = h('button', { class: 'btn ghost' }, 'Salir');
    b.onclick = () => {
      const keep = [...modal.foot.childNodes];
      const prevPrimary = primary;
      primary = null;
      modal.setFoot(
        h('span', { style: { alignSelf: 'center', marginRight: 'auto', fontWeight: 700 } }, exam ? '¿Seguro que quieres dejar el examen?' : '¿Seguro que quieres abandonar la misión?'),
        h('button', { class: 'btn', 'data-gp-default': true, onclick: () => { modal.setFoot(...keep); primary = prevPrimary; } }, 'No, seguir'),
        h('button', { class: 'btn primary', onclick: () => { cleanup(); modal.close(); onAbort?.(); } }, 'Sí, salir'),
      );
    };
    return b;
  }

  function header(q) {
    return h('div', { class: 'quiz-head' },
      h('span', { class: 'quiz-progress' }, `Pregunta ${i + 1} de ${questions.length}`),
      h('span', { class: 'quiz-type' }, TYPE_LABELS[q.type]),
      !useShields ? null : h('span', { class: 'shields', title: 'Escudos' }, '🛡️'.repeat(Math.max(0, shieldsLeft)), h('span', { style: { opacity: 0.25 } }, '🛡️'.repeat(Math.max(0, shields - shieldsLeft)))));
  }

  function show() {
    current?.dispose?.();
    current = null;
    const q = questions[i];
    if (q.type === 'vuelo') return showFly(q);
    const checkBtn = h('button', { class: 'btn primary', disabled: true }, 'Comprobar');
    let comp = null;
    comp = RENDERERS[q.type](q, {
      onChange: () => { if (comp) checkBtn.disabled = !comp.isComplete(); },
      onSubmit: () => { if (!checkBtn.disabled) checkBtn.click(); },
    });
    current = comp;
    checkBtn.disabled = !comp.isComplete();
    const feedback = h('div');
    checkBtn.onclick = () => { checkBtn.disabled = true; answered(q, comp.check(), feedback); };
    primary = checkBtn;
    modal.setBody(header(q), h('div', { class: 'quiz-q' }, questionTitle(q)), comp.el, feedback);
    modal.setFoot(exitButton(), checkBtn);
  }

  function showFly(q) {
    const go = h('button', { class: 'btn primary big' }, '🚀 ¡Allá voy!');
    primary = go;
    modal.setBody(header(q), h('div', { class: 'fly-card' },
      h('div', { class: 'big-icon' }, '🛸'),
      h('div', { class: 'quiz-q' }, q.q),
      h('p', null, 'Pilota tu nave hasta el astro correcto. Cuando estés cerca, pulsa ', keyOr('E', 'A'), ' para elegirlo.'),
      h('p', { class: 'note' }, 'Truco: con ', keyOr('M', 'Y'), ' puedes hacer un hipersalto, pero ¡tienes que saber adónde ir!')));
    modal.setFoot(exitButton(), go);
    go.onclick = () => {
      modal.suspend();
      onFly(q, (bodyId) => {
        modal.resume();
        const correct = bodyId === q.answer;
        const r = { score: correct ? 1 : 0, answerText: BODY_BY_ID[q.answer].name };
        const fb = h('div');
        modal.setBody(header(q), h('div', { class: 'quiz-q' }, q.q), h('p', null, 'Has elegido: ', h('b', null, BODY_BY_ID[bodyId]?.name || '—')), fb);
        answered(q, r, fb);
      });
    };
  }

  function answered(q, r, feedbackEl) {
    const correct = r.score >= 0.999;
    recordAnswer(q.id, correct);
    save();
    const lostShield = useShields && r.score < 0.5;
    if (lostShield) shieldsLeft--;
    results.push({ q, ...r, correct });
    const last = i === questions.length - 1 || (useShields && shieldsLeft <= 0);
    const next = h('button', { class: 'btn primary' }, last ? 'Ver resultado' : 'Siguiente →');
    next.onclick = () => { if (last) finish(); else { i++; show(); } };
    if (exam) { sfx.click(); next.click(); return; }
    if (correct) sfx.correct(); else { sfx.wrong(); pad.rumble(0.45, 0.8, 260); }
    const cls = correct ? 'ok' : r.score > 0 ? 'partial' : 'bad';
    const titleTxt = correct ? '✅ ¡Correcto! +100 puntos' : r.score > 0 ? `🟡 ¡Casi! Has acertado el ${Math.round(r.score * 100)} %` : '❌ ¡Ups! No es correcto';
    feedbackEl.replaceChildren(h('div', { class: `feedback ${cls}` },
      h('h4', null, titleTxt),
      correct ? null : h('p', null, h('b', null, 'Respuesta correcta: '), r.answerText),
      h('p', null, q.explain),
      lostShield ? h('p', { class: 'note' }, shieldsLeft > 0 ? `🛡️ Has perdido un escudo. Te quedan ${shieldsLeft}.` : '💥 ¡Te has quedado sin escudos!') : null,
      !correct && onReview ? h('button', { class: 'btn small cyan', style: { marginTop: '8px' }, onclick: () => onReview(q) }, '📖 Repasar este tema') : null));
    feedbackEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    primary = next;
    modal.setFoot(next);
    next.focus();
  }

  show();
  return modal;
}
