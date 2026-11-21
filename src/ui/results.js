// Pantallas de resultado: misión (estrellas y puntos) y examen final (nota sobre 10).
import { h, formatNota } from '../utils/dom.js';
import { openModal } from './modal.js';
import { questionTitle } from './questions/index.js';
import { sfx } from '../utils/audio.js';

export function calificacion(nota) {
  if (nota >= 9) return ['Sobresaliente', 'sb'];
  if (nota >= 7) return ['Notable', 'nt'];
  if (nota >= 6) return ['Bien', 'bi'];
  if (nota >= 5) return ['Suficiente', 'su'];
  return ['Insuficiente', 'in'];
}

export function reviewList(results) {
  return h('div', { class: 'review' }, results.map((r, i) => {
    const cls = r.correct ? 'ok' : r.score > 0 ? 'partial' : 'bad';
    return h('div', { class: `review-item ${cls}` },
      h('b', null, `${i + 1}. ${questionTitle(r.q)} ${r.correct ? '✅' : r.score > 0 ? '🟡' : '❌'}`),
      r.correct ? null : h('div', { class: 'ans' }, '✔ ', r.answerText),
      r.correct ? null : h('div', { class: 'exp' }, r.q.explain));
  }));
}

export function stars(n, max = 3) {
  return h('span', { class: 'stars' }, Array.from({ length: max }, (_, i) => h('span', { class: i < n ? 'on' : '' }, '★')));
}

export function showMissionResult({ mission, results, failed, starsWon, points, rankUp, onNext, onBoard, onRetry }) {
  if (failed) sfx.wrong(); else sfx.fanfare();
  const ok = results.filter((r) => r.correct).length;
  const body = h('div', { class: 'mission-result' },
    h('div', { style: { fontSize: '54px' } }, failed ? '💥' : '🏅'),
    h('h3', { style: { fontFamily: 'var(--font-title)', fontSize: '26px', margin: '4px 0' } }, failed ? '¡Misión fallida!' : '¡Misión cumplida!'),
    failed ? h('p', null, 'Te has quedado sin escudos. Repasa las explicaciones y vuelve a intentarlo: ¡seguro que ahora lo consigues!') : stars(starsWon),
    h('p', null, `Has acertado ${ok} de ${results.length} preguntas.`),
    h('div', { class: 'pts' }, `+${points} puntos`),
    rankUp ? h('p', { style: { fontSize: '20px', color: '#ffb547', fontWeight: 800 } }, `🎉 ¡Has subido de rango: ahora eres ${rankUp}!`) : null,
    results.some((r) => !r.correct) ? h('div', { style: { textAlign: 'left', marginTop: '14px' } }, h('h4', null, 'Repasa tus fallos:'), reviewList(results.filter((r) => !r.correct))) : null,
  );
  const foot = [h('button', { class: 'btn', onclick: () => { m.close(); onBoard(); } }, '📋 Misiones')];
  if (failed || starsWon < 3) foot.push(h('button', { class: 'btn', onclick: () => { m.close(); onRetry(); } }, '🔁 Repetir'));
  if (onNext && !failed) foot.push(h('button', { class: 'btn primary', onclick: () => { m.close(); onNext(); } }, 'Siguiente misión →'));
  const m = openModal({ title: mission.title, body, foot, closable: false, className: 'narrow' });
  return m;
}

export function showExamResult({ results, nota, onBoard, onRetry }) {
  const [txt, cls] = calificacion(nota);
  if (nota >= 5) sfx.fanfare(); else sfx.wrong();
  const body = h('div', null,
    h('div', { class: `grade ${cls}` }, h('div', { class: 'nota' }, formatNota(nota)), h('div', { class: 'calif' }, txt)),
    h('p', { style: { textAlign: 'center' } }, nota >= 9 ? '¡Increíble! Estás listo para el examen. 🚀' : nota >= 5 ? '¡Bien hecho! Repasa los fallos y llegarás al sobresaliente.' : 'Repasa la chuleta y los fallos, y vuelve a intentarlo. ¡Tú puedes!'),
    h('h4', null, 'Corrección del examen:'),
    reviewList(results));
  const m = openModal({
    title: '📝 Examen final: resultado',
    body,
    foot: [h('button', { class: 'btn', onclick: () => { m.close(); onBoard(); } }, '📋 Misiones'), h('button', { class: 'btn primary', onclick: () => { m.close(); onRetry(); } }, '🔁 Otro examen')],
    closable: false,
  });
  return m;
}
