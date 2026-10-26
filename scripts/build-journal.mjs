#!/usr/bin/env node
/**
 * Builds the Journal from Markdown. Every journal/*.md file becomes
 * journal-<slug>.html in the site root (so the shared header/footer partials and
 * their relative links work unchanged), plus:
 *   - journal.html                       the index, newest first
 *   - src/partials/journallatest.html    the "From the Journal" row on the home page
 *   - the journal URLs in public/sitemap.xml (between the journal markers)
 * The generated HTML is git-ignored; `npm run dev` and `npm run build` run this first.
 *
 * Front matter (between --- lines at the top of each .md):
 *   title, date (YYYY-MM-DD), summary, cover (an image base name in
 *   public/assets/images, e.g. real-landing-door), coverAlt, slug (optional)
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, unlinkSync } from 'node:fs';
import { join, basename } from 'node:path';
import { marked } from 'marked';
import sharp from 'sharp';

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'journal');
const SITE_URL = (process.env.SITE_URL || 'https://cpamukcu.github.io/jiangxinshijie').replace(/\/$/, '');
const manifest = JSON.parse(readFileSync(join(ROOT, 'public/assets/images/responsive-manifest.json'), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function parse(file) {
  const raw = readFileSync(join(SRC, file), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter`);
  const meta = Object.fromEntries(m[1].split('\n').filter(Boolean).map((l) => {
    const i = l.indexOf(':');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"(.*)"$/, '$1')];
  }));
  for (const k of ['title', 'date', 'summary', 'cover', 'coverAlt']) if (!meta[k]) throw new Error(`${file}: missing ${k}`);
  meta.slug ||= basename(file, '.md');
  meta.page = `journal-${meta.slug}.html`;
  meta.html = marked.parse(m[2], { gfm: true });
  meta.words = m[2].split(/\s+/).filter(Boolean).length;
  return meta;
}

// <picture> with the WebP tiers gen-responsive-images.mjs produced for this image
const dims = {}; // intrinsic size per cover, so the browser reserves the box (no layout shift)
function picture(base, alt, sizes, extra = '') {
  const entry = manifest[base];
  const wh = dims[base] ? ` width="${dims[base].width}" height="${dims[base].height}"` : '';
  if (!entry) throw new Error(`no responsive variants for ${base}; run scripts/gen-responsive-images.mjs`);
  const srcset = entry.variants.map((v) => `/assets/images/${v.webp} ${v.width}w`).join(', ');
  return `<picture><source type="image/webp" srcset="${srcset}" sizes="${sizes}"><img src="/assets/images/${base}.jpg"${wh} alt="${esc(alt)}"${extra}></picture>`;
}

function head({ title, description, image, type, jsonLd }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${type}">
<meta property="og:image" content="/assets/images/${image}.jpg">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/inter.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/outfit.woff2" crossorigin>${jsonLd ? `\n<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>` : ''}
</head>`;
}

function hero({ image, alt, crumbs, title, lede }) {
  return `  <section class="page-hero page-hero--journal" aria-label="${esc(title)}">
    <div class="media page-hero__media" data-fallback-label="${image}.jpg">${picture(image, alt, '100vw', ' fetchpriority="high"')}</div>
    <div class="wrap page-hero__content">
      <nav class="crumbs" aria-label="Breadcrumb">${crumbs}</nav>
      <h1 class="page-hero__title">${title}</h1>
      ${lede}
    </div>
  </section>`;
}

const shell = (headHtml, bodyClass, main) => `${headHtml}
<body class="${bodyClass}">

<a class="skip-link" href="#main">Skip to content</a>

<!--@include header-->

<main id="main">

${main}

<!--@include cta-->

</main>

<!--@include footer-->

<script type="module" src="/src/main.js"></script>
</body>
</html>
`;

const card = (p, sizes) => `<a class="post-card reveal" href="${p.page}">
          <div class="media post-card__media" data-fallback-label="${p.cover}.jpg">${picture(p.cover, p.coverAlt, sizes, ' loading="lazy" decoding="async"')}</div>
          <time class="post-card__date" datetime="${p.date}">${fmtDate(p.date)}</time>
          <h3 class="post-card__title">${esc(p.title)}</h3>
          <p class="post-card__summary">${esc(p.summary)}</p>
          <span class="post-card__go">Read the article <span aria-hidden="true">→</span></span>
        </a>`;

// ---------- build ----------
const posts = existsSync(SRC) ? readdirSync(SRC).filter((f) => f.endsWith('.md')).map(parse) : [];
posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
for (const base of new Set([...posts.map((p) => p.cover), 'real-villa-glass-shaft'])) {
  const { width, height } = await sharp(join(ROOT, 'public/assets/images', `${base}.jpg`)).metadata();
  dims[base] = { width, height };
}

// stale generated pages from posts that were renamed or removed
for (const f of readdirSync(ROOT)) if (/^journal-.+\.html$/.test(f) && !posts.some((p) => p.page === f)) unlinkSync(join(ROOT, f));

for (const p of posts) {
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: p.title, description: p.summary, datePublished: p.date,
    image: `%SITE_URL%/assets/images/${p.cover}.jpg`, wordCount: p.words,
    mainEntityOfPage: `%SITE_URL%/${p.page}`,
    author: { '@id': '%SITE_URL%/#organization' }, publisher: { '@id': '%SITE_URL%/#organization' }
  };
  const minutes = Math.max(1, Math.round(p.words / 220));
  const main = `${hero({
    image: p.cover, alt: p.coverAlt,
    crumbs: `<a href="index.html">Home</a><span aria-hidden="true">/</span><a href="journal.html">Journal</a><span aria-hidden="true">/</span><span>${esc(p.title)}</span>`,
    title: esc(p.title),
    lede: `<p class="page-hero__lede"><time datetime="${p.date}">${fmtDate(p.date)}</time> · ${minutes} min read</p>`
  })}

  <article class="section article" aria-label="${esc(p.title)}">
    <div class="wrap article__wrap">
      <p class="article__summary">${esc(p.summary)}</p>
      <div class="article__body">
${p.html}
      </div>
      <a href="journal.html" class="text-link">← All Journal articles</a>
    </div>
  </article>`;
  writeFileSync(join(ROOT, p.page), shell(head({ title: `${p.title} | SINNVO Journal`, description: p.summary, image: p.cover, type: 'article', jsonLd }), 'page-sub page-journal', main));
}

const indexMain = `${hero({
  image: 'real-villa-glass-shaft', alt: 'A SINNVO glass-shaft elevator rising through a double-height villa hall',
  crumbs: '<a href="index.html">Home</a><span aria-hidden="true">/</span><span>Journal</span>',
  title: 'Journal',
  lede: '<p class="page-hero__lede">Guides for villa owners, architects and distributors planning a home elevator: structures, measurements and finishes.</p>'
})}

  <section class="section" aria-label="Articles">
    <div class="wrap">
      <h2 class="sr-only">Articles</h2>
      <div class="post-grid">
        ${posts.map((p) => card(p, '(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 33vw')).join('\n        ')}
      </div>
    </div>
  </section>`;
writeFileSync(join(ROOT, 'journal.html'), shell(head({
  title: 'Journal | SINNVO Villa Elevators',
  description: 'Guides for planning a villa or home elevator: choosing a shaft and drive structure, what to measure before a quote, and how cabin finishes come together.',
  image: 'real-villa-glass-shaft', type: 'website'
}), 'page-sub page-journal', indexMain));

writeFileSync(join(ROOT, 'src/partials/journallatest.html'), `<section class="section journal-latest" aria-label="From the Journal">
  <div class="wrap">
    <div class="journal-latest__head reveal">
      <h2 class="h2">From the Journal</h2>
      <a href="journal.html" class="text-link">All articles →</a>
    </div>
    <div class="post-grid">
      ${posts.slice(0, 3).map((p) => card(p, '(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 33vw')).join('\n      ')}
    </div>
  </div>
</section>
`);

const sitemapPath = join(ROOT, 'public/sitemap.xml');
const urls = ['journal.html', ...posts.map((p) => p.page)].map((u) => `  <url><loc>${SITE_URL}/${u}</loc></url>`).join('\n');
let sitemap = readFileSync(sitemapPath, 'utf8').replace(/\n?  <!-- journal -->[\s\S]*?<!-- \/journal -->/, '');
sitemap = sitemap.replace('</urlset>', `  <!-- journal -->\n${urls}\n  <!-- /journal -->\n</urlset>`);
writeFileSync(sitemapPath, sitemap);

console.log(`journal: ${posts.length} posts -> journal.html, ${posts.map((p) => p.page).join(', ')}`);
