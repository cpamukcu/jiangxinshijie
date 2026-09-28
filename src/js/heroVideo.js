/**
 * Hero scroll choreography.
 *
 * The hero section (.hero) is a tall scroll track with an inner
 * `position: sticky` viewport (.hero__sticky, pure CSS — no pinning library).
 * While that sticky viewport is pinned, we compute how far the user has
 * scrolled through the track (0–1) and use it to drive two things:
 *
 *  1. Video scrubbing — video.currentTime tracks progress (only if the video
 *     loads; otherwise the static .hero__fallback image stays put).
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
  const canvas = document.getElementById('heroVideoCanvas');
  if (!hero || !video) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // The video is fetched only after the page has loaded (so it never competes with the
  // poster, fonts and CSS), in a small portrait cut on phones, and skipped on data-saver / 2G.
  const conn = navigator.connection;
  const lowData = !!conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''));
  const src = window.matchMedia('(max-width: 720px)').matches ? video.dataset.srcMobile : video.dataset.srcDesktop;
  const hasSource = !!src && !lowData;
  const hint = hero.querySelector('.hero__scrollcue');
  const kicker = hero.querySelector('.hero__kicker');
  const title = hero.querySelector('.hero__title');
  const desc = hero.querySelector('.hero__desc');
  const actions = hero.querySelector('.hero__actions');

  const ctx2d = canvas ? canvas.getContext('2d', { alpha: false }) : null;

  // Canvas box size in device pixels, refreshed only on resize (see
  // syncCanvasBox below) instead of read from the layout on every drawn
  // frame — getBoundingClientRect() forces a layout, and drawFrame() can run
  // once per rAF tick while scrubbing.
  const canvasBox = { w: 0, h: 0 };
  function syncCanvasBox() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasBox.w = Math.max(1, Math.round(rect.width * dpr));
    canvasBox.h = Math.max(1, Math.round(rect.height * dpr));
  }
  syncCanvasBox();

  // Paints the video's current frame into the canvas, cropped to match object-fit: cover.
  function drawFrame() {
    if (!ctx2d || !video.videoWidth) return;
    const w = canvasBox.w, h = canvasBox.h;
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const vw = video.videoWidth, vh = video.videoHeight;
    const boxAspect = w / h, vidAspect = vw / vh;
    let sx, sy, sw, sh;
    if (vidAspect > boxAspect) { sh = vh; sw = vh * boxAspect; sx = (vw - sw) / 2; sy = 0; }
    else { sw = vw; sh = vw / boxAspect; sx = 0; sy = (vh - sh) / 2; }
    try { ctx2d.drawImage(video, sx, sy, sw, sh, 0, 0, w, h); } catch (e) { return; }
    if (!canvas.classList.contains('is-active')) canvas.classList.add('is-active');
  }

  video.addEventListener('error', () => { if (canvas) canvas.classList.remove('is-active'); }, { once: true });
  video.addEventListener('loadedmetadata', render, { once: true });
  // Paint the first frame only once real data exists, so the poster never flashes to black.
  video.addEventListener('loadeddata', () => { if (hasSource) drawFrame(); seekLoop(); }, { once: true });
  // GitHub Pages serves the video as a single progressive stream, so readyState can stay
  // below HAVE_CURRENT_DATA for a while after a seek jumps past what's buffered so far —
  // seekLoop() bails out without scheduling a retry in that case (see its own comment).
  // If the visitor stops scrolling at exactly that moment, nothing else would ever call
  // seekLoop() again, leaving the frame frozen even once enough of the file arrives. These
  // retry on every 'progress' tick (fired as bytes keep arriving) and once on 'canplay', so
  // scrubbing always catches up to the current scroll position without polling every frame.
  video.addEventListener('progress', () => { if (hasSource) seekLoop(); });
  video.addEventListener('canplay', () => { if (hasSource) seekLoop(); }, { once: true });
  function startVideo() {
    // Markup says preload="none" so nothing is fetched early; Safari won't fetch a
    // preload="none" video at all (even with src set) unless this is flipped and load() called.
    video.preload = 'auto';
    video.src = src;
    video.load();
    // iOS Safari won't fetch frames for a paused, never-played video: a muted play/pause primes it.
    video.play().then(() => video.pause()).catch(() => {});
  }
  if (hasSource) {
    const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(startVideo, { timeout: 1500 }) : setTimeout(startVideo, 300));
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
  let shown = 0;
  let ticking = false;
  let looping = false;

  // Ease the video toward the scroll position and never queue a seek while one is
  // in flight — phones drop frames badly if currentTime is set on every scroll event.
  // Bails out synchronously (no rAF scheduled at all) while the video isn't ready yet,
  // rather than spinning an empty rAF loop until it is — the 'loadeddata' listener and
  // later render() calls (on scroll) each retry seekLoop() on their own.
  function seekLoop() {
    if (looping) return;
    if (!(video.readyState >= 2 && video.duration)) return;
    looping = true;
    const step = () => {
      shown += (currentProgress - shown) * 0.22;
      if (Math.abs(currentProgress - shown) < 0.0008) shown = currentProgress;
      const t = shown * video.duration;
      if (!video.seeking && Math.abs(video.currentTime - t) > 0.016) video.currentTime = t;
      drawFrame();
      if (shown !== currentProgress) requestAnimationFrame(step);
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
  const onResize = () => { syncCanvasBox(); onScroll(); };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  render();
}
