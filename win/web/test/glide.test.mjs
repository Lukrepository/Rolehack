// Written for Rolehack by Lucas Ruiz, 2026-10-09.
//
// Smooth movement's rules (glide.js), stage 1: the hero alone, on node's own test runner:
//
//   node --test win/web/test/
//
// What the page leans on (smooth-movement-brief-2026-10-08.md in the workspace):
//  1. a step of one square glides; anything farther jumps, and so do steps that
//     ran with no paint between them, mounting a steed, and a step under which
//     the view jumps;
//  2. a single step eases out over BASE_MS; faster steps glide evenly, timed
//     from the previous screen in which the hero moved;
//  3. a step during a glide starts where the hero is drawn;
//  4. the square the hero glides onto shows what it last showed with nobody on
//     it: never a creature or the mark of one, and not a boulder just pushed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeGlide, receive, at, snap, reset, painted, keepUnder, pushedAhead, BASE_MS, MIN_MS, easeOut,
} from '../glide.js';

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('a single step glides BASE_MS, easing out', () => {
  const g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0);
  const s = receive(g, { x: 11, y: 5 }, 1000);
  assert.ok(s);
  assert.equal(s.dur, BASE_MS);
  const mid = at(g, 1000 + BASE_MS / 2);
  assert.ok(close(mid.x, 10 + easeOut(0.5)));
  assert.equal(mid.y, 5);
  assert.equal(at(g, 1000 + BASE_MS).done, true);
});

test('the first screen, and a screen with no hero, start nothing', () => {
  const g = makeGlide();
  assert.equal(receive(g, { x: 3, y: 3 }, 0), null);
  assert.equal(receive(g, null, 50), null);
  assert.equal(receive(g, { x: 4, y: 3 }, 100), null);   // the last screen had no hero
});

test('anything farther than one square jumps', () => {
  const g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0);
  assert.equal(receive(g, { x: 12, y: 5 }, 1000), null);
  assert.equal(at(g, 1001), null);
});

test('off, nothing glides', () => {
  const g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0, { on: false });
  assert.equal(receive(g, { x: 11, y: 5 }, 1000, { on: false }), null);
});

test('a step under which the view jumps (the view glide off) jumps too', () => {
  const g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0);
  assert.equal(receive(g, { x: 11, y: 5 }, 1000, { jumpWithView: true }), null);
});

test('a step during a glide starts where the hero is drawn, evenly', () => {
  const g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0);
  receive(g, { x: 11, y: 5 }, 1000);
  const drawn = at(g, 1040).x;
  const s = receive(g, { x: 12, y: 5 }, 1040);
  assert.ok(close(s.x0, drawn));
  assert.equal(s.x1, 12);
  assert.equal(s.ease(0.5), 0.5);   // linear
});

test('fast steps glide 0.75 of the time between them, never under MIN_MS', () => {
  const g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0);
  receive(g, { x: 11, y: 5 }, 1000);
  assert.equal(receive(g, { x: 12, y: 5 }, 1080).dur, 60);
  assert.equal(receive(g, { x: 13, y: 5 }, 1100).dur, MIN_MS);
});

test("a run's monster screens between the hero's don't shorten its glides", () => {
  // runmode:walk: the hero's step is flushed, then 40 ms later the monsters' replies
  const g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0);
  let t = 1000, x = 10;
  const durs = [];
  for (let i = 0; i < 5; i++) {
    x++; durs.push(receive(g, { x, y: 5 }, t).dur);     // the hero's screen
    receive(g, { x, y: 5 }, t + 40);                       // the monsters' screen: the hero stays
    t += 80;
  }
  assert.deepEqual(durs, [BASE_MS, 60, 60, 60, 60]);
});

test('a screen where the hero stays keeps a glide headed there', () => {
  const g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0);
  receive(g, { x: 11, y: 5 }, 1000);
  receive(g, { x: 11, y: 5 }, 1030);
  assert.ok(at(g, 1050) && !at(g, 1050).done);
});

test('snap and reset end the glide; reset forgets the last screen', () => {
  const g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0);
  receive(g, { x: 11, y: 5 }, 1000);
  snap(g);
  assert.equal(at(g, 1010), null);
  receive(g, { x: 12, y: 5 }, 2000);
  reset(g);
  assert.equal(receive(g, { x: 13, y: 5 }, 3000), null);   // nothing to glide from
});

test('steps a little slower than BASE_MS glide 0.75 of the time, evenly', () => {
  const g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0);
  receive(g, { x: 11, y: 5 }, 1000);
  const s = receive(g, { x: 12, y: 5 }, 1120);   // 120 ms: under BASE_MS / 0.75
  assert.equal(s.dur, 90);
  assert.equal(s.ease(0.5), 0.5);
  assert.equal(s.x0, 11);                        // the last glide had ended
});

test('the hero is followed while off, so turning it on glides from the last square', () => {
  const g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0, { on: false });
  receive(g, { x: 11, y: 5 }, 1000, { on: false });
  const s = receive(g, { x: 12, y: 5 }, 2000);
  assert.equal(s.x0, 11);
  assert.equal(s.dur, BASE_MS);
});

test('steps with no paint between them jump (typed-ahead keys)', () => {
  const g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0);
  painted(g);
  assert.ok(receive(g, { x: 11, y: 5 }, 5000));          // one square from the painted one
  assert.equal(receive(g, { x: 12, y: 5 }, 5001), null);  // two
  assert.equal(receive(g, { x: 12, y: 4 }, 5002), null);  // still two, round a corner
  assert.equal(at(g, 5010), null);
  painted(g);
  const s = receive(g, { x: 12, y: 3 }, 5100);
  assert.deepEqual([s.x0, s.y0, s.x1, s.y1], [12, 4, 12, 3]);
});

test('a held key painted between steps still chains', () => {
  const g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0);
  painted(g);
  receive(g, { x: 11, y: 5 }, 1000);
  painted(g);
  const s = receive(g, { x: 12, y: 5 }, 1033);
  assert.ok(s.x0 > 10.5 && s.x0 < 11);
});

test('mounting a steed jumps; dismounting and riding glide', () => {
  let g = makeGlide();
  receive(g, { x: 10, y: 5 }, 0);
  assert.equal(receive(g, { x: 11, y: 5, ridden: true }, 1000), null);
  g = makeGlide();
  receive(g, { x: 10, y: 5, ridden: true }, 0);
  assert.ok(receive(g, { x: 11, y: 5 }, 1000));
  g = makeGlide();
  receive(g, { x: 10, y: 5, ridden: true }, 0);
  assert.ok(receive(g, { x: 11, y: 5, ridden: true }, 1000));
});

// A small map for keepUnder and pushedAhead: every square floor (tile 10) but
// those a case sets.
const HERO = 0x01, FLOOR = 10, BOULDER = 20, MARK = 99, PET = 50, PIT = 30;
const floor = () => ({ tile: FLOOR, mon: 0, flags: 0 });
const screen = (cells) => {
  const g = Array.from({ length: 3 }, () => Array.from({ length: 6 }, floor));
  for (const [x, y, c] of cells) g[y][x] = c;
  return g;
};
const blankUnder = () => Array.from({ length: 3 }, () => new Array(6).fill(null));
const hero = { tile: 1, mon: 1, flags: HERO };
const boulder = { tile: BOULDER, mon: 0, flags: 0 };

test("a creature's mark is never drawn under the hero (the 'I' a pet erased)", () => {
  const under = blankUnder();
  keepUnder(under, screen([[1, 1, hero]]), null, { x: 1, y: 1 });
  keepUnder(under, screen([[1, 1, hero], [2, 1, { tile: MARK, mon: 2, flags: 0 }]]), { x: 1, y: 1 }, { x: 1, y: 1 });
  keepUnder(under, screen([[1, 1, hero], [2, 1, { tile: PET, mon: 1, flags: 0x10 }]]), { x: 1, y: 1 }, { x: 1, y: 1 });
  keepUnder(under, screen([[1, 1, { tile: PET, mon: 1, flags: 0x10 }], [2, 1, hero]]), { x: 1, y: 1 }, { x: 2, y: 1 });
  assert.equal(under[1][2].tile, FLOOR);   // the floor it showed first, never the I
  assert.equal(under[1][1], null);        // nor the pet: that square never showed without someone
});

test('a pushed boulder is not drawn twice: its old square is emptied', () => {
  const under = blankUnder();
  keepUnder(under, screen([[1, 1, hero], [2, 1, boulder]]), null, { x: 1, y: 1 });
  const next = screen([[2, 1, hero], [3, 1, boulder]]);
  assert.equal(pushedAhead({ x: 1, y: 1 }, { x: 2, y: 1 }, under, next), true);
  keepUnder(under, next, { x: 1, y: 1 }, { x: 2, y: 1 });
  assert.equal(under[1][2], null);
});

test('a squeeze past a boulder (one already ahead) keeps it under the hero', () => {
  const under = blankUnder();
  keepUnder(under, screen([[1, 1, hero], [2, 1, boulder], [3, 1, boulder]]), null, { x: 1, y: 1 });
  const next = screen([[2, 1, hero], [3, 1, boulder]]);
  keepUnder(under, next, { x: 1, y: 1 }, { x: 2, y: 1 });
  assert.equal(under[1][2].tile, BOULDER);
});

test('a boulder that fills a pit changes nothing', () => {
  const under = blankUnder();
  keepUnder(under, screen([[1, 1, hero], [2, 1, boulder], [3, 1, { tile: PIT, mon: 0, flags: 0 }]]), null, { x: 1, y: 1 });
  const next = screen([[2, 1, hero]]);   // the pit is floor now
  keepUnder(under, next, { x: 1, y: 1 }, { x: 2, y: 1 });
  assert.equal(under[1][2].tile, BOULDER);
});

test('walking into the dark is no push: the square ahead shows the floor walked on', () => {
  const under = blankUnder();
  // a corridor: the square ahead had never been seen
  const first = screen([[1, 1, hero]]);
  first[1][3] = { tile: -1, mon: 0, flags: 0 };
  keepUnder(under, first, null, { x: 1, y: 1 });
  const next = screen([[2, 1, hero]]);
  assert.equal(pushedAhead({ x: 1, y: 1 }, { x: 2, y: 1 }, under, next), false);
  keepUnder(under, next, { x: 1, y: 1 }, { x: 2, y: 1 });
  assert.equal(under[1][2].tile, FLOOR);
});

test('glide.js stays a plain module: no imports, no DOM, no clock', async () => {
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../glide.js', import.meta.url), 'utf8');
  const code = src.replace(/\/\/.*$/gm, '');
  assert.equal(/\bimport\b/.test(code), false);
  assert.equal(/\b(window|document|navigator|localStorage|Date\.now|performance|requestAnimationFrame)\b/.test(code), false);
});
