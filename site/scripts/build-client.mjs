// Bundles client/enhance.ts (plus its on-demand chunks: Lenis, three.js) into
// public/js/ with hashed names, and records the entry in app/client-manifest.json
// so the layout can reference it.
import { build } from 'esbuild';
import { rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const outdir = new URL('public/js/', root).pathname;
await rm(outdir, { recursive: true, force: true });

const result = await build({
  entryPoints: { enhance: new URL('client/enhance.ts', root).pathname },
  outdir,
  bundle: true,
  splitting: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  entryNames: '[name]-[hash]',
  chunkNames: '[name]-[hash]',
  metafile: true
});

const entry = Object.entries(result.metafile.outputs).find(([, o]) => o.entryPoint);
const src = '/js/' + entry[0].split('/').pop();
await writeFile(new URL('app/client-manifest.json', root), JSON.stringify({ enhance: src }, null, 2) + '\n');
for (const [file, o] of Object.entries(result.metafile.outputs)) console.log(`${file.split('public/')[1]}: ${(o.bytes / 1024).toFixed(1)} KB`);
