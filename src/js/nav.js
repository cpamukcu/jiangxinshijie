/**
 * Sticky header: transparent over the hero, solid once scrolled past it.
 * Also fades the whole bar in over the first ~90px of scroll, so the very
 * first frame of the page is the clean, chrome-free hero shot — matching
 * the hero content's own scroll-reveal (src/js/heroVideo.js) — then fades
 * out gracefully if the visitor is back at the very top. Skipped entirely
 * under prefers-reduced-motion (header just stays fully visible).
 * Also drives the mobile menu.
 */
export function initNav() {
  const header = document.getElementById('siteHeader');
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');
  if (!header) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  let ticking = false;
  const update = () => {
    ticking = false;
    header.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.6);
    if (!reduceMotion) {
      const t = clamp(window.scrollY / 90, 0, 1);
      header.style.opacity = String(t);
      header.style.pointerEvents = t < 0.05 ? 'none' : '';
    }
  };
  const onScroll = () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  };
  update();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (toggle && nav) {
    const closeMenu = () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    };
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('nav-open', isOpen);
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  }
}
