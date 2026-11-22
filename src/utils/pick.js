import { questionWeight } from './storage.js';

// Muestreo ponderado (las preguntas falladas salen más) sin repetir y con variedad de tipos.
export function pick(pool, n, { maxPerType = 2, avoid = new Set() } = {}) {
  const chosen = [];
  const typeCount = {};
  let candidates = pool.filter((q) => !avoid.has(q.id));
  while (chosen.length < n && candidates.length) {
    const ok = candidates.filter((q) => (typeCount[q.type] || 0) < maxPerType);
    const list = ok.length ? ok : candidates;
    const total = list.reduce((s, q) => s + questionWeight(q.id), 0);
    let r = Math.random() * total;
    let q = list[list.length - 1];
    for (const c of list) { r -= questionWeight(c.id); if (r <= 0) { q = c; break; } }
    chosen.push(q);
    typeCount[q.type] = (typeCount[q.type] || 0) + 1;
    candidates = candidates.filter((c) => c !== q);
  }
  return chosen;
}
