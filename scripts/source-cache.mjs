import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const cache = new URL('../.cache/', import.meta.url);
let queue = Promise.resolve(), lastRequest = 0;
export const digest = content => createHash('sha256').update(content).digest('hex');
export async function source(name, url) {
  await mkdir(cache, { recursive: true });
  const path = new URL(name, cache);
  try { return await readFile(path, 'utf8'); } catch {}
  const task = queue.then(async () => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const delay = Math.max(0, 800 - (Date.now() - lastRequest));
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      lastRequest = Date.now();
      const response = await fetch(url, { headers: { 'User-Agent': 'OrbitaGame/2.0 (local educational game; public aggregate dataset research)' }, signal: AbortSignal.timeout(45000) });
      if (response.status === 429 || response.status === 503) {
        const wait = Math.max(2000 * (attempt + 1), Number(response.headers.get('retry-after') || 0) * 1000);
        console.log(`Source busy (${response.status}); respecting retry after ${Math.ceil(wait / 1000)}s.`);
        await response.arrayBuffer(); await new Promise(resolve => setTimeout(resolve, wait)); continue;
      }
      if (!response.ok) throw new Error(`${response.status}: ${url}`);
      const text = await response.text(); await writeFile(path, text); return text;
    }
    throw new Error(`Source remains busy: ${url}`);
  });
  queue = task.catch(() => {});
  return task;
}
export async function workers(items, task, concurrency = 2) {
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) { const i = cursor++; await task(items[i], i); }
  }));
}
