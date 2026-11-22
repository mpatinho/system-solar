// Comprueba que los datos del temario y el banco de preguntas son coherentes.
import { BODIES, BODY_BY_ID, speechText } from '../src/data/bodies.js';
import { toSpeech } from '../src/utils/speechText.js';
import { CATEGORIES, DEFAULT_STYLE, reqText } from '../src/ship/styles.js';
import { QUESTIONS } from '../src/data/questions.js';
import { CONCEPT_GROUPS } from '../src/data/concepts.js';
import { normalizeText } from '../src/utils/dom.js';

const errors = [];
const err = (m) => errors.push(m);

// Astros
for (const b of BODIES) {
  for (const k of ['id', 'name', 'kind', 'subtitle', 'facts', 'exam', 'curiosity', 'render']) if (!b[k]) err(`Astro ${b.id}: falta «${k}»`);
  if (!Array.isArray(b.facts) || b.facts.length < 4) err(`Astro ${b.id}: pocos datos (${b.facts?.length})`);
  if (!b.exam?.length) err(`Astro ${b.id}: sin «Para el examen»`);
  // Lo que se lee en voz alta no debe tener abreviaturas que la voz deletree («k m»).
  const spoken = toSpeech(speechText(b));
  const bad = spoken.match(/\bkm\b|°|−|\d\.º|\d\.\d{3}\b/);
  if (bad) err(`Astro ${b.id}: la voz leería «${bad[0]}» en «…${spoken.slice(Math.max(0, bad.index - 30), bad.index + 20)}…»`);
}

// Preguntas
const ids = new Set();
const types = {};
const TYPES = ['test', 'definicion', 'vf', 'ordenar', 'unir', 'huecos', 'clasificar', 'identificar', 'vuelo'];
for (const q of QUESTIONS) {
  if (ids.has(q.id)) err(`Pregunta duplicada: ${q.id}`);
  ids.add(q.id);
  types[q.type] = (types[q.type] || 0) + 1;
  if (!TYPES.includes(q.type)) err(`${q.id}: tipo desconocido ${q.type}`);
  if (!q.tags?.length) err(`${q.id}: sin etiquetas`);
  if (!q.explain) err(`${q.id}: sin explicación`);
  switch (q.type) {
    case 'test': case 'definicion': case 'identificar':
      if (!Array.isArray(q.options) || q.options.length < 2) err(`${q.id}: opciones insuficientes`);
      if (!(q.answer >= 0 && q.answer < q.options.length)) err(`${q.id}: la respuesta no está entre las opciones`);
      if (new Set(q.options).size !== q.options.length) err(`${q.id}: opciones repetidas`);
      if (q.type === 'definicion' && !q.term) err(`${q.id}: falta el término`);
      if (q.type === 'identificar' && !(q.show?.body ? BODY_BY_ID[q.show.body] : ['nueva', 'creciente', 'llena', 'menguante'].includes(q.show?.phase))) err(`${q.id}: «show» no válido`);
      break;
    case 'vf':
      if (typeof q.answer !== 'boolean') err(`${q.id}: respuesta no booleana`);
      if (q.answer === true && q.fix) err(`${q.id}: una frase verdadera no necesita corrección`);
      if (q.answer === false && q.fix && !(q.fix.answer >= 0 && q.fix.answer < q.fix.options.length)) err(`${q.id}: corrección mal definida`);
      break;
    case 'ordenar':
      if (!Array.isArray(q.items) || q.items.length < 3) err(`${q.id}: pocos elementos`);
      if (new Set(q.items).size !== q.items.length) err(`${q.id}: elementos repetidos`);
      break;
    case 'unir':
      if (!Array.isArray(q.pairs) || q.pairs.length < 2) err(`${q.id}: pocas parejas`);
      if (new Set(q.pairs.map((p) => p[1])).size !== q.pairs.length) err(`${q.id}: parejas de la derecha repetidas`);
      break;
    case 'huecos': {
      const n = (q.text.match(/\{\d+\}/g) || []).length;
      if (n !== q.answers.length) err(`${q.id}: ${n} huecos pero ${q.answers.length} respuestas`);
      // Banco de palabras (para jugar con mando): distracciones que no sean respuestas válidas.
      if (!Array.isArray(q.bank) || q.bank.length < 2) err(`${q.id}: el banco de palabras necesita al menos 2 distracciones`);
      const valid = new Set(q.answers.flat().map(normalizeText));
      for (const w of q.bank || []) if (valid.has(normalizeText(w))) err(`${q.id}: «${w}» está en el banco pero es una respuesta correcta`);
      if (new Set((q.bank || []).map(normalizeText)).size !== (q.bank || []).length) err(`${q.id}: palabras repetidas en el banco`);
      break;
    }
    case 'clasificar':
      if (!q.groups?.length) err(`${q.id}: sin grupos`);
      for (const [t, g] of q.items) if (!(g >= 0 && g < q.groups.length)) err(`${q.id}: «${t}» en un grupo que no existe`);
      break;
    case 'vuelo':
      if (!BODY_BY_ID[q.answer]) err(`${q.id}: el astro «${q.answer}» no existe`);
      break;
    default:
  }
}
for (const t of TYPES) if (!types[t]) err(`No hay ninguna pregunta de tipo ${t}`);

// Cada misión debe tener al menos 4 preguntas (sin contar las de vuelo)
const missionTags = ['sol', 'mercurio', 'venus', 'tierra', 'luna', 'marte', 'asteroides', 'jupiter', 'saturno', 'urano', 'neptuno', 'pluton', 'universo', 'general'];
for (const tag of missionTags) {
  const n = QUESTIONS.filter((q) => q.type !== 'vuelo' && q.tags.includes(tag)).length;
  if (n < 4) err(`La misión «${tag}» solo tiene ${n} preguntas`);
}
if (!CONCEPT_GROUPS.length) err('Faltan conceptos');

console.log(`Astros: ${BODIES.length} · Preguntas: ${QUESTIONS.length}`);
console.log('Por tipo:', Object.entries(types).map(([k, v]) => `${k}=${v}`).join(', '));
// Hangar: ids únicos, lo gratuito existe y cada requisito se sabe explicar.
const REQ_KEYS = ['points', 'stamps', 'examNota', 'streak', 'asteroids'];
for (const c of CATEGORIES) {
  const ids = c.items.map((i) => i.id);
  if (new Set(ids).size !== ids.length) err(`Hangar ${c.key}: ids repetidos`);
  if (!ids.includes(DEFAULT_STYLE[c.key])) err(`Hangar ${c.key}: falta el valor por defecto «${DEFAULT_STYLE[c.key]}»`);
  for (const it of c.items) {
    if (!it.req) continue;
    const keys = Object.keys(it.req);
    if (keys.length !== 1 || !REQ_KEYS.includes(keys[0])) err(`Hangar ${c.key}/${it.id}: requisito no válido`);
    if (!reqText(it.req)) err(`Hangar ${c.key}/${it.id}: requisito sin texto`);
  }
}

if (errors.length) {
  console.error(`\n❌ ${errors.length} errores:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('✅ Datos correctos');
