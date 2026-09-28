#!/usr/bin/env node
/**
 * Generates responsive WebP + resized-JPEG variants for every source JPEG in
 * public/assets/images, at up to two target widths (800 / 1600), capped so
 * nothing is ever upscaled past its own original width. Writes
 * public/assets/images/responsive-manifest.json describing what was produced,
 * so the HTML transform script (html-to-picture.mjs) knows which srcset
 * entries exist per image without re-inspecting files itself.
 *
 * Re-run is idempotent: only files derived from an *original* jpg are ever
 * written (never from a previously-generated -Nw file), and originals are
 * matched by filename, not overwritten.
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import sharp from 'sharp';

const IMAGES_DIR = join(import.meta.dirname, '..', 'public', 'assets', 'images');
const TARGET_WIDTHS = [800, 1600];
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 78;

function isGeneratedVariant(name) {
  return /-(?:800|1600)w\.(?:jpg|webp)$/.test(name);
}

async function run() {
  const entries = readdirSync(IMAGES_DIR).filter(
    (f) => extname(f).toLowerCase() === '.jpg' && !isGeneratedVariant(f)
  );

  const manifest = {};
  let bytesBefore = 0;
  let bytesAfterNewFiles = 0;

  for (const file of entries) {
    const srcPath = join(IMAGES_DIR, file);
    const base = basename(file, '.jpg');
    const origStat = statSync(srcPath);
    bytesBefore += origStat.size;

    const img = sharp(srcPath);
    const meta = await img.metadata();
    const origWidth = meta.width;

    const widths = TARGET_WIDTHS.filter((w) => w <= origWidth);

    if (widths.length === 0) {
      // Original is already narrower than the smallest target (e.g. swatches) —
      // still worth a same-size WebP re-encode, just no srcset needed.
      const webpPath = join(IMAGES_DIR, `${base}.webp`);
      const info = await sharp(srcPath).webp({ quality: WEBP_QUALITY }).toFile(webpPath);
      bytesAfterNewFiles += info.size;
      manifest[base] = { origWidth, variants: [], singleWebp: `${base}.webp` };
      console.log(`${file}: single-size webp (${origWidth}px) — ${(info.size / 1024).toFixed(1)} KiB`);
      continue;
    }

    const variants = [];
    for (const w of widths) {
      const jpgPath = join(IMAGES_DIR, `${base}-${w}w.jpg`);
      const webpPath = join(IMAGES_DIR, `${base}-${w}w.webp`);

      const jpgInfo = await sharp(srcPath)
        .resize({ width: w })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true })
        .toFile(jpgPath);
      const webpInfo = await sharp(srcPath)
        .resize({ width: w })
        .webp({ quality: WEBP_QUALITY })
        .toFile(webpPath);

      bytesAfterNewFiles += jpgInfo.size + webpInfo.size;
      variants.push({ width: w, jpg: `${base}-${w}w.jpg`, webp: `${base}-${w}w.webp` });
      console.log(
        `${file}: ${w}w — jpg ${(jpgInfo.size / 1024).toFixed(1)} KiB, webp ${(webpInfo.size / 1024).toFixed(1)} KiB`
      );
    }
    manifest[base] = { origWidth, variants, singleWebp: null };
  }

  writeFileSync(
    join(IMAGES_DIR, 'responsive-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n'
  );

  console.log('\n--- summary ---');
  console.log(`Original JPEGs scanned: ${entries.length}`);
  console.log(`Original bytes: ${(bytesBefore / 1024 / 1024).toFixed(2)} MiB`);
  console.log(`New variant bytes written: ${(bytesAfterNewFiles / 1024 / 1024).toFixed(2)} MiB`);
  console.log('Manifest written to public/assets/images/responsive-manifest.json');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
