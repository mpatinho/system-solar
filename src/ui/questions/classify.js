// Clasificar: se pulsa una ficha y luego el grupo (o se arrastra).
import { h, shuffle } from '../../utils/dom.js';

export function renderClassify(q, { onChange }) {
  const placed = new Map(); // índice de ficha → grupo
  let selected = null;
  let locked = false;
  const chips = shuffle(q.items.map((_, i) => i)).map((i) => {
    const c = h('button', { class: 'chip', type: 'button', draggable: 'true' }, q.items[i][0]);
    c.dataset.idx = i;
    c.addEventListener('click', (e) => { e.stopPropagation(); if (locked) return; selected = selected === i ? null : i; refresh(); });
    c.addEventListener('dragstart', (e) => { selected = i; e.dataTransfer.setData('text/plain', String(i)); refresh(); });
    return c;
  });
  const pool = h('div', { class: 'classify-pool', 'data-gp': true, tabindex: '-1' });
  pool.addEventListener('click', () => { if (selected !== null && !locked) { placed.delete(selected); selected = null; refresh(); } });
  const bins = q.groups.map((name, g) => {
    const list = h('div', { class: 'chips' });
    const bin = h('div', { class: 'bin', 'data-gp': true, tabindex: '-1' }, h('h4', null, name), list);
    bin.addEventListener('click', () => drop(g));
    bin.addEventListener('dragover', (e) => { e.preventDefault(); bin.classList.add('over'); });
    bin.addEventListener('dragleave', () => bin.classList.remove('over'));
    bin.addEventListener('drop', (e) => { e.preventDefault(); bin.classList.remove('over'); drop(g); });
    return { bin, list };
  });
  const drop = (g) => {
    if (selected === null || locked) return;
    placed.set(selected, g);
    selected = null;
    refresh();
  };
  const refresh = () => {
    pool.replaceChildren();
    bins.forEach((b) => b.list.replaceChildren());
    chips.forEach((c) => {
      const i = Number(c.dataset.idx);
      c.classList.toggle('sel', selected === i);
      if (placed.has(i)) bins[placed.get(i)].list.append(c);
      else pool.append(c);
    });
    bins.forEach((b) => b.bin.classList.toggle('target', selected !== null));
    if (!pool.children.length) pool.append(h('span', { class: 'note' }, '¡Todas colocadas! Pulsa «Comprobar».'));
    onChange();
  };
  refresh();
  return {
    el: h('div', null, h('p', { class: 'note' }, 'Pulsa una ficha y después el grupo donde va (también puedes arrastrarla).'), pool, h('div', { class: 'classify-bins' }, bins.map((b) => b.bin))),
    isComplete: () => placed.size === q.items.length,
    check() {
      locked = true;
      let ok = 0;
      chips.forEach((c) => {
        const i = Number(c.dataset.idx);
        const good = placed.get(i) === q.items[i][1];
        if (good) ok++;
        c.classList.add(good ? 'correct' : 'wrong');
        c.disabled = true;
      });
      const answerText = q.groups.map((g, gi) => `${g}: ${q.items.filter((it) => it[1] === gi).map((it) => it[0]).join(', ')}`).join(' · ');
      return { score: ok / q.items.length, answerText };
    },
  };
}
