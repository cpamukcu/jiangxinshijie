/**
 * Hero scroll choreography.
 *
 * The hero section (.hero) is a tall scroll track with an inner
 * `position: sticky` viewport (.hero__sticky, pure CSS — no pinning library).
 * While that sticky viewport is pinned, we compute how far the user has
 * scrolled through the track (0–1) and use it to drive two things:
 *
 *  1. Video scrubbing — video.currentTime tracks progress (only if a real
 *     <source> exists; otherwise the static .hero__fallback image stays put).
 *  2. Text reveal — the kicker/headline/description/actions start hidden so
 *     the opening frame is a clean, text-free shot, then fade + slide in
 *     from the left in a short staggered sequence as the visitor scrolls.
 *
 * `prefers-reduced-motion: reduce` disables both — the video stays on its
 * poster frame and all text is shown at full opacity immediately (no JS
 * inline styles applied at all, so the plain CSS/document-flow appearance
 * is what reduced-motion users get).
 */
export function initHeroVideo() {
  const hero = document.querySelector('.hero');
  const video = document.getElementById('heroVideo');
  if (!hero || !video) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const hasSource = !!video.querySelector('source[src]');
  const hint = hero.querySelector('.hero__scrollcue');
  const kicker = hero.querySelector('.hero__kicker');
  const title = hero.querySelector('.hero__title');
  const desc = hero.querySelector('.hero__desc');
  const actions = hero.querySelector('.hero__actions');

  video.addEventListener('error', () => { video.classList.remove('is-active'); }, { once: true });
  video.addEventListener('loadedmetadata', render, { once: true });
  // Show the video only once a real frame exists, so the poster never flashes to black.
  video.addEventListener('loadeddata', () => { if (hasSource) video.classList.add('is-active'); seekLoop(); }, { once: true });
  // iOS Safari won't fetch frames for a paused, never-played video: a muted play/pause primes it.
  if (hasSource) video.play().then(() => video.pause()).catch(() => {});

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function reveal(el, from, to) {
    if (!el) return;
    const t = easeOut(seg(currentProgress, from, to));
    el.style.opacity = String(t);
    el.style.transform = `translateX(${(1 - t) * -22}px)`;
  }

  let currentProgress = 0;
  let shown = 0;
  let ticking = false;
  let looping = false;

  // Ease the video toward the scroll position and never queue a seek while one is
  // in flight — phones drop frames badly if currentTime is set on every scroll event.
  function seekLoop() {
    if (looping) return;
    looping = true;
    const step = () => {
      const ready = video.readyState >= 2 && video.duration;
      if (ready) {
        shown += (currentProgress - shown) * 0.22;
        if (Math.abs(currentProgress - shown) < 0.0008) shown = currentProgress;
        const t = shown * video.duration;
        if (!video.seeking && Math.abs(video.currentTime - t) > 0.016) video.currentTime = t;
      }
      if (!ready || shown !== currentProgress) requestAnimationFrame(step);
      else looping = false;
    };
    requestAnimationFrame(step);
  }

  function render() {
    ticking = false;
    const rect = hero.getBoundingClientRect();
    const sticky = hero.querySelector('.hero__sticky');
    const trackHeight = hero.offsetHeight - (sticky ? sticky.offsetHeight : window.innerHeight);
    if (trackHeight <= 0) return;
    currentProgress = clamp(-rect.top / trackHeight, 0, 1);

    if (hasSource) seekLoop();

    if (hint) hint.style.opacity = String(1 - seg(currentProgress, 0, 0.07));
    reveal(kicker, 0.04, 0.18);
    reveal(title, 0.1, 0.28);
    reveal(desc, 0.18, 0.36);
    reveal(actions, 0.24, 0.42);
  }

  const onScroll = () => {
    if (!ticking) { requestAnimationFrame(render); ticking = true; }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  render();
}
