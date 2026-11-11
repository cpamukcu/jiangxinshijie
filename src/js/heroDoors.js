/**
 * Home hero: "Doors at Dusk".
 *
 * The hero is a tall scroll track with a `position: sticky` viewport (pure CSS, like before).
 * Scroll progress through the track drives one playhead through a still-frame sequence of
 * the dusk cabin film (public/assets/video/doors/, built by scripts/gen-door-frames.mjs):
 *
 *   1. The camera starts tight on the closed cabin doors.
 *   2. The real doors open. Each half of "Every floor, / your style." is locked to its own
 *      door edge, using edge positions measured from the footage, and clears as they finish.
 *   3. The camera pulls back into the softly lit room and the hero copy + buttons come in.
 *
 * Frames are drawn to a <canvas> (no <video>: seeking is too slow on mobile Safari, see
 * heroVideo.js's history). The camera move is a CSS transform on the canvas.
 *
 * No JS, prefers-reduced-motion, data saver / 2G: the section stays in its static end
 * state (poster of the open room, copy shown) — `.hero--live` is never added.
 */
// 0-based source frame indices that exist as doors-NNN.webp (see gen-door-frames.mjs)
const F_CLOSED = 30, F_OPEN = 74, F_END = 189;
const AVAILABLE = [];
for (let i = F_CLOSED; i <= F_END; i++) if (i <= F_OPEN || i % 2 === 0 || i === F_END) AVAILABLE.push(i);

// Measured from the 1280×720 source: the seam between the closed doors, and each door's
// inner edge x per frame while opening.
const SRC_W = 1280, SRC_H = 720, SEAM_X = 604, DOOR_CY = 485, ZOOM = 1.85;
const EDGE_L = [[30,603],[36,604],[38,603],[40,602],[42,599],[44,597],[46,594],[48,592],[50,589],[52,585],[54,582],[56,579],[58,576],[60,572],[62,569],[64,566],[66,562],[68,560],[70,556],[72,550],[74,550]];
const EDGE_R = [[30,605],[32,609],[34,613],[36,617],[38,621],[40,626],[42,631],[44,636],[46,641],[48,645],[50,650],[52,655],[54,659],[56,664],[58,669],[60,673],[62,677],[64,682],[66,686],[68,688],[70,695],[72,698],[74,699]];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function lookup(table, f) {
  if (f <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    if (f <= table[i][0]) {
      const [a, va] = table[i - 1], [b, vb] = table[i];
      return va + (vb - va) * (f - a) / (b - a);
    }
  }
  return table[table.length - 1][1];
}

export function initHeroDoors() {
  const hero = document.querySelector('.hero--doors');
  const canvas = hero && hero.querySelector('.hero__video-canvas');
  if (!hero || !canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const conn = navigator.connection;
  if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return;

  const base = canvas.dataset.frames;
  const ctx = canvas.getContext('2d', { alpha: false });
  const sticky = hero.querySelector('.hero__sticky');
  const L = hero.querySelector('.hero__half--l');
  const R = hero.querySelector('.hero__half--r');
  const cue = hero.querySelector('.hero__scrollcue');
  const scrim = hero.querySelector('.hero__scrim');
  const shade = hero.querySelector('.hero__vignette');
  const reveals = [
    [hero.querySelector('.hero__kicker'), 0.80, 0.88],
    [hero.querySelector('.hero__title'), 0.82, 0.90],
    [hero.querySelector('.hero__desc'), 0.85, 0.93],
    [hero.querySelector('.hero__actions'), 0.87, 0.95],
  ];
  hero.classList.add('hero--live');

  /* ---------- frames ---------- */
  const frames = new Map(); // source index -> decoded Image
  const url = (i) => `${base}-${String(i).padStart(3, '0')}.webp`;
  function load(i) {
    return new Promise((done) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = url(i);
      img.decode().then(() => { frames.set(i, img); dirty = true; kick(); }, () => {}).then(done);
    });
  }
  // the opening frame right away (it is the first thing on screen), then coarse to fine so
  // scrubbing works early on a slow connection. Only the coarse pass (~1 in 8 frames) loads
  // with the page; the fine passes wait for the visitor's first scroll/touch/key, so a visit
  // that never scrolls doesn't download and decode ~100 frames (~2.8 MB).
  function loadRest() {
    const rest = AVAILABLE.filter((i) => i !== F_CLOSED);
    const order = [];
    for (const step of [16, 8, 4, 2, 1]) rest.forEach((f, k) => { if (k % step === 0 && !order.includes(f)) order.push(f); });
    let gate = rest.filter((f, k) => k % 8 === 0).length; // frames allowed before the first interaction
    let running = 0;
    const next = () => {
      if (!order.length || gate <= 0) return;
      gate--; running++;
      load(order.shift()).then(() => { running--; next(); });
    };
    const INTERACTIONS = ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown'];
    const release = () => {
      INTERACTIONS.forEach((t) => window.removeEventListener(t, release));
      gate = Infinity;
      for (let k = running; k < 4; k++) next();
    };
    INTERACTIONS.forEach((t) => window.addEventListener(t, release, { passive: true }));
    for (let k = 0; k < 4; k++) next();
    if (window.scrollY > 0) release(); // restored scroll position: the visitor is already mid-hero
  }
  load(F_CLOSED);
  if (document.readyState === 'complete') loadRest();
  else window.addEventListener('load', loadRest, { once: true });

  function nearest(f) {
    let best = null, bestD = Infinity;
    for (const [i, img] of frames) { const d = Math.abs(i - f); if (d < bestD) { bestD = d; best = img; } }
    return best;
  }

  /* ---------- canvas ---------- */
  let vw = 0, vh = 0;
  function size() {
    vw = sticky.clientWidth; vh = sticky.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(vw * dpr)); canvas.height = Math.max(1, Math.round(vh * dpr));
    shown = null; dirty = true;
  }
  let shown = null;
  function draw(img) {
    if (!img || img === shown) return;
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    shown = img;
    if (!canvas.classList.contains('is-active')) canvas.classList.add('is-active');
  }

  /* ---------- scroll -> eased progress ---------- */
  let top = 0, track = 1;
  function measure() {
    top = hero.getBoundingClientRect().top + window.scrollY;
    track = Math.max(1, hero.offsetHeight - sticky.offsetHeight);
  }
  const target = () => clamp((window.scrollY - top) / track, 0, 1);
  let p = target(), dirty = true, running = false;

  // writes a style only when its value changed, so settled frames touch no styles
  const last = new Map();
  const setOn = (el, key, prop, v) => { if (el && last.get(key) !== v) { last.set(key, v); el.style[prop] = v; } };

  function render() {
    // playhead: doors open over 0.06–0.50, the film keeps running over 0.50–0.94
    const f = p < 0.5
      ? F_CLOSED + (F_OPEN - F_CLOSED) * seg(p, 0.06, 0.5)
      : F_OPEN + (F_END - F_OPEN) * seg(p, 0.5, 0.94);
    const z = 1 - easeInOut(seg(p, 0.5, 0.84)); // 1 = tight on the doors, 0 = whole room
    draw(nearest(f));

    // camera: where the door seam lands with object-fit: cover, scaled up and centred
    const s = Math.max(vw / SRC_W, vh / SRC_H);
    const sx = (vw - SRC_W * s) / 2 + SEAM_X * s, sy = (vh - SRC_H * s) / 2 + DOOR_CY * s;
    const S = 1 + (ZOOM - 1) * z;
    const tx = sx + (vw / 2 - sx) * z - sx * S, ty = sy + (vh / 2 - sy) * z - sy * S;
    setOn(canvas, 'cam', 'transform', `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${S.toFixed(4)})`);

    // each half of the headline rides its own real door edge, then clears
    const k = s * S;
    const dl = (lookup(EDGE_L, f) - lookup(EDGE_L, F_CLOSED)) * k, dr = (lookup(EDGE_R, f) - lookup(EDGE_R, F_CLOSED)) * k;
    setOn(L, 'Lt', 'transform', `translate3d(${dl.toFixed(1)}px,-50%,0)`);
    setOn(R, 'Rt', 'transform', `translate3d(${dr.toFixed(1)}px,-50%,0)`);
    const headline = clamp(1 - (f - 54) / (F_OPEN - 4 - 54), 0, 1).toFixed(3);
    setOn(L, 'Lo', 'opacity', headline); setOn(R, 'Ro', 'opacity', headline);

    setOn(cue, 'cue', 'opacity', (1 - seg(p, 0, 0.03)).toFixed(3));
    setOn(scrim, 'scrim', 'opacity', (1 - seg(p, 0.34, 0.54)).toFixed(3));
    setOn(shade, 'shade', 'opacity', seg(p, 0.76, 0.86).toFixed(3));

    for (const [el, a, b] of reveals) {
      if (!el) continue;
      const t = easeOut(seg(p, a, b));
      setOn(el, el.className + 'o', 'opacity', t.toFixed(3));
      setOn(el, el.className + 't', 'transform', t === 1 ? 'none' : `translate3d(0,${((1 - t) * 24).toFixed(1)}px,0)`);
      setOn(el, el.className + 'v', 'visibility', t > 0 ? 'visible' : 'hidden');
    }
  }

  // ease towards the scroll position (like a scrub of ~0.3 s), so trackpad and wheel steps
  // read as one continuous camera move
  function tick() {
    const goal = target();
    const d = goal - p;
    p = Math.abs(d) < 0.0004 ? goal : p + d * 0.16;
    if (dirty || d !== 0) { render(); dirty = false; }
    if (p !== goal) requestAnimationFrame(tick);
    else running = false;
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }

  const onResize = () => { measure(); size(); kick(); };
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(sticky);
  window.addEventListener('resize', onResize);
  window.addEventListener('load', onResize, { once: true });
  window.addEventListener('scroll', kick, { passive: true });
  measure(); size(); render();
}
