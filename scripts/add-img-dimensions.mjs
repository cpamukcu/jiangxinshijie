#!/usr/bin/env node
/**
 * Adds width/height (the source JPEG's intrinsic size) to every
 * `<img src="/assets/images/NAME.jpg">` in the pages and partials that has no
 * width yet, so the browser reserves the right box before the image loads
 * (no layout shift). `.media img` is sized by CSS, so the attributes only set
 * the aspect ratio; base.css keeps other images at `height: auto`.
 *
 * Idempotent: images that already carry a width attribute are left alone.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const IMAGES_DIR = join(ROOT, 'public', 'assets', 'images');
const files = [
  ...readdirSync(ROOT).filter((f) => f.endsWith('.html')).map((f) => join(ROOT, f)),
  ...readdirSync(join(ROOT, 'src', 'partials')).filter((f) => f.endsWith('.html')).map((f) => join(ROOT, 'src', 'partials', f)),
];
const sizes = new Map();
const IMG_RE = /<img src="\/assets\/images\/([\w-]+)\.jpg"([^>]*)>/g;

let added = 0;
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const bases = new Set([...html.matchAll(IMG_RE)].filter((m) => !/\swidth="/.test(m[2])).map((m) => m[1]));
  for (const base of bases) {
    const src = join(IMAGES_DIR, `${base}.jpg`);
    if (!sizes.has(base) && existsSync(src)) {
      const { width, height } = await sharp(src).metadata();
      sizes.set(base, { width, height });
    }
  }
  const out = html.replace(IMG_RE, (tag, base, attrs) => {
    if (/\swidth="/.test(attrs) || !sizes.has(base)) return tag;
    const { width, height } = sizes.get(base);
    added++;
    return `<img src="/assets/images/${base}.jpg" width="${width}" height="${height}"${attrs}>`;
  });
  if (out !== html) writeFileSync(file, out);
}
console.log(`width/height added to ${added} <img> tags`);
