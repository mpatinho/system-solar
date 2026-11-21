// Ventanas modales, avisos (toasts) y destello de pantalla.
import { h } from '../utils/dom.js';
import { state } from '../state.js';

const stack = [];
const uiRoot = () => document.getElementById('ui');

export function openModal({ title, body, foot, className = '', closable = true, onClose, blocking = true }) {
  let closed = false;
  let suspended = false;
  const api = {};
  const close = () => {
    if (closed) return;
    closed = true;
    back.remove();
    if (blocking && !suspended) state.modals = Math.max(0, state.modals - 1);
    const i = stack.indexOf(api);
    if (i >= 0) stack.splice(i, 1);
    onClose?.();
  };
  const titleEl = h('h2', null, title);
  const head = h('div', { class: 'modal-head' }, titleEl, closable && h('button', { class: 'modal-close', 'aria-label': 'Cerrar', title: 'Cerrar (Esc)', onclick: close }, '×'));
  const bodyEl = h('div', { class: 'modal-body' }, body);
  const footEl = h('div', { class: 'modal-foot' }, foot);
  if (!foot) footEl.classList.add('hidden');
  const modal = h('div', { class: `modal ${className}`, role: 'dialog', 'aria-label': title }, head, bodyEl, footEl);
  const back = h('div', { class: 'modal-back' }, modal);
  if (closable) back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
  uiRoot().append(back);
  if (blocking) state.modals++;
  Object.assign(api, {
    close,
    el: modal,
    back,
    body: bodyEl,
    foot: footEl,
    closable,
    // Oculta la ventana temporalmente y deja pilotar (preguntas de vuelo).
    suspend() {
      if (suspended || closed) return;
      suspended = true;
      back.classList.add('hidden');
      if (blocking) state.modals = Math.max(0, state.modals - 1);
    },
    resume() {
      if (!suspended || closed) return;
      suspended = false;
      back.classList.remove('hidden');
      if (blocking) state.modals++;
    },
    setTitle(t) { titleEl.textContent = t; },
    setBody(...nodes) { bodyEl.replaceChildren(...nodes.flat()); bodyEl.scrollTop = 0; },
    setFoot(...nodes) { footEl.replaceChildren(...nodes.flat()); footEl.classList.toggle('hidden', nodes.flat().length === 0); },
  });
  // Getters reales (Object.assign copiaría solo el valor del momento).
  Object.defineProperties(api, {
    closed: { get: () => closed, enumerable: true },
    suspended: { get: () => suspended, enumerable: true },
  });
  stack.push(api);
  return api;
}

export function closeTopModal() {
  const top = [...stack].reverse().find((m) => !m.suspended);
  if (top && top.closable) { top.close(); return true; }
  return false;
}

export const modalOpen = () => stack.some((m) => !m.suspended);

export function closeAllModals() {
  [...stack].forEach((m) => m.close());
}

export function toast(text, type = '', ms = 2600) {
  const el = h('div', { class: `toast ${type}` }, text);
  const box = document.getElementById('toasts');
  box.append(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, ms);
}

export function flash() {
  const f = document.getElementById('flash');
  f.classList.add('on');
  requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
}
