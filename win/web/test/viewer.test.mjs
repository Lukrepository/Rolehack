// Written for Rolehack by Lucas Ruiz, 2026-10-02.
//
// The remembered budget's tests (viewer.js), on node's own test runner:
//
//   node --test win/web/test/
//
// What the page leans on (the design's section 12; the review of the twin
// banks on the page, 2026-10-02):
//  1. a first visit in a window that is not the device turned -- a split
//     screen beside a wiki, a touch PC's portrait window -- or one whose
//     browser bars differ between the orientations (an iPhone's Safari,
//     Android's three-button bar) lays out as the window alone does: the
//     same usable verdict, the same pad and fit; Lucas's phone in split
//     screen (443x460) comes back unusable, so the page shows classic;
//  2. where the estimate can be right (Lucas's tab), the first portrait visit
//     gets the very banks it keeps after the first turn;
//  3. a temporary window -- a short landscape one, a narrow portrait one, a
//     split half -- never changes what a full window gets afterwards;
//  4. what is learnt is learnt from the device's own windows: the landscape
//     height only grows, and a window whose layout is unusable teaches nothing.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout } from '../layout.js';
import { budgetFor, budgetedLayout, worse } from '../viewer.js';

// the page's settings at its defaults (overlay.js rebuildTwin)
const BASE = { padKey: 58, insets: { l: 0, r: 0, t: 0, b: 0 }, header: 'stacked' };
const LUCAS = { w: 443, h: 939 };          // the screen, as screen.width and height report it in portrait

// a run of windows on one screen, as the page meets them: each lays out with
// what the ones before taught, and teaches what it may
function visit(windows, scr, entry = {}) {
  let e = entry;
  return windows.map(([W, H, s = scr, pointer = 'touch']) => {
    const out = budgetedLayout(W, H, pointer, BASE, s, { l: 0, r: 0 }, e);
    if (out.learn) e = out.learn;
    return { ...out, entry: e };
  });
}

const alone = (W, H, pointer = 'touch') => layout(W, H, pointer, BASE);
const verdict = (r) => (r ? { usable: r.usable, level: r.spec.fit.level, pad: r.spec.fit.pad, degraded: r.spec.fit.degraded } : null);
// every control's rect, for "the same banks"
const rects = (r) => Object.fromEntries(r.spec.controls.map((c) => [c.id, [c.x, c.y, c.w, c.h].map((v) => Math.round(v * 100) / 100)]));

// ---- 1. first visits that must lay out as the window alone does

test('a first visit in a window that is not the device turned lays out as the window alone', () => {
  const cases = [
    // [window, screen, why]
    [[443, 460], LUCAS, "Lucas's phone in split screen beside a wiki (the design's test 7)"],
    [[443, 640], LUCAS, 'two thirds of a split screen'],
    [[412, 600], { w: 412, h: 915 }, 'a 412 dp phone in split screen'],
    [[500, 700], { w: 1366, h: 768 }, "a touch laptop's portrait window"],
    [[600, 1000], { w: 1920, h: 1080 }, "a touch PC's portrait window"],
    [[390, 664], { w: 390, h: 844 }, "an iPhone's Safari, whose portrait toolbar landscape does not have"],
    [[412, 787], { w: 412, h: 915 }, "Android's three-button bar, at the side in landscape"],
    [[375, 553], { w: 375, h: 667 }, "an iPhone SE's Safari"],
    [[448, 443], { w: 939, h: 443 }, 'one half of a landscape split screen'],
  ];
  const out = [];
  for (const [[W, H], scr, why] of cases) {
    const [got] = visit([[W, H]], scr);
    const want = alone(W, H);
    const a = JSON.stringify(verdict(got.r)), b = JSON.stringify(verdict(want));
    if (a !== b) out.push(`${W}x${H} on ${scr.w}x${scr.h} (${why}): ${a}, alone ${b} (budget ${got.used})`);
  }
  assert.deepEqual(out, []);
  // the first two would show 0.17 and 24 dp keys under the old estimate
  assert.equal(visit([[443, 460]], LUCAS)[0].r.usable, false, '443x460 shows classic');
  const [twoThirds] = visit([[443, 640]], LUCAS);
  assert.equal(twoThirds.r.usable, true);
  assert.equal(twoThirds.r.spec.fit.pad, 58);
});

// a guess that would cost the pad a step is dropped: an iPhone's Safari in
// portrait would have estimated a 210 dp landscape height
test('an estimate that makes the layout worse than none is dropped', () => {
  const [ip] = visit([[390, 664]], { w: 390, h: 844 });
  assert.equal(ip.used, 'none');
  assert.equal(ip.r.spec.fit.pad, 58);
  assert.equal(ip.r.spec.fit.degraded, false);
  // the three-button bar's estimate (412 - 128 = 284) is made, tried and dropped
  const B = budgetFor(412, 787, { w: 412, h: 915 }, null, {});
  assert.equal(B.guessed, true);
  assert.equal(B.budget.h, 284);
  assert.ok(worse(layout(412, 787, 'touch', { ...BASE, budget: B.budget }), alone(412, 787)));
  assert.equal(visit([[412, 787]], { w: 412, h: 915 })[0].used, 'none');
});

// ---- 2. Lucas's tab: the estimate is right, and the first visit keeps its banks

test("Lucas's tab: a first portrait visit gets the banks it keeps after the first turn", () => {
  const [first, turned, back] = visit([[443, 859], [896, 363, { w: 939, h: 443 }], [443, 859]], LUCAS);
  assert.equal(first.used, 'guessed');
  assert.equal(first.budget.h, 363, 'the short side less the 80 dp of bars');
  assert.equal(turned.used, 'seen');
  assert.equal(back.used, 'seen');
  assert.deepEqual(back.entry, { w: 443, pw: 1, h: 363, l: 896, sl: 0, sr: 0, lh: 1 });
  assert.deepEqual(rects(first.r), rects(back.r), 'no key moved when the estimate was replaced by what the device showed');
  assert.equal(first.r.spec.fit.pad, 58);
  // and first seen in landscape, the portrait width is the screen's short side
  const [l0, p0] = visit([[896, 363, { w: 939, h: 443 }], [443, 859]], LUCAS);
  assert.equal(l0.used, 'guessed');
  assert.equal(l0.budget.w, 443);
  assert.deepEqual(rects(p0.r), rects(back.r));
});

// ---- 3. temporary windows change nothing for the full ones

test('a temporary window never changes what a full window gets afterwards', () => {
  const scrL = { w: 939, h: 443 };
  const [, full] = visit([[896, 443, scrL], [443, 939]], LUCAS);
  const seen = full.entry;
  const fullP = rects(full.r), fullL = rects(visit([[896, 443, scrL]], LUCAS, seen)[0].r);
  const runs = [
    ['a short landscape window (896x300)', [[896, 300, scrL]]],
    ['a landscape split, top and bottom (896x220)', [[896, 220, scrL]]],
    ['a narrow portrait window (390x700)', [[390, 700]]],
    ['a landscape split half (448x443), which shows classic', [[448, 443, scrL]]],
    ["Lucas's phone in split screen (443x460)", [[443, 460]]],
  ];
  const out = [];
  for (const [what, wins] of runs) {
    // the full window of either orientation straight after it
    const [p] = visit([...wins, [443, 939]], LUCAS, seen).slice(-1);
    const [l] = visit([...wins, [896, 443, scrL]], LUCAS, seen).slice(-1);
    if (JSON.stringify(rects(p.r)) !== JSON.stringify(fullP)) out.push(`${what}: the full portrait window changed (pad ${p.r.spec.fit.pad})`);
    if (JSON.stringify(rects(l.r)) !== JSON.stringify(fullL)) out.push(`${what}: the full landscape window changed`);
    if (p.r.info.T !== full.r.info.T) out.push(`${what}: the map cell changed, ${p.r.info.T} against ${full.r.info.T}`);
    for (const x of [p, l]) if (JSON.stringify(x.entry) !== JSON.stringify(seen)) out.push(`${what}: the budget became ${JSON.stringify(x.entry)}`);
  }
  assert.deepEqual(out, []);
  assert.equal(full.r.spec.fit.pad, 58);
});

// A touch laptop or a 2-in-1: a browser window that is not the screen's
// width teaches nothing, and once the device's own landscape is seen, a
// portrait window narrower than the screen still lays out on its own.
test("a desktop window teaches nothing, and a touch PC's portrait window lays out alone", () => {
  const scr = { w: 1366, h: 768 };
  const [, turned] = visit([[1000, 600], [768, 1250]], scr);
  const [direct] = visit([[768, 1250]], scr);
  assert.deepEqual(rects(turned.r), rects(direct.r), 'the 1000x600 window left no budget behind');
  assert.equal(turned.r.info.T, direct.r.info.T);
  const [full, narrow] = visit([[1366, 657], [500, 700]], scr);
  assert.equal(full.entry.lh, 1);
  assert.deepEqual(rects(narrow.r), rects(alone(500, 700)));
  assert.equal(narrow.used, 'none');
});

// ---- 4. what is learnt

test('the landscape height is learnt from the device turned, and only grows', () => {
  const scrL = { w: 939, h: 443 };
  const [tab, full, tabAgain] = visit([[896, 363, scrL], [896, 443, scrL], [896, 363, scrL]], LUCAS);
  assert.equal(tab.entry.h, 363);
  assert.equal(full.entry.h, 443, 'a taller landscape window replaces it');
  assert.equal(tabAgain.learn, null, 'a shorter one is a bar come back or a split');
  assert.equal(tabAgain.entry.h, 443);
  assert.equal(tabAgain.used, 'guessed', 'it still lays out at its own height');
  assert.equal(tabAgain.budget.h, 363);
  // a split never teaches, and a window that comes back unusable teaches nothing
  assert.equal(budgetFor(896, 220, scrL, null, {}).learn, null);
  const [split] = visit([[443, 460]], LUCAS);
  assert.equal(split.r.usable, false);
  assert.equal(split.learn, null);
  // the side insets are learnt with the landscape height, and given to portrait
  const [l] = visit([[844, 390, { w: 844, h: 390 }]], { w: 390, h: 844 });
  const notch = budgetedLayout(844, 390, 'touch', { ...BASE, insets: { l: 47, r: 47, t: 0, b: 21 } }, { w: 390, h: 844 }, { l: 47, r: 47 }, l.entry);
  assert.equal(notch.learn.sl, 47);
  const p = budgetFor(390, 844, { w: 390, h: 844 }, null, notch.learn);
  assert.deepEqual(p.sideInsets, { l: 47, r: 47 });
});
