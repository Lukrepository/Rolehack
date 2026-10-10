// Written for Rolehack by Lucas Ruiz, 2026-10-09.
//
// Smooth movement's rules (glide.js), stage 1, the hero, and stage 2, the
// creatures, on node's own test runner:
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
//     it: never a creature or the mark of one, and not a boulder just pushed;
//  5. a creature glides only when its picture left one square and the same
//     picture appeared on exactly one neighbouring square, uniquely both ways;
//     anything ambiguous jumps, as on tty's two screens, and a male and a
//     female drawn alike are one picture (tiles.py's same; the test runs it);
//  6. a pet's heart makes it a different picture; the hero swapping with a pet
//     slides both; a mark never glides;
//  7. every glide in one batch (the screens up to the next paint) has one
//     length, the hero's when it moved; two squares in one screen, a creature
//     the last painted frame didn't show where it moved from, a step under
//     which the view jumps and an effect's frames jump; hallucinating, only the
//     hero glides.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  makeGlide, receive, at, snap, reset, painted, keepUnder, pushedAhead, BASE_MS, MIN_MS, easeOut,
  screen as glideScreen, monsters, active, pairMoves, picture,
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

/* ---------- stage 2: the creatures ---------- */

// A screen for screen(): w by h squares, pictures and creature marks set by
// [x, y, pic, mon] (mon 1 a creature, 2 its mark); the hero's square as given.
const W2 = 16, H2 = 3, JACKAL = 24, KITTEN = 68, PETKIT = 69, HEROPIC = 700, IMARK = 900;
function scr(cells, hero) {
  const pic = new Int32Array(W2 * H2).fill(-1), mon = new Uint8Array(W2 * H2);
  for (const [x, y, p, m = 1] of cells) { pic[y * W2 + x] = p; mon[y * W2 + x] = m; }
  if (hero) { pic[hero.y * W2 + hero.x] = HEROPIC; mon[hero.y * W2 + hero.x] = 1; }
  return { w: W2, h: H2, pic, mon, hero };
}
const glides = (g, t) => monsters(g, t).map((m) => `${m.pic}:${Math.round(m.x)},${Math.round(m.y)}->${m.x1},${m.y1}`);

test('a creature whose picture moved one square, uniquely, glides', () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[3, 1, JACKAL]], hero), 0);
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1000);
  assert.deepEqual(glides(g, 1000), ['24:3,1->4,1']);
});

test('a line of identical creatures stepping together jumps at both ends, as on tty', () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[2, 1, JACKAL], [3, 1, JACKAL], [4, 1, JACKAL]], hero), 0);
  glideScreen(g, scr([[3, 1, JACKAL], [4, 1, JACKAL], [5, 1, JACKAL]], hero), 1000);
  assert.deepEqual(glides(g, 1000), []);
});

test('two creatures that could each have made a move both jump', () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[3, 0, JACKAL], [3, 2, JACKAL]], hero), 0);
  glideScreen(g, scr([[4, 1, JACKAL], [2, 1, JACKAL]], hero), 1000);   // either could have made either step
  assert.deepEqual(glides(g, 1000), []);
});

test('a pet and a wild creature drawn alike but for the heart are different pictures', () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[3, 0, PETKIT], [3, 2, KITTEN]], hero), 0);
  glideScreen(g, scr([[4, 1, PETKIT], [3, 2, KITTEN]], hero), 1000);
  assert.deepEqual(glides(g, 1000), ['69:3,0->4,1']);
});

test('the hero swapping with a pet: both glide, in one length', () => {
  const g = makeGlide();
  glideScreen(g, scr([[2, 1, PETKIT]], { x: 1, y: 1 }), 0);
  glideScreen(g, scr([[1, 1, PETKIT]], { x: 2, y: 1 }), 1000);
  assert.deepEqual(glides(g, 1000), ['69:2,1->1,1']);
  assert.equal(g.mons[0].dur, g.s.dur);
});

test("a mark (the remembered 'I', a warning digit) never glides", () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[3, 1, IMARK, 2]], hero), 0);
  glideScreen(g, scr([[4, 1, IMARK, 2]], hero), 1000);
  assert.deepEqual(glides(g, 1000), []);
});

test('two squares in one screen (a fast monster) jump', () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[3, 1, JACKAL]], hero), 0);
  glideScreen(g, scr([[5, 1, JACKAL]], hero), 1000);
  assert.deepEqual(glides(g, 1000), []);
});

test('every glide a screen starts has one length, the hero\'s when it moved', () => {
  const g = makeGlide();
  glideScreen(g, scr([[5, 1, JACKAL]], { x: 1, y: 1 }), 0);
  glideScreen(g, scr([[6, 1, JACKAL]], { x: 2, y: 1 }), 1000);
  assert.equal(g.s.dur, BASE_MS);
  assert.equal(g.mons[0].dur, BASE_MS);
});

test("a walk-mode run's monster screens glide evenly, timed from the last monster screen", () => {
  const g = makeGlide();
  let hx = 1, jx = 5, t = 1000;
  glideScreen(g, scr([[jx, 1, JACKAL]], { x: hx, y: 1 }), 0);
  const durs = [];
  for (let i = 0; i < 4; i++) {
    hx++; glideScreen(g, scr([[jx, 1, JACKAL]], { x: hx, y: 1 }), t);          // the hero's step
    painted(g);
    jx++; glideScreen(g, scr([[jx, 1, JACKAL]], { x: hx, y: 1 }), t + 40);     // the monsters' replies
    durs.push(g.mons.find((m) => m.t0 === t + 40).dur);
    painted(g);
    t += 80;
  }
  assert.deepEqual(durs, [BASE_MS, 60, 60, 60]);
});

test('a creature that moved twice with no paint between jumps; painted, it chains', () => {
  let g = makeGlide(); const hero = { x: 0, y: 0 };
  glideScreen(g, scr([[2, 1, JACKAL]], hero), 0);
  glideScreen(g, scr([[3, 1, JACKAL]], hero), 1000);
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1010);
  assert.deepEqual(glides(g, 1010), []);
  g = makeGlide();
  glideScreen(g, scr([[2, 1, JACKAL]], hero), 0);
  glideScreen(g, scr([[3, 1, JACKAL]], hero), 1000);
  painted(g);
  const drawn = monsters(g, 1050)[0].x;
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1050);
  assert.ok(Math.abs(g.mons[0].x0 - drawn) < 1e-9);
  assert.equal(g.mons[0].ease(0.5), 0.5);
});

test('hallucinating (creatures off), nothing but the hero glides', () => {
  const g = makeGlide();
  glideScreen(g, scr([[3, 1, JACKAL]], { x: 0, y: 0 }), 0);
  glideScreen(g, scr([[4, 1, JACKAL]], { x: 1, y: 0 }), 1000, { creatures: false });
  assert.deepEqual(glides(g, 1000), []);
  assert.ok(g.s);
});

test('snap and reset end the creatures\' glides too; active() sees them', () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[3, 1, JACKAL]], hero), 0);
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1000);
  assert.equal(active(g, 1010), true);
  assert.equal(active(g, 1000 + BASE_MS), false);
  snap(g);
  assert.equal(g.mons.length, 0);
  glideScreen(g, scr([[5, 1, JACKAL]], hero), 2000);
  reset(g);
  glideScreen(g, scr([[6, 1, JACKAL]], hero), 3000);
  assert.deepEqual(glides(g, 3000), []);   // no screen before it to pair with
});

// the glides a screen at time t started, as glides() writes them
const started = (g, t) => g.mons.filter((m) => m.t0 === t)
  .map((m) => `${m.pic}:${Math.round(m.x0)},${Math.round(m.y0)}->${m.x1},${m.y1}`);

test('pairMoves: a line of two moving on leaves one square and fills another, and pairs nothing', () => {
  const { moves, jumped } = pairMoves(scr([[3, 1, JACKAL], [4, 1, JACKAL]], null),
    scr([[4, 1, JACKAL], [5, 1, JACKAL]], null), W2, H2, null, null);
  assert.deepEqual(moves, []);
  assert.deepEqual(jumped.map((j) => `${j.kind}:${j.x},${j.y}`).sort(), ['in:5,1', 'out:3,1']);
});

test('pairMoves: the hero swapping with a pet is one move, from its new square to its old', () => {
  const { moves, jumped } = pairMoves(scr([[6, 1, PETKIT]], { x: 5, y: 1 }),
    scr([[5, 1, PETKIT]], { x: 6, y: 1 }), W2, H2, { x: 5, y: 1 }, { x: 6, y: 1 });
  assert.deepEqual(moves, [{ pic: PETKIT, sx: 6, sy: 1, tx: 5, ty: 1 }]);
  assert.deepEqual(jumped, []);
});

test("a male and a female jackal drawn alike are one picture: competing moves jump (the brief's 6.1)", () => {
  // tiles.py's same table, from the real tile files (python3, as build.sh needs)
  const dir = mkdtempSync(join(tmpdir(), 'rh-tiles-'));
  try {
    const r = spawnSync('python3', [fileURLToPath(new URL('../tiles.py', import.meta.url)), dir], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    const { same } = JSON.parse(readFileSync(join(dir, 'tiles.json'), 'utf8'));
    // tiles 24 and 25 really are the jackal pair, so a reordered sheet fails here
    const mons = readFileSync(new URL('../../share/monsters.txt', import.meta.url), 'utf8');
    assert.ok(mons.includes('# tile 24 (jackal,male)') && mons.includes('# tile 25 (jackal,female)'));
    assert.equal(same[24], same[25]);
    assert.equal(picture(24, false, same), picture(25, false, same));
    assert.notEqual(picture(24, true, same), picture(24, false, same));
    assert.equal(picture(24, false, null), -1);   // no table, no picture
    // the male at (3,0) and the female at (3,2); then one stands at (4,1), one at (2,1)
    const pair = (pic) => {
      const g = makeGlide(), hero = { x: 0, y: 0 };
      glideScreen(g, scr([[3, 0, pic(24)], [3, 2, pic(25)]], hero), 0);
      glideScreen(g, scr([[4, 1, pic(24)], [2, 1, pic(25)]], hero), 1000);
      return glides(g, 1000);
    };
    assert.deepEqual(pair((t) => picture(t, false, same)), []);
    // paired on tile numbers, as the page must not, both would glide
    assert.equal(pair((t) => t * 2).length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// fails on the nouses mutant
test('one creature and two identical pictures beside it: both jump (a source with two targets)', () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 0);
  glideScreen(g, scr([[3, 1, JACKAL], [5, 1, JACKAL]], hero), 1000);
  assert.deepEqual(glides(g, 1000), []);
});

// fails on the nolen mutant
test('two creatures and one identical picture between them: it jumps (a target with two sources)', () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[4, 0, JACKAL], [4, 2, JACKAL]], hero), 0);
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1000);
  assert.deepEqual(glides(g, 1000), []);
});

// fails on the noswap mutant
test('the swap is taken first, so a second identical pet beside the hero\'s old square still glides', () => {
  // without the swap rule the square the hero left has two candidates (the pet
  // it swapped with, and the second pet), and both pets would jump
  const g = makeGlide();
  glideScreen(g, scr([[6, 1, PETKIT], [4, 0, PETKIT]], { x: 5, y: 1 }), 0);
  glideScreen(g, scr([[5, 1, PETKIT], [4, 1, PETKIT]], { x: 6, y: 1 }), 1000);
  assert.deepEqual(glides(g, 1000), ['69:6,1->5,1', '69:4,0->4,1']);
});

// fails on the nokept mutant
test('a glide carries on through a screen where its creature stays put', () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[3, 1, JACKAL]], hero), 0);
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1000);
  painted(g);
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1040);
  assert.equal(monsters(g, 1050).length, 1);
  assert.equal(monsters(g, 1050)[0].done, false);
});

// fails on the keptall mutant
test('a glide whose creature is gone from its square (killed: a corpse there) ends', () => {
  // renderMap draws the glide with the picture on its square, so a kept glide
  // would slide the corpse
  const CORPSE = 500;
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[3, 1, JACKAL]], hero), 0);
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1000);
  painted(g);
  glideScreen(g, scr([[4, 1, CORPSE, 0]], hero), 1040);
  assert.deepEqual(glides(g, 1050), []);
});

// fails on the nolinear mutant
test('a creature glide chained on a slow monster screen still glides evenly', () => {
  const g = makeGlide();
  glideScreen(g, scr([[5, 1, JACKAL]], { x: 1, y: 1 }), 0);
  glideScreen(g, scr([[6, 1, JACKAL]], { x: 2, y: 1 }), 1000);   // the hero's screen
  painted(g);
  glideScreen(g, scr([[7, 1, JACKAL]], { x: 2, y: 1 }), 1040);   // a monster screen, the last one long ago
  const m = g.mons.find((s) => s.t0 === 1040);
  assert.equal(m.dur, BASE_MS);
  assert.equal(m.ease(0.5), 0.5);
});

// the brief's 6.7 cases: they pass now and guard against regressions
test('a square left and refilled in one screen: both creatures glide', () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[2, 1, PETKIT], [3, 1, JACKAL]], hero), 0);
  glideScreen(g, scr([[3, 1, PETKIT], [4, 1, JACKAL]], hero), 1000);
  assert.deepEqual(glides(g, 1000), ['69:2,1->3,1', '24:3,1->4,1']);
});

test('a pet following the hero into the square it left glides', () => {
  const g = makeGlide();
  glideScreen(g, scr([[1, 1, PETKIT]], { x: 2, y: 1 }), 0);
  glideScreen(g, scr([[2, 1, PETKIT]], { x: 3, y: 1 }), 1000);
  assert.deepEqual(glides(g, 1000), ['69:1,1->2,1']);
});

test("a creature's glide never carries on onto the hero's square (the hero drawn alike)", () => {
  // the hero's picture is a creature's when it is polymorphed into its kind,
  // or meets a player-monster of its own role and sex
  const g = makeGlide();
  const alike = (s) => { s.pic[s.hero.y * W2 + s.hero.x] = JACKAL; return s; };
  glideScreen(g, alike(scr([[5, 1, JACKAL]], { x: 7, y: 1 })), 0); painted(g);
  glideScreen(g, alike(scr([[6, 1, JACKAL]], { x: 7, y: 1 })), 1000); painted(g);
  glideScreen(g, alike(scr([], { x: 6, y: 1 })), 1030);   // the creature gone, the hero on its square
  assert.deepEqual(monsters(g, 1030), []);
  const h = at(g, 1030);
  assert.ok(h && h.x1 === 6 && h.y1 === 1);
});

test('the first screen after hallucinating pairs with nothing; the next real move glides', () => {
  // hallucinated pictures are random on every screen: one may happen to match
  // a real one next to it
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[3, 1, JACKAL]], hero), 0); painted(g);
  glideScreen(g, scr([[3, 1, 77], [4, 1, 99]], hero), 1000, { creatures: false }); painted(g);
  glideScreen(g, scr([[3, 1, 40], [4, 1, 77]], hero), 1040, { creatures: false }); painted(g);
  glideScreen(g, scr([[3, 1, JACKAL], [5, 1, 77]], hero), 1080);   // it ends: 77 is a real picture now
  assert.deepEqual(monsters(g, 1080), []);
  painted(g);
  glideScreen(g, scr([[3, 1, JACKAL], [6, 1, 77]], hero), 1120);
  assert.deepEqual(glides(g, 1120), ['77:5,1->6,1']);
});

test("a fight turn's screens are one batch: the replies glide BASE_MS, easing out", () => {
  // "You hit the jackal." flushes the map before the monsters move (pline.c)
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[3, 1, JACKAL]], hero), 0); painted(g);
  glideScreen(g, scr([[3, 1, JACKAL]], hero), 400);       // the message's flush
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 400.3);     // the turn's end
  const m = g.mons.find((s) => s.t0 === 400.3);
  assert.equal(m.dur, BASE_MS);
  assert.equal(m.ease, easeOut);
});

test("a monster's message in mid-turn: the moves before and after it last as long", () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[3, 0, JACKAL], [9, 2, JACKAL]], hero), 0); painted(g);
  glideScreen(g, scr([[4, 0, JACKAL], [9, 2, JACKAL]], hero), 1000);      // "The jackal bites!"
  glideScreen(g, scr([[4, 0, JACKAL], [10, 2, JACKAL]], hero), 1000.2);   // the turn's end
  assert.deepEqual(g.mons.map((m) => m.dur), [BASE_MS, BASE_MS]);
});

test("a swap's message, then the pet's own move: it glides on when it ends one square from where it was painted", () => {
  // "You swap places with your kitten." flushes the swap as its own screen
  let g = makeGlide();
  glideScreen(g, scr([[6, 1, PETKIT]], { x: 5, y: 1 }), 0); painted(g);
  glideScreen(g, scr([[5, 1, PETKIT]], { x: 6, y: 1 }), 1000);       // the swap
  glideScreen(g, scr([[5, 2, PETKIT]], { x: 6, y: 1 }), 1000.2);     // the pet moves on
  assert.deepEqual(glides(g, 1000.2), ['69:6,1->5,2']);
  assert.equal(g.mons[0].dur, BASE_MS);
  // two squares from where it was painted: it jumps
  g = makeGlide();
  glideScreen(g, scr([[6, 1, PETKIT]], { x: 5, y: 1 }), 0); painted(g);
  glideScreen(g, scr([[5, 1, PETKIT]], { x: 6, y: 1 }), 1000);
  glideScreen(g, scr([[4, 1, PETKIT]], { x: 6, y: 1 }), 1000.2);
  assert.deepEqual(glides(g, 1000.2), []);
});

test('a step whose message flushes first: the pet following glides as long as the hero', () => {
  const g = makeGlide();
  glideScreen(g, scr([[1, 1, PETKIT]], { x: 2, y: 1 }), 0); painted(g);
  glideScreen(g, scr([[2, 1, PETKIT]], { x: 3, y: 1 }), 1000); painted(g);   // a held key
  glideScreen(g, scr([[2, 1, PETKIT]], { x: 4, y: 1 }), 1033);                 // "You see here a dagger."
  glideScreen(g, scr([[3, 1, PETKIT]], { x: 4, y: 1 }), 1033.3);               // the pet follows
  const pet = g.mons.find((m) => m.t0 === 1033.3);
  assert.equal(g.s.dur, MIN_MS);
  assert.equal(pet.dur, g.s.dur);
  assert.equal(pet.ease(0.5), 0.5);
});

test("a missile's frames change no creature: the reply after them glides BASE_MS", () => {
  const DART = 800, g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[5, 1, JACKAL]], hero), 0); painted(g);
  for (const [t, x] of [[1000, 1], [1040, 2], [1080, 3]]) {
    glideScreen(g, scr([[5, 1, JACKAL], [x, 1, DART, 0]], hero), t); painted(g);
  }
  glideScreen(g, scr([[6, 1, JACKAL]], hero), 1120);
  assert.equal(g.mons[0].dur, BASE_MS);
});

test('helpless turns still shorten: monster screens 40 ms apart glide 30 ms, evenly', () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  let jx = 3, t = 1000;
  glideScreen(g, scr([[jx, 1, JACKAL]], hero), 0); painted(g);
  const durs = [];
  for (let i = 0; i < 4; i++) {
    jx++; glideScreen(g, scr([[jx, 1, JACKAL]], hero), t);
    durs.push(g.mons.find((m) => m.t0 === t).dur);
    painted(g); t += 40;
  }
  assert.deepEqual(durs, [BASE_MS, 30, 30, 30]);
});

test('reset forgets the batch: a fresh screen is timed afresh', () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[3, 1, JACKAL]], hero), 0); painted(g);
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1000); painted(g);
  glideScreen(g, scr([[5, 1, JACKAL]], hero), 1040);   // a batch of 30 ms glides
  reset(g);
  glideScreen(g, scr([[5, 1, JACKAL]], hero), 1042);
  glideScreen(g, scr([[6, 1, JACKAL]], hero), 1043);
  assert.equal(g.mons[0].dur, BASE_MS);
});

test("with the hero not drawn (invisible, hiding), a walk-mode run's pet glides evenly", () => {
  const g = makeGlide();
  let px = 3, t = 1000;
  glideScreen(g, scr([[px, 1, PETKIT]], null), 0); painted(g);
  const durs = [], eases = [];
  for (let i = 0; i < 4; i++) {
    glideScreen(g, scr([[px, 1, PETKIT]], null), t); painted(g);    // the hero's step: nothing shows it
    px++; glideScreen(g, scr([[px, 1, PETKIT]], null), t + 40);      // the pet follows
    const m = g.mons.find((s) => s.t0 === t + 40);
    durs.push(m.dur); eases.push(m.ease(0.5));
    painted(g); t += 80;
  }
  assert.deepEqual(durs, [BASE_MS, 60, 60, 60]);
  assert.deepEqual(eases.slice(1), [0.5, 0.5, 0.5]);
});

test("a slow monster's glides are timed from its last move, not the empty screen between", () => {
  const g = makeGlide(), hero = { x: 0, y: 0 };
  glideScreen(g, scr([[3, 1, JACKAL]], hero), 0); painted(g);
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1000); painted(g);   // it moves
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1040); painted(g);   // it doesn't
  glideScreen(g, scr([[5, 1, JACKAL]], hero), 1080);               // it moves
  assert.equal(g.mons.find((m) => m.t0 === 1080).dur, 60);
});

test("a missile's frames (no cursor on the hero) start no creature glide", () => {
  // a monster's arrow flies west over two orcs drawn alike: each frame hides
  // one and shows the other again, which reads as one stepping onto the
  // other's square
  const ORC = 40, DART = 800, hero = { x: 2, y: 1 };
  const orcs = [[6, 1, ORC], [7, 1, ORC], [10, 1, ORC]];
  const frame = (dart, line = orcs) => scr(line.map(([x, y, p]) => (x === dart ? [x, y, DART, 0] : [x, y, p]))
    .concat(dart !== null && !line.some(([x]) => x === dart) ? [[dart, 1, DART, 0]] : []), hero);
  const volley = (effect) => {
    const g = makeGlide(), seen = [];
    glideScreen(g, frame(null), 0); painted(g);
    let t = 1000;
    for (const x of [9, 8, 7, 6, 5, 4, 3]) {
      glideScreen(g, frame(x), t, { effect }); seen.push(...started(g, t)); painted(g); t += 40;
    }
    return { g, seen, t };
  };
  assert.deepEqual(volley(false).seen, ['40:6,1->7,1']);   // without the rule: a false step
  const { g, seen, t } = volley(true);
  assert.deepEqual(seen, []);
  // the turn's end, the cursor on the hero again: nothing glides back, and a
  // real step still glides
  glideScreen(g, frame(null), t);
  assert.deepEqual(started(g, t), []);
  painted(g);
  glideScreen(g, frame(null, [[5, 1, ORC], [7, 1, ORC], [10, 1, ORC]]), t + 400);
  assert.deepEqual(started(g, t + 400), ['40:6,1->5,1']);
});

test("the hero's dart: its frames start nothing, then both replies glide", () => {
  const DART = 800, hero = { x: 2, y: 1 }, g = makeGlide();
  glideScreen(g, scr([[7, 1, JACKAL], [10, 2, JACKAL]], hero), 0); painted(g);
  let t = 1000;
  for (const x of [3, 4, 5, 6]) {
    glideScreen(g, scr([[7, 1, JACKAL], [10, 2, JACKAL], [x, 1, DART, 0]], hero), t, { effect: true });
    painted(g); t += 40;
  }
  glideScreen(g, scr([[7, 1, JACKAL], [10, 2, JACKAL]], hero), t);          // "You hit the jackal."
  glideScreen(g, scr([[6, 1, JACKAL], [9, 2, JACKAL]], hero), t + 0.3);     // the replies
  assert.deepEqual(started(g, t + 0.3), ['24:7,1->6,1', '24:10,2->9,2']);
  assert.deepEqual(g.mons.map((m) => m.dur), [BASE_MS, BASE_MS]);
});

test('a step under which the view jumps jumps the creatures too, pet and swap', () => {
  const g = makeGlide();
  glideScreen(g, scr([[0, 1, PETKIT], [9, 1, JACKAL]], { x: 1, y: 1 }), 0); painted(g);
  glideScreen(g, scr([[1, 1, PETKIT], [8, 1, JACKAL]], { x: 2, y: 1 }), 1000, { jumpWithView: true });
  assert.equal(g.s, null);
  assert.deepEqual(glides(g, 1000), []);
  // a glide under way ends too
  const h = makeGlide();
  glideScreen(h, scr([[9, 1, JACKAL]], { x: 1, y: 1 }), 0); painted(h);
  glideScreen(h, scr([[8, 1, JACKAL]], { x: 1, y: 1 }), 1000); painted(h);
  assert.equal(h.mons.length, 1);
  glideScreen(h, scr([[8, 1, JACKAL]], { x: 2, y: 1 }), 1030, { jumpWithView: true });
  assert.deepEqual(h.mons, []);
  // the swap
  const s = makeGlide();
  glideScreen(s, scr([[2, 1, PETKIT]], { x: 1, y: 1 }), 0); painted(s);
  glideScreen(s, scr([[1, 1, PETKIT]], { x: 2, y: 1 }), 1000, { jumpWithView: true });
  assert.deepEqual(glides(s, 1000), []);
  // and the rest of its batch: "You see here ...", then the pet follows
  const b = makeGlide();
  glideScreen(b, scr([[0, 1, PETKIT]], { x: 1, y: 1 }), 0); painted(b);
  glideScreen(b, scr([[0, 1, PETKIT]], { x: 2, y: 1 }), 1000, { jumpWithView: true });
  glideScreen(b, scr([[1, 1, PETKIT]], { x: 2, y: 1 }), 1000.3);
  assert.deepEqual(glides(b, 1000.3), []);
  // the hero kept its square: the view stays, creatures glide (a fight)
  const f = makeGlide();
  glideScreen(f, scr([[5, 1, JACKAL]], { x: 1, y: 1 }), 0); painted(f);
  glideScreen(f, scr([[4, 1, JACKAL]], { x: 1, y: 1 }), 1000);
  assert.deepEqual(glides(f, 1000), ['24:5,1->4,1']);
});

test('a creature glides only from a square the last painted screen showed it on', () => {
  const hero = { x: 0, y: 0 };
  // (a) its first move was ambiguous and jumped, unpainted; the next, unique, jumps too
  let g = makeGlide();
  glideScreen(g, scr([[3, 0, JACKAL], [3, 2, JACKAL]], hero), 0); painted(g);
  glideScreen(g, scr([[4, 1, JACKAL], [2, 1, JACKAL]], hero), 1000);
  glideScreen(g, scr([[5, 1, JACKAL], [2, 1, JACKAL]], hero), 1005);
  assert.deepEqual(glides(g, 1005), []);
  // (b) it came into view on the unpainted screen
  g = makeGlide();
  glideScreen(g, scr([], hero), 0); painted(g);
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1000);
  glideScreen(g, scr([[5, 1, JACKAL]], hero), 1005);
  assert.deepEqual(glides(g, 1005), []);
  // (c) its earlier glide ran out before any paint (a hidden tab)
  g = makeGlide();
  glideScreen(g, scr([[3, 1, JACKAL]], hero), 0); painted(g);
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1000);
  glideScreen(g, scr([[5, 1, JACKAL]], hero), 1200);
  assert.deepEqual(glides(g, 1200), []);
  // painted between, each step glides
  g = makeGlide();
  glideScreen(g, scr([], hero), 0); painted(g);
  glideScreen(g, scr([[4, 1, JACKAL]], hero), 1000); painted(g);
  glideScreen(g, scr([[5, 1, JACKAL]], hero), 1040);
  assert.deepEqual(glides(g, 1040), ['24:4,1->5,1']);
});
