// Written for Rolehack by Lucas Ruiz, 2026-10-02.
//
// The layout rule's tests (layout.js), on node's own test runner, with
// nothing to install:
//
//   node --test win/web/test/
//
// What the page leans on:
//  1. layout() still lays out the design's golden screens as the design did:
//     every control, band, map area, glass, panel, pop-up and decor rect (the
//     bank wells with their guard halos, and the confirm ring: the hit layers
//     of the near-miss guard, section 6) of the 15 scored screens and the six
//     variants (fixtures/, copied from the design's spec.json and variants/)
//     within half a dp; and the same of the edge windows (fixtures/edge.json,
//     written by edge-cli.mjs from the design's layout.js), where the rule has
//     to give way -- the pad stepping 58 -> 52 -> 46, the right columns
//     narrowing, the last resort, unusable -- each also held to the design's
//     own numbers (edge-cli.mjs's EDGE): usable, the fit's level, pad and right
//     columns, and the gap between the banks;
//  2. it never throws, over a sweep of windows, pointers and settings, nonsense
//     included; whatever it calls usable has no key off screen, on a key, on
//     the map or under a band; and only small or near-square windows come back
//     unusable (the page shows classic there);
//  3. parity: a window and the same window turned get the same banks -- every
//     key at the same offsets from its own bottom corner -- since nothing in a
//     bank may depend on the orientation (the design's section 1);
//  4. the left-handed layout is the right-handed one mirrored: every key the
//     same offsets from the other corner, the pad's columns kept in their
//     screen order (the directions stay true to the map);
//  5. layout.js stays a plain module the page imports as it is.
// README.md says how to refresh the fixtures when the design changes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { layout, collisions } from '../layout.js';
import { EDGE, summary, expectDiff } from './edge-cli.mjs';

const FIXTURES = new URL('./fixtures/', import.meta.url);
const TOL = 0.5;          // dp: the fixtures are rounded to 0.01, the rule may drift less than this
const SAME = 0.02;        // dp: parity is exact, up to the 0.01 rounding of two rects

// How the design's layout-cli.mjs makes each fixture: the screens of a pair
// are laid out with the pair's remembered budget (portrait width, landscape
// height and width), as the page does once the device has been seen both
// ways (section 12); each variant is the rule under one changed setting.
// These must match layout-cli.mjs's SCREENS, PAIRS and VARIANTS.
const PAIRS = [['896x443', '443x939'], ['640x360', '360x640'], ['915x412', '412x915'], ['844x390', '390x844'], ['1024x768', '768x1024']];
const VARIANTS = {
  'spec.json': {},
  'spec-combat-left.json': { combatThumb: 'L' },
  'spec-left-handed.json': { hand: 'left' },
  'spec-text-cells.json': { cellAspect: 0.5625 },
  'spec-pad46.json': { padKey: 46 },
  'spec-pad52.json': { padKey: 52 },
  'spec-cell-rows.json': { mapCell: 'rows' },
};
const SCREENS = ['896x443', '443x939', '640x360', '360x640', '915x412', '412x915', '844x390', '390x844',
  '1024x768', '768x1024', '1180x820', '1366x768', '1280x800', '1920x1080', '2560x1440'];

function screenSettings(W, H, settings) {
  const key = `${W}x${H}`, pr = PAIRS.find(([l, p]) => l === key || p === key);
  if (!pr) return settings;
  const [lw, lh] = pr[0].split('x').map(Number), [pw] = pr[1].split('x').map(Number);
  return { ...settings, budget: { w: pw, h: lh, l: lw } };
}

// every way two rects differ by more than TOL, as text
function rectDiff(what, a, b) {
  if (!a || !b) return a === b ? [] : [`${what}: ${a ? 'extra' : 'missing'}`];
  const out = [];
  for (const k of ['x', 'y', 'w', 'h']) {
    if (!(Math.abs(a[k] - b[k]) <= TOL)) out.push(`${what}.${k} ${a[k]} (golden ${b[k]})`);
  }
  return out;
}

// a list of named rects against the golden list, in order
function listDiff(what, got, want, nameOf) {
  const out = [];
  if (got.length !== want.length) out.push(`${what}: ${got.length} (golden ${want.length})`);
  for (let i = 0; i < Math.min(got.length, want.length); i++) {
    const n = nameOf(want[i]);
    if (nameOf(got[i]) !== n) out.push(`${what}[${i}]: ${nameOf(got[i])} (golden ${n})`);
    out.push(...rectDiff(`${what} ${n}`, got[i], want[i]));
  }
  return out;
}

function specDiff(got, want) {
  const out = [];
  const ids = (s) => s.controls.map((c) => c.id).join(' ');
  if (ids(got) !== ids(want)) out.push(`controls: ${ids(got)} (golden ${ids(want)})`);
  for (const w of want.controls) {
    const g = got.controls.find((c) => c.id === w.id);
    if (!g) continue;
    out.push(...rectDiff(w.id, g, w));
    if (g.thumb !== w.thumb) out.push(`${w.id}.thumb ${g.thumb} (golden ${w.thumb})`);
    if (g.kind !== w.kind) out.push(`${w.id}.kind ${g.kind} (golden ${w.kind})`);
  }
  out.push(...rectDiff('mapArea', got.mapArea, want.mapArea));
  out.push(...rectDiff('glass', got.glass, want.glass));
  out.push(...listDiff('band', got.bands, want.bands, (b) => b.name));
  out.push(...listDiff('panel', got.chrome, want.chrome, (p) => p.name));
  out.push(...listDiff('popup', got.popups, want.popups, (p) => `${p.owner}: ${p.label.split(':')[0]}`));
  out.push(...listDiff('decor', got.decor, want.decor, (d) => d.name.split(' (')[0]));
  for (const k of ['level', 'pad', 'rightColumns', 'degraded']) {
    if (got.fit[k] !== want.fit[k] && !(typeof want.fit[k] === 'number' && Math.abs(got.fit[k] - want.fit[k]) <= TOL)) {
      out.push(`fit.${k} ${got.fit[k]} (golden ${want.fit[k]})`);
    }
  }
  return out;
}

// ---- 1. the golden screens

const EDGE_FILE = 'edge.json';

test('the fixtures are the design\'s screens and variants', () => {
  const files = fs.readdirSync(FIXTURES).filter((f) => f.endsWith('.json')).sort();
  assert.deepEqual(files, [...Object.keys(VARIANTS), EDGE_FILE].sort(), 'a fixture with no settings here, or settings with no fixture');
  for (const f of files.filter((n) => n !== EDGE_FILE)) {
    const fx = JSON.parse(fs.readFileSync(new URL(f, FIXTURES), 'utf8'));
    assert.deepEqual(Object.keys(fx.screens), SCREENS, `${f}: the screens layout-cli.mjs scores`);
  }
});

for (const [file, settings] of Object.entries(VARIANTS)) {
  test(`layout() reproduces ${file} within ${TOL} dp`, async (t) => {
    const fx = JSON.parse(fs.readFileSync(new URL(file, FIXTURES), 'utf8'));
    for (const [key, want] of Object.entries(fx.screens)) {
      await t.test(key, () => {
        const [W, H] = key.split('x').map(Number);
        const r = layout(W, H, want.pointer, screenSettings(W, H, settings));
        assert.ok(r.spec, `no spec: ${r.reason}`);
        assert.equal(r.usable, true, `unusable: ${r.reason}`);
        assert.deepEqual(specDiff(r.spec, want), []);
      });
    }
  });
}

// The edge windows: every case in EDGE is in the fixture, made for the same
// window and settings, and the other way round.
test(`layout() reproduces ${EDGE_FILE}, the windows where the rule gives way, within ${TOL} dp`, async (t) => {
  const fx = JSON.parse(fs.readFileSync(new URL(EDGE_FILE, FIXTURES), 'utf8'));
  assert.deepEqual(Object.keys(fx.screens), Object.keys(EDGE), `${EDGE_FILE}: the cases edge-cli.mjs writes (rerun it)`);
  for (const [name, c] of Object.entries(EDGE)) {
    await t.test(name, () => {
      const want = fx.screens[name];
      assert.deepEqual({ W: want.W, H: want.H, pointer: want.pointer, settings: want.settings },
        { W: c.W, H: c.H, pointer: c.pointer, settings: c.settings }, `${EDGE_FILE} was made for another window or settings (rerun edge-cli.mjs)`);
      const r = layout(c.W, c.H, c.pointer, c.settings);
      assert.ok(r.spec, `no spec: ${r.reason}`);
      const got = summary(r);
      assert.deepEqual(expectDiff(got, c.expect), [], `${c.why}: not the design's numbers`);
      assert.equal(got.usable, want.usable, `usable (golden ${want.usable})`);
      assert.ok(Math.abs(got.gap - want.gap) <= TOL, `the gap between the banks ${got.gap} (golden ${want.gap})`);
      assert.deepEqual(specDiff(r.spec, want.spec), []);
    });
  }
});

// ---- 2. never throws

// a small seeded generator, so a failure names a case that comes back
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

const SWEEP_SETTINGS = [
  {},
  { padKey: 46 }, { padKey: 52 },
  { hand: 'left', combatThumb: 'L' },
  { cellAspect: 0.5625, mapCell: 'rows' },
  // the plain settings end here (PLAIN); then budgets, insets, big text and nonsense
  { budget: { w: 443, h: 443, l: 896 } },
  { insets: { l: 47, r: 47, t: 0, b: 21 }, anchor: 'safe', gripLift: 40 },
  { insets: { l: 59, r: 0, t: 0, b: 0 }, sideInsets: { l: 59, r: 0 }, avoidCutout: 24 },
  { text: { msgFont: 'screen', msgSize: 1.4, textScale: 2 } },
  // nonsense: every number unusable, every shape wrong
  { padKey: NaN, deskKey: -3, gripLift: -5, cellAspect: 0, msgRowH: 'x', statusH: Infinity,
    insets: { l: 'x', r: null, t: -1, b: NaN }, budget: { w: -1, h: 0 }, msgRows: { landscape: Infinity, portrait: -2 },
    halo: 0, ring: -1, cellColumns: 0, fitFloor: NaN, hand: 7, anchor: {}, mapCell: null },
];

const PLAIN = 5;

function checkResult(r, what) {
  assert.ok(r && typeof r === 'object', `${what}: no result`);
  assert.ok(r.spec, `${what}: layout() caught a throw: ${r.reason}`);
  assert.equal(typeof r.usable, 'boolean', `${what}: usable is not a boolean`);
  if (!r.usable) return;
  const S = r.spec;
  assert.equal(S.controls.filter((c) => !c.behind).length, 36, `${what}: 36 keys`);
  for (const c of S.controls) {
    assert.ok([c.x, c.y, c.w, c.h].every(Number.isFinite) && c.w > 0 && c.h > 0, `${what}: ${c.id} is not a rect`);
  }
  for (const b of [S.mapArea, S.glass, ...S.bands, ...S.chrome, ...S.popups]) {
    assert.ok([b.x, b.y, b.w, b.h].every(Number.isFinite), `${what}: a band, panel or pop-up is not finite`);
  }
  assert.deepEqual(collisions(S), [], `${what}: usable, yet`);
  // and the same again by this file's own reckoning, not layout.js's
  const live = S.controls.filter((c) => !c.behind);
  const over = (a, b) => a.x + 0.01 < b.x + b.w && b.x + 0.01 < a.x + a.w && a.y + 0.01 < b.y + b.h && b.y + 0.01 < a.y + a.h;
  const bad = [];
  for (const c of live) {
    if (c.x < -0.01 || c.y < -0.01 || c.x + c.w > S.W + 0.01 || c.y + c.h > S.H + 0.01) bad.push(`${c.id} off screen`);
    if (over(c, S.mapArea)) bad.push(`${c.id} on the map`);
    for (const b of [...S.bands, ...S.chrome]) if (over(b, c)) bad.push(`${b.name.split(' (')[0]} over ${c.id}`);
  }
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) if (over(live[i], live[j])) bad.push(`${live[i].id} on ${live[j].id}`);
  if (!(S.mapArea.w > 0 && S.mapArea.h > 0)) bad.push('no map');
  assert.deepEqual(bad, [], `${what}: usable, yet`);
}

test('layout() never throws, and what it calls usable is drawable', () => {
  let n = 0;
  for (let W = 200; W <= 2600; W += 60) {
    for (let H = 200; H <= 2600; H += 60) {
      for (const pointer of ['touch', 'mouse']) {
        for (const [i, st] of SWEEP_SETTINGS.entries()) {
          if (pointer === 'mouse' && i !== 0 && i !== SWEEP_SETTINGS.length - 1) continue;
          let r;
          assert.doesNotThrow(() => { r = layout(W, H, pointer, st); }, `${W}x${H} ${pointer} ${JSON.stringify(st)}`);
          checkResult(r, `${W}x${H} ${pointer} ${JSON.stringify(st)}`);
          // Only small and near-square windows may be unusable (the page shows
          // classic there): the largest such square is 616 dp at the defaults
          // (the design: "squares under about 650 dp").  With the plain
          // settings, anything 660 dp or more on its short side has room.
          if (i < PLAIN && Math.min(W, H) >= 660) assert.equal(r.usable, true, `${W}x${H} ${pointer} ${JSON.stringify(st)}: unusable (${r.reason})`);
          n++;
        }
      }
    }
  }
  // phones, small tablets and near-square split screens, closer together
  for (let W = 300; W <= 1000; W += 12) {
    for (let H = 300; H <= 1000; H += 12) {
      for (const st of [{}, { padKey: 46, hand: 'left' }]) {
        let r;
        assert.doesNotThrow(() => { r = layout(W, H, 'touch', st); }, `${W}x${H} ${JSON.stringify(st)}`);
        checkResult(r, `${W}x${H} touch ${JSON.stringify(st)}`);
        n++;
      }
    }
  }
  // random windows and settings, odd sizes included
  const rnd = rng(20261002);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  for (let i = 0; i < 1500; i++) {
    const W = pick([rnd() * 3000, Math.round(rnd() * 3000), 1, 0, -50, NaN, 1e6]);
    const H = pick([rnd() * 3000, Math.round(rnd() * 3000), 1, 0, -50, NaN, 1e6]);
    const st = {
      padKey: pick([46, 52, 58, 40, 72, NaN]), hand: pick(['right', 'left']), combatThumb: pick(['R', 'L']),
      gripLift: pick([0, 20, 80, 500, -1]), anchor: pick(['auto', 'safe', 'physical', 'odd']),
      insets: { l: pick([0, 47, 62, 300]), r: pick([0, 47]), t: pick([0, 24]), b: pick([0, 21, 34]) },
      budget: pick([null, { w: rnd() * 900, h: rnd() * 900, l: rnd() * 2000 }]),
      mapCell: pick(['columns', 'rows']), cellAspect: pick([1, 0.5625]),
      text: pick([undefined, { msgFont: pick(['atkinson', 'screen']), msgSize: pick([0.85, 1, 1.4]), textScale: pick([0.85, 1, 2]) }]),
    };
    const pointer = pick(['touch', 'touch', 'mouse', 'pen']);
    let r;
    assert.doesNotThrow(() => { r = layout(W, H, pointer, st); }, `${W}x${H} ${pointer} ${JSON.stringify(st)}`);
    checkResult(r, `random ${i}: ${W}x${H} ${pointer} ${JSON.stringify(st)}`);
    n++;
  }
  assert.ok(n > 25000, `${n} layouts`);
});

// ---- 3 and 4. parity

// a key's offsets from its own thumb's bottom corner
const corner = (S, c) => ({ in: c.thumb === 'L' ? c.x : S.W - c.x - c.w, up: S.H - c.y - c.h, w: c.w, h: c.h });

function sameCorners(A, B, what, mapId = (id) => id, otherThumb = false) {
  const out = [];
  for (const a of A.controls) {
    if (a.behind) continue;
    const b = B.controls.find((c) => c.id === mapId(a.id));
    if (!b) { out.push(`${what}: ${a.id} missing`); continue; }
    if ((a.thumb !== b.thumb) !== otherThumb) out.push(`${what}: ${a.id} on thumb ${a.thumb}, then ${b.thumb}`);
    const p = corner(A, a), q = corner(B, b);
    for (const k of ['in', 'up', 'w', 'h']) {
      if (!(Math.abs(p[k] - q[k]) <= SAME)) out.push(`${what}: ${a.id}.${k} ${p[k].toFixed(2)} then ${q[k].toFixed(2)}`);
    }
  }
  return out;
}

const PHONES = [[344, 882], [360, 800], [360, 640], [390, 844], [393, 852], [402, 874], [412, 915], [412, 924],
  [428, 926], [430, 932], [440, 956], [443, 939], [448, 997]];
const TABLETS = [[600, 960], [712, 1138], [768, 1024], [820, 1180], [853, 1280], [912, 1368], [1032, 1376]];
const FOLDABLES = [[540, 720], [561, 744], [690, 829], [701, 841]];
const PARITY_SETTINGS = [{}, ...Object.values(VARIANTS).filter((v) => Object.keys(v).length), { padKey: 46, hand: 'left' }];

test('a window and the same window turned get the same banks', () => {
  const out = [];
  for (const [S, L] of [...PHONES, ...TABLETS, ...FOLDABLES]) {
    for (const st of PARITY_SETTINGS) {
      const what = `${L}x${S} / ${S}x${L} ${JSON.stringify(st)}`;
      const land = layout(L, S, 'touch', st), port = layout(S, L, 'touch', st);
      assert.ok(land.usable && port.usable, `${what}: unusable (${land.reason || port.reason})`);
      out.push(...sameCorners(land.spec, port.spec, what));
    }
  }
  // Lucas's phone is uneven (896 wide in landscape, 939 tall in portrait):
  // the remembered budget gives it parity all the same
  for (const st of PARITY_SETTINGS) {
    const b = { ...st, budget: { w: 443, h: 443, l: 896 } };
    out.push(...sameCorners(layout(896, 443, 'touch', b).spec, layout(443, 939, 'touch', b).spec, `896x443 / 443x939 ${JSON.stringify(st)}`));
  }
  assert.deepEqual(out, []);
});

// the pad's columns keep their screen order in either corner
const PAD_MIRROR = { pad_y: 'pad_u', pad_u: 'pad_y', pad_h: 'pad_l', pad_l: 'pad_h', pad_b: 'pad_n', pad_n: 'pad_b' };

test('the left-handed layout mirrors the right-handed one', () => {
  const out = [];
  for (const [S, L] of [...PHONES, ...TABLETS, ...FOLDABLES]) {
    for (const [W, H] of [[L, S], [S, L]]) {
      for (const st of [{}, { padKey: 46 }, { combatThumb: 'L' }]) {
        const what = `${W}x${H} ${JSON.stringify(st)}`;
        const R = layout(W, H, 'touch', st).spec, Lh = layout(W, H, 'touch', { ...st, hand: 'left' }).spec;
        out.push(...sameCorners(R, Lh, what, (id) => PAD_MIRROR[id] || id, true));
        const m = R.mapArea, n = Lh.mapArea;
        if (!(Math.abs(m.x - (W - n.x - n.w)) <= SAME && Math.abs(m.y - n.y) <= SAME && Math.abs(m.w - n.w) <= SAME && Math.abs(m.h - n.h) <= SAME)) {
          out.push(`${what}: the map ${JSON.stringify(m)}, left-handed ${JSON.stringify(n)}`);
        }
      }
    }
  }
  assert.deepEqual(out, []);
});

// ---- the stacked header

// A header that is one block in the glass, messages over the status -- the
// page's until it laid its bands out apart (2026-10-02), and Android's
// RhScreen -- asks for that with header 'stacked': then no band stands beside
// another or over the banks, every band lies in the glass, and a window whose
// header is stacked in the glass anyway (every phone at the default cell) lays
// out just as it does by default -- unless the plan squeezed the banks for a
// header over them in the other orientation (mapCell 'rows'), which 'stacked'
// never does.
test("header 'stacked' keeps the bands stacked in the glass", () => {
  const out = [];
  const inside = (b, g) => b.x >= g.x - 0.01 && b.y >= g.y - 0.01 && b.x + b.w <= g.x + g.w + 0.01 && b.y + b.h <= g.y + g.h + 0.01;
  const stacked = (S) => S.bands.length === 2 && Math.abs(S.bands[0].x - S.bands[1].x) <= 0.01
    && Math.abs(S.bands[0].w - S.bands[1].w) <= 0.01 && S.bands[1].y >= S.bands[0].y + S.bands[0].h - 0.01
    && S.bands.every((b) => inside(b, S.glass));
  const windows = [...PHONES, ...TABLETS, ...FOLDABLES].flatMap(([S, L]) => [[L, S], [S, L]]);
  let sideBySide = 0, same = 0;
  for (const [W, H] of [...windows, [1366, 768], [1280, 800], [1920, 1080], [2560, 1440]]) {
    for (const pointer of ['touch', 'mouse']) {
      for (const st of [{}, { mapCell: 'rows' }, { padKey: 46, hand: 'left' }]) {
        const what = `${W}x${H} ${pointer} ${JSON.stringify(st)}`;
        const r = layout(W, H, pointer, { ...st, header: 'stacked' }), a = layout(W, H, pointer, st);
        checkResult(r, `${what} stacked`);
        if (!r.usable) continue;
        if (!stacked(r.spec)) out.push(`${what}: the bands are not stacked in the glass`);
        if (a.usable && stacked(a.spec) && !a.info.M.over) { out.push(...specDiff(r.spec, a.spec).map((d) => `${what}: ${d}`)); same++; } else sideBySide++;
      }
    }
  }
  assert.deepEqual(out, []);
  // the option has something to do: tablets and the desk put the header side by side by default
  assert.ok(sideBySide > 10 && same > 100, `${sideBySide} side by side by default, ${same} stacked anyway`);
});

// ---- the status lines hidden

// With the status lines hidden (Settings, Status lines: Hidden) the page asks
// for no status band (statusH 0) and draws none, so the rule keeps no room for
// HP and Pw bars under lines that are not there: 14 dp kept for them stood
// empty between the messages and the map (the review, 2026-10-02).  With the
// lines shown the bars come as before.
test('no room for bars under hidden status lines', () => {
  const out = [];
  let bars = 0;
  const windows = [...PHONES, ...TABLETS].flatMap(([S, L]) => [[L, S], [S, L]]);
  for (const [W, H] of windows) {
    for (const st of [{}, { mapCell: 'rows' }]) {
      const hid = layout(W, H, 'touch', { ...st, statusH: 0 }), shown = layout(W, H, 'touch', st);
      checkResult(hid, `${W}x${H} hidden`);
      if (!hid.usable) continue;
      // a stacked header's status band (a side-by-side one stands beside the messages,
      // as tall as they are, and grants nothing)
      const [msg, status] = hid.spec.bands, stacked = Math.abs(status.x - msg.x) <= 0.01;
      if (stacked && status.h > 0.01) out.push(`${W}x${H} ${JSON.stringify(st)}: ${status.name}, ${status.h} dp, with the lines hidden`);
      if (shown.usable && shown.spec.bands[1].name === 'status (3 lines + HP/Pw bars)') bars++;
    }
  }
  assert.deepEqual(out, []);
  assert.ok(bars > 0, 'no window got bars with the lines shown');
});

// ---- 5. the page imports the file as it is

test('layout.js is a plain module: no imports, no DOM, no node', () => {
  const src = fs.readFileSync(new URL('../layout.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(src, /^\s*import\b|\bimport\(|\brequire\(|\bprocess\.|\b(document|window|navigator|localStorage|globalThis)\s*\./m);
});
