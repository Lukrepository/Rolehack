// Nothing moves for a touch player (Lucas, 2026-10-06 and 2026-10-07): desktop mode changed
// the desk alone (layout.js section 10), so every layout for pointer 'touch' or 'pen' must be
// what the rule gave before it, to the last digit, and so must a layout for any pointer but
// 'mouse' (all take the touch path).  This lays out the sweep's windows and variants, a grid
// of windows, every window a pixel apart across each step of the touch rule the grid meets
// (a step that moved by a pixel showed in 1 of 29,456 layouts before), and a seeded random
// set with nonsense settings, with and without the desk's new settings (dpr, prevDesk), and
// compares JSON.stringify(layout(...)) with the unchanged rule's.
//
//   RH_BASE=<the unchanged layout.js> node doc/twin-banks/checks/same.mjs
//
// RH_BASE defaults to /root/desk/baseline/layout.js where that exists (rolehack/web's rule at
// c694b4c07, before desktop mode); elsewhere make one with
//   git show c694b4c07:win/web/layout.js > <dir>/layout-base.js
// RH_LAYOUT=<path> runs another build of the candidate, as the other checks do.  Exit code 1
// on any difference.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE = '/root/desk/baseline/layout.js';
const basePath = process.env.RH_BASE || (fs.existsSync(DEFAULT_BASE) ? DEFAULT_BASE : null);
if (!basePath) {
  console.log('same: no baseline rule.  Run it as');
  console.log('  git show c694b4c07:win/web/layout.js > <dir>/layout-base.js');
  console.log('  RH_BASE=<dir>/layout-base.js node doc/twin-banks/checks/same.mjs');
  process.exit(2);
}
const base = await import(pathToFileURL(path.resolve(basePath)).href);
const cand = await import(pathToFileURL(process.env.RH_LAYOUT ? path.resolve(process.env.RH_LAYOUT) : path.join(HERE, '../../../win/web/layout.js')).href);
const run = (m, W, H, p, st) => { try { return JSON.stringify(m.layout(W, H, p, st)); } catch (e) { return `THROWS ${e.message}`; } };

// sweep.mjs's windows and variants
const phones = [[344, 882], [360, 800], [360, 640], [390, 844], [393, 852], [402, 874], [412, 915], [412, 924], [428, 926], [430, 932], [440, 956], [443, 939], [448, 997]];
const tablets = [[600, 960], [712, 1138], [768, 1024], [820, 1180], [853, 1280], [912, 1368], [1032, 1376]];
const foldables = [[540, 720], [561, 744], [690, 829], [701, 841]];
const touchL = [[1280, 950], [1366, 768], [1536, 864], [1280, 720]];
const mouse = [[1280, 800], [1440, 900], [1920, 1080], [1920, 1200], [2560, 1440], [2560, 1600], [3440, 1440], [3840, 2160], [1280, 720], [1536, 864], [5120, 2160]];
const short = [[640, 336], [592, 336], [600, 330], [700, 320], [1024, 300], [800, 250], [480, 300], [300, 200]];
// Lucas's laptop (1280x640 installed, 1272x588 in a tab), his phone, and its split screen
const lucas = [[896, 443], [443, 939], [1280, 640], [1272, 588], [443, 460]];
const VARIANTS = [{}, { hand: 'left' }, { combatThumb: 'L' }, { cellAspect: 0.5625 }, { mapCell: 'rows' }, { header: 'stacked' }];
const windows = [];
for (const [w, h] of [...phones, ...tablets, ...foldables, ...short, ...lucas]) windows.push([w, h], [h, w]);
windows.push(...touchL, ...mouse);
const deskArr = cand.layout(1280, 800, 'mouse', {}).info.desk;
const extras = [{}, { dpr: 1.5 }, { dpr: 2.4375, prevDesk: deskArr }, { prevDesk: deskArr }, { dpr: NaN, prevDesk: 'x' }];

let n = 0;
const differ = [];
const t0 = Date.now();
function same(W, H, p, st, tag) {
  n++;
  const a = run(base, W, H, p, st), b = run(cand, W, H, p, st);
  if (a !== b) differ.push(`${tag} ${p} ${W}x${H} ${JSON.stringify(st)}`);
}
for (const p of ['touch', 'pen']) for (const v of VARIANTS) for (const k of [46, 52, 58]) for (const ex of extras) for (const [W, H] of windows) {
  same(W, H, p, { ...v, padKey: k, ...ex }, 'sweep');
}
// with a budget, and with the tiers and glasses a page keeps
for (const p of ['touch', 'pen']) for (const ex of extras) for (const [W, H] of windows) {
  same(W, H, p, { budget: { w: 443, h: 443, l: 896 }, ...ex }, 'budget');
  same(W, H, p, { prevTier: 'tablet', prevCellTier: 'phone', prevGlass: { kind: 'above', over: false }, prevCellGlass: { kind: 'between', over: false, whole: true }, ...ex }, 'kept');
}
// a grid of windows, 320-2600 by 300-1600 dp
for (let W = 320; W <= 2600; W += 40) for (let H = 300; H <= 1600; H += 40) for (const p of ['touch', 'pen']) {
  same(W, H, p, {}, 'grid');
  same(W, H, p, { dpr: 1.25, prevDesk: deskArr }, 'grid');
}
// every pointer but 'mouse' takes the touch path: a few others, as 'touch' and 'pen' above
const others = [undefined, null, '', 'x', 'Mouse', 'keyboard', 0];
for (const p of others) for (const ex of extras) for (const [W, H] of windows) same(W, H, p, { ...ex }, 'pointer');
// a pixel at a time across the touch rule's own steps: wherever the unchanged rule's
// arrangement (tier, glass, header, panels; the source's words) differs between two windows
// of the grid, every window between them (a step of a pixel slipped through the 40 dp grid)
const shape = (r) => (r && r.spec ? [r.usable, r.info && r.info.tier, r.info && r.info.G && r.info.G.kind, r.info && r.info.G && r.info.G.over,
  new Set(r.spec.bands.map((b) => b.y)).size, r.spec.bands.length, r.spec.chrome.map((c) => c.name).join(), r.spec.source.replace(/[0-9.]+/g, '#')].join('|') : 'none');
let fine = 0;
for (const p of ['touch', 'pen']) {
  const at = new Map();
  const shapeAt = (W, H) => { const k = `${W}x${H}`; if (!at.has(k)) { let r = null; try { r = base.layout(W, H, p, {}); } catch { r = null; } at.set(k, shape(r)); } return at.get(k); };
  const between = (a, b) => { for (let i = 1; i < 40; i++) { const [W, H] = [a[0] + (b[0] - a[0]) * i / 40, a[1] + (b[1] - a[1]) * i / 40]; fine++; same(W, H, p, {}, 'step'); same(W, H, p, { dpr: 1.5, prevDesk: deskArr }, 'step'); } };
  for (let H = 300; H <= 1600; H += 40) for (let W = 320; W + 40 <= 2600; W += 40) if (shapeAt(W, H) !== shapeAt(W + 40, H)) between([W, H], [W + 40, H]);
  for (let W = 320; W <= 2600; W += 40) for (let H = 300; H + 40 <= 1600; H += 40) if (shapeAt(W, H) !== shapeAt(W, H + 40)) between([W, H], [W, H + 40]);
}
// a seeded random set, nonsense included (sweep.mjs section 10's settings, and the desk's)
let s = 7;
const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (xs) => xs[Math.floor(r() * xs.length)];
const odd = [NaN, 0, -5, 1, 50, Infinity, '400', null, undefined];
for (let i = 0; i < 4000; i++) {
  const W = r() < 0.05 ? pick(odd) : Math.round(100 + r() * 4000), H = r() < 0.05 ? pick(odd) : Math.round(100 + r() * 2500);
  const st = { padKey: pick([46, 52, 58, 40, 70, NaN]), hand: pick(['left', 'right']), combatThumb: pick(['L', 'R']), cellAspect: pick([1, 0.5625, 0, NaN]), mapCell: pick(['columns', 'rows', 'x']),
    gripLift: pick([0, 20, 80, 500, -10]), avoidCutout: pick([0, 8, 30, 200]), insets: pick([undefined, { l: 47, r: 47 }, { t: 400 }, { l: NaN }]), anchor: pick(['auto', 'safe', 'physical']),
    text: pick([undefined, { msgFont: 'screen', msgSize: 1.4, textScale: 2 }, { msgSize: 'x' }]), budget: pick([null, { w: 443, h: 443, l: 896 }, { w: 2000, h: 50 }, { w: NaN }]), msgRows: pick([undefined, { landscape: 0, portrait: 9 }]),
    prevTier: pick([null, 'phone', 'tablet', 'desk', 7]), prevGlass: pick([null, { kind: 'between', over: true }, 'x']),
    dpr: pick([undefined, 1, 1.25, 1.5, 2, 2.4375, NaN, 0, -2, 1e9, '2']), prevDesk: pick([undefined, null, deskArr, { ...deskArr, Td: 1e9 }, 'x', 5, {}]) };
  same(W, H, pick(['touch', 'pen']), st, 'random');
}
console.log(`same: ${n - differ.length} touch and pen layouts identical, ${differ.length} differ (${((Date.now() - t0) / 1000).toFixed(0)} s; other pointers but 'mouse' included, and ${fine} windows a pixel apart across the touch rule's steps)`);
for (const d of differ.slice(0, 40)) console.log('  ' + d);
process.exit(differ.length ? 1 : 0);
