// Progreso guardado en localStorage (siempre protegido con try/catch).

const KEY = 'explorador-sistema-solar-v1';

const DEFAULTS = () => ({
  visited: {},
  points: 0,
  missions: {},
  leitner: {},
  wrong: {},
  exams: [],
  settings: { version: 2, quality: 'auto', autoTier: null, showFps: false, invertY: false, sound: true, voice: true, orbits: true, labels: true, helpSeen: false, timeScale: 1 },
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    const data = JSON.parse(raw);
    const d = DEFAULTS();
    const settings = { ...d.settings, ...(data.settings || {}) };
    // v1 → v2: la calidad «alta» era el valor por defecto; ahora es la automática.
    if (!data.settings?.version) {
      if (settings.quality === 'alta') settings.quality = 'auto';
      settings.version = 2;
    }
    return { ...d, ...data, settings };
  } catch {
    return DEFAULTS();
  }
}

export const progress = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* almacenamiento no disponible: el juego sigue funcionando */
  }
}

export function resetProgress() {
  const keepSettings = { ...progress.settings };
  Object.assign(progress, DEFAULTS(), { settings: keepSettings });
  save();
}

export const RANKS = [
  { name: 'Cadete', min: 0, medal: '🎖️' },
  { name: 'Piloto', min: 1500, medal: '🥉' },
  { name: 'Capitán', min: 4000, medal: '🥈' },
  { name: 'Comandante', min: 8000, medal: '🥇' },
  { name: 'Almirante galáctico', min: 14000, medal: '🏆' },
];

export function rankFor(points) {
  let idx = 0;
  RANKS.forEach((r, i) => { if (points >= r.min) idx = i; });
  const next = RANKS[idx + 1];
  const cur = RANKS[idx];
  const pct = next ? (points - cur.min) / (next.min - cur.min) : 1;
  return { ...cur, index: idx, next, pct };
}

// Sistema Leitner sencillo: caja 1 (fallada) → se repite más; caja 3 → dominada.
export function recordAnswer(qid, correct) {
  const box = progress.leitner[qid] || 1;
  if (correct) progress.leitner[qid] = Math.min(3, box + 1);
  else {
    progress.leitner[qid] = 1;
    progress.wrong[qid] = (progress.wrong[qid] || 0) + 1;
  }
  if (correct && progress.wrong[qid] && progress.leitner[qid] >= 3) delete progress.wrong[qid];
}

export function questionWeight(qid) {
  const box = progress.leitner[qid];
  if (!box) return 2; // nunca vista
  return box === 1 ? 4 : box === 2 ? 1.5 : 0.6;
}

export function pendingWrongIds() {
  return Object.keys(progress.wrong).filter((id) => (progress.leitner[id] || 1) < 3);
}
