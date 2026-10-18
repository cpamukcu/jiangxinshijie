// Bundles three.js into the viewer so sinnvo-villa-lift-standalone.html opens by
// double-click, offline, with no CDN or local server. Run after `node build.mjs`.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSync } from 'esbuild';

const html = readFileSync('sinnvo-villa-lift.html', 'utf8');
const importmap = /<script type="importmap">[\s\S]*?<\/script>\s*/;
const moduleTag = /<script type="module">([\s\S]*?)<\/script>/;
const src = html.match(moduleTag)[1].replaceAll("'three/addons/", "'three/examples/jsm/");

const dir = mkdtempSync(join(tmpdir(), 'sinnvo-viewer-'));
const entry = join(dir, 'entry.js');
writeFileSync(entry, src);
const out = buildSync({
  entryPoints: [entry], bundle: true, format: 'iife', minify: true, write: false,
  nodePaths: [join(process.cwd(), 'node_modules')], logLevel: 'warning',
}).outputFiles[0].text.replaceAll('</script', '<\\/script');

const page = html
  .replace(importmap, '')
  .replace(moduleTag, () => `<script>${out}</script>`);
writeFileSync('sinnvo-villa-lift-standalone.html', page);
console.log('built sinnvo-villa-lift-standalone.html', (page.length / 1024).toFixed(0), 'KB');
