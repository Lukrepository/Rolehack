// Written for Rolehack by Lucas Ruiz, 2026-10-09.
//
// Smooth movement (smooth-movement-brief-2026-10-08.md in the workspace; Lucas
// and his brother picked it in the "Glide or Snap" mock): stage 1, the hero
// glides from square to square instead of jumping, and stage 2 (below,
// screen()), the creatures the hero sees glide too.  It is drawing only.
// The game moves the hero at once, and nothing waits for a glide: a key always
// acts, and a new step starts from wherever the hero is drawn.
//
// It works only from what the game drew, as notliad's smooth-movement plugin
// for Dwarf Fortress does: the hero's square, and for the creatures each
// square's picture, on the screen before and after each flush (the frame-end
// display_nhwindow(WIN_MAP), web.js takeScreen).
// So it shows nothing the game hasn't drawn: the hero's square on two screens,
// and, on the square it glides onto, what that square last showed with nobody
// on it (keepUnder; after a swap with a pet that is an older screen's, and a
// square a boulder was just pushed from shows the tiles' background).
//
// The rules, for the hero (the creatures' are under stage 2, below):
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
  // came; shown: the hero's square on the last painted screen.  Stage 2, the
  // creatures: mons, their glides under way; prev, the last screen's pictures
  // (null after one whose creatures may not glide); lastOther: when the last
  // screen came in which the hero kept its square and a creature moved, came or
  // went; batch: the screens since the last paint (screen()); shownScr: the
  // creatures' screen on the last painted frame
  return { s: null, hero: null, lastStep: -Infinity, shown: null, mons: [], prev: null, lastOther: -Infinity,
           batch: null, shownScr: null };
}

// How long a glide lasts when the last screen of its kind came interval ms ago:
// BASE_MS easing out, or, when screens come faster than BASE_MS / 0.75, evenly
// for 0.75 of the interval, never under MIN_MS (NetHack 3D's rule)
function cadence(interval) {
  return interval < BASE_MS / 0.75
    ? { dur: Math.max(MIN_MS, Math.min(BASE_MS, 0.75 * interval)), fast: true }
    : { dur: BASE_MS, fast: false };
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
  const { dur, fast } = cadence(interval);
  g.s = { x0: chained ? now.x : prev.x, y0: chained ? now.y : prev.y, x1: hero.x, y1: hero.y, t0: t, dur,
          ease: chained || fast ? linear : easeOut };
  return g.s;
}

// A frame is about to be painted: it shows the hero on g.hero's square, or on
// its way there, the creatures as the last screen has them, and every
// creature's glide under way; it ends the batch (web.js, from
// requestAnimationFrame).
export function painted(g) {
  g.shown = g.hero;
  g.shownScr = g.prev;
  g.batch = null;
  for (const m of g.mons) m.seen = true;
}

// End any glide at once (a question, a menu, a new level): the screen is true.
export function snap(g) { g.s = null; g.mons = []; }

// A new level or a cleared map: forget the last screen too.
export function reset(g) {
  g.s = null; g.hero = null; g.lastStep = -Infinity; g.shown = null;
  g.mons = []; g.prev = null; g.lastOther = -Infinity; g.batch = null; g.shownScr = null;
}

// Is anything still gliding at time t?
export function active(g, t) {
  const h = at(g, t);
  if (h && !h.done) return true;
  return g.mons.some((m) => !pos(m, t).done);
}

/* ---------- stage 2: the creatures ---------- */

// Stage 2 (Lucas, 2026-10-09: "let's get started on stage 2"): the creatures
// the hero sees glide too, by the same rules, worked out the same way: from
// the screen alone, never the game's own record of which monster is which.
//
// A screen, for the creatures: { w, h, pic, mon, hero }.  pic[i] is the picture
// drawn on square i (picture(), below), or -1; mon[i] is 1 where a creature is
// drawn and 2 for the mark of one, the remembered 'I' or a warning digit
// (winshim.c web_glyphinfo 8); hero is the hero's square, or null.
//
//   - a creature slides only when its picture left a square and appeared on
//     exactly one of that square's neighbours, and no other square that
//     picture left could have made the same move (pairMoves: one way in, one
//     way out): anything ambiguous jumps, as two identical jackals on tty's
//     two screens can't be told apart;
//   - the hero swapping places with a creature it sees (a pet or a peaceful,
//     or a displacer beast) slides both, when the picture on the hero's new
//     square now shows on the square it left;
//   - a mark ('I', a warning digit), an object or the floor never slides;
//   - every glide in one batch (every screen up to the next paint: a shown
//     message flushes the map before it is put, pline.c, so one key's "You
//     hit", a monster's message in mid-turn and the turn's end come with no
//     paint between) lasts as long, never by which creature moved first or how
//     fast it is: one look, one length (the brief's 6.2);
//   - screens in which the hero kept its square (helpless turns, a run's
//     monster half under runmode:walk) are timed from the last such screen in
//     which a creature moved, came or went (lastOther), not from the hero's
//     last step, so their glides shorten to keep up (cadence()); a message or
//     a missile's frame changes no creature, so it doesn't count;
//   - two squares in one screen (a fast monster's two moves) jump;
//   - a creature glides only from a square the last painted frame showed it
//     on: one that came into view or jumped since jumps, and one that moved
//     twice with no paint between (a swap's message, then the pet's own move;
//     typed-ahead keys) glides on from where it was drawn only when it ends one
//     square from where it was last painted, as the hero does;
//   - a step under which the view jumps (the view glide off, or a device that
//     asks for less motion) jumps the creatures too, for the rest of its batch:
//     gliding in map squares, they'd jump with the map and then slide, and a
//     pet following the hero would drop back a square and catch up on every
//     step;
//   - an effect's frames (a missile in flight, a beam, an explosion: the core
//     flushes them without putting the cursor on the hero, flush_screen(0)) and
//     a monster displacing another start no creature glide: a missile passing
//     over two creatures drawn alike would read as one stepping onto the
//     other's square;
//   - hallucinating, no creature glides, though the hero still does (it is
//     found by its square, not its picture), and the first screen after it
//     pairs with nothing; engulfed or underwater, nothing glides (web.js).

const mpos = (s, t) => {
  const k = s.dur > 0 ? Math.min(1, Math.max(0, (t - s.t0) / s.dur)) : 1;
  const e = s.ease(k);
  return { x: s.x0 + (s.x1 - s.x0) * e, y: s.y0 + (s.y1 - s.y0) * e, done: k >= 1 };
};
const pos = mpos;

// The picture drawn on a square, as the creatures are paired by: the tiles'
// "same picture" id (tiles.json same: each tile's first tile with identical
// pixels), so a male and a female jackal, drawn alike, are one picture, and
// whether a pet's heart is drawn on it.  With no same table, none (-1): tile
// numbers tell a male from a female drawn alike, which tty's two screens can't.
export const picture = (tile, pet, same) => (same ? same[tile] * 2 + (pet ? 1 : 0) : -1);

// Where each creature's glide is at time t: [{ x, y, x1, y1, pic, done }].
export function monsters(g, t) {
  return g.mons.map((s) => ({ ...mpos(s, t), x1: s.x1, y1: s.y1, pic: s.pic }));
}

// The moves two screens show (prev, cur: { pic, mon }, w by h), and the
// squares a creature came onto or left with no move to pair it (jumped:
// screen() counts them for the creatures' clock).  heroPrev and heroNow: the
// hero's square on each, never a creature's.
export function pairMoves(prev, cur, w, h, heroPrev, heroNow) {
  const hp = heroPrev ? heroPrev.y * w + heroPrev.x : -1, hn = heroNow ? heroNow.y * w + heroNow.x : -1;
  const isSrc = (i) => i !== hp && prev.mon[i] === 1 && !(cur.mon[i] === 1 && cur.pic[i] === prev.pic[i] && i !== hn);
  const isTgt = (i) => i !== hn && cur.mon[i] === 1 && !(prev.mon[i] === 1 && prev.pic[i] === cur.pic[i] && i !== hp);
  const moves = [], usedS = new Set(), usedT = new Set();
  // the swap: the hero stepped onto a creature's square, and that creature now
  // shows on the square the hero left (tty shows the same, with a message)
  if (hp >= 0 && hn >= 0 && cheb(heroPrev, heroNow) === 1
      && prev.mon[hn] === 1 && cur.mon[hp] === 1 && cur.pic[hp] === prev.pic[hn]) {
    moves.push({ pic: prev.pic[hn], sx: heroNow.x, sy: heroNow.y, tx: heroPrev.x, ty: heroPrev.y });
    usedS.add(hn); usedT.add(hp);
  }
  const cands = new Map(), uses = new Map();
  for (let i = 0; i < w * h; i++) {
    if (usedT.has(i) || !isTgt(i)) continue;
    const tx = i % w, ty = (i / w) | 0, list = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const sx = tx + dx, sy = ty + dy;
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const s = sy * w + sx;
      if (!usedS.has(s) && isSrc(s) && prev.pic[s] === cur.pic[i]) list.push(s);
    }
    if (list.length) { cands.set(i, list); for (const s of list) uses.set(s, (uses.get(s) || 0) + 1); }
  }
  for (const [tgt, list] of cands) {
    if (list.length !== 1 || uses.get(list[0]) !== 1) continue;   // ambiguous: it jumps
    const s = list[0];
    moves.push({ pic: cur.pic[tgt], sx: s % w, sy: (s / w) | 0, tx: tgt % w, ty: (tgt / w) | 0 });
    usedS.add(s); usedT.add(tgt);
  }
  const jumped = [];
  for (let i = 0; i < w * h; i++) {
    if (isTgt(i) && !usedT.has(i)) jumped.push({ x: i % w, y: (i / w) | 0, kind: 'in' });
    if (isSrc(i) && !usedS.has(i)) jumped.push({ x: i % w, y: (i / w) | 0, kind: 'out' });
  }
  return { moves, jumped };
}

// A new screen at time t, for the hero and the creatures: the hero by
// receive()'s rules, then the creatures, all in one length.  on: smooth
// movement is on (web.js: off while engulfed or underwater, for the hero and
// the creatures alike); creatures: they may glide (web.js: not while
// hallucinating, nor without tiles.json's same table; the hero still does);
// jumpWithView: as for receive(); every creature jumps with the hero then, so
// the whole screen jumps, as on tty; effect: the core drew this screen without
// putting the cursor on the hero (web.js: a missile's frame, a beam, a monster
// displacing another), so no creature glide starts on it.
export function screen(g, scr, t, { on = true, creatures = true, jumpWithView = false, effect = false } = {}) {
  const heroPrev = g.hero, lastStep = g.lastStep;
  receive(g, scr.hero, t, { on, jumpWithView });
  const prev = g.prev;
  // while creatures may not glide (hallucinating: every picture is random) keep
  // no screen to pair against, so the first screen after starts fresh
  g.prev = creatures ? { pic: scr.pic.slice(), mon: scr.mon.slice() } : null;
  if (!on) g.shownScr = null;
  // A batch: every screen up to the next paint (painted()).  A shown message
  // flushes the map before it is put (pline.c), so one key's "You hit", a
  // monster's message in mid-turn and the turn's end come in one task with no
  // paint between.  No paint for BASE_MS (smooth movement off, a hidden tab)
  // starts a new one.
  if (!g.batch || t - g.batch.t0 >= BASE_MS) g.batch = { t0: t, c: null, jump: false, moved: false };
  const b = g.batch;
  if (jumpWithView) b.jump = true;
  if (!on || !creatures || b.jump || !prev || prev.pic.length !== scr.pic.length) { g.mons = []; return; }
  const stepped = !!(heroPrev && scr.hero && cheb(heroPrev, scr.hero) > 0);
  const { moves, jumped } = effect ? { moves: [], jumped: [] } : pairMoves(prev, scr, scr.w, scr.h, heroPrev, scr.hero);
  // one length for every glide in the batch: the hero's when it glides in it,
  // else timed at the batch's first screen from the last of its kind
  if (g.s && g.s.t0 === t) b.c = { dur: g.s.dur, fast: g.s.ease === linear };
  else if (!b.c) b.c = cadence(stepped ? t - lastStep : t - g.lastOther);
  // the creatures' clock runs from the last screen in which one moved, came or
  // went, as the hero's runs from his last step: a message's flush, a missile's
  // frame or a step by a hero who isn't drawn (invisible without see invisible,
  // hiding) changes none of them, and a walk-mode run's monster screens stay
  // 80 ms apart, not 40
  if (!stepped && (moves.length || jumped.length) && !b.moved) { g.lastOther = t; b.moved = true; }
  const c = b.c, shown = g.shownScr;
  const old = g.mons, made = [], taken = new Set();
  for (const mv of moves) {
    const k = old.findIndex((s) => !taken.has(s) && s.x1 === mv.sx && s.y1 === mv.sy && s.pic === mv.pic && !mpos(s, t).done);
    const was = k >= 0 ? old[k] : null;
    if (was) taken.add(was);
    // moved again before a paint (a swap's message, then the pet's own move;
    // typed-ahead keys): the screen never showed the middle, so it glides on
    // from where it was drawn only when it now stands one square from where it
    // was last painted, as the hero does; farther, it jumps
    if (was && !was.seen) {
      if (cheb({ x: was.sx, y: was.sy }, { x: mv.tx, y: mv.ty }) === 1)
        made.push({ ...was, x1: mv.tx, y1: mv.ty, t0: t, dur: c.dur });
      continue;
    }
    // the source must be a square the last painted frame showed it on: a
    // creature that came into view, or jumped, with no paint since jumps
    const si = mv.sy * scr.w + mv.sx;
    if (shown && shown.pic.length === scr.pic.length && !(shown.mon[si] === 1 && shown.pic[si] === mv.pic)) continue;
    const p = was ? mpos(was, t) : null;
    made.push({ pic: mv.pic, sx: mv.sx, sy: mv.sy, x0: p ? p.x : mv.sx, y0: p ? p.y : mv.sy, x1: mv.tx, y1: mv.ty,
                t0: t, dur: c.dur, ease: p || c.fast ? linear : easeOut, seen: false });
  }
  // glides still going whose creature still stands where they are headed carry
  // on; never one headed for the hero's square, which can show the same picture
  // (polymorphed, showrace, a player-monster of the hero's role)
  const kept = old.filter((s) => !taken.has(s) && !mpos(s, t).done
    && scr.mon[s.y1 * scr.w + s.x1] === 1 && scr.pic[s.y1 * scr.w + s.x1] === s.pic
    && !(scr.hero && s.x1 === scr.hero.x && s.y1 === scr.hero.y));
  g.mons = kept.concat(made);
}

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
