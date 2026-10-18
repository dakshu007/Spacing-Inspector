// Builds public/demo/*.js (the live demo) from the extension's own code.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { minify } from 'terser';

const root = new URL('../', import.meta.url);
const ext = new URL('../../extension/', import.meta.url);
const read = (u) => readFile(u, 'utf8');

const inspector = `(function (chrome) {\n${await read(new URL('content/inspector.js', ext))}\n})(window.SpacingDemoChrome);`;
const files = {
  'shim.js': await read(new URL('demo-src/shim.js', root)),
  'core.js': await read(new URL('lib/core.js', ext)),
  'inspector.js': inspector
};

await mkdir(new URL('public/demo/', root), { recursive: true });
for (const [name, src] of Object.entries(files)) {
  const { code } = await minify(src, { compress: true, mangle: true, format: { comments: false } });
  await writeFile(new URL(`public/demo/${name}`, root), code);
  console.log(`demo/${name}: ${(code.length / 1024).toFixed(1)} KB`);
}
