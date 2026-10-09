// Written for Rolehack by Lucas Ruiz, 2026-10-02.
//
// The edge windows: the screens where the layout rule has to give way, and the
// command that writes their golden specs (fixtures/edge.json) from the twin
// banks design's layout.js:
//
//   node win/web/test/edge-cli.mjs <design>/layout.js
//
// Every screen in the design's spec.json and variants has room to spare (fit
// level 'full', the chosen pad size), so on their own they leave the rule's
// other outcomes unchecked: the pad stepping down 58 -> 52 -> 46 on short
// sides (Lucas's floor is 46), the right bank's columns narrowing under their
// 44 dp floor, the last resort under the rule, and the windows that come back
// unusable (the page shows classic there).  A change to any of those applies
// to both orientations, so the parity test cannot see it either (a reviewer
// planted a skipped 52 dp step: the Z Fold's cover screen fell to 46 dp keys
// and every test passed, 2026-10-02).  Hence these screens, each with the
// numbers the design gives it and its whole spec.  DESIGN.md v2 quotes several
// of the numbers (its CHANGES E1, M2 and R2, and sections 4, 12, 13 and 14);
// the rest are what the design's layout.js gives.
//
// The fixture is made from the design folder's layout.js, never from
// win/web/layout.js: it is there to catch the page's copy drifting from the
// design.  This file refuses the page's copy, and writes nothing when the
// design's numbers differ from the ones below; when the design changes them on
// purpose, change them here first.  layout.test.mjs imports EDGE and
// summary() from here, so the cases are written down once.
//
// Under node 20, "node --test win/web/test/" loads every module in this
// directory as a test file, this one too; the test runner marks its children
// with NODE_TEST_CONTEXT, and then this file only exports.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'fixtures', 'edge.json');

const r2 = (v) => Math.round(v * 100) / 100;

// what each case is held to: usable, the fit's level, pad and right columns,
// and the portrait gap between the banks (info.M.c)
export function summary(r) {
  const f = r.spec.fit;
  return { usable: r.usable, level: f.level, pad: f.pad, rightColumns: f.rightColumns, gap: r2(r.info.M.c) };
}

const touch = (W, H, why, expect, settings = {}) => ({ W, H, pointer: 'touch', settings, why, expect });

// name: the window, its settings, why it is here, and the design's numbers
export const EDGE = {
  '344x882': touch(344, 882, "the Galaxy Z Fold's cover screen: the pad steps 58 -> 52",
    { usable: true, level: 'stepped', pad: 52, rightColumns: 45.33, gap: 24 }),
  '882x344': touch(882, 344, 'the same turned: the same banks',
    { usable: true, level: 'stepped', pad: 52, rightColumns: 45.33, gap: 24 }),
  '640x336': touch(640, 336, 'a 336 dp short side with no portrait seen: 46 dp keys',
    { usable: true, level: 'stepped', pad: 46, rightColumns: 44, gap: 24 }),
  '336x640': touch(336, 640, 'the same turned',
    { usable: true, level: 'stepped', pad: 46, rightColumns: 44, gap: 24 }),
  '640x336 budget 360x616': touch(640, 336, "the same window remembering a 360 dp portrait width (the status bar showing): the budget keeps 58 dp keys",
    { usable: true, level: 'full', pad: 58, rightColumns: 44.67, gap: 24 }, { budget: { w: 360, h: 336, l: 640 } }),
  '600x330': touch(600, 330, 'a 330 dp short side: 46 dp keys',
    { usable: true, level: 'stepped', pad: 46, rightColumns: 44, gap: 24 }),
  '700x320': touch(700, 320, "a 320 dp short side: 46 dp keys, and the right bank's columns narrow to 41 dp (degraded)",
    { usable: true, level: 'narrow', pad: 46, rightColumns: 41.33, gap: 24 }),
  '320x568': touch(320, 568, 'the first iPhone SE: narrow, as 700x320',
    { usable: true, level: 'narrow', pad: 46, rightColumns: 41.33, gap: 24 }),
  '1024x300': touch(1024, 300, 'the last resort: right columns at 40 dp, 14 dp between the banks',
    { usable: true, level: 'degraded', pad: 46, rightColumns: 40, gap: 14 }),
  '800x250': touch(800, 250, 'below the last resort: the whole bank scales',
    { usable: true, level: 'degraded', pad: 40.49, rightColumns: 35.21, gap: 8.8 }),
  '360x800 cutout 24': touch(360, 800, 'a 24 dp side cutout on a 360 dp phone steps the pad to 46 dp',
    { usable: true, level: 'stepped', pad: 46, rightColumns: 44, gap: 24 }, { avoidCutout: 24 }),
  '360x800 cutout 30': touch(360, 800, "a 30 dp cutout narrows the right bank's columns to 41 dp (degraded)",
    { usable: true, level: 'narrow', pad: 46, rightColumns: 41.33, gap: 24 }, { avoidCutout: 30 }),
  '443x460': touch(443, 460, "Lucas's phone in split screen beside a wiki: no rectangle left for a map, so classic",
    { usable: false, level: 'unusable', pad: 58, rightColumns: 58, gap: 27 }),
  '480x300': touch(480, 300, "a 300 dp short side with no room for the drawer: classic",
    { usable: false, level: 'unusable', pad: 46, rightColumns: 40, gap: 14 }),
  // the status lines at the text metric (2026-10-08) made the desk's header taller, so the scaling here deepened (was pad 39.88, gap 23.93)
  '700x450 mouse': { W: 700, H: 450, pointer: 'mouse', settings: {}, why: 'a desk window too short for the 40 dp dock: scaled, a 5-row map, classic',
    expect: { usable: false, level: 'unusable', pad: 33.89, rightColumns: 33.89, gap: 20.33 } },
};

// the design's numbers against a result, as text
export function expectDiff(got, want) {
  const out = [];
  for (const [k, v] of Object.entries(want)) {
    const ok = typeof v === 'number' ? Math.abs(got[k] - v) <= 0.01 + 1e-9 : got[k] === v;
    if (!ok) out.push(`${k} ${got[k]} (the design: ${v})`);
  }
  return out;
}

async function main(args) {
  if (args.length !== 1) {
    console.error('usage: node win/web/test/edge-cli.mjs <design folder>/layout.js');
    return 2;
  }
  const file = path.resolve(args[0]);
  if (file === path.resolve(HERE, '..', 'layout.js')) {
    console.error("edge-cli: that is the page's own copy of the rule; the fixture comes from the design's layout.js");
    return 2;
  }
  const { layout } = await import(pathToFileURL(file).href);
  const screens = {}, wrong = [];
  for (const [name, c] of Object.entries(EDGE)) {
    const r = layout(c.W, c.H, c.pointer, c.settings);
    if (!r.spec) { wrong.push(`${name}: no spec (${r.reason})`); continue; }
    const got = summary(r);
    for (const d of expectDiff(got, c.expect)) wrong.push(`${name}: ${d}`);
    const { W, H, pointer, settings, why } = c;
    screens[name] = { W, H, pointer, settings, why, usable: got.usable, gap: got.gap, spec: r.spec };
    console.log(`${name.padEnd(24)} ${got.usable ? 'usable  ' : 'unusable'} ${got.level.padEnd(9)} pad ${got.pad}, right columns ${got.rightColumns}, gap ${got.gap}`);
  }
  if (wrong.length) {
    console.error(`\nedge-cli: ${file} differs from the numbers in EDGE, so nothing was written:\n  ${wrong.join('\n  ')}`);
    return 1;
  }
  const fx = {
    name: 'the edge windows: where the rule has to give way',
    notes: `Written by win/web/test/edge-cli.mjs from the twin banks design's layout.js, never win/web/layout.js. Each screen: its window, pointer and settings, why it is here, whether it is usable, the portrait gap between the banks (info.M.c), and the whole spec.`,
    screens,
  };
  fs.writeFileSync(OUT, JSON.stringify(fx, null, 1));
  console.log(`\nwrote ${path.relative(process.cwd(), OUT)} (${Object.keys(screens).length} screens)`);
  return 0;
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct && !process.env.NODE_TEST_CONTEXT) process.exitCode = await main(process.argv.slice(2));
