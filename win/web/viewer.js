// Written for Rolehack by Lucas Ruiz, 2026-10-02.
//
// What the twin banks know of the device they are viewed on, beyond the
// window in hand: for now the remembered budget (the design's section 12),
// which the design gives this module, with the input-mode machine and the
// size classes to come.  A plain module like layout.js, which it imports:
// no DOM and no storage, so overlay.js hands it the screen, the insets and
// the stored entry, and stores what it says it learnt; node tests it
// (test/viewer.test.mjs).
//
// The budget is what one display mode (a tab, the installed app,
// fullscreen) has shown in each orientation of the whole device: the
// portrait width, the landscape height and width, the landscape side insets.
// layout() takes it so that a phone's two orientations get the same banks
// and the same map cell in a tab, where the browser's bars make the window
// uneven (443x859 against 896x363 on Lucas's phone).  Two things about it
// were wrong in the first cut of the page, found in review (2026-10-02):
//  - the orientation not seen yet was always estimated from the screen, the
//    landscape height as the short side less every bar the portrait window
//    showed.  Beside a wiki in split screen that "bar" is half the screen, and
//    443x460 got twin keys of 0.17 dp instead of classic; on an iPhone, whose
//    portrait toolbar is not there in landscape, the pad shrank to 35 dp, and
//    stayed so until the phone was turned;
//  - every window wrote what it showed, a split screen's half or a short
//    freeform window included, so the next full window was laid out for it:
//    46 dp keys in a full portrait window after a 896x300 one.
// So now:
//  - only a window that fills the screen the way the whole device turned
//    does -- a portrait window across the screen's short side, a landscape one
//    across most of its long side (Lucas's phone letterboxes 896 of 939 for
//    the cutout) -- uses the budget or teaches it.  Any other window, a split,
//    a freeform or desktop window, a touch PC's portrait window, lays out on
//    its own, as layout() lays out any window;
//  - the estimate is made only where it can be right: in portrait, when the
//    bars it would take are a browser's (BARS_MAX), and in either orientation
//    only when the layout it gives is no worse than the window's own -- no
//    smaller pad, not degraded where the window alone is not.  The real
//    orientation, once seen, replaces it, and then parity is the point, even
//    where it costs the other orientation a step of key size;
//  - it is learnt from a window whose layout is usable and not degraded, and
//    the landscape height only grows: a shorter landscape window than one
//    already seen is a split or a bar come back, not the device;
//  - layout() still lays out without the budget any window narrower or
//    shorter than it promises.

import { layout } from './layout.js';

// A portrait window within this of the screen's short side spans it (CSS px
// are fractional at some densities; screen.width is whole).
export const SPAN_SHORT = 8;
// A landscape window at least this share of the screen's long side spans it.
export const SPAN_LONG = 0.85;
// The most a browser's bars take from a portrait window's height, for the
// landscape estimate: Chrome's toolbar and the status bar on Lucas's phone are
// 80 dp; Android's three-button bar adds 48 (it goes to the side in landscape,
// so the estimate is low there, and the comparison catches it); an iPhone's
// Safari takes 180, most of it a bottom toolbar landscape does not have.
export const BARS_MAX = 150;
// A landscape window shorter than this share of the screen's short side is a
// split, not the device turned: it never teaches the landscape height (a
// browser's bars in landscape are 80 dp of 443 on Lucas's phone, 128 of 360
// with Samsung Internet's bottom bar).
export const LAND_MIN = 0.6;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// What a window may take from the stored entry, and what it may teach it.
// screen: { w, h } (screen.width and height, either way round); insets: this
// window's safe-area insets; entry: the display mode's stored budget,
// { w, h, l, sl, sr, pw, lh } (prefs.js).
export function budgetFor(W, H, screen, insets, entry) {
  const e = entry || {};
  const sw = num(screen && screen.w) || W, sh = num(screen && screen.h) || H;
  const short = Math.min(sw, sh), long = Math.max(sw, sh);
  const ins = { l: Math.max(0, num(insets && insets.l)), r: Math.max(0, num(insets && insets.r)) };
  if (H > W) {
    // portrait: across the short side, or not the device turned at all
    if (W < short - SPAN_SHORT) return { budget: null, sideInsets: null, guessed: false, learn: null };
    const learn = e.pw && Math.abs(num(e.w) - W) < 0.5 ? null : { ...e, w: W, pw: 1 };
    if (e.lh) return { budget: { w: W, h: num(e.h), l: num(e.l) }, sideInsets: { l: num(e.sl), r: num(e.sr) }, guessed: false, learn };
    if (long - H > BARS_MAX) return { budget: null, sideInsets: null, guessed: false, learn };
    return { budget: { w: W, h: Math.max(1, short - (long - H)), l: long }, sideInsets: null, guessed: true, learn };
  }
  // landscape (a square window too, as layout() takes it): across the long side
  if (W < SPAN_LONG * long) return { budget: null, sideInsets: null, guessed: false, learn: null };
  const taller = !e.lh || H >= num(e.h) - 0.5;
  const learn = H >= LAND_MIN * short && taller
    && !(e.lh && Math.abs(num(e.h) - H) < 0.5 && Math.abs(num(e.l) - W) < 0.5 && num(e.sl) === ins.l && num(e.sr) === ins.r)
    ? { ...e, h: H, l: W, sl: ins.l, sr: ins.r, lh: 1 } : null;
  // the window's own height and width, and the portrait width seen or, until
  // it is, the screen's short side; the side insets are the window's own
  return { budget: { w: e.pw ? num(e.w) : short, h: H, l: W }, sideInsets: null, guessed: !e.pw, learn };
}

// A guess is worse than none when it costs the pad a step, or degrades a
// window that alone is not degraded, or loses twin banks the window has room for.
const fit = (r) => (r && r.spec ? r.spec.fit : null);
export function worse(a, b) {
  if (!b || !b.usable) return false;
  if (!a || !a.usable) return true;
  const fa = fit(a), fb = fit(b);
  return fa.pad < fb.pad - 1e-6 || (fa.degraded && !fb.degraded);
}

// layout() for a window with the budget that applies to it.  Returns the
// result, what was used ('seen', 'guessed' or 'none') and the budget and side
// insets given to layout(), and the entry to store when the window taught it
// something (null when it did not).
export function budgetedLayout(W, H, pointer, settings, screen, insets, entry) {
  const B = budgetFor(W, H, screen, insets, entry);
  const run = (b) => { try { return layout(W, H, pointer, { ...settings, ...b }); } catch (x) { return null; } };
  let r = run({ budget: B.budget, sideInsets: B.sideInsets }), used = B.budget ? (B.guessed ? 'guessed' : 'seen') : 'none';
  if (B.guessed) {
    const alone = run({ budget: null, sideInsets: null });
    if (worse(r, alone)) { r = alone; used = 'none'; }
  }
  const ok = r && r.usable && r.spec && !r.spec.fit.degraded;
  const none = used === 'none';
  return { r, used, budget: none ? null : B.budget, sideInsets: none ? null : B.sideInsets, learn: ok ? B.learn : null };
}
