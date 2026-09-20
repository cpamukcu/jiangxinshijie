# JIANGXINSHIJIE — Villa Elevator

Marketing site for Huzhou Jiangxinshijie Elevator Co., Ltd. Vanilla HTML/CSS/JS
(ES modules), built with Vite. No framework, no backend.

## Run it

```bash
npm install
npm run dev       # local dev server with hot reload
npm run build     # production build → dist/
npm run preview   # serve the dist/ build locally to sanity-check it
```

## What's real vs. placeholder

The core catalogue content — structure diagrams, well colours, case-study
photos, all 10 cabin collections' real material specs, brand story, safety
copy — was cropped directly from the company's own 2026.08 product brochure
and screened to make sure **no Chinese text or logos are baked into the
pixels** (this is an export-facing site, so every string of copy is English
only). Cabin names keep their Pinyin transliteration (Liuguang, Wujie,
Jingjie, etc.) as product names, styled the way a fragrance or paint-colour
name would be.

A second pass of AI-generated photography (in `Desktop/VILLA/`) replaced or
filled every remaining gap: the hero video, the Brand Story exterior shot,
Decorative Elements flatlay, the Human-Machine Interface panel, a new
"Precision Assembly" detail card, a Safety-section lifestyle photo, the
closing lifestyle banner before Contact, and four of the ten cabin photos
(Liuguang, Jingjie, Lumina, Yinshe) where a more evocative mood shot fit the
name better than the brochure's studio product render.

The site still degrades gracefully wherever an image or video is missing:
any `<img>` inside a `.media` element whose file 404s automatically swaps to
a labeled placeholder (see `.media.is-missing` in `src/styles/base.css`,
wired by `src/js/assetFallback.js`) instead of a broken-image icon.

### TODO before launch

| Asset | Status | Notes |
|---|---|---|
| `public/assets/video/header.mp4` | **In place** | 1280×720 H.264, 8s, scroll-scrubbed via `src/js/heroVideo.js`. A second take (`Elevator_descending_in_villa_...mp4`) is sitting in `Desktop/VILLA/` unused — swap it in if you prefer that take. |
| `public/assets/images/logo.svg` | **Placeholder** | A simple typographic mark I built (navy wordmark + geometric "X"). Swap for the real vector logo file — keep the filename `logo.svg` or update the two `<img>` references in `index.html`. |
| Real contact details | Placeholder | `src/js/contactForm.js` uses `info@jiangxinshijie.com` as the mailto target — replace with the real inbox, and wire the form to a real backend (e.g. Formspree) per the `TODO` comment in that file. |
| QR codes on the home Contact section | Placeholder | The "Follow Us" boxes are unlabeled dashed placeholders (Website / Xiaohongshu / Douyin / WeChat Channels) — drop in real QR images when available; do not fabricate scannable codes. |

Every image slot referenced in the HTML pages now resolves to a real file —
run `comm -23 <(grep -oE 'data-fallback-label="[^"]+"' index.html | sed 's/.*"\(.*\)"/\1/' | sort -u) <(ls public/assets/images | sort -u)`
to re-check for gaps after any future edit.

## Structure

```
index.html               home — scroll-driven hero + 9 sections
about / collections / solutions / technology / projects / contact .html
                         inner pages (each linked from the shared header + footer)
src/partials/            header, footer, CTA band — injected at build time by the
                         html-partials plugin in vite.config.js (<!--@include name-->)
src/main.js              entry point — imports styles + initializes modules
src/styles/              tokens, base, header, hero, sections, lightbox, pages, responsive
src/js/
  nav.js                 sticky header + mobile menu
  heroVideo.js            scroll-scrub hero video (CSS-sticky + rAF, no library)
  reveal.js               IntersectionObserver fade/rise-on-scroll
  lightbox.js              vanilla modal for the cabin interior gallery
  assetFallback.js         labeled placeholder for any missing image
  contactForm.js           mailto: fallback for the contact form
  parallax.js              subtle scroll parallax on the closing lifestyle banner
  filters.js               chip filters on Collections and Projects
public/assets/images/    curated photography (see TODO table above for gaps)
public/favicon.svg
```

## Notes for the next real-asset pass

- Images are served as-is from `public/` (unprocessed by Vite) — for a real
  launch, re-export responsive `srcset` variants (e.g. 480/960/1600w) once
  final photography is in, and consider an `<picture>`/AVIF fallback for the
  hero and cabin gallery images specifically, since those are the heaviest.
- `prefers-reduced-motion: reduce` is respected everywhere: the hero skips
  video scrubbing (falls back to the static poster image), and all
  `.reveal` sections and hover-zoom effects are disabled via CSS.

## Multi-page build

`vite.config.js` treats every `*.html` in the project root as an entry point, so
adding a page is: create `newpage.html` (copy any inner page as a template), add
a nav link in `src/partials/header.html` (with `data-nav="newpage"` so the active
link is highlighted), and add it to `public/sitemap.xml`.

`og:image` URLs are made absolute at build time from `SITE_URL` (defaults to the
GitHub Pages address). When a custom domain is live, build with
`SITE_URL=https://yourdomain.com npm run build` and update `public/robots.txt`
and `public/sitemap.xml`.
