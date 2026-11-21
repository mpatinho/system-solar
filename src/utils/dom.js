// Pequeñas utilidades de DOM y texto.

export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Quita tildes, mayúsculas, signos de ordinal y espacios extra (para «completa los huecos»).
export function normalizeText(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[º°ª.,;:!¡?¿«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function formatNota(n) {
  return n.toFixed(1).replace('.', ',').replace(',0', '');
}

export function thumbStyle(body) {
  if (!body) return {};
  if (body.id === 'sol') return { backgroundImage: 'url(textures/2k_sun.jpg)', backgroundSize: '200% 100%' };
  if (body.texture) return { backgroundImage: `url(textures/${body.texture})` };
  const fallback = {
    pluton: 'radial-gradient(circle at 60% 45%, #f4ead8 0 18%, #c9a27e 30%, #7a5a45 70%)',
    cometa: 'radial-gradient(circle at 40% 40%, #e8f6ff, #7fb6d9 35%, #1c2b3d 70%)',
    voyager: 'radial-gradient(circle at 50% 50%, #ffe7a8 0 10%, #8a7cff 30%, #1b1446 75%)',
  };
  return { background: fallback[body.id] || '#555' };
}

export function planetThumb(body, extraClass = '') {
  return h('div', { class: `planet-thumb ${body?.id === 'sol' ? 'sun' : ''} ${extraClass}`, style: thumbStyle(body) });
}
