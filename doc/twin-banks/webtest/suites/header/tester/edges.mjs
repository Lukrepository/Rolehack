// The hero stays on screen while walking to every edge of a level, through
// the real game: a debug-mode game loads a des script (#wizloaddes) that
// makes the whole level -- columns 1 to 79, rows 0 to 20 -- lit floor, and the
// hero walks, one step per command, to the left edge, the top, the right
// edge, the bottom and back to the left edge.  After every step, from the
// canvas's own last frame (not the page's view state):
//   - the hero's outline is drawn at the cell the core's cursor is on;
//   - the hero's cell lies wholly inside the canvas, and a finger at its
//     centre and four inner corners reaches the canvas (no band, chip, lamp
//     or key over it);
//   - along each axis the level is centred where it fits and otherwise follows
//     the hero, kept to the level's edges (Lucas, 2026-09-27: web.js placeView);
// and once per window a drag moves the map along both axes (also one where
// the level fits) and the next step brings the view back to that rule.
// Windows: all eleven, both map cells, zoom factors 1 and 2.5.
//   node edges.mjs <dpr> [cell] [zoom]  -> edges-<dpr>-<cell>-<zoom>.json
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, ALL, WIZSTATE, writeJson, frameGrid } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const CELLS = process.argv[3] ? [process.argv[3]] : ['columns', 'rows'];
const ZOOMS = process.argv[4] ? [Number(process.argv[4])] : [1, 2.5];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const b = await launch();
const out = [];
let fails = 0;

const MAP = Array.from({ length: 21 }, () => '.'.repeat(79)).join('\n');
const DES = `des.level_init({ style = "solidfill", fg = " " });\ndes.level_flags("mazelevel", "noflip");\n`
  + `des.map({ x = 1, y = 0, lit = true, map = [[\n${MAP}\n]] });\n`;

const state = (p) => p.evaluate(() => ({ cw: globalThis.__T.commandWait, more: globalThis.__T.moreShown, cur: globalThis.__T.cursor,
  line: !!(document.getElementById('line') && document.getElementById('line').offsetParent), modal: !document.getElementById('modal').hidden }));

async function waitCmd(p, ms = 4000) {
  const t0 = Date.now();
  for (;;) {
    const s = await state(p);
    if (s.more) { await p.keyboard.press('Space'); await sleep(60); continue; }
    if (s.cw) return s;
    if (Date.now() - t0 > ms) return s;
    await sleep(25);
  }
}

// the frame's grid and the hero, checked against the rule
async function judge(p, label) {
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  const g = await frameGrid(p);
  const bad = [];
  if (!g) return { bad: [`${label}: no frame`], g };
  const cur = await p.evaluate(() => globalThis.__T.cursor);
  if (g.hx !== cur.x || g.hy !== cur.y) bad.push(`${label}: hero outlined at ${g.hx},${g.hy}, cursor at ${cur.x},${cur.y}`);
  const Td = g.Td, x0 = g.L + cur.x * Td, y0 = g.Tp + cur.y * Td;
  if (x0 < -0.01 || y0 < -0.01 || x0 + Td > g.cw + 0.01 || y0 + Td > g.ch + 0.01) bad.push(`${label}: hero cell ${x0},${y0} +${Td} outside the ${g.cw}x${g.ch} canvas`);
  // what a finger reaches at the hero
  const pts = [[0.5, 0.5], [0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]].map(([fx, fy]) => [g.canvas.x + (x0 + Td * fx) / g.dpr, g.canvas.y + (y0 + Td * fy) / g.dpr]);
  const cover = await p.evaluate((pts) => pts.map(([x, y]) => { const e = document.elementFromPoint(x, y); return e && e.id === 'map' ? null : e ? (e.id || e.className || e.tagName) : 'nothing'; }), pts);
  cover.forEach((c, i) => { if (c) bad.push(`${label}: hero point ${i} covered by ${c}`); });
  // the view rule, each axis, in device px (1 px of rounding allowed)
  for (const [ax, start, len, avail, at] of [['x', g.L, 80 * Td, g.cw, cur.x], ['y', g.Tp, 21 * Td, g.ch, cur.y]]) {
    if (len <= avail + 0.01) {
      const want = (avail - len) / 2;
      if (Math.abs(start - want) > 1.01) bad.push(`${label}: level fits along ${ax} (${len} in ${avail}) but starts at ${start}, centred is ${want}`);
    } else {
      const want = Math.min(0, Math.max(avail - len, avail / 2 - (at + 0.5) * Td));
      if (Math.abs(start - want) > 1.51) bad.push(`${label}: along ${ax} the level starts at ${start}, the rule gives ${want.toFixed(1)} (hero ${at})`);
      if (start > 1.01 || start + len < avail - 1.01) bad.push(`${label}: along ${ax} the level (${start}..${start + len}) leaves the canvas (${avail}) uncovered while it does not fit`);
    }
  }
  return { bad, g, cur };
}

const KEY = { h: 104, j: 106, k: 107, l: 108 };
async function step(p, d) {
  const before = (await state(p)).cur;
  await p.evaluate((k) => globalThis.__T.key(k), KEY[d]);
  const t0 = Date.now();
  for (;;) {
    const s = await state(p);
    if (s.more) { await p.keyboard.press('Space'); await sleep(40); continue; }
    if (s.cw && (s.cur.x !== before.x || s.cur.y !== before.y)) return { moved: true, s };
    if (s.cw && Date.now() - t0 > 400) return { moved: false, s };
    if (Date.now() - t0 > 4000) return { moved: false, s };
    await sleep(20);
  }
}

for (const cell of CELLS) for (const zoom of ZOOMS) for (const [w, h] of ALL) {
  if (ONLY && !ONLY.includes(`${w}x${h}`)) continue;
  const name = `edges-${DPR}-${cell}-z${zoom}-${w}x${h}`;
  const ctx = await newCtx(b, { w, h, dpr: DPR, state: WIZSTATE, wiz: true,
    prefs: { mapCell: cell, zoomFactor: zoom, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  const T = await touch(ctx, p);
  await T.rotate(w, h, DPR);
  await resume(p, 'wizard');
  const bad = [];
  // the whole level, lit floor
  await p.evaluate((src) => globalThis.__T.M.FS.writeFile('/edge.lua', src), DES);
  await p.evaluate(() => globalThis.__T.send('#wizloaddes\n'));
  for (let i = 0; i < 40 && !(await state(p)).line; i++) await sleep(50);
  await p.fill('#line', '/edge.lua'); await p.press('#line', 'Enter');
  await waitCmd(p);
  await p.evaluate(() => globalThis.__T.send('^R'));   // redraw
  await waitCmd(p);
  await sleep(200);
  const floor = await p.evaluate(() => { const g = globalThis.__T.grid; let n = 0; for (const r of g) for (const c of r) if (c.tile >= 0 || c.ch !== 32) n++; return n; });
  if (floor < 1500) bad.push(`the level shows only ${floor} cells after the des script`);
  // a drag moves the map along both axes; the next step snaps it back
  const g0 = await frameGrid(p);
  const cx = g0.canvas.x + g0.canvas.w / 2, cy = g0.canvas.y + g0.canvas.h / 2;
  await T.down([[cx, cy]]);
  for (let i = 1; i <= 8; i++) { await T.move([[cx - (60 * i) / 8, cy - (40 * i) / 8]]); await sleep(16); }
  await T.up();
  await sleep(150);
  const g1 = await frameGrid(p);
  const dx = (g1.L - g0.L) / DPR, dy = (g1.Tp - g0.Tp) / DPR;
  if (Math.abs(dx + 60) > 2 || Math.abs(dy + 40) > 2) bad.push(`a drag of (-60,-40) moved the map by (${dx.toFixed(1)},${dy.toFixed(1)})`);
  const route = [['x', 1], ['y', 0], ['x', 79], ['y', 20], ['x', 1], ['y', 10]];
  let steps = 0, firstAfterDrag = true, reached = [];
  const shots = {};
  for (const [ax, goal] of route) {
    let blocked = 0;
    for (let guard = 0; guard < 140; guard++) {
      const cur = (await state(p)).cur;
      if (cur[ax] === goal) break;
      const d = ax === 'x' ? (goal < cur.x ? 'h' : 'l') : (goal < cur.y ? 'k' : 'j');
      let r = await step(p, d);
      // a monster in the way: fight it a few times, then step round it
      if (!r.moved && ++blocked < 10) continue;
      if (!r.moved) { r = await step(p, ax === 'x' ? (cur.y < 10 ? 'j' : 'k') : (cur.x < 40 ? 'l' : 'h')); blocked = 0; }
      steps++;
      if (!r.moved) { bad.push(`stuck at ${cur.x},${cur.y} going ${d}`); break; }
      const j = await judge(p, `${d} to ${r.s.cur.x},${r.s.cur.y}${firstAfterDrag ? ' (after the drag)' : ''}`);
      firstAfterDrag = false;
      bad.push(...j.bad);
    }
    const cur = (await state(p)).cur;
    reached.push(`${cur.x},${cur.y}`);
    const corner = `${cur.x},${cur.y}`;
    if (['1,0', '79,0', '79,20', '1,20'].includes(corner) && !shots[corner]) {
      shots[corner] = `${SHOTS}/${name}-at-${cur.x}-${cur.y}.png`;
      await T.shot(shots[corner]);
    }
  }
  const errs = p.errors.splice(0);
  bad.push(...errs.map((x) => `console: ${x}`));
  fails += bad.length;
  out.push({ name, w, h, dpr: DPR, cell, zoom, steps, reached, bad, shots, cell0: g0 && g0.Td });
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${name} Td=${g0 && g0.Td} steps=${steps} reached ${reached.join(' > ')}${bad.length ? `\n     ${bad.slice(0, 10).join('\n     ')}${bad.length > 10 ? `\n     ... ${bad.length - 10} more` : ''}` : ''}`);
  await ctx.close();
}
writeJson(`edges-${DPR}-${CELLS.join('+')}-${ZOOMS.join('+')}.json`, out);
console.log(`${fails} failures in ${out.length} windows`);
await b.close();
