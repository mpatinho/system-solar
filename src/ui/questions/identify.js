// Identificar un astro (vista 3D girando) o una fase de la Luna (dibujo).
import { h } from '../../utils/dom.js';
import { choiceList } from './choice.js';
import { createMini3D } from '../demos/mini3d.js';
import { drawMoonPhase, PHASE_ANGLES } from '../demos/phaseDraw.js';
import { makeCanvas, starfield } from '../demos/common.js';

export function renderIdentify(q, { onChange }) {
  const view = h('div', { class: 'identify-view' });
  let dispose = () => {};
  if (q.show.body) {
    const canvas = h('canvas', { width: 360, height: 220, style: { width: '360px', height: '220px' } });
    view.append(canvas);
    const mini = createMini3D(canvas, q.show.body, { width: 360, height: 220 });
    dispose = () => mini.dispose();
  } else if (q.show.phase) {
    const c = makeCanvas(260, 220);
    view.append(c.canvas);
    c.canvas.style.width = '260px';
    const draw = () => {
      c.ctx.fillStyle = '#02050d';
      c.ctx.fillRect(0, 0, c.w, c.h);
      starfield(c.ctx, c.w, c.h, 40, 3, 0);
      drawMoonPhase(c.ctx, c.w / 2, c.h / 2, 85, PHASE_ANGLES[q.show.phase]);
    };
    draw();
    setTimeout(draw, 300); // por si la textura aún no estaba cargada
  }
  const list = choiceList(q.options, q.answer, { onChange });
  return {
    el: h('div', null, view, list.el),
    isComplete: list.isComplete,
    onKey: (k) => list.pickByKey(k),
    dispose: () => dispose(),
    check() {
      list.lock();
      list.mark();
      return { score: list.selected === q.answer ? 1 : 0, answerText: q.options[q.answer] };
    },
  };
}
