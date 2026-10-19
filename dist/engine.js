export const ROUNDS = 7;
export const PREVIEW_MS = 3000;
export const ANSWER_MS = 25000;
export const DATA_VERSION = '2026-10-19.3';
export const PREVIOUS_VERSION = '2026-10-19.2';
export const LEGACY_VERSION = '2026-10-19.1';
export const SUPPORTED_VERSIONS = new Set([LEGACY_VERSION, PREVIOUS_VERSION, DATA_VERSION]);
export const TIERS = {
  common: { name: 'En tierra', score: 10, color: '#a0a7ad', symbol: '●', emoji: '⬜', text: 'La primera que se nos viene a la cabeza. Hay mucho cielo por explorar.' },
  clever: { name: 'Falsa pista', score: 15, color: '#db927b', symbol: '✳', emoji: '🟧', text: 'Parece una elección rarísima… pero es la rareza de siempre. Selección editorial.' },
  familiar: { name: 'Despegue', score: 30, color: '#94b6c8', symbol: '↗', emoji: '🟦', text: 'Una buena respuesta. Ya te has separado de lo más evidente.' },
  rare: { name: 'Estratosfera', score: 60, color: '#a9c7a8', symbol: '✦', emoji: '🟩', text: 'Poco frecuente. Tu vocabulario empieza a desafiar la gravedad.' },
  deep: { name: 'Espacio profundo', score: 85, color: '#c0add0', symbol: '✧', emoji: '🟪', text: 'Una auténtica joya escondida. Pocas palabras llegan tan lejos.' },
  gem: { name: 'Órbita', score: 100, color: '#edc677', symbol: '✷', emoji: '🌟', text: 'Una joya de esta categoría. Has encontrado una estrella.' },
  miss: { name: 'Sin señal', score: 0, color: '#70777d', symbol: '—', emoji: '⬛', text: 'Esta señal no ha llegado. La siguiente palabra es otra oportunidad.' }
};
export function normalize(value) {
  return String(value).toLocaleLowerCase('es').replaceAll('ñ', '~').normalize('NFD').replace(/\p{M}/gu, '').replaceAll('~', 'ñ').replace(/[^a-zñ0-9 ]/g, ' ').trim().replace(/\s+/g, ' ');
}
export function hash(text) {
  let h = 2166136261;
  for (const c of String(text)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function random(seed) {
  let a = hash(seed);
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function shuffled(values, seed) {
  const items = [...values], rnd = random(seed);
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  return items;
}
export function madridDate(now = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now));
  const get = key => parts.find(x => x.type === key).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function dateOffset(date, delta) {
  const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + delta); return d.toISOString().slice(0, 10);
}
export function missionNumber(date) { return Math.max(1, Math.round((Date.parse(date) - Date.parse('2026-10-19')) / 86400000) + 1); }
export function band(score) {
  return score >= 450 ? 'gem' : score >= 351 ? 'deep' : score >= 251 ? 'rare' : score >= 151 ? 'familiar' : 'common';
}
const rarityIndexes = new WeakMap();
export function recognitionBand(value) {
  return value >= 98 ? 'common' : value >= 90 ? 'familiar' : value >= 65 ? 'rare' : value >= 35 ? 'deep' : 'gem';
}
export function belongsToVersion(category, version) {
  return category.dataVersion ? category.dataVersion === version : version === LEGACY_VERSION ? category.legacy !== false : category.legacy === false;
}
export function tierFor(answer, category) {
  if (category.metric === 'curated-es' || answer.revised) return answer.scoreTier;
  if (category.metric === 'dictionary-es-2026') return recognitionBand(answer.count);
  if (normalize(answer.word) === normalize(category.gem)) return 'gem';
  if (category.clever?.some(x => normalize(x) === normalize(answer.word))) return 'clever';
  if (answer.count == null) return 'deep';
  if (category.metric === 'recognition-es') return answer.count >= 98 ? 'common' : answer.count >= 90 ? 'familiar' : answer.count >= 65 ? 'rare' : 'deep';
  if (!rarityIndexes.has(category)) {
    const sorted = category.answers.filter(a => a.count != null).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, 'es'));
    rarityIndexes.set(category, new Map(sorted.map((a, i) => [a.word, i / Math.max(1, sorted.length - 1)])));
  }
  const percentile = rarityIndexes.get(category).get(answer.word) ?? 1;
  return percentile < .12 ? 'common' : percentile < .45 ? 'familiar' : percentile < .78 ? 'rare' : 'deep';
}
// Optimal-string-alignment distance: one deletion, insertion, replacement or adjacent swap.
export function distance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i ? j ? 0 : i : j));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
  }
  return matrix[a.length][b.length];
}
const indexes = new Map();
function indexFor(category) {
  if (indexes.has(category)) {
    const index = indexes.get(category); indexes.delete(category); indexes.set(category, index); return index;
  }
  if (!indexes.has(category)) {
    const idx = new Map();
    for (const a of category.answers) for (const alias of [a.word, ...(a.aliases || [])]) {
      const key = alias === a.word && a.key ? a.key : normalize(alias); if (!idx.has(key)) idx.set(key, a);
    }
    indexes.set(category, idx);
    if (indexes.size > 8) indexes.delete(indexes.keys().next().value);
  }
  return indexes.get(category);
}
export function matchAnswer(raw, category, autocorrect = true) {
  const input = normalize(raw), index = indexFor(category);
  if (!input) return { accepted: false };
  if (index.has(input)) {
    const answer = index.get(input), tier = tierFor(answer, category);
    const dictionary = category.metric === 'dictionary-es-2026';
    return { accepted: true, answer: answer.word, tier, score: TIERS[tier].score,
      count: dictionary ? null : answer.count, metric: dictionary || answer.revised ? 'curated-es' : category.metric,
      ...(dictionary ? { basis: 'editorial-historical', historicalRecognition: answer.count, historicalSample: answer.sample, measuredWord: answer.measuredWord } : {}),
      ...(answer.basis ? { basis: answer.basis } : {}),
      ...(answer.historicalRecognition != null ? { historicalRecognition: answer.historicalRecognition, historicalSample: answer.historicalSample } : {}),
      ...(!dictionary && answer.measuredWord ? { measuredWord: answer.measuredWord, sample: answer.sample } : {}), ...(answer.daysListed ? { daysListed: answer.daysListed } : {}) };
  }
  if (!autocorrect || input.length < 4 || input.length > 48) return { accepted: false };
  const candidates = new Map(), alphabet = 'abcdefghijklmnñopqrstuvwxyz ';
  const consider = key => { const value = index.get(key); if (value) candidates.set(value.word, value); };
  // Generate one-edit neighbors instead of scanning hundreds of thousands of words.
  for (let i = 0; i <= input.length; i++) {
    if (i < input.length) { consider(input.slice(0, i) + input.slice(i + 1)); for (const letter of alphabet) consider(input.slice(0, i) + letter + input.slice(i + 1)); }
    for (const letter of alphabet) consider(input.slice(0, i) + letter + input.slice(i));
    if (i < input.length - 1) consider(input.slice(0, i) + input[i + 1] + input[i] + input.slice(i + 2));
  }
  // Ambiguous typos never silently turn into an unrelated answer.
  return candidates.size === 1 ? { accepted: false, suggestion: [...candidates.keys()][0] } : { accepted: false };
}
export function pickPrompts(categories, seed, pack = 'all', version = DATA_VERSION) {
  const legacy = version === LEGACY_VERSION;
  const pool = categories.filter(c => belongsToVersion(c, version));
  if (!legacy && pack === 'all') {
    const packs = shuffled([...new Set(pool.map(c => c.pack))], `packs:${seed}`);
    const selected = packs.slice(0, ROUNDS).map(p => shuffled(pool.filter(c => c.pack === p), `${version}:${seed}:${p}`)[0]);
    if (selected.length < ROUNDS) selected.push(...shuffled(pool.filter(c => !selected.includes(c)), `${version}:extra:${seed}`).slice(0, ROUNDS - selected.length));
    return shuffled(selected, `order:${version}:${seed}`).map(c => c.id);
  }
  if (pack !== 'all') return shuffled(pool.filter(c => c.pack === pack), `${version}:${pack}:${seed}`).slice(0, ROUNDS).map(c => c.id);
  const result = [];
  for (const [group, n] of [['everyday', 2], ['words', 2], ['spain', 2], ['nature', 1]]) result.push(...shuffled(pool.filter(c => c.pack === group), `${version}:${seed}:${group}`).slice(0, n));
  return shuffled(result, 'order:' + seed).map(c => c.id);
}
export function createRun(categories, { mode = 'daily', seed = madridDate(), pack = 'all', dataVersion = DATA_VERSION } = {}) {
  const prompts = pickPrompts(categories, seed, pack, dataVersion);
  if (prompts.length !== ROUNDS) throw new Error('A mission must have seven prompts.');
  return { schema: 1, dataVersion, mode, seed: String(seed), pack, prompts, phase: 'intro', round: 0, results: [], deadline: null, draft: '', createdAt: Date.now() };
}
export function startRound(run, now = Date.now()) {
  if (!['intro', 'feedback'].includes(run.phase) || run.results.length >= ROUNDS) return run;
  return { ...run, round: run.results.length, phase: 'preview', deadline: now + PREVIEW_MS, draft: '' };
}
export function finishRound(run, result, raw = '', now = Date.now()) {
  if (run.phase !== 'answering' || run.results.length !== run.round) return run;
  return { ...run, phase: 'feedback', deadline: null, draft: '', results: [...run.results, { prompt: run.prompts[run.round], raw, ...result, score: result.accepted ? result.score : 0, tier: result.accepted ? result.tier : 'miss', answeredAt: now }] };
}
export function advanceClock(run, categories, now = Date.now(), autocorrect = true) {
  if (run.phase === 'preview' && now >= run.deadline) run = { ...run, phase: 'answering', deadline: run.deadline + ANSWER_MS };
  if (run.phase === 'answering' && now >= run.deadline) {
    const category = categories.find(c => c.id === run.prompts[run.round]);
    // At zero the draft gets one exact check; typo suggestions cannot extend the clock.
    run = finishRound(run, matchAnswer(run.draft || '', category, false), run.draft || '', now);
  }
  return run;
}
export function totalScore(run) { return run.results.reduce((n, r) => n + r.score, 0); }
export function validateRun(run, categories) {
  if (!run || run.schema !== 1 || !SUPPORTED_VERSIONS.has(run.dataVersion) || !['daily', 'unlimited', 'archive', 'pack', 'challenge'].includes(run.mode) || typeof run.seed !== 'string' || run.seed.length > 100 || !Array.isArray(run.prompts) || run.prompts.length !== ROUNDS || new Set(run.prompts).size !== ROUNDS || !run.prompts.every(id => categories.some(c => c.id === id && belongsToVersion(c, run.dataVersion))) || !Array.isArray(run.results) || run.results.length > ROUNDS || !['intro', 'preview', 'answering', 'feedback', 'done'].includes(run.phase) || !Number.isInteger(run.round) || run.round < 0 || run.round >= ROUNDS) return false;
  if (run.results.some((r, i) => !r || r.prompt !== run.prompts[i] || !TIERS[r.tier] || r.score !== TIERS[r.tier].score)) return false;
  if (['answering', 'preview'].includes(run.phase) && (!Number.isFinite(run.deadline) || run.results.length !== run.round)) return false;
  if (run.phase === 'feedback' && run.results.length !== run.round + 1 || run.phase === 'done' && run.results.length !== ROUNDS || run.phase === 'intro' && run.results.length !== 0) return false;
  return true;
}
export function streaks(completed, today = madridDate()) {
  const dates = [...new Set(completed.filter(r => r.mode === 'daily' && r.phase === 'done').map(r => r.seed))].sort();
  let best = 0, count = 0, previous;
  for (const date of dates) { count = previous && dateOffset(previous, 1) === date ? count + 1 : 1; best = Math.max(best, count); previous = date; }
  const set = new Set(dates); let current = 0, date = set.has(today) ? today : dateOffset(today, -1);
  while (set.has(date)) { current++; date = dateOffset(date, -1); }
  return { current, best };
}
