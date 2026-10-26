#!/usr/bin/env node
/**
 * Crops and grades the real SINNVO photos from the brand kit into master JPEGs
 * in public/assets/images/ (named real-*.jpg). Originals are only read, never
 * written. Afterwards run gen-responsive-images.mjs for the WebP tiers and
 * html-to-picture.mjs for any new <img> tags.
 *
 *   node scripts/prep-real-photos.mjs [kitPhotosDir]
 *
 * Default kit dir: ~/Desktop/SINNVO/sinnvo-ad-kit/photos. When a retouched
 * version exists in ~/Desktop/SINNVO/edited/ under the same kit filename, it
 * wins over the kit original.
 *
 * Ratios per slot: 4:5 portrait, 1:1 detail, 3:2 wide. `y` is where the crop
 * window is centred vertically (0 = top, 1 = bottom); optional `x` does the same
 * horizontally and `zoom` (<1) shrinks the window to crop tighter.
 * Grade: slight lift of the shadows, a touch of brightness and clarity, so the
 * set reads as one bright shoot without changing the product's colours.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import sharp from 'sharp';

const KIT = process.argv[2] || join(homedir(), 'Desktop/SINNVO/sinnvo-ad-kit/photos');
const EDITED = join(homedir(), 'Desktop/SINNVO/edited');
const OUT = join(import.meta.dirname, '..', 'public', 'assets', 'images');
const MAX_W = 1600;

const RATIOS = { portrait: 4 / 5, square: 1, wide: 3 / 2, landscape: 4 / 3, card: 16 / 10 };
// `e` overrides the crop when the Yuanbao-edited version is used (its framing differs from the kit photo).
const PHOTOS = [
  { src: '01-hero-glass-elevator__IMG_8555.jpg', out: 'real-glass-shaft-showroom', ratio: 'portrait', y: 0.5 },
  { src: '02-cabin-starlight-blue__IMG_8562.jpg', out: 'real-cabin-starlight', ratio: 'portrait', y: 0.45, e: { y: 0.5 } },
  { src: '04-cabin-white-marble-glow__IMG_8558.jpg', out: 'real-cabin-white-marble', ratio: 'portrait', y: 0.5 },
  { src: '06-cabin-warm-wood__IMG_8545.jpg', out: 'real-cabin-champagne', ratio: 'portrait', y: 0.5 },
  { src: '09-showroom-violet-wall-b__IMG_8551.jpg', out: 'real-showroom-cabin', ratio: 'portrait', y: 0.58, e: { y: 0.52, x: 0.38, zoom: 0.78 } }, // tighter edited crop keeps an AI-invented wall sign out of frame
  { src: '19-pattern-panels-b__IMG_8565.jpg', out: 'real-decorative-panels', ratio: 'square', y: 0.42, x: 0.4, zoom: 0.8, e: { y: 0.42 } },
  // edited-only: these replace AI images or are new on the site, so the kit photo is never used
  { src: '11-glass-shaft-tall-a__IMG_8531.jpg', out: 'real-villa-glass-shaft', ratio: 'portrait', y: 0.5, editedOnly: true },
  { src: '13-control-panels-glow__IMG_8538.jpg', out: 'real-control-panels', ratio: 'card', y: 0.55, editedOnly: true },
  { src: '14-factory-cabin-lit__IMG_8509.jpg', out: 'real-workshop-cabin', ratio: 'landscape', y: 0.55, editedOnly: true },
  { src: '17-craft-wood-curve__IMG_8513.jpg', out: 'real-wood-panel', ratio: 'landscape', y: 0.55, editedOnly: true },
  { src: '20-door-frame-light__IMG_8529.jpg', out: 'real-villa-landing', ratio: 'landscape', y: 0.5, editedOnly: true },
  { src: '21-white-corridor-door__IMG_8543.jpg', out: 'real-landing-door', ratio: 'portrait', y: 0.5, editedOnly: true },
  { src: '22-materials-wall__IMG_8539.jpg', out: 'real-trim-profiles', ratio: 'landscape', y: 0.5, editedOnly: true },
  { src: '26-corridor-wide__IMG_8549.jpg', out: 'real-showroom-corridor', ratio: 'wide', y: 0.5, editedOnly: true },
];

const editedPath = (name) => ['.png', '.jpg', '.webp']
  .map((ext) => join(EDITED, name.replace(/\.jpg$/, ext))).find((f) => existsSync(f));

for (const entry of PHOTOS) {
  const edited = editedPath(entry.src);
  if (!edited && entry.editedOnly) { console.log(`${entry.out}: waiting for the edited version`); continue; }
  const p = edited ? { ...entry, x: undefined, zoom: undefined, ...entry.e } : entry;
  const src = edited || join(KIT, p.src);
  const { width, height } = await sharp(src).metadata();
  const r = RATIOS[p.ratio];
  let w = width, h = Math.round(width / r);
  if (h > height) { h = height; w = Math.round(height * r); }
  w = Math.round(w * (p.zoom ?? 1)); h = Math.round(h * (p.zoom ?? 1));
  const left = Math.min(width - w, Math.max(0, Math.round((p.x ?? 0.5) * width - w / 2)));
  const top = Math.min(height - h, Math.max(0, Math.round(p.y * height - h / 2)));
  const outW = Math.min(w, MAX_W);
  let img = sharp(src).extract({ left, top, width: w, height: h }).resize({ width: outW });
  img = edited
    ? img.sharpen({ sigma: 0.4 })           // already retouched: only a touch of clarity
    : img.linear(0.95, 10)                  // lift shadows a little
      .modulate({ brightness: 1.03, saturation: 0.98 })
      .sharpen({ sigma: 0.6 });             // gentle clarity
  const info = await img
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 76, mozjpeg: true })
    .toFile(join(OUT, `${p.out}.jpg`));
  console.log(`${p.out}.jpg  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB${src === edited ? '  (edited)' : ''}`);
}
