/**
 * Hero scroll choreography.
 *
 * The hero section (.hero) is a tall scroll track with an inner
 * `position: sticky` viewport (.hero__sticky, pure CSS — no pinning library).
 * While that sticky viewport is pinned, we compute how far the user has
 * scrolled through the track (0–1) and use it to drive two things:
 *
 *  1. Frame scrubbing — a preloaded sequence of still frames (extracted from
 *     the source clip by scripts/gen-hero-frames.mjs) is drawn to a canvas,
 *     picking whichever frame is nearest to the current scroll progress.
 *     This used to scrub a real <video> element via video.currentTime, but
 *     that's seek-latency-bound: even with dense keyframes and a small file,
 *     mobile Safari's seek latency was high enough to visibly freeze/stutter
 *     on a fast scroll (confirmed on a real iPhone). A preloaded image has
 *     no seek step — once the frames are loaded, picking one for a given
 *     scroll position is just a synchronous canvas draw, so scrubbing always
 *     matches scroll position exactly, with no per-device latency to hit.
 *  2. Text reveal — the kicker/headline/description/actions start hidden so
 *     the opening frame is a clean, text-free shot, then fade + slide in
 *     from the left in a short staggered sequence as the visitor scrolls.
 *
 * `prefers-reduced-motion: reduce` disables both — the frame sequence stays
 * on its poster frame and all text is shown at full opacity immediately (no
 * JS inline styles applied at all, so the plain CSS/document-flow appearance
 * is what reduced-motion users get).
 */
export function initHeroVideo() {
  const hero = document.querySelector('.hero');
  const canvas = document.getElementById('heroVideoCanvas');
  if (!hero || !canvas) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Frames are fetched only after the page has loaded (so they never compete with the
  // poster, fonts and CSS), in a small portrait cut on phones, and skipped on data-saver / 2G.
  const conn = navigator.connection;
  const lowData = !!conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''));
  const isMobile = window.matchMedia('(max-width: 720px)').matches;
  const base = isMobile ? canvas.dataset.framesMobile : canvas.dataset.framesDesktop;
  const frameCount = parseInt(isMobile ? canvas.dataset.frameCountMobile : canvas.dataset.frameCountDesktop, 10) || 0;
  const hasSource = !!base && frameCount > 1 && !lowData;
  const hint = hero.querySelector('.hero__scrollcue');
  const kicker = hero.querySelector('.hero__kicker');
  const title = hero.querySelector('.hero__title');
  const desc = hero.querySelector('.hero__desc');
  const actions = hero.querySelector('.hero__actions');

  const ctx2d = canvas.getContext('2d', { alpha: false });

  // Canvas box size in device pixels, refreshed only on resize instead of read from the
  // layout on every drawn frame — getBoundingClientRect() forces a layout, and drawFrame()
  // can run on every scroll event while scrubbing.
  const canvasBox = { w: 0, h: 0 };
  function syncCanvasBox() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasBox.w = Math.max(1, Math.round(rect.width * dpr));
    canvasBox.h = Math.max(1, Math.round(rect.height * dpr));
  }
  syncCanvasBox();

  // Paints one still frame into the canvas, cropped to match object-fit: cover.
  function drawFrame(img) {
    if (!ctx2d || !img || !img.naturalWidth) return;
    const w = canvasBox.w, h = canvasBox.h;
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const boxAspect = w / h, imgAspect = iw / ih;
    let sx, sy, sw, sh;
    if (imgAspect > boxAspect) { sh = ih; sw = ih * boxAspect; sx = (iw - sw) / 2; sy = 0; }
    else { sw = iw; sh = iw / boxAspect; sx = 0; sy = (ih - sh) / 2; }
    try { ctx2d.drawImage(img, sx, sy, sw, sh, 0, 0, w, h); } catch (e) { return; }
    if (!canvas.classList.contains('is-active')) canvas.classList.add('is-active');
  }

  const frames = [];
  let framesReady = false;

  function frameForProgress(p) {
    const idx = Math.max(0, Math.min(frameCount - 1, Math.round(p * (frameCount - 1))));
    return frames[idx];
  }

  function loadFrames() {
    let loaded = 0;
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.addEventListener('load', () => {
        loaded++;
        if (i === 0) drawFrame(img); // paint the opening frame as soon as it's in, so the poster never lingers longer than it has to
        if (loaded === frameCount) { framesReady = true; drawFrame(frameForProgress(currentProgress)); }
      }, { once: true });
      img.src = `${base}-${String(i).padStart(2, '0')}.webp`;
      frames[i] = img;
    }
  }
  if (hasSource) {
    const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(loadFrames, { timeout: 1500 }) : setTimeout(loadFrames, 300));
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle, { once: true });
  }

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
  let ticking = false;

  function render() {
    ticking = false;
    const rect = hero.getBoundingClientRect();
    const sticky = hero.querySelector('.hero__sticky');
    const trackHeight = hero.offsetHeight - (sticky ? sticky.offsetHeight : window.innerHeight);
    if (trackHeight <= 0) return;
    currentProgress = clamp(-rect.top / trackHeight, 0, 1);

    if (framesReady) drawFrame(frameForProgress(currentProgress));

    if (hint) hint.style.opacity = String(1 - seg(currentProgress, 0, 0.07));
    reveal(kicker, 0.04, 0.18);
    reveal(title, 0.1, 0.28);
    reveal(desc, 0.18, 0.36);
    reveal(actions, 0.24, 0.42);
  }

  const onScroll = () => {
    if (!ticking) { requestAnimationFrame(render); ticking = true; }
  };
  const onResize = () => { syncCanvasBox(); onScroll(); };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  render();
}
