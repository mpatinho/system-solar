// Opción múltiple (test, definición) — también la usa «identificar».
import { h, shuffle } from '../../utils/dom.js';

const LETTERS = 'ABCDEF';

export function choiceList(options, answer, { shuffleOptions = true, onChange } = {}) {
  const numeric = options.every((o) => /^\d/.test(String(o)));
  const order = shuffleOptions && !numeric ? shuffle(options.map((_, i) => i)) : options.map((_, i) => i);
  let selected = null;
  let locked = false;
  const buttons = [];
  const el = h('div', { class: 'options' });
  order.forEach((idx, pos) => {
    const b = h('button', { class: 'opt', type: 'button' }, h('span', { class: 'letter' }, LETTERS[pos]), h('span', null, options[idx]));
    b.addEventListener('click', () => {
      if (locked) return;
      selected = idx;
      buttons.forEach(([bb, ii]) => bb.classList.toggle('selected', ii === idx));
      onChange?.();
    });
    buttons.push([b, idx]);
    el.append(b);
  });
  return {
    el,
    get selected() { return selected; },
    isComplete: () => selected !== null,
    lock() { locked = true; buttons.forEach(([b]) => { b.disabled = true; }); },
    mark() {
      buttons.forEach(([b, i]) => {
        if (i === answer) b.classList.add('correct');
        else if (i === selected) b.classList.add('wrong');
      });
    },
    // Teclas A-D / 1-4 para responder rápido
    pickByKey(key) {
      const k = key.toUpperCase();
      let pos = LETTERS.indexOf(k);
      if (pos < 0 && /^[1-6]$/.test(k)) pos = Number(k) - 1;
      if (pos >= 0 && pos < buttons.length) buttons[pos][0].click();
    },
  };
}

export function renderChoice(q, { onChange }) {
  const list = choiceList(q.options, q.answer, { onChange });
  const head = q.type === 'definicion' ? h('p', { class: 'note' }, 'Elige la definición correcta:') : null;
  return {
    el: h('div', null, head, list.el),
    isComplete: list.isComplete,
    onKey: (k) => list.pickByKey(k),
    check() {
      list.lock();
      list.mark();
      return { score: list.selected === q.answer ? 1 : 0, answerText: q.options[q.answer] };
    },
  };
}

export const questionTitle = (q) => (q.type === 'definicion' ? `¿Qué es ${q.term}?` : q.q || 'Completa la frase');
