import { writeFile } from 'node:fs/promises';
import { source, workers, digest } from './source-cache.mjs';
const period = { start: '2026-09-01', end: '2026-09-30', country: 'ES', project: 'es.wikipedia' };
const records = new Map(), hashes = [];
await workers(Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, '0')), async day => {
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top-per-country/ES/all-access/2026/09/${day}`;
  const text = await source(`es-country-2026-09-${day}.json`, url);
  hashes.push([day, digest(text)]);
  const articles = JSON.parse(text).items?.[0]?.articles;
  if (!Array.isArray(articles)) throw new Error('Missing Spain country statistics');
  for (const article of articles) {
    if (article.project !== period.project || article.article.includes(':') || !Number.isFinite(article.views_ceil)) continue;
    const title = article.article.replaceAll('_', ' ');
    const row = records.get(title) || { title, publishedViews: 0, daysListed: 0, bestRank: Infinity };
    row.publishedViews += article.views_ceil; row.daysListed++; row.bestRank = Math.min(row.bestRank, article.rank);
    records.set(title, row);
  }
}, 2);
const ranked = [...records.values()].filter(r => r.daysListed >= 3).sort((a, b) => b.publishedViews - a.publishedViews || a.title.localeCompare(b.title, 'es'));
console.log(`Spain daily lists: ${records.size} articles; ${ranked.length} observed on at least three days.`);
const batches = Array.from({ length: Math.ceil(ranked.length / 25) }, (_, i) => ranked.slice(i * 25, i * 25 + 25));
const pages = new Map(); let done = 0;
await workers(batches, async batch => {
  let more = {}, page = 0;
  do {
    const url = new URL('https://es.wikipedia.org/w/api.php');
    url.search = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', prop: 'categories|pageprops', cllimit: 'max', clshow: '!hidden', titles: batch.map(r => r.title).join('|'), redirects: '1', ...more });
    const text = await source(`es-article-meta-${digest(batch.map(r => r.title).join('|')).slice(0, 16)}-${page++}.json`, url.href);
    const json = JSON.parse(text);
    if (json.error) throw new Error(json.error.info);
    for (const p of json.query?.pages || []) {
      if (p.missing || p.invalid) continue;
      const old = pages.get(p.title);
      pages.set(p.title, { title: p.title, qid: p.pageprops?.wikibase_item || old?.qid || '', categories: [...new Set([...(old?.categories || []), ...(p.categories || []).map(c => c.title.replace(/^Categoría:/, ''))])] });
    }
    for (const p of [...(json.query?.normalized || []), ...(json.query?.redirects || [])]) { const r = records.get(p.from); if (r) r.target = p.to; }
    more = json.continue;
  } while (more);
  done++; if (done % 20 === 0 || done === batches.length) console.log(`Article metadata ${done}/${batches.length}`);
}, 2);
const merged = new Map();
for (const r of ranked) {
  let target = r.target || r.title; const seen = new Set();
  while (records.get(target)?.target && !seen.has(target)) { seen.add(target); target = records.get(target).target; }
  const p = pages.get(target) || pages.get(r.title); if (!p) continue;
  const key = p.qid || p.title, old = merged.get(key);
  if (!old) merged.set(key, { ...r, ...p, aliases: r.title !== p.title ? [r.title] : [] });
  else { old.publishedViews += r.publishedViews; old.daysListed = Math.max(old.daysListed, r.daysListed); old.aliases.push(r.title); }
}
const output = { period, methodology: 'Sum of published rounded views_ceil values in country ES daily top lists, Spanish Wikipedia only. At least three listed days. Missing days are unreported, not zero. This is an interest index, not an exact monthly total or a recognition percentage.', source: 'https://wikimedia.org/api/rest_v1/metrics/pageviews/top-per-country/ES/all-access/2026/09/15', hashes: hashes.sort(), entries: [...merged.values()] };
await writeFile(new URL('../.cache/spain-interest.json', import.meta.url), JSON.stringify(output));
console.log(`Saved ${output.entries.length} Spain-interest entries.`);
