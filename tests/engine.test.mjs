import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { TIERS, DATA_VERSION, PREVIOUS_VERSION, LEGACY_VERSION, normalize, madridDate, dateOffset, pickPrompts, createRun, startRound, advanceClock, finishRound, matchAnswer, totalScore, validateRun, streaks, tierFor, recognitionBand, band } from '../dist/engine.js';
import { buildCategories, PACKS } from '../dist/categories.js';

const data = JSON.parse(await readFile(new URL('../dist/data.json', import.meta.url), 'utf8'));
data.curated = JSON.parse(await readFile(new URL('../dist/repertory.json', import.meta.url), 'utf8'));
const categories = buildCategories(data);
const category = id => categories.find(c => c.id === id);
function completedDaily(date) {
  let run = createRun(categories, { seed: date });
  for (let i = 0; i < 7; i++) {
    run = advanceClock(startRound(run, 1000 + i * 30000), categories, 4000 + i * 30000);
    const c = category(run.prompts[i]);
    run = finishRound(run, matchAnswer(c.gem, c), c.gem);
  }
  return { ...run, phase: 'done' };
}
test('Spanish normalization ignores accents/case but preserves the letter ñ', () => {
  assert.equal(normalize('  ÁRBOL  '), 'arbol');
  assert.equal(normalize('Pingüino'), 'pinguino');
  assert.notEqual(normalize('año'), normalize('ano'));
});
test('INE snapshot contains official 2025 figures, without confusing cities and provinces', () => {
  assert.equal(data.provinces.length, 52);
  assert.equal(data.capitals.length, 50);
  assert.equal(data.islands.length, 11);
  assert.equal(new Map(data.provinces).get('Madrid'), 7137031);
  assert.equal(new Map(data.capitals).get('Madrid'), 3506730);
  assert.equal(new Map(data.provinces).get('Soria'), 90234);
});
test('all categories have valid, finite answer sets and a reachable 100-point gem', () => {
  assert.ok(categories.length >= 70);
  assert.equal(new Set(categories.map(c => c.id)).size, categories.length);
  for (const c of categories) {
    assert.ok(c.answers.length >= 7, c.id);
    assert.ok(c.answers.every(a => a.count === null || Number.isFinite(a.count) && a.count >= 0), c.id);
    const gem = c.answers.find(a => a.word === c.gem);
    assert.ok(gem, c.id);
    assert.equal(tierFor(gem, c), 'gem', c.id);
    assert.ok(PACKS[c.pack], c.id);
  }
});
test('daily missions use seven unique prompts and reproduce the same date on any device', () => {
  const a = pickPrompts(categories, '2026-10-19'), b = pickPrompts(categories, '2026-10-19');
  assert.deepEqual(a, b);
  assert.equal(a.length, 7);
  assert.equal(new Set(a).size, 7);
  assert.notDeepEqual(a, pickPrompts(categories, '2026-10-20'));
  assert.deepEqual(a, createRun(categories, { mode: 'challenge', seed: '2026-10-19' }).prompts);
});
test('all 30 chapters in every pack can be played and keep seven unique prompts', () => {
  for (const pack of Object.keys(PACKS).filter(p => p !== 'all')) for (let i = 1; i <= 30; i++) {
    const run = createRun(categories, { mode: 'pack', seed: `${pack}-${i}`, pack });
    assert.equal(run.prompts.length, 7);
    assert.equal(new Set(run.prompts).size, 7);
    assert.ok(run.prompts.every(id => category(id).pack === pack));
  }
});
test('midnight uses Madrid civil time, including summer and winter offsets', () => {
  assert.equal(madridDate(Date.parse('2026-07-01T21:59:59Z')), '2026-07-01');
  assert.equal(madridDate(Date.parse('2026-07-01T22:00:00Z')), '2026-07-02');
  assert.equal(madridDate(Date.parse('2026-12-01T22:59:59Z')), '2026-12-01');
  assert.equal(madridDate(Date.parse('2026-12-01T23:00:00Z')), '2026-12-02');
  assert.equal(dateOffset('2026-03-29', -1), '2026-03-28');
});
test('preview lasts three seconds and answer deadline survives reload rather than resetting', () => {
  const starting = startRound(createRun(categories), 1000);
  assert.equal(advanceClock(starting, categories, 3999).phase, 'preview');
  const answering = advanceClock(JSON.parse(JSON.stringify(starting)), categories, 4000);
  assert.equal(answering.phase, 'answering');
  assert.equal(answering.deadline, 29000);
  assert.equal(advanceClock(answering, categories, 28999).phase, 'answering');
  const timedOut = advanceClock(answering, categories, 29000);
  assert.equal(timedOut.phase, 'feedback');
  assert.equal(timedOut.results.length, 1);
  assert.equal(timedOut.results[0].score, 0);
});
test('the draft receives an exact final check at zero and cannot extend the clock with a suggestion', () => {
  let r = advanceClock(startRound(createRun(categories), 0), categories, 3000);
  const c = category(r.prompts[0]);
  r.draft = c.gem;
  assert.equal(advanceClock(r, categories, 28000).results[0].score, 100);
  r.draft = 'zzzz-no-es-una-respuesta';
  assert.equal(advanceClock(r, categories, 28000).results[0].score, 0);
});
test('rejected guesses do not end the round, and one accepted answer cannot score twice', () => {
  let r = advanceClock(startRound(createRun(categories), 0), categories, 3000);
  assert.equal(matchAnswer('zzzz-no-existe', category(r.prompts[0])).accepted, false);
  assert.equal(r.phase, 'answering');
  const result = matchAnswer(category(r.prompts[0]).gem, category(r.prompts[0]));
  r = finishRound(r, result);
  assert.equal(r.results.length, 1);
  assert.equal(totalScore(finishRound(r, result)), 100);
});
test('aliases accept common Spanish/official place variants and inflected profession forms', () => {
  assert.equal(matchAnswer('Vizcaya', category('provinces')).answer, 'Bizkaia');
  assert.equal(matchAnswer('San Sebastian', category('capitals')).answer, 'Donostia/San Sebastián');
  assert.equal(matchAnswer('enfermera', category('jobs')).answer, 'enfermero');
  assert.equal(matchAnswer('TORTILLA ESPAÑOLA', category('food')).answer, 'tortilla de patatas');
});
test('ambiguous typos are rejected, a unique adjacent swap is offered for confirmation', () => {
  const c = { answers: [{ word: 'Madrid', count: 1 }, { word: 'Málaga', count: 2 }], gem: 'Madrid', clever: [] };
  assert.deepEqual(matchAnswer('Mdarid', c), { accepted: false, suggestion: 'Madrid' });
  assert.equal(matchAnswer('Mdarid', c, false).suggestion, undefined);
  assert.equal(matchAnswer('sol', { ...c, answers: [{ word: 'sal', count: 1 }, { word: 'son', count: 2 }] }).suggestion, undefined);
});
test('editorial false-friend and gem exceptions use the original fixed point schedule', () => {
  assert.equal(matchAnswer('ornitorrinco', category('mammals')).score, 15);
  assert.equal(matchAnswer('equidna', category('mammals')).score, 100);
  assert.deepEqual(Object.values(TIERS).map(t => t.score).sort((a, b) => a - b), [0, 10, 15, 30, 60, 85, 100]);
});
test('a perfect seven-round mission totals 700; completion validates after serialization', () => {
  const run = completedDaily('2026-10-19');
  assert.equal(totalScore(run), 700);
  assert.equal(run.results.length, 7);
  assert.ok(validateRun(JSON.parse(JSON.stringify(run)), categories));
  assert.equal(startRound(run).phase, 'done');
});
test('corrupt or incompatible saves cannot restore scores or incomplete completed games', () => {
  const run = completedDaily('2026-10-19');
  assert.equal(validateRun({ ...run, results: run.results.slice(0, 2) }, categories), false);
  assert.equal(validateRun({ ...run, dataVersion: 'older' }, categories), false);
  assert.equal(validateRun({ ...run, prompts: ['unknown', ...run.prompts.slice(1)] }, categories), false);
  assert.equal(validateRun({ ...run, results: run.results.map((r, i) => i ? r : { ...r, score: 500 }) }, categories), false);
});
test('archives, unlimited missions and repeated daily records cannot inflate a daily streak', () => {
  const a = completedDaily('2026-10-18'), b = completedDaily('2026-10-19');
  assert.deepEqual(streaks([a, b, b, { ...a, seed: '2026-10-17', mode: 'archive' }], '2026-10-19'), { current: 2, best: 2 });
  assert.deepEqual(streaks([a, b], '2026-10-20'), { current: 2, best: 2 });
  assert.deepEqual(streaks([a, b], '2026-10-21'), { current: 0, best: 2 });
});
test('end-of-game bands preserve the observed original score boundaries', () => {
  assert.equal(band(150), 'common'); assert.equal(band(151), 'familiar');
  assert.equal(band(250), 'familiar'); assert.equal(band(251), 'rare');
  assert.equal(band(350), 'rare'); assert.equal(band(351), 'deep');
  assert.equal(band(449), 'deep'); assert.equal(band(450), 'gem');
});
test('the expanded playable database is at least tenfold after accent normalization, without counting aliases twice', () => {
  const all = category('es-all-words');
  const count = new Set(all.answers.map(a => normalize(a.word))).size;
  assert.ok(count >= 171000);
  assert.equal(count, data.expansion.uniqueNormalizedSpellings);
  assert.equal(data.expansion.baselineLemmas, 17100);
  assert.equal(data.expansion.rankingCountry, 'ES');
  assert.equal(data.sources.interestSpain.period.country, 'ES');
  assert.equal(data.version, DATA_VERSION);
});
test('paella is common using the Spain cohort: 100 percent of 122, and never an editorial rare gem', () => {
  const result = matchAnswer('paella', category('es-topic-world-food'));
  assert.equal(result.count, 100);
  assert.equal(result.sample, 122);
  assert.equal(result.score, 10);
  assert.equal(result.metric, 'recognition-es');
  for (const c of categories.filter(c => !c.legacy)) for (const a of c.answers.filter(a => a.word === 'paella')) assert.equal(tierFor(a, c), 'common');
});
test('v2 rankings use Spain-specific recognition or Spain-located readership, never pan-Hispanic counts or population', () => {
  const active = categories.filter(c => c.dataVersion === PREVIOUS_VERSION);
  assert.ok(active.length >= 400);
  assert.ok(active.some(c => c.id === 'es-topic-elements'));
  assert.ok(active.some(c => c.id === 'es-world-actors'));
  assert.ok(active.some(c => c.id === 'es-world-films'));
  for (const c of active) {
    assert.ok(['recognition-es', 'interest-es'].includes(c.metric));
    const original = c.answers.filter(a => !a.revised);
    assert.ok(original.every(a => Number.isFinite(a.count)));
    if (c.metric === 'recognition-es') {
      assert.ok(original.every(a => a.count >= 0 && a.count <= 100 && a.sample >= 30 && typeof a.measuredWord === 'string'));
      assert.ok(c.answers.find(a => a.word === c.gem).count < 90);
      if (c.pack !== 'words') assert.ok(original.every(a => normalize(a.word) === normalize(a.measuredWord)), c.id);
    } else assert.ok(original.every(a => a.daysListed >= 3));
  }
});
test('all 56 current questions have at least 100 canonical answers and no letter/length padding', () => {
  const active = categories.filter(c => !c.legacy);
  assert.equal(active.length, 56);
  assert.equal(new Set(active.map(c => c.text)).size, 56);
  for (const c of active) {
    const distinct = new Set(c.answers.map(a => normalize(a.word)));
    assert.ok(distinct.size >= 100, c.id);
    assert.equal(distinct.size, c.answers.length, c.id);
    assert.ok(!/\bletras?\b|empiece|termine|contenga|ocho|diez/i.test(c.text), c.text);
    assert.equal(c.dataVersion, DATA_VERSION);
    assert.ok(['curated-es', 'dictionary-es-2026'].includes(c.metric));
  }
  for (const pack of Object.keys(PACKS).filter(p => p !== 'all')) assert.equal(active.filter(c => c.pack === pack).length, 8);
});
test('Messi, Leo Messi, CR7 and metro ligero validate directly in current and previously shared broad questions', () => {
  for (const id of ['q3-footballers', 'es-world-footballers']) for (const answer of ['Messi', 'Leo Messi', 'Lionel Messi', 'CR7']) {
    const result = matchAnswer(answer, category(id), false);
    assert.ok(result.accepted, `${id}: ${answer}`);
    assert.equal(result.score, 10);
  }
  for (const id of ['q3-transport', 'es-topic-transport']) assert.equal(matchAnswer('Metro ligero', category(id), false).score, 30);
});
test('2026 evidence has real periods and unknown interest never becomes zero', () => {
  const bank = data.curated;
  assert.equal(bank.checked, '2026-10-20');
  assert.equal(bank.ine.reference, '2025-01-01');
  assert.equal(bank.ine.published, '2026-04-23');
  assert.equal(bank.interestPeriod.country, 'ES');
  const bases = new Set();
  for (const c of categories.filter(c => !c.legacy && c.metric === 'curated-es')) for (const a of c.answers) {
    bases.add(a.basis);
    if (a.basis === 'interest-2026') assert.ok(a.count > 0 && a.daysListed >= 3);
    if (a.basis === 'editorial-historical') assert.ok(a.historicalRecognition >= 0 && a.historicalSample >= 30 && a.count === null);
    if (a.basis.startsWith('ine-')) assert.ok(a.count >= 20);
    assert.ok([10, 30, 60, 85, 100].includes(tierFor(a, c) && TIERS[tierFor(a, c)].score));
  }
  for (const basis of ['interest-2026', 'ine-names-2026', 'ine-surnames-2026', 'editorial-historical', 'editorial-2026']) assert.ok(bases.has(basis));
});
test('lower familiarity consistently earns more points; multiple 100-point answers are supported', () => {
  assert.deepEqual([100, 98, 97, 90, 89, 65, 64, 35, 34, 0].map(v => TIERS[recognitionBand(v)].score), [10, 10, 30, 30, 60, 60, 85, 85, 100, 100]);
  const c = category('q3-surnames');
  assert.equal(matchAnswer('García', c, false).score, 10);
  assert.ok(c.answers.filter(a => tierFor(a, c) === 'gem').length > 100);
  assert.equal(matchAnswer('Antonio', category('q3-first-names'), false).score, 10);
  assert.equal(category('q3-elements').answers.length, 118);
});
test('v2 missions still validate and preserve version-specific seeds after the repertory replacement', () => {
  const previous = createRun(categories, { seed: '2026-10-19', dataVersion: PREVIOUS_VERSION });
  assert.ok(previous.prompts.every(id => category(id).dataVersion === PREVIOUS_VERSION));
  assert.ok(validateRun(advanceClock(startRound(previous, 1000), categories, 4000), categories));
  assert.equal(validateRun({ ...previous, dataVersion: DATA_VERSION }, categories), false);
});
test('reviewed boundaries reject bad translated taxonomy candidates and unrelated people', () => {
  for (const [id, word] of [['q3-trees', 'ratón'], ['q3-trees', 'ababol'], ['q3-fish', 'gallipato de mar'], ['q3-footballers', 'Paulino Uzcudun'], ['q3-materials', 'pirimidine'], ['q3-health', 'flebótomo'], ['q3-transport', 'misil sidewinder']]) assert.equal(matchAnswer(word, category(id), false).accepted, false, `${id}: ${word}`);
});
test('a qualified series never borrows the readership statistic of an unqualified novel or film', () => {
  const result = matchAnswer('La casa de los espíritus', category('q3-series'), false);
  assert.ok(result.accepted);
  assert.equal(result.basis, 'editorial-2026');
  assert.equal(result.count, null);
  // This snapshot does contain the qualified Carrie series article; retain its real signal.
  assert.equal(matchAnswer('Carrie', category('q3-series'), false).basis, 'interest-2026');
});
test('basic Spanish answers work across every revised question, including gender and common aliases', () => {
  const examples = {
    transport:'metro ligero', market:'arroz', menu:'paella', kitchen:'sartén', home:'sofá', sports:'fútbol', drinks:'agua', desserts:'flan',
    mammals:'perro', birds:'gorrión', fish:'sardina', invertebrates:'araña', reptiles:'rana', plants:'romero', phenomena:'lluvia', trees:'pino',
    jobs:'enfermera', wardrobe:'camisa', instruments:'piano', tools:'martillo', feelings:'alegría', containers:'botella', dictionary:'curiosidad', 'sports-equipment':'balón',
    'spanish-towns':'Madrid', 'spanish-clubs':'Real Madrid', 'spanish-food':'tortilla de patatas', 'first-names':'Antonio', surnames:'García', 'spanish-landscapes':'Ebro', 'spanish-artists':'Pablo Picasso', demonym:'madrileño',
    elements:'hidrógeno', math:'suma', anatomy:'corazón', materials:'acero', inventions:'teléfono', disciplines:'biología', health:'gripe', astronomy:'Luna',
    films:'Titanic', series:'Los Simpson', actors:'Brad Pitt', music:'Shakira', books:'Don Quijote', characters:'Harry Potter', videogames:'Minecraft', directors:'Steven Spielberg',
    footballers:'Messi', 'football-clubs':'Barcelona', countries:'España', cities:'París', geography:'Nilo', scientists:'Albert Einstein', writers:'Cervantes', brands:'Zara'
  };
  assert.equal(Object.keys(examples).length, 56);
  for (const [id, word] of Object.entries(examples)) assert.ok(matchAnswer(word, category('q3-' + id), false).accepted, `${id}: ${word}`);
});

test('reviewed player answers are accepted across all 56 questions', async () => {
  const cases = JSON.parse(await readFile(new URL('./coverage-cases.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(cases).length, 56);
  const missing = [];
  for (const [id, words] of Object.entries(cases)) for (const word of words.split('|')) {
    if (!matchAnswer(word, category('q3-' + id), false).accepted) missing.push(`${id}: ${word}`);
  }
  assert.deepEqual(missing, []);
});

test('Tom Holland and lava work in current and previously shared broad questions', () => {
  for (const id of ['q3-actors', 'es-world-actors']) assert.ok(matchAnswer('tom holland', category(id), false).accepted, id);
  for (const id of ['q3-materials', 'es-topic-natural-materials']) assert.ok(matchAnswer('lava', category(id), false).accepted, id);
  assert.equal(matchAnswer('lava', category('q3-materials'), false).basis, 'editorial-2026');
  const word = matchAnswer('metamorfosis', category('q3-dictionary'), false);
  assert.ok(word.accepted);
  assert.equal(word.basis, 'editorial-2026');
  assert.equal(word.count, null);
  assert.equal(matchAnswer('metamorfosis', category('es-all-words'), false).accepted, false);
});

test('additional coverage keeps semantic boundaries and independently attested variants', () => {
  for (const [id, word] of [['actors', 'lava'], ['materials', 'Tom Holland'], ['materials', 'mercurio rojo'], ['instruments', 'campanólogo'], ['footballers', 'Nora Mørk'], ['fish', 'tortuga']]) {
    assert.equal(matchAnswer(word, category('q3-' + id), false).accepted, false, `${id}: ${word}`);
  }
  for (const [id, word] of [['demonym', 'catalanas'], ['demonym', 'cordobesas'], ['jobs', 'abogadas'], ['jobs', 'cajera'], ['materials', 'magma']]) {
    assert.ok(matchAnswer(word, category('q3-' + id), false).accepted, `${id}: ${word}`);
  }
});
test('absolute recognition levels keep equally common words equally common', () => {
  const c = { metric: 'recognition-es', gem: 'rare', clever: [], answers: [{ word: 'a', count: 100 }, { word: 'b', count: 100 }, { word: 'rare', count: 20 }] };
  assert.equal(tierFor(c.answers[0], c), 'common');
  assert.equal(tierFor(c.answers[1], c), 'common');
  for (const [count, expected] of [[98, 'common'], [97.99, 'familiar'], [90, 'familiar'], [89.99, 'rare'], [65, 'rare'], [64.99, 'deep']]) assert.equal(tierFor({ word: 'sample', count }, c), expected);
});
test('inherited inflections retain their measured lemma and sample rather than fabricating independent surveys', () => {
  const all = category('es-all-words');
  const a = all.answers.find(a => a.word !== a.measuredWord && a.pos.split('|').includes('v'));
  assert.ok(a);
  const direct = data.spainNorms.find(n => n[0] === a.measuredWord);
  const result = matchAnswer(a.word, all, false);
  assert.equal(result.measuredWord, direct[0]);
  assert.equal(result.count, direct[1]);
  assert.equal(result.sample, direct[2]);
  assert.equal(result.accepted, true);
});
test('legacy puzzles and unfinished records remain reproducible with their original question order', () => {
  const legacy = createRun(categories, { seed: '2026-10-19', dataVersion: LEGACY_VERSION });
  assert.deepEqual(legacy.prompts, ['islands', 'fruit-a', 'ending-mente', 'vowel-bookends', 'animals-s', 'provinces-a', 'long-colors']);
  const answering = advanceClock(startRound(legacy, 1000), categories, 4000);
  assert.ok(validateRun(JSON.parse(JSON.stringify(answering)), categories));
  assert.ok(legacy.prompts.every(id => category(id).legacy));
  assert.ok(createRun(categories, { seed: '2026-10-19' }).prompts.every(id => !category(id).legacy));
});
