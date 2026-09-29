/**
 * Fade+rise reveal on scroll.
 *  - `.reveal` elements animate as a whole (CSS transition).
 *  - Grid-like containers listed in STAGGER have their children revealed one by
 *    one (`.rv`, CSS animation) with a small per-column delay, so long lists on
 *    phones animate as each row arrives instead of all at once off-screen.
 * An element that has already been scrolled past (fast fling) is revealed too.
 */
const STAGGER = [
  '.safety-grid', '.cabin-grid', '.case-grid', '.solutions-grid', '.pillars', '.quickpick',
  '.extra-finishes', '.proof-grid', '.details-grid', '.vmv', '.swatches__grid', '.supplier-row__badges'
].join(',');

export function initReveal() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canObserve = 'IntersectionObserver' in window;

  // Read every container's gridTemplateColumns first (a batch of pure layout
  // reads), then apply classes/styles in a second pass — interleaving reads
  // and writes here would force a style recalculation per container instead
  // of one for the whole batch.
  const containers = [...document.querySelectorAll(STAGGER)].filter((c) => c.classList.contains('reveal'));
  const cols = containers.map((container) =>
    Math.max(1, getComputedStyle(container).gridTemplateColumns.split(' ').filter(Boolean).length || 1)
  );
  containers.forEach((container, ci) => {
    container.classList.remove('reveal');
    [...container.children].forEach((kid, i) => {
      kid.classList.add('rv');
      kid.style.setProperty('--rd', `${(i % cols[ci]) * 90}ms`);
    });
  });

  const targets = document.querySelectorAll('.reveal, .rv');
  if (!targets.length) return;
  const show = (el) => el.classList.add(el.classList.contains('rv') ? 'is-in' : 'is-visible');

  if (!canObserve || reduce) { targets.forEach(show); return; }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
        show(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });

  targets.forEach((el) => io.observe(el));
}
