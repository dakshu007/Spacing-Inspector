// Post-build: the page is fully rendered at build time and client/enhance.ts
// handles all interaction, so strip the Next.js/React runtime and RSC payload
// from the exported HTML. Visitors get plain HTML + CSS and a 4 KB module.
import { readdir, readFile, writeFile, rm, rmdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const out = new URL('../out/', import.meta.url).pathname;

async function walk(dir) {
  const files = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(p)));
    else files.push(p);
  }
  return files;
}

const files = await walk(out);
for (const file of files) {
  // RSC payloads (page.txt next to page.html, and __next.* segments) are only
  // fetched by the client router, which is gone.
  if (/(^|\/)__next\.[^/]*\.txt$/.test(file) || (file.endsWith('.txt') && existsSync(file.slice(0, -4) + '.html'))) {
    await rm(file);
    continue;
  }
  if (!file.endsWith('.html')) continue;
  const before = await readFile(file, 'utf8');
  const html = before
    .replace(/<link rel="preload" as="script"[^>]*>/g, '')
    .replace(/<script src="\/_next\/[^"]*"[^>]*><\/script>/g, '')
    .replace(/<script>(?:(?!<\/script>)[\s\S])*?(?:self\.__next_f|\$RC|__next_s|requestAnimationFrame\(function\(\)\{\$RT)(?:(?!<\/script>)[\s\S])*<\/script>/g, '');
  await writeFile(file, html);
  console.log(`${file.slice(out.length)}: ${(before.length / 1024).toFixed(0)} KB → ${(html.length / 1024).toFixed(0)} KB`);
}
// The framework's JS and CSS chunks are no longer referenced (CSS is inlined).
await rm(join(out, '_next/static/chunks'), { recursive: true, force: true });
for (const e of await readdir(join(out, '_next/static'), { withFileTypes: true })) {
  if (e.isDirectory() && e.name !== 'media') await rm(join(out, '_next/static', e.name), { recursive: true, force: true });
}

// Drop folders the RSC cleanup left empty.
for (const e of await readdir(out, { withFileTypes: true })) {
  const dir = join(out, e.name);
  if (e.isDirectory() && (await readdir(dir)).length === 0) await rmdir(dir);
}
