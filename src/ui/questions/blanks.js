// Completar huecos escribiendo (no se tienen en cuenta tildes ni mayúsculas).
import { h, normalizeText } from '../../utils/dom.js';

export function renderBlanks(q, { onChange, onSubmit }) {
  const inputs = [];
  const parts = q.text.split(/(\{\d+\})/);
  const line = h('div', { class: 'blank-text' }, parts.map((p) => {
    const m = p.match(/^\{(\d+)\}$/);
    if (!m) return p;
    const input = h('input', { class: 'blank', type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': `Hueco ${Number(m[1]) + 1}` });
    input.dataset.idx = m[1];
    input.addEventListener('input', onChange);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSubmit?.(); e.stopPropagation(); });
    inputs.push(input);
    return input;
  }));
  setTimeout(() => inputs[0]?.focus(), 50);
  const accepted = (idx, value) => q.answers[idx].some((a) => normalizeText(a) === normalizeText(value));
  return {
    el: h('div', null, h('p', { class: 'note' }, 'Escribe la palabra o el número que falta.'), line),
    isComplete: () => inputs.every((i) => i.value.trim() !== ''),
    check() {
      let ok = 0;
      const used = new Set();
      for (const input of inputs) {
        const idx = Number(input.dataset.idx);
        let good = false;
        if (q.anyOrder) {
          const j = q.answers.findIndex((_, k) => !used.has(k) && accepted(k, input.value));
          if (j >= 0) { used.add(j); good = true; }
        } else good = accepted(idx, input.value);
        input.disabled = true;
        input.classList.add(good ? 'correct' : 'wrong');
        if (good) ok++;
        else input.after(h('span', { class: 'blank-fix' }, `(${q.answers[idx][0]})`));
      }
      let filled = q.text;
      q.answers.forEach((a, i) => { filled = filled.replace(`{${i}}`, a[0]); });
      return { score: ok / inputs.length, answerText: filled };
    },
  };
}
