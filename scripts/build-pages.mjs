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
const bytes = (await Promise.all(files.map(f => stat(f)))).reduce((sum, s) => sum + s.size, 0);
console.log(`GitHub Pages ready: ${files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MiB, data ${data.version}.`);
console.log('Publish _site/ at the repository URL. All checked assets use relative paths.');
