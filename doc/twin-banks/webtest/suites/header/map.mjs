// The map: one cell per device, the view, the drag, the pinch and the overview.
//  1. rotation: a phone opened in landscape, turned to portrait and back (window
//     and screen swap) keeps its drawn cell, at zoom 1 and after a pinch;
//  2. the view: the hero at every cell of the level's edge (and a grid inside)
//     is drawn whole inside the map; an axis where the level fits is centred at
//     rest, one where it does not is kept to the level's edges;
//  3. a real walk: the hero rushes to the walls of its room each way and stays
//     on screen;
//  4. the drag: along an axis the level fits, a drag still moves the map as far
//     as the finger goes, and the hero's next step puts it back (Lucas,
//     2026-09-27);
//  5. the pinch: two fingers spreading zoom live, write zoomFactor only on the
//     lift (never classic's zoom), and the drawn cell is the device cell times
//     the factor, floored to device pixels;
//  6. the overview: two fingers held still for 250 ms show the whole level
//     fitted to the map area until they lift; a spread change first makes it a
//     pinch; fingers sliding together are neither;
//  7. classic: the pinch zooms from the first move, writes zoom, and has no
//     overview.
// Real touches through CDP throughout.
//   node map.mjs [dpr]   -> map-<dpr>.json, shots/map-<dpr>-*.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, writeJson, PHONES, BIG } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const only = process.env.ONLY;
const b = await launch();
const out = [];
let fails = 0;
const say = (tag, bad, extra = '') => { fails += bad.length; console.log(`${tag} @${DPR}: ${bad.length ? `BAD ${bad.length}: ${bad.slice(0, 6).join(' | ')}` : 'ok'}${extra ? ` (${extra})` : ''}`); };

const viewOf = (p) => p.evaluate(() => {
  const R = globalThis.__bt, cv = document.getElementById('map').getBoundingClientRect();
  return { T: R.view.T, left: R.view.left, top: R.view.top, panX: R.view.panX, panY: R.view.panY, area: { ...R.view.area }, cv: { x: cv.x, y: cv.y, w: cv.width, h: cv.height },
    cell: R.geom && R.geom.cell, overview: R.overview, cursor: { ...R.cursor }, zf: localStorage.getItem('rh.zoomFactor'), zoom: localStorage.getItem('rh.zoom'),
    twin: !!(R.geom && R.geom.twin) };
});
const drawn = (T, dpr, least = 4) => Math.max(least, Math.floor(T * dpr + 1e-6)) / dpr;

// 2. the hero at every edge cell, and a grid inside
async function edges(p) {
  return p.evaluate(() => {
    const R = globalThis.__bt, bad = [];
    const cells = [];
    for (let x = 0; x < 80; x++) cells.push([x, 0], [x, 20]);
    for (let y = 1; y < 20; y++) cells.push([0, y], [79, y]);
    for (let x = 5; x < 80; x += 10) for (let y = 3; y < 21; y += 5) cells.push([x, y]);
    let first = null;
    for (const [x, y] of cells) {
      const v = R.viewAt(x, y), a = v.area, T = v.T;
      const hx = v.left + x * T, hy = v.top + y * T;
      if (hx < a.x - 0.01 || hy < a.y - 0.01 || hx + T > a.x + a.w + 0.01 || hy + T > a.y + a.h + 0.01) bad.push(`hero at (${x},${y}) drawn at ${hx.toFixed(1)},${hy.toFixed(1)} outside ${a.w.toFixed(1)}x${a.h.toFixed(1)}`);
      const fitsX = 80 * T <= a.w + 1e-6, fitsY = 21 * T <= a.h + 1e-6;
      const dpr = devicePixelRatio, near = (u, w) => Math.abs(u - w) <= 1 / dpr + 1e-6;
      if (fitsX && !near(v.left, a.x + (a.w - 80 * T) / 2)) bad.push(`(${x},${y}) the level fits across but is not centred: left ${v.left}`);
      if (fitsY && !near(v.top, a.y + (a.h - 21 * T) / 2)) bad.push(`(${x},${y}) the level fits down but is not centred: top ${v.top}`);
      if (!fitsX && (v.left > a.x + 1e-6 || v.left + 80 * T < a.x + a.w - 1e-6)) bad.push(`(${x},${y}) past the level's edge across: left ${v.left}`);
      if (!fitsY && (v.top > a.y + 1e-6 || v.top + 21 * T < a.y + a.h - 1e-6)) bad.push(`(${x},${y}) past the level's edge down: top ${v.top}`);
      if (!first) first = { T, fitsX, fitsY };
    }
    return { bad: bad.slice(0, 10), n: cells.length, ...first };
  });
}

// 3. a real walk: rush to the room's walls each way
async function walk(p) {
  const bad = [], path = [];
  for (const key of ['Shift+KeyL', 'Shift+KeyJ', 'Shift+KeyH', 'Shift+KeyK', 'Shift+KeyL']) {
    await p.keyboard.press(key);
    await sleep(900);
    const v = await viewOf(p);
    const hx = v.left + v.cursor.x * v.T, hy = v.top + v.cursor.y * v.T;
    path.push(`${key.slice(-1)}(${v.cursor.x},${v.cursor.y})`);
    if (hx < -0.01 || hy < -0.01 || hx + v.T > v.area.w + 0.01 || hy + v.T > v.area.h + 0.01) bad.push(`after ${key} the hero at (${v.cursor.x},${v.cursor.y}) is off the map`);
    if (await p.evaluate(() => globalThis.__bt.moreShown)) { await p.keyboard.press('Space'); await sleep(300); }
  }
  return { bad, path: path.join(' ') };
}

// 4. the drag along an axis the level fits; the next step snaps it back
async function drag(p, k) {
  const v0 = await viewOf(p), bad = [];
  const fitsY = 21 * v0.T <= v0.area.h + 1e-6, fitsX = 80 * v0.T <= v0.area.w + 1e-6;
  const cx = v0.cv.x + v0.cv.w / 2, cy = v0.cv.y + v0.cv.h / 2;
  const dy = fitsY ? 50 : 30, dx = fitsX ? 50 : 30;
  await k.drag(cx, cy, dx, dy, 10);
  const v1 = await viewOf(p);
  if (Math.abs(v1.top - v0.top - dy) > 1 / DPR + 0.01) bad.push(`a ${dy} px drag down moved the map ${(v1.top - v0.top).toFixed(2)} (the level ${fitsY ? 'fits' : 'does not fit'} down)`);
  if (Math.abs(v1.left - v0.left - dx) > 1 / DPR + 0.01) bad.push(`a ${dx} px drag across moved the map ${(v1.left - v0.left).toFixed(2)} (the level ${fitsX ? 'fits' : 'does not fit'} across)`);
  // the hero steps (a live game: a wall, a monster or a --More-- may take a
  // key, so step until the hero has moved): the view is at rest again
  for (const key of ['h', 'l', 'k', 'j', 'h', 'l', 'k', 'j']) {
    await p.keyboard.press(key);
    await sleep(600);
    // a --More--, or a question (a pet in the way, a peaceful to attack): out of it
    for (let n = 0; n < 6; n++) {
      const w = await p.evaluate(() => ({ more: globalThis.__bt.moreShown, ask: globalThis.__bt.page.some((e) => e.ask), modal: globalThis.__bt.modalOpen }));
      if (w.more) await p.keyboard.press('Space'); else if (w.ask || w.modal) await p.keyboard.press('Escape'); else break;
      await sleep(300);
    }
    const c = (await viewOf(p)).cursor;
    if (c.x !== v0.cursor.x || c.y !== v0.cursor.y) break;
  }
  const v3 = await viewOf(p);
  if (v3.cursor.x === v0.cursor.x && v3.cursor.y === v0.cursor.y) bad.push('the hero never stepped');
  if (v3.panX || v3.panY) bad.push(`the pan stayed after the hero moved: ${v3.panX},${v3.panY}`);
  if (fitsY && Math.abs(v3.top - (v3.area.h - 21 * v3.T) / 2) > 1 / DPR + 0.01) bad.push(`not centred down again at rest: top ${v3.top}`);
  return { bad, fitsX, fitsY, moved: [v1.left - v0.left, v1.top - v0.top] };
}

// 5-7. two fingers
async function two(p, k, mode) {
  const bad = [], notes = [];
  const v0 = await viewOf(p);
  const cx = v0.cv.x + v0.cv.w / 2, cy = v0.cv.y + v0.cv.h / 2;
  const at = (s, oy = 0) => [[cx - s, cy + oy], [cx + s, cy + oy]];
  if (mode === 'pinch') {
    await k.down(at(30));
    const steps = [];
    for (let i = 1; i <= 10; i++) { await k.move(at(30 + 3 * i)); await sleep(16); }
    const vm = await viewOf(p);
    steps.push(vm.T);
    if (v0.twin && vm.zf !== v0.zf) bad.push(`zoomFactor written during the pinch: ${vm.zf}`);
    if (!(vm.T > v0.T)) bad.push(`the cell did not grow during the pinch: ${v0.T} -> ${vm.T}`);
    if (vm.overview) bad.push('a pinch became the overview');
    await k.up();
    await sleep(200);
    const v1 = await viewOf(p);
    if (v0.twin) {
      // the pinch grows the cell as drawn: twice it, as a factor of the device cell
      const f = Number(v1.zf), want = (2 * v0.T) / v0.cell;
      if (!(Math.abs(f - want) < 0.01)) bad.push(`zoomFactor after a 60 -> 120 px pinch: ${v1.zf}, not ${want.toFixed(3)}`);
      if (v1.zoom !== v0.zoom) bad.push(`twin's pinch wrote classic's zoom: ${v0.zoom} -> ${v1.zoom}`);
      if (Math.abs(v1.T - drawn(v1.cell * f, DPR)) > 1e-6) bad.push(`drawn cell ${v1.T} vs floor(cell x factor) ${drawn(v1.cell * f, DPR)}`);
    } else {
      if (!(Number(v1.zoom) > 0)) bad.push(`classic's pinch wrote no zoom: ${v1.zoom}`);
      if (v1.zf !== v0.zf) bad.push(`classic's pinch wrote zoomFactor: ${v1.zf}`);
    }
    notes.push(`T ${v0.T.toFixed(3)} -> ${v1.T.toFixed(3)}, zoomFactor ${v1.zf}, zoom ${v1.zoom}`);
    return { bad, notes, T0: v0.T, T1: v1.T };
  }
  if (mode === 'still') {
    // classic: a pinch from the first move, so keep them still; twin: the overview
    await k.down(at(40));
    await sleep(150);
    const early = await viewOf(p);
    await sleep(250);
    const vo = await viewOf(p);
    await k.shot(`${SHOTS}/map-${DPR}-overview-${Math.round(v0.area.w)}x${Math.round(v0.area.h)}-${v0.twin ? 'twin' : 'classic'}.png`);
    // a finger may wobble a little and lift one at a time: still the overview until both lift
    await k.move([[cx - 43, cy + 2], [cx + 38, cy - 3]]);
    await sleep(50);
    const wob = await viewOf(p);
    await k.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: cx + 38, y: cy - 3, id: 1 }] });
    await sleep(60);
    const one = await viewOf(p);
    await k.up();
    await sleep(150);
    const v1 = await viewOf(p);
    if (v0.twin) {
      const want = drawn(Math.min(v0.area.w / 80, v0.area.h / 21), DPR, 1);
      if (early.overview) bad.push('the overview came before 250 ms');
      if (!vo.overview) bad.push('two still fingers did not show the overview');
      if (Math.abs(vo.T - want) > 1e-6) bad.push(`overview cell ${vo.T} vs the whole level fitted ${want}`);
      if (vo.left < -0.01 || vo.top < -0.01 || vo.left + 80 * vo.T > vo.area.w + 0.01 || vo.top + 21 * vo.T > vo.area.h + 0.01) bad.push(`the overview's level ${vo.left},${vo.top} ${80 * vo.T}x${21 * vo.T} is not inside the map ${vo.area.w}x${vo.area.h}`);
      if (!wob.overview || wob.T !== vo.T) bad.push('a wobble ended the overview');
      if (!one.overview) bad.push('the overview ended when the first finger lifted');
      if (v1.overview) bad.push('the overview stayed after the lift');
      if (v1.zf !== v0.zf) bad.push(`the overview wrote zoomFactor ${v1.zf}`);
      notes.push(`overview cell ${vo.T.toFixed(3)} (level ${(80 * vo.T).toFixed(1)}x${(21 * vo.T).toFixed(1)} in ${vo.area.w.toFixed(1)}x${vo.area.h.toFixed(1)})`);
    } else {
      if (vo.overview || vo.T !== v0.T) bad.push(`classic: two still fingers changed the map (overview ${vo.overview}, T ${v0.T} -> ${vo.T})`);
    }
    if (Math.abs(v1.T - v0.T) > 1e-6) bad.push(`the cell after the lift ${v1.T} vs before ${v0.T}`);
    if (v1.panX !== v0.panX || v1.panY !== v0.panY) bad.push('two fingers panned the map');
    return { bad, notes };
  }
  if (mode === 'spread') {
    // a quick spread before 250 ms: a pinch, never the overview
    await k.down(at(40));
    for (let i = 1; i <= 4; i++) { await k.move(at(40 + 4 * i)); await sleep(20); }
    await sleep(400);
    const vm = await viewOf(p);
    await k.up();
    await sleep(150);
    if (vm.overview) bad.push('a spread of 32 px became the overview');
    if (!(vm.T > v0.T)) bad.push('a spread of 32 px did not zoom');
    return { bad, notes: [`T ${v0.T.toFixed(3)} -> ${vm.T.toFixed(3)}`] };
  }
  if (mode === 'slide') {
    // both fingers slide together 40 px: no spread change, so neither
    await k.down(at(40));
    for (let i = 1; i <= 8; i++) { await k.move(at(40, 5 * i)); await sleep(20); }
    await sleep(400);
    const vm = await viewOf(p);
    await k.up();
    await sleep(150);
    const v1 = await viewOf(p);
    if (vm.overview) bad.push('fingers that slid became the overview');
    if (Math.abs(vm.T - v0.T) > 1e-6) bad.push(`fingers that slid zoomed: ${v0.T} -> ${vm.T}`);
    if (v1.panX !== v0.panX || v1.panY !== v0.panY) bad.push(`fingers that slid panned: ${v1.panX},${v1.panY}`);
    return { bad, notes };
  }
  if (mode === 'twitch') {
    // classic: a 6 px spread already zooms (no threshold)
    await k.down(at(40));
    for (let i = 1; i <= 3; i++) { await k.move(at(40 + i)); await sleep(20); }
    const vm = await viewOf(p);
    await k.up();
    await sleep(150);
    if (!v0.twin && vm.T === v0.T && Number(vm.zoom) === Number(v0.zoom)) bad.push('classic: a 6 px spread did not zoom');
    if (v0.twin && Math.abs(vm.T - v0.T) > 1e-6) bad.push(`twin: a 6 px spread zoomed (${v0.T} -> ${vm.T})`);
    return { bad, notes };
  }
}

const fresh = async (w, h, prefs, screen) => {
  const ctx = await newCtx(b, { w, h, dpr: DPR, screen: screen && { width: screen[0], height: screen[1] }, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null }, ...prefs } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(400);
  return { ctx, p, k: await touch(ctx, p) };
};

// 1. rotation keeps the glyph size
for (const pr of PHONES) {
  if (only && !`rotate-${pr.tag}`.startsWith(only)) continue;
  for (const zf of [1, 1.5]) {
    const scrL = [pr.scr[1], pr.scr[0]];
    const { ctx, p, k } = await fresh(pr.L[0], pr.L[1], { zoomFactor: zf }, scrL);
    const Ts = [], cells = [];
    for (const [i, o] of ['L', 'P', 'L'].entries()) {
      const [W, H] = pr[o];
      if (i) await k.rotate(W, H, DPR, o === 'P' ? pr.scr : scrL);
      const v = await viewOf(p);
      Ts.push(v.T); cells.push(v.cell);
      if (zf === 1) await k.shot(`${SHOTS}/map-${DPR}-rotate-${pr.tag}-${i}-${W}x${H}.png`);
    }
    const bad = [];
    if (new Set(Ts.map((t) => t.toFixed(6))).size !== 1) bad.push(`drawn cells ${Ts.map((t) => t.toFixed(3)).join(' / ')}`);
    if (new Set(cells.map((t) => t.toFixed(6))).size !== 1) bad.push(`device cells ${cells.map((t) => t.toFixed(3)).join(' / ')}`);
    if (Math.abs(Ts[0] - drawn(cells[0] * zf, DPR)) > 1e-6) bad.push(`drawn ${Ts[0]} vs floor(cell x ${zf})`);
    if (p.errors.length) bad.push(`console: ${p.errors.join(' | ')}`);
    say(`rotate ${pr.tag} zoom ${zf}`, bad, `cell ${cells[0].toFixed(2)} drawn ${Ts.map((t) => t.toFixed(3)).join(' / ')}`);
    out.push({ test: 'rotate', tag: pr.tag, zf, Ts, cells, bad });
    await ctx.close();
  }
}

// 2-7 at every window
const WINS = [];
for (const pr of PHONES) for (const o of ['L', 'P']) WINS.push({ tag: `${pr.tag}-${o}`, w: pr[o][0], h: pr[o][1] });
for (const [w, h] of BIG) WINS.push({ tag: `${w}x${h}`, w, h });
for (const wn of WINS) {
  if (only && !wn.tag.startsWith(only)) continue;
  for (const layout of ['twin', 'classic']) {
    if (layout === 'classic' && !/^lucas|^1024/.test(wn.tag)) continue;
    const prefs = layout === 'classic' ? { layout: 'classic' } : {};
    let s = await fresh(wn.w, wn.h, prefs);
    const res = { tag: wn.tag, layout };
    const all = [];
    if (layout === 'twin') {
      for (const zf of [1, 2.5]) {
        if (zf !== 1) { await s.ctx.close(); s = await fresh(wn.w, wn.h, { zoomFactor: zf }); }
        const e = await edges(s.p);
        res[`edges${zf}`] = e;
        all.push(...e.bad.map((x) => `zoom ${zf}: ${x}`));
      }
      await s.ctx.close(); s = await fresh(wn.w, wn.h, {});
      const wk = await walk(s.p);
      res.walk = wk; all.push(...wk.bad);
      await s.ctx.close(); s = await fresh(wn.w, wn.h, {});
      const dg = await drag(s.p, s.k);
      res.drag = dg; all.push(...dg.bad);
    }
    for (const mode of layout === 'twin' ? ['pinch', 'still', 'spread', 'slide', 'twitch'] : ['pinch', 'still', 'twitch']) {
      await s.ctx.close(); s = await fresh(wn.w, wn.h, prefs);
      const r = await two(s.p, s.k, mode);
      res[mode] = r; all.push(...r.bad.map((x) => `${mode}: ${x}`));
      if (s.p.errors.length) all.push(`console: ${s.p.errors.join(' | ')}`);
    }
    await s.ctx.close();
    res.bad = all;
    say(`${layout} ${wn.tag}`, all, layout === 'twin' ? `edges ${res.edges1.n} cells, T ${res.edges1.T.toFixed(3)} fits ${res.edges1.fitsX ? 'across' : ''}${res.edges1.fitsY ? ' down' : ''}; walk ${res.walk.path}; ${res.pinch.notes.join('')}; ${res.still.notes.join('')}` : res.pinch.notes.join(''));
    out.push(res);
  }
}
writeJson(`map-${DPR}.json`, out);
console.log(fails ? `FAILURES: ${fails}` : 'ALL PASS');
await b.close();
