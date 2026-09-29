#!/usr/bin/env node
/**
 * Generates responsive WebP variants for every source JPEG in
 * public/assets/images at up to four widths (480 / 800 / 1200 / 1600),
 * capped so nothing is ever upscaled past its own original width, and writes
 * public/assets/images/responsive-manifest.json describing what was produced
 * so html-to-picture.mjs / upgrade-preload-links.mjs can build srcsets
 * without re-inspecting files.
 *
 * Tiers: 480 serves card/grid images on 2x phones, 1200 serves full-width
 * heroes on 3x phones (which would otherwise jump straight to 1600).
 * Quality 64 was checked side-by-side against 78 on the heaviest images —
 * indistinguishable at display size, roughly 25% fewer bytes.
 *
 * No resized JPEG copies: every browser that supports srcset also decodes
 * WebP now; anything that doesn't still gets the original JPEG via <img src>.
 *
 * Re-run is idempotent: variants are only ever derived from an *original*
 * jpg (never from a previously generated -Nw file), and stale variant files
 * from earlier tiers/formats are removed.
 */
import { readdirSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import sharp from 'sharp';

const IMAGES_DIR = join(import.meta.dirname, '..', 'public', 'assets', 'images');
const TARGET_WIDTHS = [480, 800, 1200, 1600];
const WEBP_QUALITY = 64;

const isGeneratedVariant = (name) => /-\d+w\.(?:jpg|webp)$/.test(name);

async function run() {
  const all = readdirSync(IMAGES_DIR);
  const entries = all.filter((f) => extname(f).toLowerCase() === '.jpg' && !isGeneratedVariant(f));

  const manifest = {};
  const keep = new Set();
  let bytesOut = 0;

  for (const file of entries) {
    const srcPath = join(IMAGES_DIR, file);
    const base = basename(file, '.jpg');
    const { width: origWidth } = await sharp(srcPath).metadata();
    const widths = TARGET_WIDTHS.filter((w) => w <= origWidth);

    if (widths.length === 0) {
      // Narrower than the smallest tier (the swatches) — same-size WebP, no srcset.
      const out = `${base}.webp`;
      const info = await sharp(srcPath).webp({ quality: WEBP_QUALITY, effort: 6 }).toFile(join(IMAGES_DIR, out));
      bytesOut += info.size;
      keep.add(out);
      manifest[base] = { origWidth, variants: [], singleWebp: out };
      continue;
    }

    const variants = [];
    for (const w of widths) {
      const out = `${base}-${w}w.webp`;
      const info = await sharp(srcPath).resize({ width: w }).webp({ quality: WEBP_QUALITY, effort: 6 }).toFile(join(IMAGES_DIR, out));
      bytesOut += info.size;
      keep.add(out);
      variants.push({ width: w, webp: out });
    }
    manifest[base] = { origWidth, variants, singleWebp: null };
    console.log(`${file}: ${widths.map((w) => w + 'w').join(', ')}`);
  }

  let removed = 0;
  for (const f of all) {
    if (isGeneratedVariant(f) && !keep.has(f)) { unlinkSync(join(IMAGES_DIR, f)); removed++; }
  }

  writeFileSync(join(IMAGES_DIR, 'responsive-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\n${entries.length} originals -> ${keep.size} WebP files, ${(bytesOut / 1024 / 1024).toFixed(2)} MiB total; removed ${removed} stale variant files`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
