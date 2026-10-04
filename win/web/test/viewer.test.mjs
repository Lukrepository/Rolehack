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
//     height only grows, and a window whose layout is unusable teaches nothing;
//  5. the size classes (phone under 600 dp wide or 480 tall, tablet
//     otherwise) change only 24 dp past a boundary, the window's tier and the
//     device cell's alike, so a window dragged across one never flickers
//     between them, and a tier never moves a key.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout } from '../layout.js';
import { budgetFor, budgetedLayout, worse, sizeClass, withClasses, classesOf, SIZE_W, SIZE_H, SIZE_BAND } from '../viewer.js';

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

// ---- 5. size classes

test('a size class changes only 24 dp past its boundary, each way', () => {
  assert.deepEqual([SIZE_W, SIZE_H, SIZE_BAND], [600, 480, 24]);
  // with nothing drawn yet, the boundaries themselves
  assert.equal(sizeClass(599, 800), 'phone');
  assert.equal(sizeClass(600, 800), 'tablet');
  assert.equal(sizeClass(1000, 479), 'phone');
  assert.equal(sizeClass(1000, 480), 'tablet');
  // a phone becomes a tablet at 624 wide and 504 tall; a tablet a phone under 576 or 456
  const run = (from, sizes) => {
    let t = from;
    const changes = [];
    for (const [W, H] of sizes) { const n = sizeClass(W, H, t); if (n !== t) changes.push(`${W}x${H} ${n}`); t = n; }
    return changes;
  };
  const wide = (a, b, H) => Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => [a + Math.sign(b - a) * i, H]);
  const tall = (a, b, W) => Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => [W, a + Math.sign(b - a) * i]);
  assert.deepEqual(run('phone', wide(560, 640, 800)), ['624x800 tablet']);
  assert.deepEqual(run('tablet', wide(640, 560, 800)), ['575x800 phone']);
  assert.deepEqual(run('phone', tall(440, 520, 1000)), ['1000x504 tablet']);
  assert.deepEqual(run('tablet', tall(520, 440, 1000)), ['1000x455 phone']);
  // jitter about either boundary: no change at all
  const jitter = (c, n) => Array.from({ length: n }, (_, i) => c + ((i % 2) ? 7 : -7));
  assert.deepEqual(run('phone', jitter(600, 40).map((W) => [W, 800])), []);
  assert.deepEqual(run('tablet', jitter(600, 40).map((W) => [W, 800])), []);
  assert.deepEqual(run('tablet', jitter(480, 40).map((H) => [1000, H])), []);
  // anything but a tier is no tier
  assert.equal(sizeClass(590, 800, 'desk'), 'phone');
  assert.equal(sizeClass(610, 800, 'nonsense'), 'tablet');
});

// The page's own loop: each layout given the tiers the last one drew
// (overlay.js rebuildTwin), a window dragged a pixel at a time across a
// boundary and back.  The window's tier, the device cell and the panels each
// change once on the way out and once on the way back, at the band's edges,
// and no key moves for any of it.
test('a window dragged across a boundary changes tier once each way, and no key moves', () => {
  const drag = (sizes) => {
    let classes = null;
    return sizes.map(([W, H]) => {
      const r = layout(W, H, 'touch', withClasses(BASE, classes));
      classes = classesOf(r, classes);
      return { W, H, r, tier: r.info.tier, cellTier: r.info.DC.tier, whole: r.info.fill.whole, panels: r.spec.chrome.map((c) => c.name.split(' (')[0]).join(','), keys: JSON.stringify(rects(r)) };
    });
  };
  const flips = (seq, k) => seq.filter((q, i) => i && q[k] !== seq[i - 1][k]).map((q) => `${q.W}x${q.H}`);
  // the height of a desktop window, 1000 wide, from 520 down to 440 and back
  const down = Array.from({ length: 81 }, (_, i) => [1000, 520 - i]), up = down.slice().reverse();
  const seqH = drag([...down, ...up.slice(1)]);
  assert.deepEqual(flips(seqH, 'tier'), ['1000x455', '1000x504']);
  assert.deepEqual(flips(seqH, 'cellTier'), ['1000x455', '1000x504'], 'the device cell keeps its tier with the window');
  assert.ok(flips(seqH, 'whole').every((w) => w === '1000x455' || w === '1000x504'), `the whole level comes and goes only with the tier: ${flips(seqH, 'whole')}`);
  // (the panels over the banks come and go with their own room, 120 dp over
  // a bank, at 503/504 here: a rule of space, crossed once each way)
  for (const q of seqH) assert.equal(q.r.usable, true, `${q.W}x${q.H} usable`);
  // without the tiers fed back, the same drag flips at 480 itself, every time it is crossed
  const bare = [[1000, 481], [1000, 479], [1000, 481], [1000, 479]].map(([W, H]) => layout(W, H, 'touch', BASE));
  assert.deepEqual(bare.map((r) => r.info.tier), ['tablet', 'phone', 'tablet', 'phone']);
  const fed = drag([[1000, 481], [1000, 479], [1000, 481], [1000, 479]]);
  assert.deepEqual(fed.map((q) => q.tier), ['tablet', 'tablet', 'tablet', 'tablet']);
  // the width of a portrait window, 900 tall, from 640 down to 560 and back
  const left = Array.from({ length: 81 }, (_, i) => [640 - i, 900]), right = left.slice().reverse();
  const seqW = drag([...left, ...right.slice(1)]);
  assert.deepEqual(flips(seqW, 'tier'), ['575x900', '624x900']);
  assert.ok(flips(seqW, 'panels').every((w) => w === '575x900' || w === '624x900'), `panels change only with the tier: ${flips(seqW, 'panels')}`);
  // a tier moves no key: the same window laid out as either tier has the same banks
  for (const [W, H] of [[590, 900], [610, 900], [1000, 470], [1000, 490], [580, 470]]) {
    const asPhone = layout(W, H, 'touch', withClasses(BASE, { tier: 'phone', cellTier: 'phone' }));
    const asTablet = layout(W, H, 'touch', withClasses(BASE, { tier: 'tablet', cellTier: 'tablet' }));
    assert.deepEqual(rects(asPhone), rects(asTablet), `${W}x${H}: the keys are the tier's own`);
  }
});

test('the tiers kept are a drawn layout\'s: a fallback to classic keeps the last ones', () => {
  const tab = layout(1024, 768, 'touch', BASE);
  const kept = classesOf(tab, null);
  assert.deepEqual(kept, { tier: 'tablet', cellTier: 'tablet' });
  const split = layout(443, 460, 'touch', BASE);
  assert.equal(split.usable, false);
  assert.deepEqual(classesOf(split, kept), kept, 'an unusable result is not drawn, so its tiers are not kept');
  assert.equal(classesOf(null, kept), kept);
  assert.deepEqual(withClasses({ padKey: 52 }, null), { padKey: 52, prevTier: null, prevCellTier: null });
  // a phone's device cell is decided at its landscape geometry, whichever way it is held
  const p = layout(443, 939, 'touch', BASE);
  assert.deepEqual(classesOf(p), { tier: 'phone', cellTier: 'phone' });
  // a portrait window on a tablet-sized device: a phone window, the device's cell a tablet's
  assert.deepEqual(classesOf(layout(560, 900, 'touch', BASE)), { tier: 'phone', cellTier: 'tablet' });
});

// Desktop mode is deferred (Lucas, 2026-10-03): the page lays out a window
// with a mouse as for touch, so a large one gets the tablet tier -- phone-size
// banks at its corners, the whole level, the log and the inventory -- and
// never the desk's dock.
test('a large window laid out as the page lays it out (touch) is a tablet, never the desk', () => {
  for (const [W, H] of [[1280, 800], [1920, 1080], [2560, 1440], [3440, 1440], [1366, 768]]) {
    const r = budgetedLayout(W, H, 'touch', withClasses(BASE, null), { w: W, h: H }, { l: 0, r: 0 }, {}).r;
    assert.equal(r.usable, true, `${W}x${H}`);
    assert.equal(r.info.tier, 'tablet', `${W}x${H}`);
    assert.equal(r.spec.pointer, 'touch');
    assert.equal(r.spec.fit.pad, 58, `${W}x${H}: phone-size keys`);
    assert.equal(r.info.fill.whole, true, `${W}x${H}: the whole level`);
    const kinds = r.spec.chrome.map((c) => c.name.split(' (')[0]);
    assert.ok(kinds.includes('panel: message log') && kinds.includes('panel: inventory'), `${W}x${H}: ${kinds}`);
  }
});
