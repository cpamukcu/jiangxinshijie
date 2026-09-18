/**
 * Lightweight scroll parallax for the closing lifestyle banner. The image
 * is oversized in CSS (128% height) so it has room to drift without
 * exposing an edge. No library — same rAF-throttled scroll-listener
 * pattern as heroVideo.js.
 */
export function initParallax() {
  const banner = document.querySelector('.lifestyle-banner');
  if (!banner) return;
  const img = banner.querySelector('.media img');
  if (!img) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let ticking = false;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function render() {
    ticking = false;
    const rect = banner.getBoundingClientRect();
    const vh = window.innerHeight;
    if (rect.bottom < 0 || rect.top > vh) return; // out of view, skip

    // p: 0 when the banner's top just enters the viewport, 1 when its
    // bottom reaches the viewport's top (i.e. fully scrolled past).
    const p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
    const shiftPercent = (p - 0.5) * 16; // drift within the 14%-oversized margin
    img.style.transform = `translateY(${shiftPercent}%)`;
  }

  const onScroll = () => {
    if (!ticking) { requestAnimationFrame(render); ticking = true; }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  render();
}
