// Ficha lateral de cada astro: datos, «Para el examen», curiosidad y lectura en voz alta.
import { h, planetThumb } from '../utils/dom.js';
import { speak, stopSpeaking, speechAvailable, isSpeaking } from '../utils/speech.js';
import { speechText } from '../data/bodies.js';
import { LESSONS } from './demos/index.js';

export function createInfoPanel({ onLesson }) {
  let el = null;
  let currentId = null;

  function hide() {
    stopSpeaking();
    el?.remove();
    el = null;
    currentId = null;
  }

  function show(body, { visited = false } = {}) {
    if (currentId === body.id) return;
    hide();
    currentId = body.id;
    const speakBtn = speechAvailable()
      ? h('button', { class: 'btn small', onclick: () => {
          if (isSpeaking()) { stopSpeaking(); speakBtn.textContent = '🔊 Escuchar'; return; }
          speakBtn.textContent = '⏹ Parar';
          speak(speechText(body), () => { speakBtn.textContent = '🔊 Escuchar'; });
        } }, '🔊 Escuchar')
      : null;
    const lessonBtns = (body.lessons || []).map((id) => h('button', { class: 'btn small cyan', onclick: () => onLesson(id) }, `${LESSONS[id].icon} ${LESSONS[id].title}`));
    el = h('aside', { class: 'info-panel', 'aria-label': `Ficha de ${body.name}` },
      h('div', { class: 'info-head' },
        planetThumb(body),
        h('div', null,
          h('h2', null, body.name, visited ? h('span', { class: 'visited-tag' }, '✓ sello') : null),
          h('div', { class: 'subtitle' }, body.subtitle)),
        h('button', { class: 'modal-close close', title: 'Cerrar ficha', onclick: () => { hide(); dismissed.add(body.id); } }, '×')),
      h('table', { class: 'facts' }, h('tbody', null, body.facts.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, v))))),
      h('div', { class: 'exam-box' }, h('h4', null, '📌 Para el examen'), h('ul', null, body.exam.map((t) => h('li', null, t)))),
      h('div', { class: 'curio-box' }, h('h4', null, '💡 Curiosidad'), h('p', null, body.curiosity)),
      h('div', { class: 'info-actions' }, speakBtn, lessonBtns),
    );
    document.getElementById('ui').append(el);
  }

  // Fichas cerradas a mano: no se vuelven a abrir hasta salir de la zona.
  const dismissed = new Set();

  return {
    show,
    hide,
    get currentId() { return currentId; },
    get el() { return el; },
    // Cerrar a mano (Esc, B o ×): no se vuelve a abrir hasta salir de la zona.
    dismiss() { if (currentId) dismissed.add(currentId); hide(); },
    isDismissed: (id) => dismissed.has(id),
    clearDismissed: (keepId) => { for (const id of [...dismissed]) if (id !== keepId) dismissed.delete(id); },
  };
}
