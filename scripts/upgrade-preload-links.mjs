#!/usr/bin/env node
/**
 * Upgrades every `<link rel="preload" as="image" href="/assets/images/X.jpg">`
 * to also carry fetchpriority="high" and an imagesrcset/imagesizes pair that
 * matches the WebP <source> the corresponding <picture> now uses (same
 * sizes value: these are all page-hero images, which are always 100vw).
 * type="image/webp" scopes the preload to browsers that would actually pick
 * that source — everyone else silently falls back to fetching the plain
 * `href` JPEG when the <picture>'s own <img> is reached, same as before.
 *
 * Idempotent: a link that already has imagesrcset is left untouched.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = import.meta.dirname + '/..';
const IMAGES_DIR = join(ROOT, 'public', 'assets', 'images');
const manifest = JSON.parse(readFileSync(join(IMAGES_DIR, 'responsive-manifest.json'), 'utf8'));

const HTML_FILES = readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => join(ROOT, f));

const LINK_RE = /<link rel="preload" as="image" href="\/assets\/images\/([\w-]+)\.jpg">/g;

let total = 0;
for (const file of HTML_FILES) {
  const content = readFileSync(file, 'utf8');
  const next = content.replace(LINK_RE, (full, base) => {
    const entry = manifest[base];
    if (!entry || !entry.variants.length) {
      console.warn(`  ! ${file}: no responsive variants for "${base}.jpg" — left preload as-is`);
      return full;
    }
    const imagesrcset = entry.variants.map((v) => `/assets/images/${v.webp} ${v.width}w`).join(', ');
    total++;
    return `<link rel="preload" as="image" href="/assets/images/${base}.jpg" imagesrcset="${imagesrcset}" imagesizes="100vw" type="image/webp" fetchpriority="high">`;
  });
  if (next !== content) {
    writeFileSync(file, next);
    console.log(`${file.replace(ROOT + '/', '')}: upgraded preload link`);
  }
}
console.log(`\nTotal upgraded: ${total}`);
