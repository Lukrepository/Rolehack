// Written for Rolehack by Lucas Ruiz, 2026-10-02.
//
// What the twin banks know of the device they are viewed on, beyond the
// window in hand: the remembered budget and the size classes (the design's
// section 12), which the design gives this module.  Its input-mode machine,
// which would switch a mouse or keyboard player to the desk's dock, is not
// built: desktop mode is deferred (Lucas, 2026-10-03), and every window is
// laid out as for touch (overlay.js rebuildTwin).  A plain module like
// layout.js, which it imports: no DOM and no storage, so overlay.js hands it
// the screen, the insets, the stored entry and the tiers it last drew, and
// stores what it says it learnt; node tests it (test/viewer.test.mjs).
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

import { layout, tierOf } from './layout.js';

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

// ---------------------------------------------------------------------------
// Size classes (the design's sections 4 and 12): a window is a phone when it
// is under 600 dp wide or under 480 dp tall -- Android's compact width and
// compact height, so a phone turned to landscape is still a phone -- and a
// tablet otherwise, a touch laptop and any large window with a mouse
// included (desktop mode is deferred: Lucas, 2026-10-03).  The tier changes
// the map's treatment and the panels, never a key: the whole level when its
// cell is 12 dp or more, the message log and the inventory between the banks
// or in spare glass, or beside the level on a window far wider than it
// (layout.js sections 8 and 9, which also let a monitor's level grow past a
// tablet's 24 dp cell).
//
// Each threshold has a band of 24 dp either side, worked from the tier the
// page last drew: a phone becomes a tablet only at 624 dp wide and 504 tall,
// a tablet a phone only under 576 or 456.  A desktop window dragged across a
// boundary, or a foldable's inner screen a few dp either side of it, would
// otherwise swap the panels and the map's cell at every pixel of the drag.
// Two tiers are kept, because layout() decides two: the window's own (the
// map's treatment and the panels) and the one the device cell was decided at,
// from the device's landscape geometry (layout.js section 8), which a portrait
// window does not share.  Only a usable layout's tiers are kept: a window that
// falls back to classic keeps the ones it had.  When the page lays out again
// is overlay.js's to say (twinBusy): never under a finger nor while a field
// has the focus, so a tier never changes under a thumb.
//
// The glass has a band of its own (Lucas, 2026-10-04; layout.js section 7):
// the glass the map was last drawn in, and the one the device cell was
// decided in, are kept here with the tiers, and layout() keeps each while its
// ranking still picks it within 24 dp of the window.  A window dragged across
// 600 tall at 1000 wide swapped a 16.5 dp cell for 12 at every pixel either
// side, and across 657 moved the map from between the banks to above them.
// ---------------------------------------------------------------------------

export const SIZE_W = 600, SIZE_H = 480, SIZE_BAND = 24;

// The window's tier, given the one it was drawn at last (null: none yet).
// layout.js tierOf is the rule itself, which the layout applies to both its
// tiers; this is its touch side, the one the page uses.
export function sizeClass(W, H, prev = null) {
  return tierOf(W, H, 'touch', prev === 'phone' || prev === 'tablet' ? prev : null);
}

// The settings that carry the tiers and glasses last drawn into the next
// layout() call.
export function withClasses(settings, classes) {
  const c = classes || {};
  return { ...settings, prevTier: c.tier || null, prevCellTier: c.cellTier || null, prevGlass: c.glass || null, prevCellGlass: c.cellGlass || null };
}

// The tiers and glasses a result was laid out at, to keep for the next one;
// the previous ones (prev) when the result is not drawn (unusable: the page
// shows classic).
export function classesOf(r, prev = null) {
  if (!(r && r.usable && r.info)) return prev;
  const G = r.info.G, D = r.info.DC;
  return {
    tier: r.info.tier, cellTier: (D && D.tier) || null,
    glass: G && G.kind ? { kind: G.kind, over: !!G.over } : null,
    cellGlass: D && D.kind ? { kind: D.kind, over: !!D.over, whole: !!D.whole } : null,
  };
}

// ---------------------------------------------------------------------------
// The device report (Lucas, 2026-10-06).  Lucas's fourth goal for the
// redesign was to know the screens the page meets, and the page sends
// nothing anywhere (no server, no telemetry), so Settings ends with one line
// a player copies or shares and sends to him: what the page saw of the device
// (window, screen, density, browser, display mode, pointers, text size, safe
// insets) and what it made of it (the layout shown and why, the tier, the key
// size, the map cell and the cells shown, the glass, the budget, the fit).
// deviceReport() formats the facts overlay.js gathers (deviceFacts) and never
// throws: a fact missing reads as "?".  browserFamily() names the browser and
// the system coarsely, for the person reading the line; the layout never
// reads the user agent (the design's section 12).  One line, so it survives a
// chat message; the fields keep one order, so lines can be compared.
// ---------------------------------------------------------------------------

const rTxt = (v, d = '?') => (v === null || v === undefined || v === '' ? d : String(v));
const rNum = (v, p = 1) => {
  if (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) return '?';
  const k = 10 ** p;
  return String(Math.round(Number(v) * k) / k);
};
const rDim = (o) => (o && rNum(o.w) !== '?' && rNum(o.h) !== '?' ? `${rNum(o.w)}×${rNum(o.h)}` : '?');
const rCut = (s, n = 140) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));

// The browser and the system, coarsely: Client Hints where the browser gives
// them (Chromium), else the user agent string.  An iPad asking for desktop
// pages says it is a Mac; the report's touch count tells them apart.
export function browserFamily(ua, uad) {
  const s = String(ua || '');
  let name = '', version = '', os = '';
  const m = (re) => { const x = s.match(re); return x ? x[1] : ''; };
  if (uad && typeof uad === 'object') {
    const known = [['Microsoft Edge', 'Edge'], ['Samsung Internet', 'Samsung Internet'], ['Opera', 'Opera'],
      ['Google Chrome', 'Chrome'], ['Chromium', 'Chromium']];
    for (const [brand, nm] of (Array.isArray(uad.brands) ? known : [])) {
      const b = uad.brands.find((x) => x && x.brand === brand);
      if (b) { name = nm; version = String(b.version || '').split('.')[0]; break; }
    }
    os = { Android: 'Android', Windows: 'Windows', macOS: 'macOS', 'Chrome OS': 'ChromeOS', Linux: 'Linux', iOS: 'iOS' }[uad.platform] || '';
  }
  if (!name) {
    const tries = [['EdgiOS', 'Edge'], ['EdgA', 'Edge'], ['Edg', 'Edge'], ['SamsungBrowser', 'Samsung Internet'],
      ['OPR', 'Opera'], ['FxiOS', 'Firefox'], ['Firefox', 'Firefox'], ['CriOS', 'Chrome'], ['Chrome', 'Chrome']];
    for (const [tok, nm] of tries) {
      const v = m(new RegExp(`${tok}/(\\d+)`));
      if (v) { name = nm; version = v; break; }
    }
    if (!name && /Safari\//.test(s) && /AppleWebKit/.test(s)) { name = 'Safari'; version = m(/Version\/(\d+)/); }
  }
  if (!os) {
    os = /iPhone|iPad|iPod/.test(s) ? 'iOS' : /Android/.test(s) ? 'Android' : /CrOS/.test(s) ? 'ChromeOS'
      : /Windows/.test(s) ? 'Windows' : /Mac OS X|Macintosh/.test(s) ? 'macOS' : /Linux|X11/.test(s) ? 'Linux' : '';
  }
  return { name, version, os };
}

// One line from the facts (overlay.js deviceFacts): build, device, then what
// the page made of it.  Twin banks report the layout's own figures; a window
// shown as classic reports classic's key size, tile and scale instead.
export function deviceReport(f) {
  const F = f || {};
  const parts = [];
  const b = F.build || {};
  parts.push(`Rolehack ${rTxt(b.short)}${b.date ? ` (${b.date})` : ''}${F.channel === 'preview' ? ' preview' : ''}${F.core ? ` core ${F.core}` : ''}`);
  // the page's own address, so a line says which install it came from
  parts.push(`at ${rTxt(F.address)}`);
  const win = F.window || {};
  const orient = rNum(win.w) !== '?' && rNum(win.h) !== '?' ? (Number(win.h) > Number(win.w) ? ' portrait' : ' landscape') : '';
  parts.push(`window ${rDim(win)}${orient}`);
  parts.push(`screen ${rDim(F.screen)}`);
  parts.push(`dpr ${rNum(F.dpr, 2)}`);
  const br = F.browser || {};
  parts.push([rTxt(br.name, 'browser'), br.version, br.os].filter(Boolean).join(' '));
  // the display mode, as a person would say it
  parts.push({ browser: 'in a tab', standalone: 'installed', fullscreen: 'fullscreen' }[F.mode] || rTxt(F.mode));
  parts.push(`touch ${rNum(F.touchPoints, 0)}`);
  parts.push(`pointer ${rTxt(F.pointer)}/${rTxt(F.anyPointer)}`);
  parts.push(`hover ${F.hover === true ? 'yes' : F.hover === false ? 'no' : '?'}`);
  parts.push(`text ×${rNum(F.textScale, 2)} ${rTxt(F.msgFont)} ×${rNum(F.msgSize, 2)}`);
  const ins = F.insets || {};
  parts.push(`insets ${rNum(ins.l, 0)}/${rNum(ins.r, 0)}/${rNum(ins.t, 0)}/${rNum(ins.b, 0)}`);
  let lay = `layout ${rTxt(F.layout)}`;
  if (F.layout && F.shown && F.shown !== F.layout) lay += `, shown as ${F.shown}${F.fallback ? `: ${rCut(F.fallback)}` : ''}`;
  parts.push(lay);
  if (F.shown === 'twin' || F.tier) {
    parts.push(`tier ${rTxt(F.tier)}`);
    let keys = `keys ${rNum(F.pad)} dp`;
    if (rNum(F.padSetting) !== rNum(F.pad)) keys = `keys ${rNum(F.padSetting)} set, ${rNum(F.pad)} drawn dp`;
    if (rNum(F.rightColumns) !== '?' && rNum(F.rightColumns) !== rNum(F.pad)) keys += `, right ${rNum(F.rightColumns)}`;
    parts.push(keys);
    parts.push(`cell ${rNum(F.cell)} dp`);
    parts.push(`map ${rNum(F.cols)}×${rNum(F.rows)}${F.whole === true ? ' whole' : F.whole === false ? ' pans' : ''}`);
    parts.push(`glass ${rTxt(F.glass)}${F.headerOver ? ' + header over banks' : ''}`);
    const bg = F.budget;
    parts.push(`budget ${rTxt(F.budgetUsed)}${bg ? ` w${rNum(bg.w, 0)} h${rNum(bg.h, 0)} l${rNum(bg.l, 0)}` : ''}`);
    parts.push(`fit ${rTxt(F.fitLevel)}${F.reason ? `: ${rCut(F.reason)}` : ''}`);
    parts.push(`map cell ${rTxt(F.mapCell)}`);
    parts.push(`zoom ×${rNum(F.zoomFactor, 2)}`);
  } else {
    parts.push(`keys ${rNum(F.pad)} dp`);
    parts.push(`tile ${rNum(F.cell)} px`);
    if (rNum(F.scale) !== '?') parts.push(`scale ×${rNum(F.scale, 2)}`);
    parts.push(`zoom ${Number(F.zoom) > 0 ? `${rNum(F.zoom)} px` : 'fit'}`);
  }
  parts.push(`${rTxt(F.style)}, ${F.caseOn === true ? 'case' : F.caseOn === false ? 'caseless' : '?'}`);
  return parts.join(' · ');
}
