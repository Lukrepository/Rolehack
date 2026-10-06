// devicePixelRatio changed with no resize (CDP's device metrics override at
// the same size): does the glass re-lay out at the new density, and do taps
// still reach the cell drawn?  ORIG=1 serves the committed web.js (before the
// fix) through the same hook, for comparison.
//   node dprchange.mjs         -> dprchange.json
//   ORIG=1 node dprchange.mjs  -> dprchange-orig.json
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { launch, ctxOptions, hookRoutes, HOOK, URL, OUT, STATE, sleep, resumeGame } from './common.mjs';

const ORIG = !!process.env.ORIG;
const W = 896, H = 443;
const b = await launch();
const ctx = await b.newContext({ ...ctxOptions(W, H, 'touch'), storageState: STATE });
await hookRoutes(ctx);
if (ORIG) {
  const src = execSync('git -C /home/user/Rolehack show HEAD:win/web/web.js').toString() + HOOK;
  await ctx.route('**/web.js', (route) => route.fulfill({ body: src, headers: { 'content-type': 'text/javascript' } }));
}
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await p.goto(URL);
await p.waitForFunction(() => globalThis.__rh && !document.getElementById('boot'), null, { timeout: 60000 });
await resumeGame(p);
await sleep(500);
await p.evaluate(() => {
  globalThis.__swallowClicks = true; globalThis.__resizes = 0;
  addEventListener('resize', () => globalThis.__resizes++);
});
const cdp = await ctx.newCDPSession(p);
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });

const state = () => p.evaluate(() => {
  const R = globalThis.__rh, cv = document.getElementById('map'), r = cv.getBoundingClientRect(), f = globalThis.__frame;
  const border = f && f.strokes.find((s) => s.style === '#272730');
  return { dpr: devicePixelRatio, resizes: globalThis.__resizes, cw: cv.width, ch: cv.height, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
    boxW: R.geom.caseless ? R.geom.W : R.geom.glass.w, asked: R.tileSize(), T: R.view.T, area: R.view.area, border };
});
async function check(label) {
  const s = await state();
  const expectCw = Math.round(s.boxW * s.dpr);
  const expectT = Math.max(4, Math.floor(s.asked * s.dpr + 1e-6)) / s.dpr;
  const out = { label, dpr: s.dpr, resizes: s.resizes, canvasWidth: s.cw, expectedCanvasWidth: expectCw, viewT: s.T, expectedT: +expectT.toFixed(4), taps: [] };
  // taps on the drawn centre of columns 0, 40 and 79 in row 10, each brought to the middle of the map area
  for (const c of [0, 40, 79]) {
    let q = await state();
    const at = (q) => {
      const L = q.border.x + 3, Tp = q.border.y + 3, Td = (q.border.w - 6) / 80, sx = q.cw / q.rect.w;
      return { x: q.rect.x + (L + (c + 0.5) * Td) / sx, y: q.rect.y + (Tp + 10.5 * Td) / sx };
    };
    let pt = at(q);
    const cx = q.rect.x + q.area.x + q.area.w / 2, cy = q.rect.y + q.area.y + q.area.h / 2;
    const dx = cx - pt.x, dy = cy - pt.y;
    if (Math.hypot(dx, dy) > 20) {
      await touch('touchStart', cx, cy);
      for (let i = 1; i <= 8; i++) { await touch('touchMove', cx + dx * i / 8, cy + dy * i / 8); await sleep(10); }
      await touch('touchEnd');
      await sleep(150);
      q = await state(); pt = at(q);
    }
    await p.evaluate(() => { globalThis.__clicks = []; });
    await touch('touchStart', pt.x, pt.y); await touch('touchEnd'); await sleep(60);
    const got = await p.evaluate(() => (globalThis.__clicks || [])[0] || null);
    out.taps.push({ c, r: 10, got: got && { x: got.x, y: got.y }, ok: !!got && got.x === c && got.y === 10 });
  }
  out.ok = out.canvasWidth === out.expectedCanvasWidth && Math.abs(out.viewT - out.expectedT) < 1e-3 && out.taps.every((t) => t.ok);
  console.log(JSON.stringify(out));
  return out;
}
const runs = [await check('dpr 1, as loaded')];
for (const dpr of [2.4375, 1.625, 1.25]) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: dpr, mobile: true, screenWidth: W, screenHeight: H });
  await sleep(600);
  runs.push(await check(`changed to ${dpr} with no resize`));
  await p.screenshot({ path: `${OUT}/shots/dprchange${ORIG ? '-orig' : ''}-${dpr}.png` });
}
fs.writeFileSync(`${OUT}/dprchange${ORIG ? '-orig' : ''}.json`, JSON.stringify({ runs, errors }, null, 1));
console.log('errors', errors);
await b.close();
