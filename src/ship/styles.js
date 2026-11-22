// Catálogo del hangar: modelos, pinturas, llamas y estelas que se desbloquean jugando.
// req: points (puntos), stamps (sellos del pasaporte), examNota (nota del examen final),
//      streak (mejor racha del reto diario), asteroids (récord del minijuego de asteroides).

export const MODELS = [
  { id: 'caza', name: 'Caza estelar', icon: '🛩️' },
  { id: 'cohete', name: 'Cohete clásico', icon: '🚀', req: { points: 1500 } },
  { id: 'platillo', name: 'Platillo volante', icon: '🛸', req: { stamps: 14 } },
];

export const PAINTS = [
  { id: 'clasica', name: 'Clásica', hull: '#c9d0da', accent: '#f05a14' },
  { id: 'cometa', name: 'Azul cometa', hull: '#dfe9f5', accent: '#2f7fe0', req: { points: 500 } },
  { id: 'marte', name: 'Rojo Marte', hull: '#b8442a', accent: '#f0e6d8', req: { points: 1000 } },
  { id: 'neptuno', name: 'Neptuno', hull: '#2b4fb8', accent: '#9fe6ff', req: { points: 2500 } },
  { id: 'jupiter', name: 'Júpiter', hull: '#d9b98c', accent: '#9c4f2a', req: { points: 3500 } },
  { id: 'sigilo', name: 'Sigilo', hull: '#2a2e36', accent: '#29e0ff', metalness: 0.5, roughness: 0.55, req: { points: 6000 } },
  { id: 'dorada', name: 'Dorada', hull: '#e8b84a', accent: '#fff2c4', metalness: 0.95, roughness: 0.22, req: { examNota: 9 } },
];

export const FLAMES = [
  { id: 'azul', name: 'Azul', core: [0.9, 1.4, 3.2], edge: [0.2, 0.5, 2.0] },
  { id: 'naranja', name: 'Naranja', core: [3.2, 1.6, 0.5], edge: [2.0, 0.45, 0.1], req: { points: 800 } },
  { id: 'verde', name: 'Verde', core: [1.0, 3.2, 1.2], edge: [0.2, 1.8, 0.4], req: { points: 2000 } },
  { id: 'morada', name: 'Morada', core: [2.4, 1.0, 3.2], edge: [1.2, 0.2, 2.0], req: { streak: 3 } },
  { id: 'arcoiris', name: 'Arcoíris', rainbow: true, req: { streak: 7 } },
];

export const TRAILS = [
  { id: 'ninguna', name: 'Sin estela' },
  { id: 'chispas', name: 'Chispas', color: [1.6, 0.9, 0.35], size: 0.07, life: 0.9, req: { points: 1200 } },
  { id: 'estrellas', name: 'Polvo de estrellas', color: [0.8, 1.0, 1.7], size: 0.1, life: 1.8, req: { points: 4000 } },
  { id: 'arcoiris', name: 'Arcoíris', rainbow: true, size: 0.09, life: 1.5, req: { asteroids: 1500 } },
];

export const CATEGORIES = [
  { key: 'model', title: 'Modelo', items: MODELS },
  { key: 'paint', title: 'Pintura', items: PAINTS },
  { key: 'flame', title: 'Llama', items: FLAMES },
  { key: 'trail', title: 'Estela', items: TRAILS },
];

export const DEFAULT_STYLE = { model: 'caza', paint: 'clasica', flame: 'azul', trail: 'ninguna' };

export function findItem(key, id) {
  const cat = CATEGORIES.find((c) => c.key === key);
  return cat.items.find((i) => i.id === id) || cat.items[0];
}

export function reqText(req) {
  if (!req) return '';
  if (req.points) return `Consigue ${req.points.toLocaleString('es-ES')} puntos`;
  if (req.stamps) return `Completa el pasaporte (${req.stamps} sellos)`;
  if (req.examNota) return `Saca un ${req.examNota} o más en el examen final`;
  if (req.streak) return `Haz el reto del día ${req.streak} días seguidos`;
  if (req.asteroids) return `Haz ${req.asteroids.toLocaleString('es-ES')} puntos en «Lluvia de respuestas»`;
  return '';
}

export function isUnlocked(item, p) {
  const r = item.req;
  if (!r) return true;
  if (r.points && (p.points || 0) < r.points) return false;
  if (r.stamps && Object.keys(p.visited || {}).length < r.stamps) return false;
  if (r.examNota && !(p.exams || []).some((e) => e.nota >= r.examNota)) return false;
  if (r.streak && (p.daily?.best || 0) < r.streak) return false;
  if (r.asteroids && (p.games?.asteroids?.best || 0) < r.asteroids) return false;
  return true;
}

// Objetos desbloqueados que todavía no se han anunciado (los gratuitos no cuentan).
export function newUnlocks(p) {
  const seen = new Set(p.hangar?.seen || []);
  const out = [];
  for (const c of CATEGORIES) {
    for (const it of c.items) {
      const key = `${c.key}:${it.id}`;
      if (it.req && !seen.has(key) && isUnlocked(it, p)) out.push({ key, category: c, item: it });
    }
  }
  return out;
}

// Estilo guardado, corrigiendo lo que ya no exista o no esté desbloqueado.
export function currentStyle(p) {
  const s = { ...DEFAULT_STYLE, ...(p.hangar || {}) };
  for (const c of CATEGORIES) {
    const it = c.items.find((i) => i.id === s[c.key]);
    if (!it || !isUnlocked(it, p)) s[c.key] = DEFAULT_STYLE[c.key];
  }
  return s;
}
