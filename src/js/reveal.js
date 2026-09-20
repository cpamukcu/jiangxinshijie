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
  '.extra-finishes', '.proof-grid', '.details-grid', '.vmv', '.swatches__grid', '.glass-list', '.supplier-row__badges'
].join(',');

export function initReveal() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canObserve = 'IntersectionObserver' in window;

  document.querySelectorAll(STAGGER).forEach((container) => {
    if (!container.classList.contains('reveal')) return;
    container.classList.remove('reveal');
    const kids = [...container.children];
    const cols = Math.max(1, getComputedStyle(container).gridTemplateColumns.split(' ').filter(Boolean).length || 1);
    kids.forEach((kid, i) => {
      kid.classList.add('rv');
      kid.style.setProperty('--rd', `${(i % cols) * 90}ms`);
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
