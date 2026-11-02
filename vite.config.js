import { defineConfig } from 'vite';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
// Social crawlers need an absolute og:image URL; override with SITE_URL to build for another domain.
const SITE_URL = (process.env.SITE_URL || 'https://sinnvoelevator.com').replace(/\/$/, '');
const partialsDir = resolve(root, 'src/partials');
const pages = readdirSync(root).filter((f) => f.endsWith('.html'));

// Site-wide entities, emitted on every page so BlogPosting author/publisher @id references resolve wherever they are read.
// TODO(client): add "email"/"telephone" and "sameAs" (official social profiles) once confirmed in writing.
const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/assets/images/logo.svg`,
  image: `${SITE_URL}/assets/images/hero-poster.jpg`,
  name: 'SINNVO',
  alternateName: '星沃',
  slogan: 'Premium Villa Elevators',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'No. 1888, Renrui West Road, Nanxun Economic Development Zone',
    addressLocality: 'Huzhou',
    addressRegion: 'Zhejiang',
    addressCountry: 'CN'
  },
  description: 'Manufacturer of custom villa and home elevators: sales, R&D, manufacturing and installation under one roof.'
};
const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: 'SINNVO',
  inLanguage: 'en',
  publisher: { '@id': `${SITE_URL}/#organization` }
};

const decode = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').trim();

// Social cards and structured data are derived from tags each page already has
// (og:title/description/image and the visible .crumbs trail), so pages only maintain those.
function seoHead(html, url, page) {
  const og = (p) => (html.match(new RegExp(`<meta property="og:${p}" content="([^"]*)"`)) || [])[1];
  const tags = [
    `<meta property="og:url" content="${url}">`,
    '<meta property="og:site_name" content="SINNVO">',
    '<meta property="og:locale" content="en_US">',
    '<meta name="twitter:card" content="summary_large_image">'
  ];
  for (const p of ['title', 'description', 'image']) if (og(p)) tags.push(`<meta name="twitter:${p}" content="${og(p)}">`);

  const graph = [ORGANIZATION, WEBSITE];
  const crumbs = (html.match(/<nav class="crumbs"[^>]*>([\s\S]*?)<\/nav>/) || [])[1];
  if (crumbs) {
    const items = [...crumbs.matchAll(/<a href="([^"]+)">([\s\S]*?)<\/a>|<span>([\s\S]*?)<\/span>/g)].map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: decode(m[2] || m[3]),
      item: m[1] ? `${SITE_URL}/${m[1] === 'index.html' ? '' : m[1]}` : url
    }));
    graph.push({ '@type': 'BreadcrumbList', itemListElement: items });
  }
  if (page !== '404') {
    tags.push(`<link rel="canonical" href="${url}">`);
    tags.push(`<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`);
  }
  return html.replace('</head>', `${tags.join('\n')}\n</head>`);
}

// Replaces <!--@include name--> with src/partials/name.html and flags the
// current page's nav link (data-nav="<page>") as aria-current.
function htmlPartials() {
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const page = basename(ctx.filename || 'index.html', '.html');
        html = html.replace(/(<meta property="og:image" content=")\/([^"]+)/, `$1${SITE_URL}/$2`);
        // canonical URL and %SITE_URL% placeholders (JSON-LD) follow the same single domain switch
        const path = page === 'index' ? '' : `${page}.html`;
        html = seoHead(html.replaceAll('%SITE_URL%', SITE_URL), `${SITE_URL}/${path}`, page);
        return html.replace(/<!--@include (\w+)-->/g, (_, name) =>
          readFileSync(resolve(partialsDir, `${name}.html`), 'utf8').replaceAll(
            `data-nav="${page}"`,
            `data-nav="${page}" aria-current="page"`
          )
        );
      }
    },
    configureServer(server) {
      server.watcher.add(partialsDir);
      server.watcher.on('change', (file) => {
        if (file.startsWith(partialsDir)) server.ws.send({ type: 'full-reload' });
      });
    }
  };
}

// Inlines the (small) built stylesheet into every page so first paint doesn't wait on a CSS round trip.
function inlineCss() {
  return {
    name: 'inline-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        return html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (tag, name) => {
          const asset = ctx.bundle && ctx.bundle[name];
          if (!asset) return tag;
          // the stylesheet lived in /assets/, so its ../assets/x urls become ./assets/x from the page root
          return `<style>${String(asset.source).replaceAll('url(../assets/', 'url(./assets/')}</style>`;
        });
      }
    }
  };
}

// Stamps each sitemap URL with its page's last commit date (needs full git history in CI: fetch-depth 0).
function sitemapLastmod() {
  return {
    name: 'sitemap-lastmod',
    apply: 'build',
    closeBundle() {
      const file = resolve(root, 'dist/sitemap.xml');
      const xml = readFileSync(file, 'utf8').replace(/<url><loc>([^<]+)<\/loc><\/url>/g, (tag, loc) => {
        const page = loc.slice(SITE_URL.length + 1) || 'index.html';
        let date = '';
        try {
          date = execFileSync('git', ['log', '-1', '--format=%cs', '--', page], { cwd: root, encoding: 'utf8' }).trim();
        } catch {}
        return date ? `<url><loc>${loc}</loc><lastmod>${date}</lastmod></url>` : tag;
      });
      writeFileSync(file, xml);
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [htmlPartials(), inlineCss(), sitemapLastmod()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: Object.fromEntries(pages.map((f) => [basename(f, '.html'), resolve(root, f)]))
    }
  }
});
