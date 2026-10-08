// Written for Rolehack by Lucas Ruiz, 2026-10-07.
//
// The desk's tests (layout.js section 10: the layout for a mouse and a keyboard), on node's
// own test runner:
//
//   node --test win/web/test/
//
// Desktop mode is being built (Lucas, 2026-10-06 and 2026-10-07), and the desk rule changed
// for it in three ways, held here:
//  1. the cell is whole device pixels (settings.dpr): the largest whole device-pixel cell
//     that fits, which the page draws exactly (web.js drawnCell, floor(T x dpr) / dpr), and at
//     dpr 1 the cell it always was;
//  2. a map that pans is never wider than the level's 80 columns, and stays centred;
//  3. the arrangement keeps a 24 dp band (settings.prevDesk, from info.desk): a window
//     dragged a pixel at a time across a step keeps the old cell, header or panels for 24 dp
//     on the way up, and drops them where they stop fitting on the way down;
//  4. the banks stand at the dock row's outer edges, the log and the inventory between them
//     (Lucas, 2026-10-08).
// Also: nonsense dpr and prevDesk never throw, and a touch or pen layout is the same with
// or without them.  doc/twin-banks/checks/desk.mjs and same.mjs run the same rules over many
// more windows.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout, collisions } from '../layout.js';

const DPRS = [1, 1.25, 1.5, 2, 2.4375];
// laptops and monitors, Lucas's installed app (1280x640) and his Edge tab (1272x588)
const WINDOWS = [[1280, 800], [1366, 768], [1536, 864], [1920, 1080], [1280, 640], [1272, 588]];
const desk = (W, H, st = {}) => layout(W, H, 'mouse', st);

// what the dock and the header leave for the map's 21 rows (section 10's own sum)
function roomFor(r) {
  const m = r.info.fill.map;
  return r.spec.H - m.y - 12 - r.info.M.B - 12 - 4;
}

test('the desk\'s cell is the largest whole device-pixel cell that fits, drawn exactly', () => {
  for (const [W, H] of WINDOWS) for (const dpr of DPRS) {
    const r = desk(W, H, { dpr });
    const at = `${W}x${H} at dpr ${dpr}`;
    assert.equal(r.usable, true, `${at}: ${r.reason}`);
    const T = r.info.T, Td = Math.round(T * dpr);
    assert.ok(Math.abs(T * dpr - Td) < 1e-9, `${at}: ${T} dp is not whole device pixels`);
    assert.equal(Math.floor(T * dpr + 1e-6) / dpr, T, `${at}: the page would draw another cell`);
    assert.equal(r.info.desk.Td, Td);
    const fits = (d) => 80 * d / dpr <= W - 16 + 1e-9 && 21 * d / dpr <= roomFor(r) + 1e-9 && d <= 32 * dpr + 1e-9;
    if (r.info.fill.whole) {
      assert.ok(fits(Td), `${at}: ${Td} device px do not fit`);
      assert.ok(!fits(Td + 1), `${at}: ${Td + 1} device px fit too`);
    } else {
      // under the whole level: the smallest whole device-pixel cell at or over 12 dp
      assert.ok(!fits(Math.ceil(12 * dpr - 1e-6)), `${at}: pans where 12 dp fit`);
      assert.equal(Td, Math.ceil(12 * dpr - 1e-6), `${at}: pans at ${T} dp`);
    }
    assert.ok(collisions(r.spec).length === 0, `${at}: ${collisions(r.spec)}`);
  }
});

test('at dpr 1 the cell is what it always was; at 1.25 it gains the device pixel it lost', () => {
  // the design's desk rows (section 4) and the fidelity report's windows
  for (const [W, H, T] of [[1280, 800, 15], [1920, 1080, 23], [2560, 1440, 31], [1366, 768, 16], [1536, 864, 19], [3440, 1440, 42], [1280, 640, 14]]) {
    assert.equal(desk(W, H).info.T, T, `${W}x${H}`);
    assert.equal(desk(W, H, { dpr: 1 }).info.T, T, `${W}x${H}`);
    assert.deepEqual(desk(W, H, { dpr: 1 }).spec, desk(W, H).spec, `${W}x${H}: dpr 1 is the default`);
  }
  // 1280x800 at dpr 1.25: whole dp gave 15 dp, drawn as 18 device px; 19 fit (15.2 dp)
  const r = desk(1280, 800, { dpr: 1.25 });
  assert.equal(r.info.desk.Td, 19);
  assert.equal(r.info.T, 15.2);
  assert.equal(r.spec.mapArea.w, 1216);
  // 1280x800 at dpr 1.5: 23 device px, where whole dp drew 22
  assert.equal(desk(1280, 800, { dpr: 1.5 }).info.desk.Td, 23);
});

test('a map that pans is never wider than the level, and stays centred', () => {
  const cases = [[1280, 585, {}], [1272, 588, {}], [1272, 588, { dpr: 1.5 }], [800, 600, { cellAspect: 0.5625 }], [1366, 585, {}]];
  for (const [W, H, st] of cases) {
    const r = desk(W, H, st), at = `${W}x${H} ${JSON.stringify(st)}`;
    const a = st.cellAspect || 1, m = r.spec.mapArea;
    assert.equal(r.usable, true, `${at}: ${r.reason}`);
    assert.equal(r.info.fill.whole, false, `${at}: the level should pan here`);
    assert.ok(m.w <= 80 * a * r.info.T + 0.01, `${at}: a ${m.w} dp map round a ${80 * a * r.info.T} dp level`);
    assert.ok(Math.abs(m.x - (W - m.w) / 2) <= 0.01, `${at}: not centred`);
    assert.deepEqual(collisions(r.spec), [], at);
  }
  // 1280x585 drew a 1264 dp map round the 960 dp level
  assert.equal(desk(1280, 585).spec.mapArea.w, 960);
  // text cells at 800x600: 540 dp, the level's width at 12 dp
  assert.equal(desk(800, 600, { cellAspect: 0.5625 }).spec.mapArea.w, 540);
  // a short, wide window: the narrowed map leaves strips of 160 dp or more, so the log and
  // the inventory stand beside it (they stood in the dock row beside a 1350 dp map)
  const wide = desk(1366, 585);
  assert.equal(wide.info.desk.beside, true);
  assert.deepEqual(wide.spec.chrome.map((p) => p.name.split(' (')[0]), ['panel: message log', 'panel: inventory', 'panel: key legend']);
});

test('the banks stand at the dock row\'s edges, the log and the inventory between them', () => {
  // Lucas, 2026-10-08: on a touchscreen laptop the edges are where hands reach ("messages
  // and inventory between them, yes ... edges always")
  const cases = [...WINDOWS.map(([W, H]) => [W, H, {}]), [1366, 585, {}], [2560, 1440, { dpr: 1.5 }],
    [3440, 1440, {}], [1280, 800, { hand: 'left' }], [800, 600, { cellAspect: 0.5625 }], [1280, 800, { deskKey: 58 }]];
  for (const [W, H, st] of cases) {
    const r = desk(W, H, st), at = `${W}x${H} ${JSON.stringify(st)}`;
    assert.equal(r.usable, true, `${at}: ${r.reason}`);
    const { L, R } = r.info.banks, m = r.info.M.m;
    assert.ok(Math.abs(L.x0 - m) < 0.01, `${at}: the left bank starts at ${L.x0}`);
    assert.ok(Math.abs(R.x1 - (W - m)) < 0.01, `${at}: the right bank ends at ${R.x1}`);
    for (const c of r.spec.controls) {
      const B = r.info.banks[c.thumb];
      assert.ok(c.x >= B.x0 - 0.01 && c.x + c.w <= B.x1 + 0.01, `${at}: ${c.id} out of its bank`);
    }
    // in the dock row the log and the inventory keep clear of the banks' wells
    if (!r.info.desk.beside) {
      for (const p of r.spec.chrome.filter((q) => /^panel: (message log|inventory)/.test(q.name))) {
        assert.ok(p.x >= L.x1 + 12 - 0.01 && p.x + p.w <= R.x0 - 12 + 0.01, `${at}: ${p.name} is not between the banks`);
      }
    }
    assert.deepEqual(collisions(r.spec), [], at);
  }
  // Lucas's Edge tab: the log and the inventory share the middle, 468 dp each
  const tab = desk(1272, 588);
  assert.deepEqual(tab.spec.chrome.filter((p) => p.name.startsWith('panel:')).map((p) => [p.name.split(' (')[0], p.x, p.w]),
    [['panel: message log', 162, 468], ['panel: inventory', 642, 468]]);
});

// A window dragged 1 dp at a time, laid out as the page lays it out: each layout gets the
// arrangement the last one drew (info.desk) as settings.prevDesk.
function drag(steps, st = {}) {
  let prevDesk = null;
  return steps.map(([W, H]) => {
    const r = desk(W, H, { ...st, prevDesk });
    if (r.usable && r.info.desk) prevDesk = r.info.desk;   // what the page drew
    return r;
  });
}
const span = (a, b) => { const o = []; for (let v = a; a <= b ? v <= b : v >= b; v += a <= b ? 1 : -1) o.push(v); return o; };
// the first window of a run where pick(result) differs from the run's first
const firstChange = (steps, rs, pick) => { const i = rs.findIndex((r) => pick(r) !== pick(rs[0])); return i < 0 ? null : steps[i]; };

// A step dragged across both ways.  On the way up the old part is kept for 24 dp past the
// rule's own step: the windows around are asked with the parts already decided here held, so
// a cell that grows with the other side does not stretch the panels' band.  On the way down
// it goes where it stops fitting, which is where the rule's own pick changes.
function band(name, along, from, to, other, pick, st = {}) {
  const at = (v) => (along === 'W' ? [v, other] : [other, v]);
  const up = span(from, to).map(at), down = span(to, from).map(at);
  const plainUp = firstChange(up, up.map(([W, H]) => desk(W, H, st)), pick);
  const plainDown = firstChange(down, down.map(([W, H]) => desk(W, H, st)), pick);
  assert.ok(plainUp && plainDown, `${name}: no step between ${from} and ${to}`);
  const i = along === 'W' ? 0 : 1;
  const dragUp = firstChange(up, drag(up, st), pick);
  assert.ok(dragUp, `${name}: never changes on the way up`);
  assert.equal(dragUp[i], plainUp[i] + 24, `${name}: on the way up`);
  assert.deepEqual(firstChange(down, drag(down, st), pick), plainDown, `${name}: on the way down`);
  return { up: plainUp[i], down: plainDown[i], dragged: dragUp[i] };
}

test("the band: a cell step, the header at 826 dp and the panels' flip each change 24 dp late on the way up", () => {
  // the cell at 1280 wide steps at 614 dp tall (12 -> 13 dp) and at 635 (14 dp): grown, it
  // stays 12 dp to 637; shrunk from 640, 14 dp goes at 634, where it stops fitting
  assert.deepEqual(band('the cell', 'H', 600, 640, 1280, (r) => r.info.desk.Td), { up: 614, down: 634, dragged: 638 });
  // and at dpr 1.5, where its steps are 14 dp apart
  band('the cell at dpr 1.5', 'H', 600, 640, 1280, (r) => r.info.desk.Td, { dpr: 1.5 });
  // the header goes side by side at 826 dp wide
  assert.deepEqual(band('the header', 'W', 800, 860, 800, (r) => r.info.desk.sideBySide), { up: 826, down: 825, dragged: 850 });
  // 1440 tall, the level at its 32 dp cap: the log and the inventory go beside it at 2912 wide
  assert.deepEqual(band('the panels', 'W', 2880, 2950, 1440, (r) => r.info.desk.beside), { up: 2912, down: 2911, dragged: 2936 });
  // text cells at 768 tall: beside the 900 dp map from 1252 wide.  24 dp taller the cell is
  // 21 dp and the map 945 wide; asked on its own, that window kept the row to 1321
  assert.deepEqual(band('the panels, text cells', 'W', 1220, 1340, 768, (r) => r.info.desk.beside, { cellAspect: 0.5625 }), { up: 1252, down: 1251, dragged: 1276 });
  // tiles at 780 tall, the 20 dp cell: beside from 1952 wide (it was kept to 2136)
  assert.deepEqual(band('the panels at 780 tall', 'W', 1900, 2150, 780, (r) => r.info.desk.beside), { up: 1952, down: 1951, dragged: 1976 });
  // and at 600 tall, the level at 12 dp (kept to 1416), at dpr 1 and 1.5
  for (const dpr of [1, 1.5]) assert.deepEqual(band(`the panels at 600 tall, dpr ${dpr}`, 'W', 1250, 1450, 600, (r) => r.info.desk.beside, { dpr }), { up: 1312, down: 1311, dragged: 1336 });
});

test("a window dragged taller meets every cell, each 24 dp after the rule's own step", () => {
  // The cell steps every 21 / dpr dp of height, closer than the band.  Taking the rule's own
  // cell when the kept one went skipped a cell or two (12 -> 14 -> 16 dp at 1450 wide) and
  // landed 3 dp past where the new cell fits, so a hand that overshot and came back 4 dp
  // changed it again (14 -> 13), and the panels with it (1760 wide).
  for (const [W, from, to, dpr, a] of [[1450, 600, 760, 1, 1], [1600, 640, 800, 2.4375, 1], [1280, 600, 800, 1.5, 1], [1040, 600, 760, 1, 0.5625]]) {
    const st = { dpr, cellAspect: a };
    const steps = span(from, to).map((H) => [W, H]);
    const own = steps.map(([w, h]) => desk(w, h, st).info.desk.Td);
    const rs = drag(steps, st);
    let changes = 0;
    for (let i = 1; i < rs.length; i++) {
      const was = rs[i - 1].info.desk.Td, now = rs[i].info.desk.Td;
      if (was === now) continue;
      changes++;
      const at = `${W}x${steps[i][1]} at dpr ${dpr}`;
      assert.equal(now, was + 1, `${at}: ${was} -> ${now} device px`);
      assert.equal(own[i - 24], now, `${at}: the rule's own cell 24 dp back is ${own[i - 24]}`);
      assert.notEqual(own[i - 25], now, `${at}: changed later than 24 dp`);
    }
    assert.ok(changes >= 2, `${W} wide at dpr ${dpr}: ${changes} changes`);
    // the legend at 1040 wide, text cells, has room in the dock row at the 15 dp cell only;
    // shown there for that cell's 21 dp, it came and went (none -> row -> none)
    assert.deepEqual(flips(steps, rs), [], `${W} wide at dpr ${dpr}`);
  }
});

// every part of the arrangement that changes and then goes back (the cell: turns the other
// way) within 24 dp of travel in one direction
function flips(steps, rs) {
  const out = [];
  for (const part of ['Td', 'sideBySide', 'beside', 'log', 'inv', 'legend']) {
    let last = null;
    for (let i = 1; i < rs.length; i++) {
      const a = rs[i - 1].info?.desk?.[part], b = rs[i].info?.desk?.[part];
      if (a === undefined || b === undefined || a === b) continue;
      const back = last && i - last.i < 24 && (part === 'Td' ? Math.sign(b - a) !== Math.sign(last.to - last.from) : b === last.from);
      if (back) out.push(`${part} ${last.from} -> ${last.to} at ${steps[last.i]}, -> ${b} at ${steps[i]}`);
      last = { i, from: a, to: b };
    }
  }
  return out;
}

test('a window dragged a pixel at a time never flips its arrangement back within 24 dp', () => {
  for (const st of [{}, { dpr: 1.25 }, { cellAspect: 0.5625 }]) {
    for (const [steps, name] of [[span(560, 760).map((H) => [1280, H]), 'up 1280 wide'], [span(760, 560).map((H) => [1280, H]), 'down 1280 wide'],
      [span(780, 1400).map((W) => [W, 768]), 'right 768 tall'], [span(1400, 780).map((W) => [W, 768]), 'left 768 tall']]) {
      const rs = drag(steps, st);
      assert.deepEqual(flips(steps, rs), [], `${JSON.stringify(st)} ${name}`);
      for (const r of rs) if (r.usable) assert.deepEqual(collisions(r.spec), [], `${JSON.stringify(st)} ${name}`);
    }
  }
});

test('the band never applies to a first layout, nor across a dpr, cell aspect or key size', () => {
  const kept = desk(1280, 640).info.desk;
  assert.equal(kept.Td, 14);
  // with the same settings 1280x660 keeps 14 dp (its own cell is 15 dp, from 656 tall)...
  assert.equal(desk(1280, 660).info.T, 15);
  assert.equal(desk(1280, 660, { prevDesk: kept }).info.T, 14);
  // ...and with others it is laid out as a first layout
  for (const [W, H] of [[1280, 660], [1290, 640], [900, 600]]) {
    assert.equal(JSON.stringify(desk(W, H, { prevDesk: null })), JSON.stringify(desk(W, H)));
    for (const st of [{ dpr: 1.25 }, { dpr: 2 }, { cellAspect: 0.5625 }, { deskKey: 58 }]) {
      assert.equal(JSON.stringify(desk(W, H, { ...st, prevDesk: kept })), JSON.stringify(desk(W, H, st)), `${W}x${H} ${JSON.stringify(st)}`);
    }
  }
});

test('nonsense dpr and prevDesk never throw, and a usable result stays drawable', () => {
  const dprs = [NaN, 0, -1, Infinity, '2', null, undefined, 1e9, 1e-9, 3.7];
  const prevs = [null, {}, 5, 'x', [], { Td: 'x' }, { dpr: 1, a: 1, k: 40, Td: 1e9, sideBySide: 'yes', legend: 'up' },
    { dpr: 1, a: 1, k: 40, Td: -3, beside: true, log: false, inv: false, legend: 'row' },
    { dpr: 1, a: 1, k: 40, Td: 31, sideBySide: true, beside: true, log: true, inv: true, legend: 'row' },
    { dpr: 1, a: 1, k: 40, Td: 12, sideBySide: false, beside: false, log: false, inv: false, legend: 'none' }];
  for (const [W, H] of [[1280, 800], [700, 450], [3440, 1440], [826, 500], [300, 300], [NaN, 600]]) for (const dpr of dprs) for (const prevDesk of prevs) {
    const r = desk(W, H, { dpr, prevDesk });
    assert.ok(r.spec, `${W}x${H} dpr ${dpr} ${JSON.stringify(prevDesk)}: ${r.reason}`);
    if (r.usable) assert.deepEqual(collisions(r.spec), [], `${W}x${H} dpr ${dpr} ${JSON.stringify(prevDesk)}`);
    // the band never costs a window its desk
    if (desk(W, H, { dpr }).usable) assert.equal(r.usable, true, `${W}x${H} dpr ${dpr} ${JSON.stringify(prevDesk)}`);
  }
});

test('a touch or pen layout is the same with or without dpr and prevDesk', () => {
  const prevDesk = desk(1280, 800).info.desk;
  for (const pointer of ['touch', 'pen']) for (const [W, H] of [[896, 443], [443, 939], [1280, 800], [1366, 768], [1920, 1080], [600, 600], [3440, 1440]]) {
    for (const st of [{}, { padKey: 46 }, { cellAspect: 0.5625 }, { budget: { w: 443, h: 443, l: 896 } }]) {
      const plain = JSON.stringify(layout(W, H, pointer, st));
      for (const extra of [{ dpr: 1.5 }, { prevDesk }, { dpr: 2.4375, prevDesk }, { dpr: NaN, prevDesk: 'x' }]) {
        assert.equal(JSON.stringify(layout(W, H, pointer, { ...st, ...extra })), plain, `${pointer} ${W}x${H} ${JSON.stringify(st)} ${JSON.stringify(extra)}`);
      }
    }
  }
});
