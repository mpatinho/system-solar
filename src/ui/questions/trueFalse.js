// Verdadero o falso. Si la frase es falsa, hay que elegir además la frase correcta.
import { h } from '../../utils/dom.js';
import { choiceList } from './choice.js';

export function renderTrueFalse(q, { onChange }) {
  let picked = null;
  let fix = null;
  const fixBox = h('div', { class: 'vf-fix' });
  const btnT = h('button', { class: 'opt', type: 'button' }, '✔ Verdadero');
  const btnF = h('button', { class: 'opt', type: 'button' }, '✘ Falso');
  const pick = (val) => {
    if (picked !== null) return;
    picked = val;
    btnT.classList.toggle('selected', val === true);
    btnF.classList.toggle('selected', val === false);
    btnT.disabled = btnF.disabled = true;
    if (val === false && q.answer === false && q.fix) {
      fix = choiceList(q.fix.options, q.fix.answer, { onChange });
      fixBox.append(h('p', null, '¡Bien visto! Ahora elige cómo sería la frase correcta:'), fix.el);
    }
    onChange();
  };
  btnT.addEventListener('click', () => pick(true));
  btnF.addEventListener('click', () => pick(false));
  return {
    el: h('div', null, h('div', { class: 'vf-buttons' }, btnT, btnF), fixBox),
    isComplete: () => picked !== null && (!fix || fix.isComplete()),
    onKey(k) {
      if (picked === null) { if (k.toUpperCase() === 'V') pick(true); if (k.toUpperCase() === 'F') pick(false); }
      else fix?.pickByKey(k);
    },
    check() {
      const right = picked === q.answer;
      (q.answer ? btnT : btnF).classList.add('correct');
      if (!right) (picked ? btnT : btnF).classList.add('wrong');
      let score = right ? 1 : 0;
      if (fix) { fix.lock(); fix.mark(); if (fix.selected !== q.fix.answer) score = 0.5; }
      const answerText = q.answer ? 'Verdadero' : `Falso. ${q.fix ? q.fix.options[q.fix.answer] : ''}`;
      return { score, answerText };
    },
  };
}
