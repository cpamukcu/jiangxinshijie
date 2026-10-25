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
  // poster, fonts and CSS), in a small portrait cut on phones, skipped entirely on
  // data-saver / 2G, and cut down to a coarse subset on 3G (see loadFrames).
  const conn = navigator.connection;
  const effType = (conn && conn.effectiveType) || '';
  const lowData = !!conn && (conn.saveData || /(^|-)2g$/.test(effType));
  const slowNet = effType === '3g';
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

  // Canvas aspect ratio, refreshed only on resize instead of read from the layout on every
  // drawn frame — getBoundingClientRect() forces a layout, and paint() runs on every
  // scrolled frame while scrubbing.
  let boxAspect = 16 / 9;
  function syncCanvasBox() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width && rect.height) boxAspect = rect.width / rect.height;
  }
  syncCanvasBox();

  // The object-fit: cover crop of a frame for the current box, in frame pixels. The canvas
  // backing store is exactly that crop, so every draw is 1:1 (no resampling, and a far
  // smaller bitmap than a full-screen retina canvas); CSS stretches it to the box.
  let crop = null;
  function cropFor(img) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    let sx, sy, sw, sh;
    if (iw / ih > boxAspect) { sh = ih; sw = ih * boxAspect; sx = (iw - sw) / 2; sy = 0; }
    else { sw = iw; sh = iw / boxAspect; sx = 0; sy = (ih - sh) / 2; }
    return { sx, sy, sw, sh, w: Math.max(1, Math.round(sw)), h: Math.max(1, Math.round(sh)) };
  }

  // Draws frame a, then frame b on top at opacity t. Blending neighbouring stills by the
  // scroll position between them turns the 32-frame sequence into near-continuous motion
  // instead of a visible step every ~40px of scroll. BLEND_STEPS sub-steps per frame pair
  // (~250 visible positions) keep the redraw count low on slow phones.
  const BLEND_STEPS = 8;
  function drawBlend(a, b, t) {
    if (!ctx2d || !a || !a.naturalWidth) return;
    if (!crop) crop = cropFor(a);
    if (canvas.width !== crop.w || canvas.height !== crop.h) { canvas.width = crop.w; canvas.height = crop.h; }
    const { sx, sy, sw, sh, w, h } = crop;
    try {
      ctx2d.globalAlpha = 1;
      ctx2d.drawImage(a, sx, sy, sw, sh, 0, 0, w, h);
      if (b && b !== a && t > 0) {
        ctx2d.globalAlpha = t;
        ctx2d.drawImage(b, sx, sy, sw, sh, 0, 0, w, h);
        ctx2d.globalAlpha = 1;
      }
    } catch (e) { return; }
    if (!canvas.classList.contains('is-active')) canvas.classList.add('is-active');
  }

  const frames = new Array(frameCount); // a slot is filled only once that frame is decoded
  let framesReady = false;              // true once frame 0 is in — scrubbing works from then on
  let shownKey = -1;

  // Nearest decoded frame to an index, so scrubbing never waits on a frame still in flight.
  function nearestFrame(idx) {
    for (let d = 0; d < frameCount; d++) {
      if (frames[idx - d]) return frames[idx - d];
      if (frames[idx + d]) return frames[idx + d];
    }
    return null;
  }

  function paint() {
    const f = currentProgress * (frameCount - 1);
    const i0 = Math.floor(f);
    const i1 = Math.min(frameCount - 1, i0 + 1);
    const t = Math.round((f - i0) * BLEND_STEPS) / BLEND_STEPS;
    const key = i0 * (BLEND_STEPS + 1) + t * BLEND_STEPS;
    if (key === shownKey) return; // same blend as on screen: no redraw
    if (frames[i0] && frames[i1]) { drawBlend(frames[i0], frames[i1], t); shownKey = key; }
    else { drawBlend(nearestFrame(Math.round(f)), null, 0); shownKey = -1; } // neighbours still loading
  }

  // Coarse-to-fine order (0, 16, 31, 8, 24, 4, 12, …): each pass doubles the timeline's
  // resolution, so a slow connection gets a usable — just steppier — scrub after a handful of
  // frames instead of waiting for all of them. Only a few requests run at once so the coarse
  // frames genuinely arrive first rather than sharing bandwidth with all the others.
  function loadOrder() {
    const order = [0, frameCount - 1];
    for (let step = 1 << Math.floor(Math.log2(frameCount - 1)); step >= 1; step >>= 1) {
      for (let i = 0; i < frameCount; i += step) if (!order.includes(i)) order.push(i);
    }
    return order;
  }

  function loadFrames() {
    const queue = loadOrder().slice(0, slowNet ? 9 : frameCount);
    const next = () => {
      const i = queue.shift();
      if (i === undefined) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = `${base}-${String(i).padStart(2, '0')}.webp`;
      // decode() before use: drawing a not-yet-decoded image would decode it synchronously
      // on the main thread in the middle of a scroll.
      img.decode().then(() => {
        frames[i] = img;
        if (!framesReady && i === 0) framesReady = true;
        if (framesReady) paint();
      }, () => {}).then(next);
    };
    for (let k = 0; k < 4; k++) next();
  }
  if (hasSource) {
    const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(loadFrames, { timeout: 1500 }) : setTimeout(loadFrames, 300));
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle, { once: true });
  }

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  // Writes a style only when its rounded value changed, so a scrolled frame past the
  // reveal ranges touches no styles at all.
  const lastT = new Map();
  function reveal(el, from, to) {
    if (!el) return;
    const t = Math.round(easeOut(seg(currentProgress, from, to)) * 1000) / 1000;
    if (lastT.get(el) === t) return;
    lastT.set(el, t);
    el.style.opacity = String(t);
    el.style.transform = t === 1 ? 'none' : `translate3d(${((1 - t) * -22).toFixed(2)}px,0,0)`;
  }

  let currentProgress = 0;
  let ticking = false;

  // Track geometry is measured on load/resize only; per frame, progress comes from scrollY
  // (no layout read on the scroll path).
  const sticky = hero.querySelector('.hero__sticky');
  let heroTop = 0, trackHeight = 0;
  function measure() {
    heroTop = hero.getBoundingClientRect().top + window.scrollY;
    trackHeight = hero.offsetHeight - (sticky ? sticky.offsetHeight : window.innerHeight);
  }
  measure();

  let hintShown = -1;
  function render() {
    ticking = false;
    if (trackHeight <= 0) return;
    currentProgress = clamp((window.scrollY - heroTop) / trackHeight, 0, 1);

    if (framesReady) paint();

    const h = Math.round((1 - seg(currentProgress, 0, 0.07)) * 100) / 100;
    if (hint && h !== hintShown) { hintShown = h; hint.style.opacity = String(h); }
    reveal(kicker, 0.04, 0.18);
    reveal(title, 0.1, 0.28);
    reveal(desc, 0.18, 0.36);
    reveal(actions, 0.24, 0.42);
  }

  const onScroll = () => {
    if (!ticking) { requestAnimationFrame(render); ticking = true; }
  };
  const onResize = () => { syncCanvasBox(); measure(); crop = null; shownKey = -1; onScroll(); };
  window.addEventListener('load', () => { measure(); onScroll(); }, { once: true });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  render();
}
