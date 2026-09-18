/**
 * Wires a graceful placeholder for any <img> (or the hero <video>) whose
 * source file is missing at build time — instead of a broken-image icon,
 * the surrounding .media container gets a labeled diagonal-stripe fallback
 * (see .media.is-missing in base.css) so the layout never breaks.
 */
export function initAssetFallbacks() {
  document.querySelectorAll('.media[data-fallback-label] img').forEach((img) => {
    const container = img.closest('.media');
    if (!container) return;
    if (img.complete && img.naturalWidth === 0) {
      container.classList.add('is-missing');
      return;
    }
    img.addEventListener('error', () => container.classList.add('is-missing'), { once: true });
  });
}
