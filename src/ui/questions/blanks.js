// Completar huecos escribiendo (no se tienen en cuenta tildes ni mayúsculas).
// Con un mando conectado aparece además un banco de palabras para elegir sin teclado.
import { h, normalizeText, shuffle } from '../../utils/dom.js';
import { pad } from '../../input/gamepad.js';

export function renderBlanks(q, { onChange, onSubmit }) {
  const inputs = [];
  const parts = q.text.split(/(\{\d+\})/);
  const line = h('div', { class: 'blank-text' }, parts.map((p) => {
    const m = p.match(/^\{(\d+)\}$/);
    if (!m) return p;
    const input = h('input', { class: 'blank', type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': `Hueco ${Number(m[1]) + 1}` });
    input.dataset.idx = m[1];
    // preventDefault: si no, el mismo Enter «pulsa» también el botón «Siguiente» que recibe el foco.
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onSubmit?.(); } e.stopPropagation(); });
    inputs.push(input);
    return input;
  }));

  // ---------- Banco de palabras ----------
  const useBank = pad.connected && Array.isArray(q.bank) && q.bank.length > 0;
  const fromChip = new Map(); // hueco → ficha que lo rellena
  let target = inputs[0];
  let locked = false;
  const chips = useBank
    ? shuffle([...q.answers.map((a) => a[0]), ...q.bank]).map((word) => {
      const chip = h('button', { class: 'chip word', type: 'button' }, word);
      chip.addEventListener('click', () => place(chip));
      return chip;
    })
    : [];

  const markTarget = () => inputs.forEach((i) => i.classList.toggle('target', useBank && i === target && !locked));
  const release = (input) => {
    const chip = fromChip.get(input);
    if (chip) { chip.disabled = false; chip.classList.remove('used'); fromChip.delete(input); }
  };
  function place(chip) {
    if (locked) return;
    const input = target && !target.disabled ? target : inputs.find((i) => !i.value.trim()) || inputs[0];
    release(input);
    input.value = chip.textContent;
    fromChip.set(input, chip);
    chip.disabled = true;
    chip.classList.add('used');
    target = inputs.find((i) => !i.value.trim()) || input;
    markTarget();
    onChange();
    // Con todo relleno, el foco salta a «Comprobar»; si no, a la siguiente ficha libre.
    const nextChip = chips.find((c) => !c.disabled);
    if (inputs.every((i) => i.value.trim()) || !nextChip) chip.closest('.modal')?.querySelector('.modal-foot .primary:not(:disabled)')?.focus({ preventScroll: true });
    else if (document.activeElement === chip) nextChip.focus({ preventScroll: true });
  }

  for (const input of inputs) {
    input.addEventListener('input', () => { release(input); onChange(); });
    input.addEventListener('focus', () => { target = input; markTarget(); });
    // Con el mando, pulsar un hueco relleno lo vacía y devuelve la palabra al banco.
    input.addEventListener('click', () => {
      if (!useBank || locked) return;
      if (fromChip.has(input)) { release(input); input.value = ''; onChange(); }
      target = input;
      markTarget();
    });
  }
  markTarget();
  if (!pad.active) setTimeout(() => inputs[0]?.focus(), 50);

  const accepted = (idx, value) => q.answers[idx].some((a) => normalizeText(a) === normalizeText(value));
  return {
    el: h('div', null,
      h('p', { class: 'note' }, useBank ? 'Elige las palabras del banco (o escríbelas con el teclado).' : 'Escribe la palabra o el número que falta.'),
      line,
      useBank ? h('div', { class: 'word-bank' }, h('span', { class: 'bank-title' }, '🧩 Banco de palabras'), chips) : null),
    isComplete: () => inputs.every((i) => i.value.trim() !== ''),
    check() {
      locked = true;
      markTarget();
      chips.forEach((c) => { c.disabled = true; });
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
