import { readFileSync, writeFileSync } from 'node:fs';
const model = readFileSync('elevator-model.js', 'utf8').replace(/^export /gm, '');
const tpl = readFileSync('viewer.template.html', 'utf8');
const html = tpl.replace('/*__MODEL__*/', model);
writeFileSync('sinnvo-villa-lift.html', html);
// local test copy: same page, three.js served from node_modules
writeFileSync('test.html', '<meta charset="utf-8">' + html
  .replace(/<link rel="(stylesheet|preconnect)" href="https:\/\/fonts[^>]*>/g, '')
  .replace('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js', '/node_modules/three/build/three.module.js')
  .replace('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/', '/node_modules/three/examples/jsm/'));
console.log('built', html.length, 'bytes');
