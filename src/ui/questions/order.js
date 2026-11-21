// Ordenar arrastrando (o con las flechas ▲▼).
import { h, shuffle } from '../../utils/dom.js';

export function renderOrder(q) {
  let items = shuffle(q.items);
  for (let tries = 0; tries < 10 && items.every((it, i) => it === q.items[i]); tries++) items = shuffle(q.items);
  const list = h('ol', { class: 'sortable' });
  let dragIdx = null;
  let locked = false;
  const draw = () => {
    list.replaceChildren(...items.map((text, i) => {
      const li = h('li', { draggable: locked ? 'false' : 'true' },
        h('span', { class: 'pos' }, i + 1),
        h('span', { class: 'txt' }, text),
        h('button', { class: 'mv', type: 'button', title: 'Subir', disabled: locked || i === 0, onclick: () => move(i, i - 1) }, '▲'),
        h('button', { class: 'mv', type: 'button', title: 'Bajar', disabled: locked || i === items.length - 1, onclick: () => move(i, i + 1) }, '▼'));
      li.addEventListener('dragstart', (e) => { dragIdx = i; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); });
      li.addEventListener('dragend', () => { li.classList.remove('dragging'); dragIdx = null; });
      li.addEventListener('dragover', (e) => { e.preventDefault(); li.classList.add('over'); });
      li.addEventListener('dragleave', () => li.classList.remove('over'));
      li.addEventListener('drop', (e) => { e.preventDefault(); li.classList.remove('over'); if (dragIdx !== null) move(dragIdx, i); });
      return li;
    }));
  };
  const move = (from, to) => {
    if (locked || to < 0 || to >= items.length || from === to) return;
    const [it] = items.splice(from, 1);
    items.splice(to, 0, it);
    draw();
  };
  draw();
  return {
    el: h('div', null, h('p', { class: 'note' }, 'Arrastra los elementos o usa las flechas ▲▼.'), list),
    isComplete: () => true,
    check() {
      locked = true;
      draw();
      let ok = 0;
      [...list.children].forEach((li, i) => {
        const good = items[i] === q.items[i];
        if (good) ok++;
        li.classList.add(good ? 'correct' : 'wrong');
      });
      return { score: ok / q.items.length, answerText: q.items.join(' → ') };
    },
  };
}
