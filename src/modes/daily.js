// Reto del día: 8 preguntas centradas en lo que más falla, con racha de días y cuenta atrás al examen.
import { h } from '../utils/dom.js';
import { openModal } from '../ui/modal.js';
import { runQuiz } from '../ui/quiz.js';
import { reviewList } from '../ui/results.js';
import { QUESTIONS, QUESTION_BY_ID } from '../data/questions.js';
import { progress, save, pendingWrongIds } from '../utils/storage.js';
import { pick } from '../utils/pick.js';
import { sfx } from '../utils/audio.js';

const DAILY_SIZE = 8;

// Fechas siempre en hora local, como 'YYYY-MM-DD'.
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const todayKey = () => dateKey();
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + n));
}

export function daysUntilExam() {
  if (!progress.examDate) return null;
  const [y, m, d] = progress.examDate.split('-').map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

export function examCountdownText() {
  const n = daysUntilExam();
  if (n === null || n < 0) return null;
  if (n === 0) return '🍀 ¡Hoy es el examen! ¡Mucha suerte!';
  if (n === 1) return '📅 ¡Mañana es el examen!';
  return `📅 Faltan ${n} días para el examen`;
}

// Estado del reto: si ya está hecho hoy y la racha viva (se pierde si ayer no se hizo).
export function dailyStatus() {
  const today = todayKey();
  const d = progress.daily;
  const done = d.last === today;
  const alive = done || d.last === addDays(today, -1);
  return { done, streak: alive ? d.streak : 0, best: d.best || 0 };
}

export function dailyQuestions() {
  const pool = QUESTIONS.filter((q) => q.type !== 'vuelo');
  // Hasta 3 fallos pendientes seguro; el resto, muestreo ponderado (fallos y no vistas salen más).
  const wrong = pendingWrongIds().map((id) => QUESTION_BY_ID[id]).filter((q) => q && q.type !== 'vuelo');
  const first = pick(wrong, Math.min(3, wrong.length), { maxPerType: 3 });
  const rest = pick(pool, DAILY_SIZE - first.length, { avoid: new Set(first.map((q) => q.id)) });
  return [...first, ...rest].sort(() => Math.random() - 0.5);
}

// Registra un reto terminado y devuelve lo ganado.
export function completeDaily(results) {
  const today = todayKey();
  const d = progress.daily;
  const firstToday = d.last !== today;
  if (firstToday) {
    d.streak = d.last === addDays(today, -1) ? (d.streak || 0) + 1 : 1;
    d.last = today;
    d.best = Math.max(d.best || 0, d.streak);
  }
  const ok = results.filter((r) => r.correct).length;
  d.days[today] = { ok: Math.max(ok, d.days[today]?.ok || 0), total: results.length };
  const points = ok * 50 + (firstToday ? 150 : 0);
  progress.points += points;
  save();
  return { ok, points, firstToday, streak: d.streak, best: d.best };
}

export function startDaily({ onClose = () => {}, onReview } = {}) {
  runQuiz({
    title: '🔥 Reto del día',
    questions: dailyQuestions(),
    shields: 0,
    onReview,
    onAbort: onClose,
    onFinish: ({ results }) => {
      const r = completeDaily(results);
      sfx.fanfare();
      const countdown = examCountdownText();
      const wrong = results.filter((x) => !x.correct);
      const m = openModal({
        title: '🔥 Reto del día',
        className: 'narrow',
        closable: false,
        body: h('div', { class: 'daily-result' },
          h('div', { class: 'flame' }, '🔥', h('span', null, r.streak)),
          h('h3', null, r.firstToday ? (r.streak > 1 ? `¡Racha de ${r.streak} días!` : '¡Primer día de racha!') : '¡Reto repetido!'),
          h('p', null, `Has acertado ${r.ok} de ${results.length} preguntas.`),
          h('div', { class: 'pts' }, `+${r.points} puntos`),
          h('p', { class: 'note' }, r.firstToday ? 'Vuelve mañana para que la racha siga creciendo.' : 'La racha solo sube una vez al día, pero repasar siempre suma puntos.', ` Mejor racha: ${r.best} ${r.best === 1 ? 'día' : 'días'}.`),
          countdown ? h('p', { class: 'countdown' }, countdown) : null,
          wrong.length ? h('div', { style: { textAlign: 'left', marginTop: '12px' } }, h('h4', null, 'Repasa tus fallos:'), reviewList(wrong)) : null),
        foot: [h('button', { class: 'btn primary', onclick: () => { m.close(); onClose(); } }, '¡Hecho!')],
      });
    },
  });
}
