#!/usr/bin/env node
/**
 * Builds the home hero's "Doors at Dusk" frame sequence (src/js/heroDoors.js).
 *
 * Source: the dusk cabin film from the hero lab (~/Desktop/SINNVO/sinnvo-hero-lab/video/dusk.mp4,
 * 1280×720, 190 frames). Point DOORS_SRC_VIDEO elsewhere if it moves. Needs ffmpeg on PATH.
 * Run once; the output is committed like any other asset in public/.
 *
 * Frames are decoded straight from the video (no intermediate JPEGs), lightly denoised to
 * calm the compression blocks in the dark areas, upscaled to 1920×1080 with Lanczos and
 * gently sharpened, then saved as WebP q78. The source is only 720p, so this is the
 * ceiling until a higher-resolution master of the film exists.
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
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const VIDEO = process.env.DOORS_SRC_VIDEO || join(homedir(), 'Desktop/SINNVO/sinnvo-hero-lab/video/dusk.mp4');
const FILTER = 'hqdn3d=2:1.5:0:0,scale=1920:1080:flags=lanczos+accurate_rnd,unsharp=5:5:0.6:5:5:0';
const QUALITY = 78;
const OUT = join(ROOT, 'public', 'assets', 'video', 'doors');
const IMAGES = join(ROOT, 'public', 'assets', 'images');
const F_CLOSED = 30, F_OPEN = 74, F_END = 189;

export const FRAMES = [];
for (let i = F_CLOSED; i <= F_END; i++) if (i <= F_OPEN || i % 2 === 0 || i === F_END) FRAMES.push(i);

// decode every frame once, losslessly, to a temp dir: frame-0000.png is source index 0
const TMP = mkdtempSync(join(tmpdir(), 'doors-'));
execFileSync('ffmpeg', ['-v', 'error', '-i', VIDEO, '-vf', FILTER, '-fps_mode', 'passthrough', '-start_number', '0', join(TMP, 'frame-%04d.png')]);
const src = (i) => join(TMP, `frame-${String(i).padStart(4, '0')}.png`);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
let bytes = 0;
for (const i of FRAMES) {
  const info = await sharp(src(i)).webp({ quality: QUALITY, effort: 6 }).toFile(join(OUT, `doors-${String(i).padStart(3, '0')}.webp`));
  bytes += info.size;
}
await sharp(src(F_END)).jpeg({ quality: 80, mozjpeg: true }).toFile(join(IMAGES, 'hero-doors-poster.jpg'));
await sharp(src(F_END)).webp({ quality: 70 }).toFile(join(IMAGES, 'hero-doors-poster.webp'));

rmSync(TMP, { recursive: true, force: true });
console.log(`${readdirSync(OUT).length} frames, ${(bytes / 1048576).toFixed(1)} MB → ${OUT}`);
console.log(`frame list: [${FRAMES.join(',')}]`);
