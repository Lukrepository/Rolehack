// Tap the drawn centre of map cells in the first, middle and last columns and
// rows, at several devicePixelRatios, and check that the click web.js pushes to
// the core names the cell drawn there.  The drawn grid is read from the canvas
// draw calls of the last frame (common.mjs CANVAS_SPY): the level's border
// strokeRect(L - 3, Tp - 3, 80 Td + 6, 21 Td + 6) gives the grid's origin and
// pitch in canvas pixels, independently of web.js's tap maths.  A cell off the
// map area is first brought to its centre with a drag (the map pans freely,
// Lucas 2026-09-27); clicks are swallowed (recorded, not delivered) so the hero
// stays put and the pan holds.
//   node taps.mjs [label]   -> taps-<label>.json, shots/<label>-*.png
import fs from 'node:fs';
import { launch, ctxOptions, hookRoutes, URL, OUT, STATE, sleep, resumeGame } from './common.mjs';

const LABEL = (process.argv[2] || 'run') + (process.env.CASELESS ? '-caseless' : '');
const DPRS = [1, 1.25, 1.625, 2.4375];
const CONFIGS = [];
for (const dpr of DPRS) {
  CONFIGS.push({ W: 896, H: 443, input: 'touch', dpr, zoom: 0 });
  CONFIGS.push({ W: 443, H: 939, input: 'touch', dpr, zoom: 0 });
  CONFIGS.push({ W: 896, H: 443, input: 'touch', dpr, zoom: 13.37 });   // a pinched, fractional cell
}
CONFIGS.push({ W: 443, H: 939, input: 'touch', dpr: 2.4375, zoom: 0, mapMode: 'text' });
CONFIGS.push({ W: 1366, H: 768, input: 'mouse', dpr: 1.25, zoom: 0 });
CONFIGS.push({ W: 1366, H: 768, input: 'mouse', dpr: 1.5, zoom: 0 });
const only = process.env.ONLY;            // e.g. ONLY=896x443@2.4375
const COLS = [0, 1, 39, 40, 78, 79], ROWS = [0, 10, 20];
const OFFS = [[0, 0], [-0.4, -0.4], [0.4, 0.4], [-0.4, 0.4], [0.4, -0.4]];   // the centre, then near the corners

const b = await launch();
const all = [];
for (const cf of CONFIGS) {
  const tag = `${cf.W}x${cf.H}@${cf.dpr}${cf.zoom ? `-z${cf.zoom}` : ''}${cf.mapMode ? `-${cf.mapMode}` : ''}${cf.input === 'mouse' ? '-mouse' : ''}`;
  if (only && !tag.startsWith(only)) continue;
  const ctx = await b.newContext({ ...ctxOptions(cf.W, cf.H, cf.input, { deviceScaleFactor: cf.dpr }), storageState: STATE });
  await hookRoutes(ctx);
  await ctx.addInitScript(([z, mm, cl]) => {
    try { localStorage.setItem('rh.zoom', JSON.stringify(z)); if (mm) localStorage.setItem('rh.mapMode', JSON.stringify(mm)); } catch (e) { /* none */ }
    if (cl) try { localStorage.setItem('rh.case', 'false'); } catch (e) { /* none */ }
  }, [cf.zoom, cf.mapMode || null, !!process.env.CASELESS]);
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await p.goto(URL);
  await p.waitForFunction(() => globalThis.__rh && !document.getElementById('boot'), null, { timeout: 60000 });
  await resumeGame(p);
  await sleep(500);
  await p.evaluate(() => { globalThis.__swallowClicks = true; globalThis.__clicks = []; });
  const cdp = await ctx.newCDPSession(p);

  const read = () => p.evaluate(() => {
    const f = globalThis.__frame, cv = document.getElementById('map'), r = cv.getBoundingClientRect(), R = globalThis.__rh;
    const border = f && f.strokes.find((s) => s.style === '#272730');
    return {
      frame: f && { n: f.n, cw: f.cw, ch: f.ch, images: f.images.length, texts: f.texts, imgSample: f.images.slice(0, 3) },
      border, cw: cv.width, ch: cv.height, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      area: R.view.area, T: R.view.T, left: R.view.left, top: R.view.top, dpr: devicePixelRatio,
    };
  });
  const grid = (s) => {
    const L = s.border.x + 3, Tp = s.border.y + 3, Td = (s.border.w - 6) / 80, TdH = (s.border.h - 6) / 21;
    const sx = s.cw / s.rect.w, sy = s.ch / s.rect.h;
    return { L, Tp, Td, TdH, sx, sy };
  };
  const at = (s, g, c, r, ox = 0, oy = 0) => ({
    x: s.rect.x + (g.L + (c + 0.5 + ox) * g.Td) / g.sx,
    y: s.rect.y + (g.Tp + (r + 0.5 + oy) * g.Td) / g.sy,
  });
  const inArea = (s, g, pt) => {
    const a = s.area, m = g.Td / g.sx;   // a cell's margin inside the area
    const x = pt.x - s.rect.x, y = pt.y - s.rect.y;
    return x >= a.x + m && x <= a.x + a.w - m && y >= a.y + m && y <= a.y + a.h - m;
  };
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const tap = async (x, y) => {
    if (cf.input === 'mouse') { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up(); }
    else { await touch('touchStart', x, y); await touch('touchEnd'); }
    await sleep(60);
  };
  const drag = async (x0, y0, dx, dy) => {
    const n = Math.max(3, Math.ceil(Math.hypot(dx, dy) / 40));
    if (cf.input === 'mouse') {
      await p.mouse.move(x0, y0); await p.mouse.down();
      for (let i = 1; i <= n; i++) { await p.mouse.move(x0 + dx * i / n, y0 + dy * i / n); await sleep(10); }
      await p.mouse.up();
    } else {
      await touch('touchStart', x0, y0);
      for (let i = 1; i <= n; i++) { await touch('touchMove', x0 + dx * i / n, y0 + dy * i / n); await sleep(10); }
      await touch('touchEnd');
    }
    await sleep(150);
  };

  let s0 = await read();
  const g0 = grid(s0);
  const res = { tag, ...cf, T: s0.T, drawn: { Td: g0.Td, TdH: g0.TdH, cellCss: g0.Td / g0.sx, scale: g0.sx }, canvas: { cw: s0.cw, rectW: s0.rect.w }, taps: [], errors };
  await p.screenshot({ path: `${OUT}/shots/${LABEL}-${tag}.png` });
  for (const r of ROWS) for (const c of COLS) {
    let s = await read(), g = grid(s), pt = at(s, g, c, r);
    let hit = await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [pt.x, pt.y]);
    if (!inArea(s, g, pt) || hit !== 'map') {
      const a = s.area, cx = s.rect.x + a.x + a.w / 2, cy = s.rect.y + a.y + a.h / 2;
      await drag(cx, cy, cx - pt.x, cy - pt.y);
      s = await read(); g = grid(s); pt = at(s, g, c, r);
      hit = await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [pt.x, pt.y]);
    }
    for (const [ox, oy] of OFFS) {
      const q = at(s, g, c, r, ox, oy);
      await p.evaluate(() => { globalThis.__clicks = []; });
      await tap(q.x, q.y);
      const got = await p.evaluate(() => (globalThis.__clicks || [])[0] || null);
      res.taps.push({ c, r, ox, oy, at: { x: +q.x.toFixed(2), y: +q.y.toFixed(2) }, under: hit, got: got && { x: got.x, y: got.y }, ok: !!got && got.x === c && got.y === r });
    }
  }
  const centre = res.taps.filter((t) => t.ox === 0 && t.oy === 0), near = res.taps.filter((t) => t.ox !== 0);
  res.summary = {
    centre: `${centre.filter((t) => t.ok).length}/${centre.length}`,
    nearCorners: `${near.filter((t) => t.ok).length}/${near.length}`,
    wrongCentre: centre.filter((t) => !t.ok).map((t) => `(${t.c},${t.r})->${t.got ? `(${t.got.x},${t.got.y})` : 'none'}`),
    wrongNear: near.filter((t) => !t.ok).length,
    errors: errors.length,
  };
  await p.screenshot({ path: `${OUT}/shots/${LABEL}-${tag}-panned.png` });
  console.log(tag, `T=${res.T} drawn=${res.drawn.cellCss.toFixed(3)}css(Td ${res.drawn.Td})`, JSON.stringify(res.summary));
  all.push(res);
  await ctx.close();
}
fs.writeFileSync(`${OUT}/taps-${LABEL}.json`, JSON.stringify(all, null, 1));
await b.close();
