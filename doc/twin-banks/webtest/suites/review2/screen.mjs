// Reviewer's independent density tap check.
//  (a) the canvas is composited 1:1: a device-scale screenshot of the page,
//      compared with the canvas's own pixels, matches exactly at offset
//      round(rect.left*dpr) (no stretch, no resample);
//  (b) taps at random points of the visible map, and points 1.5 device px either
//      side of cell boundaries, read as the cell whose pixels lie under them,
//      the cell read from the canvas's own pixels (the border found by colour)
//      rather than from web.js's numbers or the draw-call spy.
import fs from 'node:fs';
import { launch, ctxOptions, hookRoutes, URL, OUT, STATE, sleep, resumeGame } from './common.mjs';

const CONFIGS = [
  { W: 443, H: 939, dpr: 2.4375 }, { W: 896, H: 443, dpr: 2.4375 },
  { W: 412, H: 915, dpr: 2.625 }, { W: 915, H: 412, dpr: 2.625 },
  { W: 360, H: 800, dpr: 3 }, { W: 800, H: 360, dpr: 3 },
  { W: 390, H: 844, dpr: 2 }, { W: 443, H: 939, dpr: 1.1 },
  { W: 896, H: 443, dpr: 1.75, zoom: 21.3 },
  { W: 443, H: 939, dpr: 2.4375, caseless: true },
  { W: 1920, H: 1080, dpr: 1.1, input: 'mouse' }, { W: 1280, H: 800, dpr: 1.333, input: 'mouse' },
];
const only = process.env.ONLY;
const b = await launch();
const results = [];
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
for (const cf of CONFIGS) {
  const input = cf.input || 'touch';
  const tag = `${cf.W}x${cf.H}@${cf.dpr}${cf.zoom ? `-z${cf.zoom}` : ''}${cf.caseless ? '-caseless' : ''}-${input}`;
  if (only && !tag.startsWith(only)) continue;
  const ctx = await b.newContext({ ...ctxOptions(cf.W, cf.H, input, { deviceScaleFactor: cf.dpr }), storageState: STATE });
  await hookRoutes(ctx);
  await ctx.addInitScript(([z, cl]) => {
    try { localStorage.setItem('rh.zoom', JSON.stringify(z || 0)); if (cl) localStorage.setItem('rh.case', 'false'); } catch (e) { /* none */ }
  }, [cf.zoom, !!cf.caseless]);
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await p.goto(URL);
  await p.waitForFunction(() => globalThis.__rh && !document.getElementById('boot'), null, { timeout: 60000 });
  await resumeGame(p);
  await sleep(600);
  await p.evaluate(() => { globalThis.__swallowClicks = true; globalThis.__clicks = []; });
  const cdp = await ctx.newCDPSession(p);

  // the canvas's own pixels: find the border by its colour, rgb(39,39,48)
  const canvasTruth = () => p.evaluate(() => {
    const cv = document.getElementById('map'), cx = cv.getContext('2d');
    const d = cx.getImageData(0, 0, cv.width, cv.height).data, w = cv.width, h = cv.height;
    const isB = (x, y) => { const i = (y * w + x) * 4; return d[i] === 39 && d[i + 1] === 39 && d[i + 2] === 48; };
    // a column with the most border pixels on the left and right, a row likewise
    const colCount = new Array(w).fill(0), rowCount = new Array(h).fill(0);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (isB(x, y)) { colCount[x]++; rowCount[y]++; }
    const cols = colCount.map((n, x) => [n, x]).filter(([n]) => n > 20).map(([, x]) => x);
    const rows = rowCount.map((n, y) => [n, y]).filter(([n]) => n > 20).map(([, y]) => y);
    const r = cv.getBoundingClientRect(), R = globalThis.__rh;
    return { w, h, cols, rows, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, dpr: devicePixelRatio,
      T: R.view.T, left: R.view.left, top: R.view.top, area: R.view.area };
  });
  let s = await canvasTruth();
  // border: 2 px lines; the left line's columns are L-4, L-3, the right's L+80Td+2, L+80Td+3
  const grid = (s) => {
    const cl = s.cols, rw = s.rows;
    // left line: columns L-4, L-3; right line: L+80Td+2, L+80Td+3 (strokeRect(L-3, Tp-3, 80Td+6, 21Td+6), width 2)
    const runs = (a) => { const out = []; for (const v of a) { const l = out[out.length - 1]; if (l && v === l[1] + 1) l[1] = v; else out.push([v, v]); } return out; };
    const cr = runs(cl), rr = runs(rw);
    let Td = null, L = null, Tp = null;
    if (rr.length >= 2) { Tp = rr[0][0] + 4; Td = (rr[rr.length - 1][1] - 3 - Tp) / 21; }
    if (cr.length >= 2) { L = cr[0][0] + 4; const t = (cr[cr.length - 1][1] - 3 - L) / 80; if (Td == null) Td = t; }
    else if (cr.length === 1 && Td != null) {
      // one vertical line: the left one if the map lies to its right
      // the left line's first column is L-4; the right line's first is L+80Td+2
      L = cr[0][0] + 4 < s.w / 2 && cr[0][0] > 0 ? cr[0][0] + 4 : cr[0][0] - 2 - 80 * Td;
    }
    if (Td == null || L == null || Tp == null) return { partial: { cr, rr } };
    return { L, Tp, Td, cr, rr };
  };
  let g = grid(s);
  const touch0 = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const drag = async (x0, y0, dx, dy) => {
    const n = Math.max(3, Math.ceil(Math.hypot(dx, dy) / 40));
    if (input === 'mouse') {
      await p.mouse.move(x0, y0); await p.mouse.down();
      for (let i = 1; i <= n; i++) { await p.mouse.move(x0 + dx * i / n, y0 + dy * i / n); await sleep(10); }
      await p.mouse.up();
    } else {
      await touch0('touchStart', x0, y0);
      for (let i = 1; i <= n; i++) { await touch0('touchMove', x0 + dx * i / n, y0 + dy * i / n); await sleep(10); }
      await touch0('touchEnd');
    }
    await sleep(200);
  };
  let panned = null;
  if (g.partial) {
    // no vertical line or no two horizontal ones on the canvas: drag so the level's top-left corner is in view
    const a = s.area, cx = s.rect.x + a.x + a.w / 2, cy = s.rect.y + a.y + a.h / 2;
    const leftCss = s.left, topCss = s.top;
    const dx = g.partial.cr.length ? 0 : (a.x + 30) - leftCss, dy = g.partial.rr.length >= 2 ? 0 : (a.y + 30) - topCss;
    panned = { dx, dy };
    for (let k = 0; k < 8 && g.partial; k++) {
      const ddx = g.partial.cr.length ? 0 : Math.min((a.x + 30) - s.left, a.w / 2 - 5);
      const ddy = g.partial.rr.length >= 2 ? 0 : Math.min((a.y + 30) - s.top, a.h / 2 - 5);
      await drag(cx - ddx / 2, cy - ddy / 2, ddx, ddy);
      s = await canvasTruth(); g = grid(s);
    }
  }
  const res = { tag, ...cf, errors, dpr: s.dpr, canvas: { w: s.w, h: s.h, cssW: s.rect.w, cssH: s.rect.h } };
  if (!g || g.partial) {
    // the border is off the canvas (a big map): pan so the top-left corner shows
    res.note = 'border not fully on canvas; panning to a corner';
  }
  res.grid = g; res.panned = panned;
  // (a) composite: a device-scale screenshot against the canvas's pixels
  await p.evaluate(() => { document.getElementById('tube').style.display = 'none'; });
  await sleep(100);
  const shot = { data: (await p.screenshot({ scale: 'device' })).toString('base64') };
  await p.evaluate(() => { document.getElementById('tube').style.display = ''; });
  const comp = await p.evaluate(async (b64) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
    const bm = await createImageBitmap(blob);
    const oc = new OffscreenCanvas(bm.width, bm.height), ox = oc.getContext('2d');
    ox.drawImage(bm, 0, 0);
    const cv = document.getElementById('map'), r = cv.getBoundingClientRect(), dpr = devicePixelRatio;
    const cd = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    const sd = ox.getImageData(0, 0, bm.width, bm.height).data;
    // compare a sample of canvas pixels the map shows (elementFromPoint says map)
    const pts = [];
    for (let k = 0; k < 4000; k++) {
      const x = Math.floor(Math.random() * cv.width), y = Math.floor(Math.random() * cv.height);
      const cx = r.x + (x + 0.5) / dpr, cy = r.y + (y + 0.5) / dpr;
      if (document.elementFromPoint(cx, cy)?.id !== 'map') continue;
      const a = globalThis.__rh.view.area, qx = (x + 0.5) / dpr, qy = (y + 0.5) / dpr;
      if (qx < a.x || qy < a.y || qx > a.x + a.w || qy > a.y + a.h) continue;
      const i0 = (y * cv.width + x) * 4;
      if (cd[i0] + cd[i0 + 1] + cd[i0 + 2] < 30) continue;   // only drawn (non-black) pixels
      pts.push([x, y]);
    }
    // normalised cross-correlation of luminance, per offset, for the left and right thirds of the canvas
    // (a stretch would put their peaks at different offsets)
    const lum = (d, i) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    const ncc = (sel, ox2, oy) => {
      const bx = Math.round(r.x * dpr) + ox2, by = Math.round(r.y * dpr) + oy;
      let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
      for (const [x, y] of sel) {
        const sx = bx + x, sy = by + y;
        if (sx < 0 || sy < 0 || sx >= bm.width || sy >= bm.height) continue;
        const A = lum(cd, (y * cv.width + x) * 4), B = lum(sd, (sy * bm.width + sx) * 4);
        n++; sa += A; sb += B; saa += A * A; sbb += B * B; sab += A * B;
      }
      const cov = sab / n - (sa / n) * (sb / n), va = saa / n - (sa / n) ** 2, vb = sbb / n - (sb / n) ** 2;
      return cov / Math.sqrt(va * vb);
    };
    // dense samples: every pixel of rows through the area
    const sample = (x0, x1) => { const out = []; const a = globalThis.__rh.view.area;
      for (let y = Math.ceil(a.y * dpr) + 2; y < Math.floor((a.y + a.h) * dpr) - 2; y += 3)
        for (let x = Math.max(x0, Math.ceil(a.x * dpr) + 2); x < Math.min(x1, Math.floor((a.x + a.w) * dpr) - 2); x += 1) {
          const cx = r.x + (x + 0.5) / dpr, cy = r.y + (y + 0.5) / dpr;
          out.push([x, y]);
        }
      return out; };
    const sel = sample(0, cv.width).filter(([x, y]) => { const i = (y * cv.width + x) * 4; return cd[i] + cd[i + 1] + cd[i + 2] > 40; });
    const exact = (ox2, oy) => {
      const bx = Math.round(r.x * dpr) + ox2, by = Math.round(r.y * dpr) + oy; let n = 0, same = 0;
      for (const [x, y] of sel) {
        const sx = bx + x, sy = by + y; if (sx < 0 || sy < 0 || sx >= bm.width || sy >= bm.height) continue;
        const i = (y * cv.width + x) * 4, j = (sy * bm.width + sx) * 4; n++;
        if (Math.abs(cd[i] - sd[j]) <= 1 && Math.abs(cd[i + 1] - sd[j + 1]) <= 1 && Math.abs(cd[i + 2] - sd[j + 2]) <= 1) same++;
      }
      return n ? same / n : null;
    };
    const tab = [];
    for (let oy = -2; oy <= 2; oy++) for (let ox2 = -2; ox2 <= 2; ox2++) tab.push({ ox: ox2, oy, f: exact(ox2, oy) });
    tab.sort((p, q) => q.f - p.f);
    const peaks = [{ n: sel.length, at0: exact(0, 0), best: tab[0], second: tab[1] }];
    return { shot: [bm.width, bm.height], expectOrigin: [Math.round(r.x * dpr), Math.round(r.y * dpr)], peaks };
  }, shot.data);
  res.composite = comp;
  // (b) taps: random points of the visible map, and boundary points
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const tap = async (x, y) => {
    if (input === 'mouse') { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up(); }
    else { await touch('touchStart', x, y); await touch('touchEnd'); }
    await sleep(40);
  };
  const taps = [];
  if (g && !g.partial) {
    const tries = [];
    for (let k = 0; k < 60; k++) tries.push([rnd() * s.w, rnd() * s.h, 'random']);
    // boundaries: device px 1.5 either side of a vertical and horizontal cell edge
    for (let k = 0; k < 30; k++) {
      const c = 1 + Math.floor(rnd() * 79), r = Math.floor(rnd() * 21);
      const ex = g.L + c * g.Td, cy = g.Tp + (r + 0.5) * g.Td;
      tries.push([ex - 1.5, cy, 'edge-'], [ex + 1.5, cy, 'edge+']);
      const c2 = Math.floor(rnd() * 80), r2 = 1 + Math.floor(rnd() * 20);
      const cx2 = g.L + (c2 + 0.5) * g.Td, ey = g.Tp + r2 * g.Td;
      tries.push([cx2, ey - 1.5, 'edgeY-'], [cx2, ey + 1.5, 'edgeY+']);
    }
    for (const [px, py, kind] of tries) {
      const want = { x: Math.floor((px - g.L) / g.Td), y: Math.floor((py - g.Tp) / g.Td) };
      if (want.x < 0 || want.x >= 80 || want.y < 0 || want.y >= 21) continue;
      const cx = s.rect.x + px / s.dpr, cy = s.rect.y + py / s.dpr;
      const under = await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [cx, cy]);
      if (under !== 'map') continue;
      { const a = s.area, qx = px / s.dpr, qy = py / s.dpr; if (qx < a.x || qy < a.y || qx > a.x + a.w || qy > a.y + a.h) continue; }
      await p.evaluate(() => { globalThis.__clicks = []; });
      await tap(cx, cy);
      const got = await p.evaluate(() => (globalThis.__clicks || [])[0] || null);
      taps.push({ kind, px: +px.toFixed(2), py: +py.toFixed(2), want, got: got && { x: got.x, y: got.y }, ok: !!got && got.x === want.x && got.y === want.y });
    }
  }
  const s2 = await canvasTruth();
  res.taps = taps;
  res.summary = {
    tapsOk: `${taps.filter((t) => t.ok).length}/${taps.length}`,
    wrong: taps.filter((t) => !t.ok).slice(0, 6),
    composite: comp,
    viewT_css: s.T, grid: g && { L: g.L, Tp: g.Tp, Td: g.Td, partial: g.partial }, panned, viewT_dev: s.T * s.dpr,
    leftMatch: g && Math.abs(s.left * s.dpr - g.L) < 1e-6, topMatch: g && Math.abs(s.top * s.dpr - g.Tp) < 1e-6,
    canvasCss: [s.rect.w, s.rect.h], canvasDev: [s.w, s.h], movedDuring: s2.left !== s.left || s2.top !== s.top,
    errors: errors.length,
  };
  await p.screenshot({ path: `${OUT}/shots/screen-${tag}.png` });
  console.log(tag, JSON.stringify(res.summary));
  results.push(res);
  await ctx.close();
}
fs.writeFileSync(`${OUT}/screen.json`, JSON.stringify(results, null, 1));
await b.close();
