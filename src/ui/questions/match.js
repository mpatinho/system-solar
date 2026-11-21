// Unir con flechas: se pulsa un elemento de la izquierda y luego su pareja de la derecha.
import { h, shuffle } from '../../utils/dom.js';

const COLORS = ['#ffb547', '#58c4ff', '#c084fc', '#f472b6', '#4ade80', '#facc15'];
const SVGNS = 'http://www.w3.org/2000/svg';

export function renderMatch(q, { onChange }) {
  const left = q.pairs.map((p) => p[0]);
  const rightOrder = shuffle(q.pairs.map((_, i) => i));
  const links = new Map(); // índice izquierda → índice derecha (índice de la pareja original)
  let selLeft = null;
  let locked = false;
  const svg = document.createElementNS(SVGNS, 'svg');
  const leftEls = left.map((t, i) => h('button', { class: 'item', type: 'button', onclick: () => clickLeft(i) }, t));
  const rightEls = rightOrder.map((pi) => h('button', { class: 'item', type: 'button', onclick: () => clickRight(pi) }, q.pairs[pi][1]));
  const box = h('div', { class: 'match' }, h('div', { class: 'col' }, leftEls), h('div', { class: 'col' }, rightEls));
  box.prepend(svg);

  const redraw = () => {
    svg.replaceChildren();
    const br = box.getBoundingClientRect();
    if (!br.width) return;
    let k = 0;
    for (const [li, pi] of links) {
      const a = leftEls[li].getBoundingClientRect();
      const b = rightEls[rightOrder.indexOf(pi)].getBoundingClientRect();
      const x1 = a.right - br.left, y1 = a.top + a.height / 2 - br.top;
      const x2 = b.left - br.left, y2 = b.top + b.height / 2 - br.top;
      let color = COLORS[li % COLORS.length];
      if (locked) color = pi === li ? '#4ade80' : '#f87171';
      const line = document.createElementNS(SVGNS, 'path');
      line.setAttribute('d', `M${x1},${y1} C${x1 + 30},${y1} ${x2 - 30},${y2} ${x2 - 6},${y2}`);
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', '3');
      line.setAttribute('fill', 'none');
      const head = document.createElementNS(SVGNS, 'path');
      head.setAttribute('d', `M${x2 - 12},${y2 - 6} L${x2},${y2} L${x2 - 12},${y2 + 6} Z`);
      head.setAttribute('fill', color);
      svg.append(line, head);
      leftEls[li].style.borderColor = color;
      rightEls[rightOrder.indexOf(pi)].style.borderColor = color;
      k++;
    }
  };
  const refresh = () => {
    leftEls.forEach((el, i) => { el.classList.toggle('sel', selLeft === i); if (!links.has(i)) el.style.borderColor = ''; });
    rightEls.forEach((el, j) => { if (![...links.values()].includes(rightOrder[j])) el.style.borderColor = ''; });
    requestAnimationFrame(redraw);
    onChange();
  };
  const clickLeft = (i) => {
    if (locked) return;
    if (links.has(i) && selLeft === null) { links.delete(i); selLeft = i; }
    else selLeft = selLeft === i ? null : i;
    refresh();
  };
  const clickRight = (pi) => {
    if (locked || selLeft === null) return;
    for (const [l, p] of links) if (p === pi) links.delete(l);
    links.set(selLeft, pi);
    selLeft = null;
    refresh();
  };
  const ro = new ResizeObserver(() => redraw());
  ro.observe(box);
  return {
    el: h('div', null, h('p', { class: 'note' }, 'Pulsa un elemento de la izquierda y después su pareja de la derecha.'), box),
    isComplete: () => links.size === left.length,
    dispose: () => ro.disconnect(),
    check() {
      locked = true;
      let ok = 0;
      for (const [l, p] of links) if (l === p) ok++;
      leftEls.forEach((el, i) => el.classList.add(links.get(i) === i ? 'correct' : 'wrong'));
      redraw();
      return { score: ok / left.length, answerText: q.pairs.map(([a, b]) => `${a} → ${b}`).join(' · ') };
    },
  };
}
