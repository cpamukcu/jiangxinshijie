# SINNVO website

Marketing site for SINNVO (星沃), a villa/home elevator manufacturer in Huzhou, China. Built and run by CP Export Marketing for the client.

## Stack
- Vanilla HTML/CSS/JS, built with Vite. No framework.
- One HTML file per page in the repo root. Shared partials in `src/partials/` (`header`, `footer`, `cta`) are injected with `<!--@include name-->` by the `html-partials` plugin in `vite.config.js`.
- Styles: `src/styles/tokens.css` (all colours, fonts, spacing tokens) then `fonts.css`, `base.css`, `header.css`, `hero.css`, `sections.css`, `pages.css`, `responsive.css` (loads last).
- Home hero is a scroll-scrubbed WebP frame sequence in `public/assets/video/frames/` (`src/js/heroVideo.js`, built by `scripts/gen-hero-frames.mjs`). Do not touch the frames.
- Responsive images: `scripts/gen-responsive-images.mjs` + `public/assets/images/responsive-manifest.json`.
- Deploys to GitHub Pages from `main` via `.github/workflows/deploy.yml`. Never push to `main` without the owner's approval.

## Commands
- `npm run dev` – local dev server (builds the Journal from `journal/*.md` first)
- `npm run build` – production build to `dist/`
- `npm run preview` – serve the build
- `SITE_URL=https://example.com npm run build` – absolute og:image URLs (SITE_URL is the single domain switch in `vite.config.js`)

## Brand rules
- Name: **SINNVO** (two N's, caps in the wordmark). Chinese name 星沃. Never "Sinwo", "Sinvoo", "Jiangxinshijie", 匠鑫饰界 or "JX".
- Tagline: "Premium Villa Elevators".
- Colours: white base, violet `#7D33FF` as the only accent (buttons, thin lines, Star Badge, small highlights; never large flat blocks), warm-grey neutrals, near-black `#141223` for text and dark sections. Product finish swatches (champagne gold, silver…) keep their real colours.
- Type: Outfit (headings, light weights) + Inter (body), self-hosted in `public/assets/fonts/`.
- Logo: kit wordmark/Star Badge from `~/Desktop/SINNVO/sinnvo-ad-kit/brand/`; do not redraw.
- English only. Cabin names stay in Pinyin.

## Facts rule
Only publish facts from the kit's `story/facts.md`, the brand story, or the company brochure content already on the site. No founding year, competitor/partner brand names, certifications, counts, awards or client names unless the client confirms in writing. Unconfirmed items stay hidden behind a `TODO(client)` comment. Company legal name is unconfirmed.
