import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
// Social crawlers need an absolute og:image URL; override with SITE_URL when a custom domain is live.
const SITE_URL = (process.env.SITE_URL || 'https://cpamukcu.github.io/jiangxinshijie').replace(/\/$/, '');
const partialsDir = resolve(root, 'src/partials');
const pages = readdirSync(root).filter((f) => f.endsWith('.html'));

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

export default defineConfig({
  base: './',
  plugins: [htmlPartials(), inlineCss()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      input: Object.fromEntries(pages.map((f) => [basename(f, '.html'), resolve(root, f)]))
    }
  }
});
