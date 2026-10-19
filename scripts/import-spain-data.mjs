import { readFile, writeFile } from 'node:fs/promises';
import { source, digest } from './source-cache.mjs';
const base = JSON.parse(await readFile(new URL('./baseline-v1.json', import.meta.url), 'utf8'));
const urls = {
  recognition: 'https://ndownloader.figshare.com/files/11826623',
  dictionary: 'https://raw.githubusercontent.com/doozan/spanish_data/master/es_allforms.csv',
  attestation: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_full.txt'
};
const [normCsv, formCsv, observedText] = await Promise.all([source('word_info.csv', urls.recognition), source('forms.txt', urls.dictionary), source('full.txt', urls.attestation)]);
const norms = [];
for (const line of normCsv.trim().split(/\r?\n/).slice(1)) {
  const a = line.split(','), known = +a[5], sample = +a[4];
  if (!/^[a-záéíóúüñ]{2,30}$/u.test(a[0]) || !Number.isFinite(known) || known < 0 || known > 100 || sample < 30) continue;
  norms.push([a[0], known, sample]);
}
const normMap = new Map(norms.map((r, i) => [r[0], i]));
const observed = new Set(observedText.trim().split('\n').map(l => l.slice(0, l.lastIndexOf(' '))));
const candidates = new Map();
const tags = new Map();
for (const line of formCsv.split('\n')) {
  const [word, pos, ...lemmas] = line.split(',');
  if (!['n', 'v', 'adj', 'adv'].includes(pos) || !/^[a-záéíóúüñ]{2,30}$/u.test(word) || (!observed.has(word) && !normMap.has(word))) continue;
  const oldTags = tags.get(word) || [];
  if (!oldTags.includes(pos)) { oldTags.push(pos); tags.set(word, oldTags); }
  if (!observed.has(word)) continue;
  const measured = normMap.has(word) ? word : lemmas.find(l => normMap.has(l));
  if (!measured) continue;
  const n = normMap.get(measured), old = candidates.get(word);
  if (!old || measured === word || (norms[n][1] > norms[old[2]][1] && old[0] !== norms[old[2]][0])) candidates.set(word, [word, pos, n]);
}
for (let n = 0; n < norms.length; n++) {
  const word = norms[n][0]; if (!candidates.has(word)) candidates.set(word, [word, 'word', n]);
}
const forms = [...candidates.values()].map(r => [r[0], tags.get(r[0])?.join('|') || r[1], r[2]]).sort((a, b) => a[0].localeCompare(b[0], 'es'));
const normalized = word => word.replaceAll('ñ', '~').normalize('NFD').replace(/\p{M}/gu, '').replaceAll('~', 'ñ');
const uniqueNormalized = new Set(forms.map(r => normalized(r[0]))).size;
if (uniqueNormalized < base.lexicon.length * 10) throw new Error(`Not tenfold: ${uniqueNormalized} / ${base.lexicon.length}`);
const interest = JSON.parse(await readFile(new URL('../.cache/spain-interest.json', import.meta.url), 'utf8'));
const out = {
  ...base, version: '2026-10-19.2', generated: new Date().toISOString(),
  sources: {
    ...base.sources,
    recognitionSpain: { title: 'SPALEX · Word information v4 · Aguasvivas et al.', url: 'https://figshare.com/articles/dataset/Word_information/5924794', doi: '10.6084/m9.figshare.5924794.v4', source: urls.recognition, sha256: digest(normCsv), license: 'CC BY 4.0', fields: ['spelling', 'percent_nts', 'count_nts'], population: 'Native Spanish participants from Spain; separate NTS cohort. Not Latin-American or pooled scores.', collected: '2014-05-12 / 2017-12-19' },
    dictionaryForms: { title: 'Spanish Data / Wiktionary form-to-lemma mappings', url: 'https://github.com/doozan/spanish_data', source: urls.dictionary, sha256: digest(formCsv), license: 'Wiktionary CC BY-SA / repository CC BY 4.0; see attribution', role: 'Spelling and lemma validation only; not the rarity ranking.' },
    wordAttestation: { title: 'FrequencyWords / OpenSubtitles, complete Spanish forms', url: 'https://github.com/hermitdave/FrequencyWords', source: urls.attestation, sha256: digest(observedText), license: 'CC BY-SA 4.0', role: 'Inflected-form attestation only; these pan-Hispanic counts are NOT used for v2 rarity.' },
    interestSpain: { title: 'Wikimedia country-ES daily top pages', url: 'https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html', source: interest.source, period: interest.period, methodology: interest.methodology, sha256: digest(JSON.stringify(interest)), dailySha256: interest.hashes, license: 'Wikimedia public aggregate statistics; page category metadata CC BY-SA 4.0' }
  },
  spainNorms: norms, forms,
  countryInterest: interest.entries.map(r => [r.title, r.publishedViews, r.daysListed, r.bestRank, r.categories, [...new Set(r.aliases || [])], r.qid]),
  expansion: { baselineLemmas: base.lexicon.length, distinctSpellings: forms.length, uniqueNormalizedSpellings: uniqueNormalized, multiplier: uniqueNormalized / base.lexicon.length, directMeasurements: norms.length, directForms: forms.filter(r => r[0] === norms[r[2]][0]).length, inflectedFormsWithMeasuredLemma: forms.filter(r => r[0] !== norms[r[2]][0]).length, rankingCountry: 'ES' }
};
const { buildCategories, PACKS } = await import('../dist/categories.js');
const active = buildCategories(out).filter(c => !c.legacy);
out.expansion.activeQuestions = active.length;
out.expansion.themedPacks = Object.keys(PACKS).length - 1;
out.expansion.questionCountsByPack = Object.fromEntries(Object.keys(PACKS).filter(p => p !== 'all').map(p => [p, active.filter(c => c.pack === p).length]));
await writeFile(new URL('../dist/data.json', import.meta.url), JSON.stringify(out));
console.log(JSON.stringify(out.expansion, null, 2));
