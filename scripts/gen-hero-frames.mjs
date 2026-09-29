#!/usr/bin/env node
/**
 * Replaces the hero's scroll-scrubbed <video> with a preloaded frame
 * sequence: extracts FRAME_COUNT evenly-time-spaced stills from each source
 * clip via ffmpeg, encodes them as WebP via sharp, and writes them to
 * public/assets/video/frames/.
 *
 * Why: scrubbing a real <video> element by setting currentTime is
 * seek-latency-bound — even with dense keyframes and a small file, mobile
 * Safari's seek latency was high enough to visibly freeze/stutter during a
 * fast scroll (confirmed on a real iPhone, see heroVideo.js's git history).
 * A preloaded image sequence has no seek step at all: once loaded, picking
 * a frame for a given scroll position is just a synchronous canvas draw,
 * so scrubbing tracks scroll position exactly with no per-device latency
 * cliff to hit.
 *
 * Run once (or whenever the source clips change) — not part of the build,
 * since ffmpeg isn't a build-time dependency and the output is committed
 * like any other asset in public/. The source clips themselves aren't
 * committed any more (nothing on the site loads them); point HERO_SRC_DIR at
 * a folder holding header.mp4 / header-mobile.mp4 — the last committed copies
 * can be recovered with `git show e51c8c5^:public/assets/video/header.mp4`.
 *
 * Sizing: the canvas caps at 2x DPR and the frames are a moving, vignetted
 * backdrop behind text, so they're encoded well below the source resolution
 * (with a light denoise — the AI-generated source is grainy, and grain is
 * what makes these frames expensive to encode). Checked side-by-side at
 * display size: indistinguishable from the full-size q76 frames, ~40% fewer
 * bytes and ~35% less decoded memory for the 32 frames held at once.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, mkdirSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

// No system ffmpeg on this machine — pass the binary's path in FFMPEG_BIN
// (this project has been using the one bundled with the imageio_ffmpeg
// Python package for prior video re-encodes; see README/git history).
const FFMPEG_BIN = process.env.FFMPEG_BIN || 'ffmpeg';

const ROOT = join(import.meta.dirname, '..');
const FRAMES_DIR = join(ROOT, 'public', 'assets', 'video', 'frames');
const FRAME_COUNT = 32;
const SRC_DIR = process.env.HERO_SRC_DIR || join(ROOT, 'public', 'assets', 'video');

const SOURCES = [
  { file: join(SRC_DIR, 'header.mp4'), name: 'header-desktop', width: 1280, quality: 58 },
  { file: join(SRC_DIR, 'header-mobile.mp4'), name: 'header-mobile', width: 480, quality: 60 },
];

function probeDuration(ffmpeg, file) {
  // ffmpeg -i prints to stderr and exits non-zero with no output file given — expected.
  let out = '';
  try {
    execFileSync(ffmpeg, ['-i', file], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = e.stderr.toString();
  }
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!m) throw new Error(`could not parse duration for ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

async function run() {
  const ffmpeg = FFMPEG_BIN;
  mkdirSync(FRAMES_DIR, { recursive: true });

  for (const { file, name, width, quality } of SOURCES) {
    const duration = probeDuration(ffmpeg, file);
    const fps = FRAME_COUNT / duration;
    const tmp = mkdtempSync(join(tmpdir(), 'hero-frames-'));

    execFileSync(ffmpeg, [
      '-y', '-loglevel', 'error', '-i', file,
      '-vf', `fps=${fps},hqdn3d=3:3:4:4`,
      '-frames:v', String(FRAME_COUNT),
      join(tmp, 'frame-%03d.png'),
    ], { stdio: 'inherit' });

    const pngs = readdirSync(tmp).filter((f) => f.endsWith('.png')).sort();
    if (pngs.length !== FRAME_COUNT) {
      console.warn(`  ! ${name}: expected ${FRAME_COUNT} frames, ffmpeg produced ${pngs.length}`);
    }

    let totalBytes = 0;
    for (let i = 0; i < pngs.length; i++) {
      const outPath = join(FRAMES_DIR, `${name}-${String(i).padStart(2, '0')}.webp`);
      const info = await sharp(join(tmp, pngs[i])).resize({ width }).webp({ quality, effort: 6 }).toFile(outPath);
      totalBytes += info.size;
    }
    rmSync(tmp, { recursive: true, force: true });
    console.log(`${name}: ${pngs.length} frames, ${(totalBytes / 1024).toFixed(1)} KiB total`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
