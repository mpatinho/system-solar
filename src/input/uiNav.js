// Navegación de menús y ventanas con el mando: la cruceta (o el stick) mueve el foco al botón
// más cercano en esa dirección, A pulsa, B cierra/vuelve, LB/RB cambian de pestaña y el stick derecho desplaza.
import { closeTopModal } from '../ui/modal.js';

const FOCUSABLE = 'button, input, select, textarea, [data-gp]';

function isVisible(el) {
  if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
  if (el.closest('.hidden')) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  return getComputedStyle(el).visibility !== 'hidden';
}

const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

export function createUiNav(pad) {
  let current = null;
  let scope = null;

  function candidates(root) {
    return [...root.querySelectorAll(FOCUSABLE)].filter(isVisible);
  }

  function clear() {
    current?.classList.remove('gp-focus');
    current = null;
  }

  function setFocus(el, { scroll = true } = {}) {
    if (current !== el) current?.classList.remove('gp-focus');
    current = el;
    if (!el) return;
    el.classList.add('gp-focus');
    if (document.activeElement !== el) el.focus({ preventScroll: true });
    if (scroll) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function pickDefault(root, list) {
    const inBody = (el) => !el.closest('.modal-head') && !el.matches('.modal-close');
    return list.find((el) => el.matches('[data-gp-default]'))
      || list.find((el) => el.matches('.modal-foot .primary'))
      || list.find((el) => inBody(el) && !el.matches('[data-gp]')) // mejor un botón que una caja (clasificar)
      || list.find(inBody)
      || list[0]
      || null;
  }

  // Vecino más cercano en una dirección: distancia principal + 3× la desviación lateral.
  function neighbor(dir, list) {
    const from = current.getBoundingClientRect();
    const fc = center(from);
    let best = null, bestScore = Infinity;
    for (const el of list) {
      if (el === current || el.contains(current)) continue; // ni el propio elemento ni su caja
      const r = el.getBoundingClientRect();
      const c = center(r);
      let main, cross;
      if (dir === 'down' || dir === 'up') {
        main = dir === 'down' ? c.y - fc.y : fc.y - c.y;
        if (main <= 4) continue;
        cross = Math.max(0, r.left - from.right, from.left - r.right);
      } else {
        main = dir === 'right' ? c.x - fc.x : fc.x - c.x;
        if (main <= 4) continue;
        cross = Math.max(0, r.top - from.bottom, from.top - r.bottom);
        if (cross > 0) cross += 40; // en horizontal se prefiere la misma fila
      }
      const score = main + cross * 3 + Math.abs(dir === 'down' || dir === 'up' ? c.x - fc.x : c.y - fc.y) * 0.05;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    return best;
  }

  function scroller(root) {
    return root.querySelector('.modal-body') || root;
  }

  function adjustRange(input, sign) {
    const min = Number(input.min || 0), max = Number(input.max || 100);
    const step = (max - min) / 40;
    input.value = String(Math.min(max, Math.max(min, Number(input.value) + sign * step)));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function switchTab(root, delta) {
    const tabs = [...root.querySelectorAll('.lesson-tabs > button')];
    if (tabs.length < 2) return;
    const i = Math.max(0, tabs.findIndex((t) => t.classList.contains('active')));
    const next = tabs[(i + delta + tabs.length) % tabs.length];
    next.click();
    setFocus(next);
  }

  return {
    get current() { return current; },
    // root: elemento que recibe la navegación (ventana superior, menú, ficha…). onBack: qué hacer con B.
    update(dt, root, { onBack } = {}) {
      if (root !== scope) { clear(); scope = root; }
      if (!root || !pad.active) { if (current && !pad.active) clear(); return; }
      // Minijuego en marcha: el mando lo lee el propio juego.
      if (root.matches('[data-gp-capture]')) { if (current) clear(); return; }

      // Si alguien movió el foco (por ejemplo, «Siguiente →» tras responder), se adopta.
      const ae = document.activeElement;
      if (ae && ae !== current && ae !== document.body && root.contains(ae) && ae.matches(FOCUSABLE) && isVisible(ae)) setFocus(ae, { scroll: false });
      if (!current || !current.isConnected || !root.contains(current) || !isVisible(current)) {
        const fresh = !current;
        const list = candidates(root);
        setFocus(pickDefault(root, list));
        // La primera pulsación solo enseña dónde está el foco (no mueve ni pulsa nada).
        if (fresh && (pad.nav() || pad.pressed('A'))) return;
      }

      const dir = pad.nav();
      if (dir && current) {
        if (current.matches('input[type=range]') && (dir === 'left' || dir === 'right')) {
          adjustRange(current, dir === 'right' ? 1 : -1);
        } else {
          const next = neighbor(dir, candidates(root));
          if (next) setFocus(next);
          else if (dir === 'up' || dir === 'down') scroller(root).scrollBy({ top: dir === 'down' ? 180 : -180, behavior: 'smooth' });
        }
      }
      if (Math.abs(pad.ry) > 0.05) scroller(root).scrollTop += pad.ry * 900 * dt;

      if (pad.pressed('A') && current && !current.matches('input[type=range]')) current.click();
      if (pad.pressed('B') || pad.pressed('START')) {
        if (onBack) onBack();
        else closeTopModal();
      }
      if (pad.pressed('LB')) switchTab(root, -1);
      if (pad.pressed('RB')) switchTab(root, 1);
    },
  };
}
