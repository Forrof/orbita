import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'dist');
const destination = path.join(root, '_site');

// The only generated directory that this script may replace is <project>/_site.
if (path.dirname(destination) !== path.resolve(root) || path.basename(destination) !== '_site') throw new Error('Invalid output directory');
await rm(destination, { recursive: true, force: true });
await mkdir(destination);
await cp(source, destination, { recursive: true, dereference: false });
for (const name of ['DATA-LICENSES.md', 'DATA-EXPANSION.md']) await cp(path.join(root, name), path.join(destination, name));
await writeFile(path.join(destination, '.nojekyll'), '');

const files = [];
async function inspect(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.isSymbolicLink()) throw new Error(`Symbolic link is not a Pages asset: ${item.name}`);
    const target = path.join(directory, item.name);
    if (item.isDirectory()) await inspect(target);
    else files.push(target);
  }
}
await inspect(destination);

// Check module, stylesheet, image, and font references without assuming domain-root hosting.
for (const file of files.filter(f => /\.(html|js|css)$/.test(f))) {
  const text = await readFile(file, 'utf8');
  const patterns = file.endsWith('.html') ? [/(?:src|href)=["']([^"']+)["']/g]
    : file.endsWith('.css') ? [/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/g]
      : [/(?:\bfrom\s*|\bimport\s*)["'](\.[^"']+)["']/g, /fetch\(["'](\.[^"']+)["']/g];
  for (const pattern of patterns) for (const match of text.matchAll(pattern)) {
    const reference = match[1] || match[2] || match[3] || '';
    if (/^(?:https?:|data:|#)/.test(reference)) continue;
    if (reference.startsWith('/')) throw new Error(`Domain-root asset would break project Pages: ${reference}`);
    const target = path.resolve(path.dirname(file), reference.split(/[?#]/)[0]);
    if (!target.startsWith(destination + path.sep) || !(await stat(target)).isFile()) throw new Error(`Missing asset: ${reference}`);
  }
}
const data = JSON.parse(await readFile(path.join(destination, 'data.json'), 'utf8'));
const focused = JSON.parse(await readFile(path.join(destination, 'focused-repertory.json'), 'utf8'));
const curated = JSON.parse(await readFile(path.join(destination, 'repertory.json'), 'utf8'));
const catalogue = await readFile(path.join(destination, 'daily-catalog.js'), 'utf8');
if (catalogue.startsWith('// DRAFT')) throw new Error('The daily edition has not been frozen for publication.');
if (data.version !== focused.version || focused.parentRevision !== curated.coverageRevision || data.expansion.activeQuestions !== focused.questions.length) throw new Error('Mismatched question snapshots.');
const { DAILY_EDITIONS } = await import('../dist/daily-catalog.js');
const ids = new Map([...curated.questions.map(q => [q.id, curated.version]), ...focused.questions.map(q => [q.id, focused.version])]);
for (const edition of DAILY_EDITIONS) {
  if (new Set(edition.pool.map(([id]) => id)).size !== edition.pool.length || edition.pool.some(([id]) => ids.get(id) !== edition.version)) throw new Error('Invalid frozen daily pool.');
  if (new Set(edition.pool.map(([, pack]) => pack)).size !== 7) throw new Error('The daily edition needs all seven themes.');
}
const bytes = (await Promise.all(files.map(f => stat(f)))).reduce((sum, s) => sum + s.size, 0);
console.log(`GitHub Pages ready: ${files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MiB, data ${data.version}.`);
console.log('Publish _site/ at the repository URL. All checked assets use relative paths.');
