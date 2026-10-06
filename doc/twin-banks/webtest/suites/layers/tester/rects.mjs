// Every key's DOM rect against layout()'s output, at the four windows.
//   node rects.mjs <dpr>
// 1. layout() run in node (win/web/layout.js) with the page's own inputs
//    gives the same spec the page drew from (overlay.twin.spec);
// 2. each control's keycap as drawn (.kcap) is the spec's rect;
// 3. each key element's box (its hit cell) holds its keycap, the cells of a
//    bank do not overlap, and every point of a cell resolves to that key in
//    the design's hit model (checks/lib.mjs hitModel), seams aside;
// 4. the spec's pop-ups (flick legend, pill) are where the page draws them
//    once shown; the map canvas is the spec's mapArea.
import { launch, newCtx, openPage, resume, toucher, SIZES, SHOTS, writeJson, Checks, sleep, SP } from './common.mjs';
import { layout } from '/home/user/Rolehack/win/web/layout.js';
const { hitModel } = await import(`${SP}/design/v2/checks/lib.mjs`);

const dpr = Number(process.argv[2] || 1);
const b = await launch();
const all = [];
const report = {};
for (const [W, H] of SIZES) {
  const C = new Checks(`rects ${dpr} ${W}x${H}`);
  const ctx = await newCtx(b, { w: W, h: H, dpr, prefs: { ghostDeck: { on: false, clean: 3, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(400);
  const got = await p.evaluate(() => {
    const o = globalThis.__tt.overlay, T = o.twin;
    const r2 = (r) => ({ x: r.x, y: r.y, w: r.width, h: r.height });
    const keys = {};
    for (const c of T.spec.controls) {
      if (c.behind) continue;
      const el = o.twinEl(c.id);
      const cap = o.twinCapRect(c.id);
      keys[c.id] = { cap: cap ? r2(cap) : null, box: el ? r2(el.getBoundingClientRect()) : null, tag: el ? el.tagName + '.' + el.className : null };
    }
    const cv = document.getElementById('map').getBoundingClientRect();
    return { W: T.W, H: T.H, pointer: T.pointer, settings: T.settings, spec: T.spec, keys, ui: document.documentElement.dataset.ui, canvas: r2(cv) };
  });
  C.ok('twin layout on', got.ui === 'twin', got.ui);
  // 1. node's layout() with the same inputs
  const r = layout(got.W, got.H, got.pointer, got.settings);
  C.ok('layout() usable', r.usable === true, r.reason);
  const same = JSON.stringify(r.spec.controls) === JSON.stringify(got.spec.controls);
  C.ok('node layout() controls == page spec controls', same);
  C.ok('node layout() mapArea == page spec mapArea', JSON.stringify(r.spec.mapArea) === JSON.stringify(got.spec.mapArea), [r.spec.mapArea, got.spec.mapArea]);
  // 2. keycaps
  const S = r.spec;
  const tol = 0.02;
  const devs = [];
  for (const c of S.controls) {
    if (c.behind) continue;
    const k = got.keys[c.id];
    if (!k || !k.cap) { C.ok(`${c.id} drawn`, false, 'no element'); continue; }
    const d = Math.max(Math.abs(k.cap.x - c.x), Math.abs(k.cap.y - c.y), Math.abs(k.cap.w - c.w), Math.abs(k.cap.h - c.h));
    devs.push({ id: c.id, d });
    C.ok(`${c.id} keycap == layout rect`, d <= tol, d > tol ? { dom: k.cap, spec: { x: c.x, y: c.y, w: c.w, h: c.h }, d } : '');
    // 3. the cell holds the keycap
    const bx = k.box, cp = k.cap;
    C.ok(`${c.id} cell holds keycap`, bx.x <= cp.x + tol && bx.y <= cp.y + tol && bx.x + bx.w >= cp.x + cp.w - tol && bx.y + bx.h >= cp.y + cp.h - tol, { box: bx, cap: cp });
    C.ok(`${c.id} cell inside the window`, bx.x >= -tol && bx.y >= -tol && bx.x + bx.w <= W + tol && bx.y + bx.h <= H + tol, bx);
  }
  // cells must not overlap
  const ids = Object.keys(got.keys);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = got.keys[ids[i]].box, c = got.keys[ids[j]].box;
    if (!a || !c) continue;
    const ov = a.x + 0.05 < c.x + c.w && c.x + 0.05 < a.x + a.w && a.y + 0.05 < c.y + c.h && c.y + 0.05 < a.y + a.h;
    if (ov) C.ok(`cells ${ids[i]} / ${ids[j]} do not overlap`, false, { a, c });
  }
  // every point of a cell (on a 2 px grid) resolves to its key in the model, except seams
  const hm = hitModel(S);
  let bad = 0, n = 0;
  const samples = [];
  for (const id of ids) {
    const bx = got.keys[id].box;
    for (let y = bx.y + 0.5; y < bx.y + bx.h; y += 2) for (let x = bx.x + 0.5; x < bx.x + bx.w; x += 2) {
      const e = hm(x, y);
      n++;
      if (e === id || e === 'swallowed') continue;
      bad++;
      if (samples.length < 12) samples.push({ id, x, y, model: e });
    }
  }
  C.ok('cells agree with the design hit model', bad === 0, bad ? { bad, n, samples } : `${n} points`);
  // 4. map canvas and mapArea
  const m = S.mapArea, cv = got.canvas;
  C.ok('map canvas inside mapArea', cv.x >= m.x - 0.5 && cv.y >= m.y - 0.5 && cv.x + cv.w <= m.x + m.w + 0.5 && cv.y + cv.h <= m.y + m.h + 0.5, { canvas: cv, mapArea: m });
  // flick legend vs spec popups (hold FLICK to show it)
  const t = await toucher(ctx, p);
  const fl = S.controls.find((c) => c.id === 'flick');
  await t.start(fl.x + fl.w / 2, fl.y + fl.h / 2);
  await sleep(500);
  const leg = await p.evaluate(() => {
    const o = globalThis.__tt.overlay;
    return { open: o.radialOpen, nodes: (o.flickNodes || []).map((n) => { const r = (n.capEl || n.el).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, tag: n.el.querySelector('.tag, .tg') ? n.el.innerText : n.el.innerText }; }) };
  });
  await t.end();
  await sleep(200);
  const specLeg = S.popups.filter((q) => q.owner === 'flick');
  C.ok('flick legend shown while FLICK held', leg.open === 'flick', leg.open);
  C.ok('flick legend has two nodes', leg.nodes.length === 2 && specLeg.length === 2, { page: leg.nodes.length, spec: specLeg.length });
  for (let i = 0; i < Math.min(leg.nodes.length, specLeg.length); i++) {
    const a = leg.nodes[i], q = specLeg[i];
    const d = Math.max(Math.abs(a.x - q.x), Math.abs(a.y - q.y), Math.abs(a.w - q.w), Math.abs(a.h - q.h));
    C.ok(`flick legend node ${i} at spec popup`, d <= 0.5, { page: a, spec: q });
  }
  await p.screenshot({ path: `${SHOTS}/rects-${dpr}-${W}x${H}.png` });
  C.ok('console clean', p.errors.length === 0, p.errors);
  report[`${W}x${H}`] = { maxKeycapDev: Math.max(...devs.map((d) => d.d)), cellsChecked: n, cellBad: bad };
  all.push(...C.list);
  await ctx.close();
}
await b.close();
writeJson(`rects-${dpr}.json`, { report, checks: all });
const f = all.filter((c) => !c.pass);
console.log(JSON.stringify(report));
console.log(`rects ${dpr}: ${all.length - f.length}/${all.length} pass`);
