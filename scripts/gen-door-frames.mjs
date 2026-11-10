#!/usr/bin/env node
/**
 * Builds the home hero's "Doors at Dusk" frame sequence (src/js/heroDoors.js).
 *
 * Source: the 1280×720 JPEG stills extracted from the dusk cabin film for the hero lab
 * (~/Desktop/SINNVO/sinnvo-hero-lab/video/dusk/001.jpg … 190.jpg). Point DOORS_SRC_DIR
 * elsewhere if they move. Run once; the output is committed like any other asset in public/.
 *
 * Only the part of the film the hero uses is kept: from the closed doors (index 30) to the
 * end (189). The door opening (30–74) keeps every frame, because the split headline is
 * locked to the door edges and needs every step; the slower pull-back after it keeps every
 * second frame (heroDoors.js draws the nearest one it has). Files are named by their
 * 0-based source index: doors-030.webp … doors-189.webp.
 *
 * Also writes the static end-state poster (no JS / reduced motion / data saver):
 * public/assets/images/hero-doors-poster.jpg + .webp.
 */
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const SRC = process.env.DOORS_SRC_DIR || join(homedir(), 'Desktop/SINNVO/sinnvo-hero-lab/video/dusk');
const OUT = join(ROOT, 'public', 'assets', 'video', 'doors');
const IMAGES = join(ROOT, 'public', 'assets', 'images');
const F_CLOSED = 30, F_OPEN = 74, F_END = 189;

export const FRAMES = [];
for (let i = F_CLOSED; i <= F_END; i++) if (i <= F_OPEN || i % 2 === 0 || i === F_END) FRAMES.push(i);

const src = (i) => join(SRC, `${String(i + 1).padStart(3, '0')}.jpg`);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let bytes = 0;
for (const i of FRAMES) {
  const info = await sharp(src(i)).webp({ quality: 62, effort: 6 }).toFile(join(OUT, `doors-${String(i).padStart(3, '0')}.webp`));
  bytes += info.size;
}
await sharp(src(F_END)).jpeg({ quality: 80, mozjpeg: true }).toFile(join(IMAGES, 'hero-doors-poster.jpg'));
await sharp(src(F_END)).webp({ quality: 70 }).toFile(join(IMAGES, 'hero-doors-poster.webp'));

console.log(`${readdirSync(OUT).length} frames, ${(bytes / 1048576).toFixed(1)} MB → ${OUT}`);
console.log(`frame list: [${FRAMES.join(',')}]`);
