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

const RATIOS = { portrait: 4 / 5, square: 1, wide: 3 / 2 };
const PHOTOS = [
  { src: '01-hero-glass-elevator__IMG_8555.jpg', out: 'real-glass-shaft-showroom', ratio: 'portrait', y: 0.5 },
  { src: '02-cabin-starlight-blue__IMG_8562.jpg', out: 'real-cabin-starlight', ratio: 'portrait', y: 0.45 },
  { src: '04-cabin-white-marble-glow__IMG_8558.jpg', out: 'real-cabin-white-marble', ratio: 'portrait', y: 0.5 },
  { src: '06-cabin-warm-wood__IMG_8545.jpg', out: 'real-cabin-champagne', ratio: 'portrait', y: 0.5 },
  { src: '09-showroom-violet-wall-b__IMG_8551.jpg', out: 'real-showroom-cabin', ratio: 'portrait', y: 0.58 },
  { src: '19-pattern-panels-b__IMG_8565.jpg', out: 'real-decorative-panels', ratio: 'square', y: 0.42, x: 0.4, zoom: 0.8 },
];

for (const p of PHOTOS) {
  const edited = join(EDITED, p.src);
  const src = existsSync(edited) ? edited : join(KIT, p.src);
  const { width, height } = await sharp(src).metadata();
  const r = RATIOS[p.ratio];
  let w = width, h = Math.round(width / r);
  if (h > height) { h = height; w = Math.round(height * r); }
  w = Math.round(w * (p.zoom ?? 1)); h = Math.round(h * (p.zoom ?? 1));
  const left = Math.min(width - w, Math.max(0, Math.round((p.x ?? 0.5) * width - w / 2)));
  const top = Math.min(height - h, Math.max(0, Math.round(p.y * height - h / 2)));
  const outW = Math.min(w, MAX_W);
  const info = await sharp(src)
    .extract({ left, top, width: w, height: h })
    .resize({ width: outW })
    .linear(0.95, 10)                       // lift shadows a little
    .modulate({ brightness: 1.03, saturation: 0.98 })
    .sharpen({ sigma: 0.6 })                // gentle clarity
    .jpeg({ quality: 76, mozjpeg: true })
    .toFile(join(OUT, `${p.out}.jpg`));
  console.log(`${p.out}.jpg  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB${src === edited ? '  (edited)' : ''}`);
}
