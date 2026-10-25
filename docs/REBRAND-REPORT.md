# SINNVO visual rebrand: final report

Branch: `rebrand/sinnvo-visual` (local, not pushed). `main` is untouched.

## What changed
- **Brand system:** white base, violet `#7D33FF` as the only accent, ink `#141223`, warm-grey neutrals (`src/styles/tokens.css`). Every navy/gold/ivory token and hard-coded colour replaced; product finish swatches kept.
- **Type:** Outfit (light display weights) + Inter, both self-hosted. Playfair Display removed.
- **Logo:** official wordmark and Star Badge from the kit (`logo.svg`, `logo-white.svg`, `favicon.svg`), not redrawn. The old lockup with the Chinese tagline is gone.
- **Header:** six short links plus a violet "Get a Quote" button. Technology, Installation and Components & OEM are in the footer.
- **Hero:** frames untouched; tagline "Premium Villa Elevators", light Outfit headline.
- **Real photos:** 6 placed (Collections strip ×3, Home, Factory & Quality, About), via `scripts/prep-real-photos.mjs` and the existing WebP pipeline, with width/height and real alt text.
- **Removed:** placeholder QR boxes; eyebrow labels above headings; all visible unverified claims.
- **Copy:** brand name in caps (SINNVO); em-dash pass on Home, About, Components & OEM, Installation.
- **Accessibility:** footer contrast, footer heading level, Collections/Solutions heading order, link colour on light sections, violet focus ring, text selection and caret.
- **Metadata:** new descriptions, Organization JSON-LD with verified facts only (no founding date, no legal name), `SITE_URL`, sitemap and robots on the GitHub Pages URL.

## Scores (Lighthouse 12.6, mobile, production build)
All 12 pages: Accessibility 100, Best Practices 100, SEO 100, Performance 98–100 (one home run read 77 from a CPU spike; re-runs 99 and 100).

## squirrelscan (v0.0.133, offline, local production build)
Score **50 (F) → 79 (C)**; failed rules 15 → 1. Fixed: canonical URLs on every page (from `SITE_URL`), Organization JSON-LD `@id`/`url`/`logo`, width/height on all 104 images (`scripts/add-img-dimensions.mjs`), lighter real-photo JPEGs, lazy-loading on first-screen images, meta description lengths, home and privacy titles, the lightbox close button's accessible name, form autocomplete hints, and a new `public/llms.txt`.

Left, and why:
- `crawl/sitemap-domain` (the 1 error): the sitemap correctly points at the live domain, not localhost. Clears on the deployed site.
- Duplicate title/description for `/` and `/index.html`: same page; the canonical tag covers it.
- CSP, X-Frame-Options, HSTS, caching, compression, security.txt: response headers that GitHub Pages does not let you set; revisit with a custom host or Cloudflare in front.
- Form CAPTCHA: will be covered by the honeypot when the Formspree handler goes in.
- JPEG fallbacks over 200 KB (`villa-exterior`, `materials-flatlay`, `detail-*`, `villa-lifestyle-banner`): existing images, served only to browsers without WebP; left untouched per the brief.
- Thin content (Contact, Projects), "agent token weight", contextual links: content decisions, not bugs.

## TODO(client): needs SINNVO's written confirmation
| Item | Where | State now |
|---|---|---|
| Registered company name | footer, contact, privacy policy | shows "SINNVO 星沃" / "SINNVO" |
| Founding year (site said 2018, brand copy says "more than a decade") | footer, home, about, factory | hidden |
| Partner brand list (KONE, Schindler, Hitachi…) | home, about | hidden in `<template data-todo>` |
| Tajikistan National Theatre, premium hotels, "hundreds of villas" | home, about, factory, projects | hidden in `<template data-todo>` |
| New cabin codes for JX610–JX660 and JXp670–JXp691 | home, collections, contact | codes hidden, names shown |
| Real enquiry inbox | `src/js/contactForm.js` | placeholder `info@sinnvo.example`, still `mailto:` |
| QR codes (WeChat, Xiaohongshu, Douyin) | removed | add back only with real images |

Search the code for `TODO(client)` and `data-todo="client` to restore anything once confirmed.

## Images that need AI retouch
03, 05, 07, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 25, 26 (details in `docs/image-inventory.md`).
13, 21, 22 and 26 carry the **old JX / 匠鑫饰界 logo or placards** in the pixels; 23 has a Chinese wall sign. Drop edited files into `~/Desktop/SINNVO/edited/` with the kit filename, add them to `PHOTOS` in `scripts/prep-real-photos.mjs`, then run the image commands below.

## Old-brand leftovers
None visible in pages, metadata, code or the placed images. Hidden (comments/templates only): the JX cabin codes, kept so they can be mapped to new codes.

## Not done
- **Contact form handler:** waits for the real inbox (Formspree is the plan: validation, honeypot, success state).
- **OG/Twitter image (1200×630, SINNVO branded):** still the hero poster.
- **Straightening verticals** on the placed photos: they are close to true; left for the retouch pass.

## Commands
```bash
cd ~/Documents/GitHub/jiangxinshijie
npm run dev                      # local dev server
npm run build && npm run preview # production build, served locally

# after adding/replacing photos
node scripts/prep-real-photos.mjs
node scripts/gen-responsive-images.mjs && node scripts/html-to-picture.mjs && node scripts/upgrade-preload-links.mjs

# deploy (only when approved): push the branch, open a PR into main, merge -> GitHub Pages deploys
git push -u origin rebrand/sinnvo-visual
```

## When sinnvo.com goes live
1. In `vite.config.js`, change the `SITE_URL` default to `https://www.sinnvo.com` (or build with `SITE_URL=https://www.sinnvo.com`).
2. Replace `https://cpamukcu.github.io/jiangxinshijie` with the new domain in `public/robots.txt`, `public/sitemap.xml` and `public/llms.txt` (canonical tags and JSON-LD follow `SITE_URL` automatically).
3. Add `public/CNAME` containing `www.sinnvo.com`, then set the custom domain in the repo's Settings → Pages and add the DNS records your registrar shows. `base: './'` already works on a root domain.

## Renaming the GitHub repo
Settings → General → Repository name → `sinnvo` → Rename. GitHub redirects the old URL. Then run `git remote set-url origin https://github.com/cpamukcu/sinnvo.git` locally, and update the Pages URL in step 2 above if you are not on a custom domain yet.
