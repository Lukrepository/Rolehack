// Written for Rolehack by Lucas Ruiz, 2026-10-09.
//
// Smooth movement, stage 1 (smooth-movement-brief-2026-10-08.md in the
// workspace; Lucas and his brother picked it in the "Glide or Snap" mock): the
// hero glides from square to square instead of jumping.  It is drawing only.
// The game moves the hero at once, and nothing waits for a glide: a key always
// acts, and a new step starts from wherever the hero is drawn.
//
// It works only from what the game drew, as notliad's smooth-movement plugin
// for Dwarf Fortress does: the hero's square on the screen before and after
// each flush (the frame-end display_nhwindow(WIN_MAP), web.js takeScreen).
// So it shows nothing the game hasn't drawn: the hero's square on two screens,
// and, on the square it glides onto, what that square last showed with nobody
// on it (keepUnder; after a swap with a pet that is an older screen's, and a
// square a boulder was just pushed from shows the tiles' background).
//
// The rules:
//   - a step of one square glides; anything farther (a teleport, a level
//     change, a run the screen didn't show square by square) jumps, and so do
//     steps that ran with no paint between them (typed-ahead keys): a square
//     more than one from the one last painted;
//   - mounting a steed jumps: the hero's new square already shows the steed;
//   - engulfed or underwater (web.js takeScreen) the 3x3 the hero sees jumps
//     with the hero, so the hero does too;
//   - a single step lasts BASE_MS and eases out: it moves at once and settles;
//   - steps that come within BASE_MS / 0.75 (about 133 ms) of the previous one
//     (a held key, a run, a travel) glide evenly, for 0.75 of the time between
//     them, never under MIN_MS (NetHack 3D's rule).  The time is measured from
//     the previous screen in which the hero moved: a walk-mode run's hero and
//     monster screens come 40 ms apart, and timing from whichever came last
//     makes the run hop;
//   - a step that comes while a glide is still going starts from where the
//     hero is drawn, so the hero never jumps back.

export const BASE_MS = 100;
export const MIN_MS = 28;

export const easeOut = (t) => 1 - (1 - t) * (1 - t) * (1 - t);
const linear = (t) => t;

const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export function makeGlide() {
  // s: the glide under way, or null; hero: the hero's square on the last screen
  // (null: none drawn); lastStep: when the last screen in which the hero moved
  // came; shown: the hero's square on the last painted screen
  return { s: null, hero: null, lastStep: -Infinity, shown: null };
}

// Where the hero is drawn at time t: { x, y, x1, y1, done }: where it is drawn
// and the square it is headed to, in squares; or null when no glide is under
// way (draw the hero on its square).
export function at(g, t) {
  const s = g.s;
  if (!s) return null;
  const k = s.dur > 0 ? Math.min(1, Math.max(0, (t - s.t0) / s.dur)) : 1;
  const e = s.ease(k);
  return { x: s.x0 + (s.x1 - s.x0) * e, y: s.y0 + (s.y1 - s.y0) * e, x1: s.x1, y1: s.y1, done: k >= 1 };
}

// A new screen came at time t, with the hero drawn at hero ({ x, y, ridden }),
// or not drawn at all (null); ridden: the hero's square shows a ridden steed
// (MG_RIDDEN).  on: smooth movement is on.  jumpWithView: the view moves a
// whole square under this step and does not glide ("The view glides too" off,
// or a device that asks for less motion: web.js viewGlides), so the hero
// jumps with it rather than slide back to the middle (the brief's rule b).
export function receive(g, hero, t, { on = true, jumpWithView = false } = {}) {
  const prev = g.hero;
  g.hero = hero ? { x: hero.x, y: hero.y, ridden: !!hero.ridden } : null;
  if (!on || !hero || !prev) { g.s = null; g.shown = null; return null; }
  const d = cheb(prev, hero);
  if (d === 0) {
    // the hero kept its square: a glide still under way carries on if it is
    // headed here
    if (g.s && (g.s.x1 !== hero.x || g.s.y1 !== hero.y)) g.s = null;
    return g.s;
  }
  const interval = t - g.lastStep;
  g.lastStep = t;
  // mounting (#ride, steed.c mount_steed -> teleds) moves the hero onto the
  // steed's square, which then shows the ridden steed: a glide would slide the
  // steed in from where the hero stood, so it jumps, as tty shows it
  if (d > 1 || jumpWithView || (g.hero.ridden && !prev.ridden)) { g.s = null; return null; }
  // queued keys run several steps in one task with no paint between (web.js
  // nextInput): a square more than one from the last painted one is a run the
  // screen didn't show square by square, so it jumps (the brief's 6.4)
  if (g.shown && cheb(g.shown, hero) > 1) { g.s = null; return null; }
  const now = at(g, t);
  const chained = !!(now && !now.done && now.x1 === prev.x && now.y1 === prev.y);
  let dur = BASE_MS, ease = easeOut;
  if (interval < BASE_MS / 0.75) { dur = Math.max(MIN_MS, Math.min(BASE_MS, 0.75 * interval)); ease = linear; }
  if (chained) ease = linear;
  g.s = { x0: chained ? now.x : prev.x, y0: chained ? now.y : prev.y, x1: hero.x, y1: hero.y, t0: t, dur, ease };
  return g.s;
}

// A frame is about to be painted: it shows the hero on g.hero's square, or on
// its way there (web.js, from requestAnimationFrame).
export function painted(g) { g.shown = g.hero; }

// End any glide at once (a question, a menu, a new level): the screen is true.
export function snap(g) { g.s = null; }

// A new level or a cleared map: forget the last screen too.
export function reset(g) { g.s = null; g.hero = null; g.lastStep = -Infinity; g.shown = null; }

const MG_HERO = 0x01;   // display.h: the hero's square

// What the hero glides onto (web.js takeScreen keeps it): under[y][x] is what
// each square last showed with no creature on it (mon 0: never a monster, nor
// the mark of one, the remembered 'I' or a warning digit: winshim.c
// web_glyphinfo), and never the hero.  grid: this screen; prev and hero: the
// hero's square on the last screen and on this one.  A pushed boulder's old
// square is emptied (pushedAhead).
export function keepUnder(under, grid, prev, hero) {
  const pushed = pushedAhead(prev, hero, under, grid);
  for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[y].length; x++) {
    const c = grid[y][x];
    if (!(c.flags & MG_HERO) && !c.mon && c.tile >= 0) under[y][x] = c;
  }
  if (pushed) under[hero.y][hero.x] = null;   // drawn as the tiles' background
}

// A boulder the hero pushed (Sokoban): the square one further along the step
// newly shows what the hero's new square last showed, so the hero's new square
// is empty now; drawn from under, it showed the boulder twice while the hero
// glided in.  under: what each square last showed with no creature on it, as
// it was before this screen; grid: this screen.  Not when the square the hero
// left shows that same picture: walking a corridor or a dark room, the square
// ahead comes into view as the same floor the hero walks on.  A squeeze or a
// giant's step leaves the boulder under the hero: the square ahead showed a
// boulder already, or still shows something else.
export function pushedAhead(prev, hero, under, grid) {
  if (!prev || !hero || cheb(prev, hero) !== 1) return false;
  const bx = 2 * hero.x - prev.x, by = 2 * hero.y - prev.y, u = under[hero.y][hero.x];
  if (!u || by < 0 || by >= grid.length || bx < 0 || bx >= grid[by].length) return false;
  const was = under[by][bx], now = grid[by][bx], left = grid[prev.y][prev.x];
  return !now.mon && now.tile === u.tile && !(was && was.tile === u.tile)
    && !(left && left.tile === u.tile);
}
