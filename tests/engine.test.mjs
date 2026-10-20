import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { TIERS, DATA_VERSION, CURATED_VERSION, PREVIOUS_VERSION, dailyMission, dailyDiscoveries, LEGACY_VERSION, normalize, madridDate, dateOffset, pickPrompts, createRun, startRound, advanceClock, finishRound, matchAnswer, totalScore, validateRun, streaks, tierFor, recognitionBand, band } from '../dist/engine.js';
import { buildCategories, PACKS } from '../dist/categories.js';

const data = JSON.parse(await readFile(new URL('../dist/data.json', import.meta.url), 'utf8'));
data.curated = JSON.parse(await readFile(new URL('../dist/repertory.json', import.meta.url), 'utf8'));
data.focused = JSON.parse(await readFile(new URL('../dist/focused-repertory.json', import.meta.url), 'utf8'));
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
  const a = createRun(categories, {seed:'2026-10-21'}).prompts, b = createRun(categories, {seed:'2026-10-21'}).prompts;
  assert.deepEqual(a, b);
  assert.equal(a.length, 7);
  assert.equal(new Set(a).size, 7);
  assert.notDeepEqual(a, createRun(categories, {seed:'2026-10-22'}).prompts);
  assert.deepEqual(a, createRun(categories, { mode: 'challenge', seed: '2026-10-21' }).prompts);
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
test('the expanded current questions have at least 100 canonical answers and no letter/length padding', () => {
  const active = categories.filter(c => !c.legacy);
  assert.equal(active.length, data.focused.questions.length);
  assert.ok(active.length >= 120);
  assert.equal(categories.filter(c => c.dataVersion === CURATED_VERSION).length, 56);
  assert.equal(new Set(active.map(c => c.text)).size, active.length);
  for (const c of active) {
    const distinct = new Set(c.answers.map(a => normalize(a.word)));
    assert.ok(distinct.size >= 100, c.id);
    assert.equal(distinct.size, c.answers.length, c.id);
    assert.ok(!/\bletras?\b|empiece|termine|contenga|ocho|diez/i.test(c.text), c.text);
    assert.equal(c.dataVersion, DATA_VERSION);
    assert.ok(['curated-es', 'dictionary-es-2026'].includes(c.metric));
  }
  for (const pack of Object.keys(PACKS).filter(p => p !== 'all')) assert.ok(active.filter(c => c.pack === pack).length >= 7);
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

test('prostate cancer and related compound diagnoses accept ordinary Spanish names without accents', () => {
  const c = category('q3-health');
  for (const word of ['cancer de prostata', 'CÁNCER DE PRÓSTATA', 'cáncer prostático', 'neoplasia maligna de próstata', 'cancer en la prostata', 'cancer prostata']) {
    const result = matchAnswer(word, c, false);
    assert.ok(result.accepted, word);
    assert.equal(result.answer, 'cáncer de próstata');
    assert.equal(result.score, 30);
    assert.equal(result.basis, 'editorial-2026');
    assert.equal(result.count, null); // Clinical classification is not a rarity statistic.
  }
  for (const word of ['cáncer de colon', 'cáncer de mama', 'cáncer de páncreas', 'diabetes tipo 2', 'diabetes gestacional', 'fractura de fémur', 'rotura de radio', 'esguince cervical', 'enfermedad renal crónica', 'trastorno por estrés postraumático', 'neuralgia del trigémino', 'intolerancia a la lactosa', 'infección de orina', 'trombosis venosa profunda']) {
    assert.ok(matchAnswer(word, c, false).accepted, word);
  }
  assert.ok(c.answers.length > 6000);
});

test('medical research does not turn treatments, body parts or administrative encounters into illnesses', () => {
  for (const word of ['quimioterapia', 'radioterapia', 'biopsia', 'mamografía', 'resonancia magnética', 'aspirina', 'cardiólogo', 'próstata', 'pulmón', 'consulta médica', 'alta médica', 'parto normal']) {
    assert.equal(matchAnswer(word, category('q3-health'), false).accepted, false, word);
  }
});

test('source-backed chemical symbols identify 118 existing elements, without hypothetical additions', () => {
  assert.equal(category('q3-elements').answers.length, 118);
  for (const [word, name] of [['Fe','hierro'],['Au','oro'],['Na','sodio'],['W','wolframio'],['Og','oganesón']]) {
    const result = matchAnswer(word, category('q3-elements'), false);
    assert.ok(result.accepted, word);
    assert.equal(result.answer, name);
  }
  for (const word of ['Uue', 'Ubn', 'vibranium', 'unobtainium', 'fes']) assert.equal(matchAnswer(word, category('q3-elements'), false).accepted, false);
});

test('Spanish geographical names and co-official variants are accepted as the same answer', () => {
  for (const [id, names] of [['cities', ['Londres','Fráncfort','Nueva York','Calcuta','El Cairo','Múnich','Pekín']], ['spanish-towns',['Lérida','Gerona','Orense','La Coruña','Fuenterrabía','Elx']], ['spanish-landscapes',['pico del Teide','pico Urriellu','río Ebro']]]) {
    for (const word of names) assert.ok(matchAnswer(word, category('q3-' + id), false).accepted, `${id}: ${word}`);
  }
});

test('international names also accept ordinary Latin transliterations used by Spanish players', () => {
  for (const word of ['Martin Odegaard', 'Odegaard', 'Luka Modric', 'Haaland']) assert.ok(matchAnswer(word, category('q3-footballers'), false).accepted, word);
});

test('dictionary validity is independent of recognition measurement and cannot invent a survey', () => {
  for (const word of ['investigación','completamente','responsabilidad','comportamiento','conmigo','metamorfosis']) {
    const result = matchAnswer(word, category('q3-dictionary'), false);
    assert.ok(result.accepted, word);
    assert.equal(result.basis, 'editorial-2026');
    assert.equal(result.count, null);
  }
  assert.equal(matchAnswer('zzzxpalabrainventada', category('q3-dictionary'), false).accepted, false);
});

test('all 56 questions have individually audited sources, including bounded public registers', async () => {
  const audit = JSON.parse(await readFile(new URL('../content/category-source-audit.json', import.meta.url), 'utf8'));
  assert.deepEqual(audit.questions.map(q => q.id), data.curated.questions.map(q => q.id));
  for (const q of audit.questions) assert.ok(q.sources.length > 0 && q.sources.every(s => new URL(s).protocol === 'https:'), q.id);
  assert.equal(audit.questions.find(q => q.id === 'q3-first-names').scope, 'published-register');
  assert.equal(audit.questions.find(q => q.id === 'q3-elements').scope, 'bounded-list');
});

test('topic lists keep species, jobs and sporting roles in their intended questions', () => {
  for (const [id, word] of [['fish','cachalote'],['birds','murciélago'],['plants','musgo de Islandia'],['jobs','ecología'],['sports','guardameta'],['instruments','campanólogo']]) {
    assert.equal(matchAnswer(word, category('q3-' + id), false).accepted, false, `${id}: ${word}`);
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
  assert.ok(createRun(categories, { seed: '2026-10-21' }).prompts.every(id => !category(id).legacy));
  assert.ok(createRun(categories, { seed: '2026-10-20' }).prompts.every(id => category(id).dataVersion === CURATED_VERSION));
});

test('daily editions are frozen across database additions, reordering and independent devices', () => {
  for (const seed of ['2026-08-16', '2026-10-20', '2026-10-21', '2027-03-28', '2027-10-31']) {
    const a = createRun(categories, { seed });
    const b = createRun([...categories].reverse().concat({ ...category('q4-actors'), id: 'unpublished-new-question' }), { seed });
    assert.deepEqual(a.prompts, b.prompts);
    assert.deepEqual(a.prompts, dailyMission(seed).prompts);
    assert.equal(a.dataVersion, dailyMission(seed).dataVersion);
    assert.deepEqual(a.prompts, createRun(categories, { mode: 'archive', seed }).prompts);
  }
  assert.equal(dailyMission('2026-10-20').dataVersion, CURATED_VERSION);
  assert.equal(dailyMission('2026-10-21').dataVersion, DATA_VERSION);
  assert.notDeepEqual(dailyMission('2026-10-20').prompts, dailyMission('2026-10-21').prompts);
  assert.throws(() => dailyMission('2026-02-30'));
  assert.throws(() => dailyMission('not-a-date'));
  for (let n = 0; n < 365; n++) {
    const date = dateOffset('2026-10-21', n);
    const plan = dailyMission(date);
    assert.equal(new Set(plan.prompts).size, 7);
    assert.equal(new Set(plan.prompts.map(id => category(id).pack)).size, 7);
    assert.notDeepEqual(plan.prompts, dailyMission(dateOffset(date, 1)).prompts);
  }
});

test('daily discoveries unlock only after seven completed daily rounds, revealing only played questions', () => {
  const done = completedDaily('2026-10-21');
  assert.deepEqual(dailyDiscoveries({ ...done, phase: 'feedback' }, categories), []);
  assert.deepEqual(dailyDiscoveries({ ...done, results: done.results.slice(0, 6) }, categories), []);
  for (const mode of ['unlimited', 'archive', 'pack', 'challenge']) assert.deepEqual(dailyDiscoveries({ ...done, mode }, categories), []);
  const top = dailyDiscoveries(done, categories);
  assert.deepEqual(top.map(d => d.prompt), done.prompts);
  assert.equal(top.length, 7);
  for (const d of top) {
    assert.equal(d.answers.length, 3);
    assert.equal(new Set(d.answers.map(a => normalize(a.word))).size, 3);
    const c = category(d.prompt);
    const scores = c.answers.map(a => TIERS[tierFor(a, c)].score).sort((a, b) => b - a).slice(0, 3);
    assert.deepEqual(d.answers.map(a => a.score), scores);
    for (const a of d.answers) assert.equal(matchAnswer(a.word, c, false).score, a.score);
  }
});

test('home furniture and electrical appliances have separate, explicit answer boundaries', () => {
  assert.equal(category('q4-home'), undefined);
  const appliance = category('q4-appliances'), furniture = category('q4-furniture');
  assert.equal(appliance.text, 'Nombra un electrodoméstico.');
  assert.equal(furniture.text, 'Nombra un mueble.');
  for (const word of ['lavadora', 'nevera', 'freidora de aire', 'lavavajillas', 'secador de pelo']) assert.ok(matchAnswer(word, appliance, false).accepted, word);
  for (const word of ['mesa', 'sofá', 'armario', 'bargueño', 'silla']) assert.ok(matchAnswer(word, furniture, false).accepted, word);
  for (const word of ['mesa', 'sofá', 'armario']) assert.equal(matchAnswer(word, appliance, false).accepted, false, word);
  for (const word of ['lavadora', 'microondas', 'televisor']) assert.equal(matchAnswer(word, furniture, false).accepted, false, word);
  assert.ok(matchAnswer('sofá', category('q3-home'), false).accepted, 'The broad previous question remains compatible.');
});

test('specific geography and clinical questions use source metadata rather than arbitrary subsets', () => {
  assert.ok(matchAnswer('Sevilla', category('q4-towns-51'), false).accepted);
  assert.equal(matchAnswer('Barcelona', category('q4-towns-51'), false).accepted, false);
  assert.ok(matchAnswer('París', category('q4-cities-fr'), false).accepted);
  assert.equal(matchAnswer('Madrid', category('q4-cities-fr'), false).accepted, false);
  assert.ok(matchAnswer('Ebro', category('q4-rivers-spain'), false).accepted);
  assert.equal(matchAnswer('Teide', category('q4-rivers-spain'), false).accepted, false);
  assert.ok(matchAnswer('cáncer de próstata', category('q4-cancers'), false).accepted);
  assert.equal(matchAnswer('gripe', category('q4-cancers'), false).accepted, false);
});

test('the enlarged acting repertory accepts familiar performers and preserves Spain rarity', () => {
  assert.ok(category('q4-actors').answers.length >= 27000);
  for (const word of ['Tom Holland', 'Zendaya', 'Michelle Jenner', 'Mads Mikkelsen', 'Shah Rukh Khan', 'Phoebe Dynevor', 'Gustaf Skarsgård']) assert.ok(matchAnswer(word, category('q4-actors'), false).accepted, word);
  assert.ok(matchAnswer('Penélope Cruz', category('q4-actors-spain'), false).accepted);
  assert.equal(matchAnswer('Tom Holland', category('q4-actors-spain'), false).accepted, false);
  assert.ok(matchAnswer('Tom Holland', category('q4-actors-england'), false).accepted);
  assert.equal(matchAnswer('Pedro Pascal', category('q4-actors-england'), false).accepted, false);
  for (const word of ['Tom Holland', 'Penélope Cruz']) assert.equal(matchAnswer(word, category('q3-actors'), false).score, matchAnswer(word, category('q4-actors'), false).score);
});

test('every current question has a checked source audit and metadata agrees with the playable bank', async () => {
  const audit = JSON.parse(await readFile(new URL('../content/focused-source-audit.json', import.meta.url), 'utf8'));
  assert.deepEqual(audit.questions.map(q => q.id), data.focused.questions.map(q => q.id));
  assert.equal(data.expansion.activeQuestions, data.focused.questions.length);
  for (const q of audit.questions) {
    assert.ok(q.sources.length > 0 && q.sources.every(s => new URL(s).protocol === 'https:'), q.id);
    assert.equal(q.count, category(q.id).answers.length);
  }
  for (const [file, expected] of Object.entries(data.focused.sourceHashes)) {
    const bytes = await readFile(new URL('../' + file, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, file);
  }
});

test('brand familiarity never borrows recognition of an unrelated dictionary word', () => {
  for (const id of ['q3-brands', 'q4-brands']) {
    const a = matchAnswer('Balay', category(id), false);
    assert.ok(a.accepted);
    assert.equal(a.score, 10);
    assert.equal(a.basis, 'editorial-2026');
    assert.equal(a.historicalRecognition, undefined);
  }
});

test('habitual answers work in every one of the 152 current questions, including scoped subsets', async () => {
  const specific = JSON.parse(await readFile(new URL('./focused-cases.json', import.meta.url), 'utf8'));
  const broad = JSON.parse(await readFile(new URL('./coverage-cases.json', import.meta.url), 'utf8'));
  const missing = [];
  for (const c of categories.filter(c => !c.legacy)) {
    const identity = c.id.slice(3);
    const cases = specific[identity] || broad[identity];
    assert.ok(cases, `No independently reviewed examples for ${c.id}`);
    for (const word of cases.split('|')) if (!matchAnswer(word, c, false).accepted) missing.push(`${c.id}: ${word}`);
  }
  assert.deepEqual(missing, []);
});

test('specific valid answers remain valid in their broader questions and compatible historical editions', () => {
  for (const [specific, broad, word] of [
    ['actors-england','actors','Emma Watson'], ['actors-korea','actors','Lee Jung-jae'],
    ['films-france','films','Amélie'], ['series-animation','series','Padre de familia'],
    ['novels','books','Don Quijote'], ['chemists','scientists','Mendeleev'],
    ['writers-spain','writers','Cervantes'], ['cancers','health','cáncer de pulmón'],
    ['cities-pt','cities','Oporto'], ['towns-59','spanish-towns','Vitoria-Gasteiz'],
    ['flowers','plants','orquídea'], ['minerals','materials','cuarzo'],
    ['dog-breeds','mammals','labrador']
  ]) {
    for (const id of ['q4-'+specific,'q4-'+broad,'q3-'+broad]) assert.ok(matchAnswer(word, category(id), false).accepted, `${id}: ${word}`);
  }
  for (const word of ['amigdalitis','epilepsia','quemadura','fiebre','dolor de cabeza']) assert.ok(matchAnswer(word, category('q3-health'), false).accepted, word);
});

test('source category essays, equipment, venues and techniques never masquerade as playable instances', () => {
  for (const [id,word] of [
    ['plants','Amarillamiento letal'],['plants','Capitel'],
    ['drinks','Cristalería'],['drinks','Asociación Internacional de Bármanes'],
    ['books','Teatro Sanpol'],['books','Obra de teatro'],
    ['market','Panadería de México'],['board-games','Juego de tablero'],
    ['planets-fiction','Geografía de la Tierra Media']
  ]) assert.equal(matchAnswer(word,category('q4-'+id),false).accepted,false,`${id}: ${word}`);
  assert.equal(matchAnswer('fractura de fémur',category('q4-health'),false).accepted,false);
  assert.equal(matchAnswer('gripe',category('q4-injuries'),false).accepted,false);
  assert.equal(matchAnswer('pterodáctilo',category('q4-dinosaurs'),false).accepted,false);
});

test('the expanded editorial vocabulary and all explicit spellings are playable in their own question', async () => {
  const review = JSON.parse(await readFile(new URL('../content/expanded-review.json', import.meta.url), 'utf8'));
  const failures = [];
  for (const [identity, { additions }] of Object.entries(review)) {
    const c = category('q4-' + identity);
    assert.ok(c, identity);
    for (const term of additions) for (const spelling of term.split('~')) {
      if (!matchAnswer(spelling, c, false).accepted) failures.push(`${identity}: ${spelling}`);
    }
  }
  assert.deepEqual(failures, []);
});

test('every air-fryer spelling identifies one appliance with the same points, also in the historical daily', () => {
  for (const id of ['q4-appliances', 'q3-home']) {
    const c = category(id), expected = matchAnswer('freidora de aire', c, false);
    for (const spelling of ['air frier', 'air fryer', 'airfryer', 'airfrier', 'freidora sin aceite', 'freidoras de aire']) {
      const answer = matchAnswer(spelling, c, false);
      assert.ok(answer.accepted, `${id}: ${spelling}`);
      assert.equal(answer.answer, expected.answer);
      assert.equal(answer.score, expected.score);
    }
  }
  assert.equal(matchAnswer('air frier', category('q4-furniture'), false).accepted, false);
  assert.equal(matchAnswer('air frier', category('q4-brands'), false).accepted, false);
});

test('a canonical spelling keeps its own answer and score when a source also lists it as an alias', () => {
  const original = category('q4-actors');
  const c = { ...original, answers: [
    { ...original.answers[0], word: 'Nombre artístico', key: 'nombre artistico', aliases: ['Nombre propio'], scoreTier: 'gem' },
    { ...original.answers[1], word: 'Nombre propio', key: 'nombre propio', aliases: [], scoreTier: 'common' }
  ] };
  const answer = matchAnswer('Nombre propio', c, false);
  assert.equal(answer.answer, 'Nombre propio');
  assert.equal(answer.score, 10);
});

test('spelling tolerance handles attested plurals, job genders and omitted title articles', () => {
  for (const [id, spelling] of [
    ['appliances', 'freidoras de aire'], ['jobs', 'diseñadora gráfica'],
    ['jobs', 'ingeniera de software'], ['wardrobe', 'camisetas de tirantes'],
    ['tools', 'llaves de carraca'], ['films', 'Shawshank Redemption'],
    ['films', 'The Shawshank Redemption'], ['characters', 'Spiderman']
  ]) assert.ok(matchAnswer(spelling, category('q4-' + id), false).accepted, `${id}: ${spelling}`);
  assert.equal(matchAnswer('botón de aire', category('q4-appliances'), false).accepted, false);
  assert.equal(matchAnswer('ingeniera de software', category('q4-actors'), false).accepted, false);
  assert.ok(matchAnswer('The Shawshank Redemption', category('q4-films-1990'), false).accepted);
  assert.ok(matchAnswer('Cadena perpetua', category('q4-films-1990'), false).accepted);
  assert.equal(matchAnswer('The Shawshank Redemption', category('q4-films-mexico'), false).accepted, false);
});

test('official species stay in their taxonomic categories and metadata never becomes an answer', () => {
  for (const [id, word] of [['mammals', 'Lynx pardinus'], ['birds', 'Turdus merula'], ['fish', 'Sardina pilchardus'], ['plants', 'Quercus ilex'], ['invertebrates', 'Apis mellifera']]) {
    assert.ok(matchAnswer(word, category('q4-' + id), false).accepted, `${id}: ${word}`);
  }
  for (const [id, word] of [['birds', 'Lynx pardinus'], ['plants', 'Amanita muscaria'], ['football-clubs', 'Equipos grandes del fútbol uruguayo'], ['directors', 'Premios y nominaciones de Leopoldo Torre Nilsson'], ['car-models', 'Honda Goldwing'], ['volcanoes', 'Mina de diamantes Williamson']]) {
    assert.equal(matchAnswer(word, category('q4-' + id), false).accepted, false, `${id}: ${word}`);
  }
  assert.equal(matchAnswer('Gasteiz', category('q4-cities-br'), false).accepted, false);
  assert.equal(matchAnswer('Beijing', category('q4-cities-us'), false).accepted, false);
});
