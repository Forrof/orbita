import { writeFile } from 'node:fs/promises';
import { source, digest } from './source-cache.mjs';

const cutoff = '2026-10-18';
const dates = [];
for (let d = new Date('2026-09-01T12:00:00Z'); d.toISOString().slice(0, 10) <= cutoff; d.setUTCDate(d.getUTCDate() + 1)) dates.push(d.toISOString().slice(0, 10));
const entries = new Map(), hashes = [], unavailable = [];
for (let i = 0; i < dates.length; i++) {
  const date = dates[i], [year, month, day] = date.split('-');
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top-per-country/ES/all-access/${year}/${month}/${day}`;
  let text;
  try { text = await source(`es-country-${date}.json`, url); }
  catch (error) { if (String(error.message).startsWith('404:')) { unavailable.push(date); continue; } throw error; }
  const result = JSON.parse(text).items?.[0];
  if (result?.country !== 'ES' || result.year !== year || result.month !== month || result.day !== day) throw new Error(`Unexpected country/date: ${date}`);
  hashes.push([date, digest(text)]);
  for (const article of result.articles || []) {
    if (article.project !== 'es.wikipedia' || /^(?:Especial|Special|Wikipedia|Portal|Categoría|Category|Ayuda|Help|Archivo|File|Usuario|User|Plantilla|Template|MediaWiki|Discusión|Talk|Anexo):/.test(article.article) || !Number.isFinite(article.views_ceil)) continue;
    const title = article.article.replaceAll('_', ' '), old = entries.get(title) || { title, publishedViews: 0, daysListed: 0 };
    old.publishedViews += article.views_ceil; old.daysListed++;
    entries.set(title, old);
  }
  if ((i + 1) % 20 === 0) console.log(`Country ES 2026: ${i + 1}/${dates.length} dates, ${entries.size} article signals.`);
}
const output = { period: { start: hashes[0]?.[0], end: hashes.at(-1)?.[0], requestedEnd: cutoff, country: 'ES', project: 'es.wikipedia' }, hashes, unavailable, methodology: 'Sum of rounded values published in country-ES daily top lists during 2026, Spanish Wikipedia only. Unlisted days are unknown, never zero. Not complete monthly totals, unique readers, recognition percentages, or a worldwide Spanish-language statistic.', entries: [...entries.values()] };
await writeFile(new URL('../.cache/current-interest-2026.json', import.meta.url), JSON.stringify(output));
console.log(`Saved ${output.entries.length} current signals from ${hashes.length} days in 2026.`);
