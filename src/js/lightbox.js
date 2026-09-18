/**
 * Minimal vanilla-JS modal for the cabin interior gallery. Each .cabin-card
 * carries its own hidden .cabin-specs block (rendered server-side / in the
 * static HTML for SEO); clicking the card clones that content into the
 * single shared lightbox instance.
 */
export function initLightbox() {
  const lightbox = document.getElementById('cabinLightbox');
  const mediaEl = document.getElementById('lightboxMedia');
  const titleEl = document.getElementById('lightboxTitle');
  const specsEl = document.getElementById('lightboxSpecs');
  if (!lightbox || !mediaEl || !titleEl || !specsEl) return;

  let lastFocused = null;

  function open(card) {
    const img = card.querySelector('.media img');
    const specsBlock = card.querySelector('.cabin-specs');
    if (!img || !specsBlock) return;

    mediaEl.innerHTML = '';
    const clonedImg = img.cloneNode(true);
    clonedImg.removeAttribute('loading');
    mediaEl.appendChild(clonedImg);

    titleEl.textContent = specsBlock.querySelector('.cabin-specs__title')?.textContent || '';
    specsEl.innerHTML = '';
    specsBlock.querySelectorAll('dl > div').forEach((row) => specsEl.appendChild(row.cloneNode(true)));

    lastFocused = document.activeElement;
    lightbox.hidden = false;
    requestAnimationFrame(() => lightbox.querySelector('.lightbox__close')?.focus());
    document.body.classList.add('nav-open'); // reuse scroll-lock rule
  }

  function close() {
    lightbox.hidden = true;
    document.body.classList.remove('nav-open');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  document.querySelectorAll('.cabin-card[data-cabin]').forEach((card) => {
    const btn = card.querySelector('.cabin-card__btn');
    if (btn) btn.addEventListener('click', () => open(card));
  });

  lightbox.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !lightbox.hidden) close();
  });
}
