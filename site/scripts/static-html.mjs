// Post-build: the page is fully rendered at build time and client/enhance.ts
// handles all interaction, so strip the Next.js/React runtime and RSC payload
// from the exported HTML. Visitors get plain HTML + CSS and a 4 KB module.
import { readdir, readFile, writeFile, rm } from 'node:fs/promises';
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
  // RSC payloads are only fetched by the client router, which is gone.
  if (/(^|\/)(__next\.[^/]*|index|_not-found)\.txt$/.test(file.slice(out.length))) {
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
await rm(join(out, '_not-found'), { recursive: true, force: true });
