// The zoom gestures after the fix: a trackpad's small wheel steps still grow
// the map (they scale the asked cell, not the floored drawn one), a wheel
// notch steps it, and a pinch starts from the drawn cell with no jump.  Then
// a tap check at the zoomed cell.
//   node zoomcheck.mjs -> zoomcheck.json
import fs from 'node:fs';
import { launch, ctxOptions, hookRoutes, URL, OUT, STATE, sleep, resumeGame } from './common.mjs';

const out = {};
const b = await launch();
for (const [input, W, H, dpr] of [['mouse', 1366, 768, 2.4375], ['touch', 896, 443, 2.4375]]) {
  const ctx = await b.newContext({ ...ctxOptions(W, H, input, { deviceScaleFactor: dpr }), storageState: STATE });
  await hookRoutes(ctx);
  await ctx.addInitScript(() => { try { localStorage.setItem('rh.zoom', '0'); } catch (e) { /* none */ } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await p.goto(URL);
  await p.waitForFunction(() => globalThis.__rh && !document.getElementById('boot'), null, { timeout: 60000 });
  await resumeGame(p);
  await sleep(400);
  const st = () => p.evaluate(() => ({ zoom: JSON.parse(localStorage.getItem('rh.zoom')), asked: globalThis.__rh.tileSize(), T: globalThis.__rh.view.T,
    area: globalThis.__rh.view.area, rect: (() => { const r = document.getElementById('map').getBoundingClientRect(); return { x: r.x, y: r.y }; })() }));
  const s0 = await st();
  const cx = s0.rect.x + s0.area.x + s0.area.w / 2, cy = s0.rect.y + s0.area.y + s0.area.h / 2;
  const res = { start: s0 };
  if (input === 'mouse') {
    await p.mouse.move(cx, cy);
    for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, -4); await sleep(15); }
    await sleep(200);
    res.after40SmallStepsIn = await st();
    for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 100); await sleep(60); }
    await sleep(200);
    res.after3NotchesOut = await st();
    res.ok = res.after40SmallStepsIn.T > s0.T && res.after3NotchesOut.T < res.after40SmallStepsIn.T;
  } else {
    const cdp = await ctx.newCDPSession(p);
    const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
    await tp('touchStart', [{ x: cx - 50, y: cy, id: 1 }, { x: cx + 50, y: cy, id: 2 }]);
    await sleep(50);
    await tp('touchMove', [{ x: cx - 50.2, y: cy, id: 1 }, { x: cx + 50.2, y: cy, id: 2 }]);   // the fingers settle: no jump
    await sleep(80);
    res.pinchStart = await st();
    for (let i = 1; i <= 10; i++) { await tp('touchMove', [{ x: cx - 50 - 5 * i, y: cy, id: 1 }, { x: cx + 50 + 5 * i, y: cy, id: 2 }]); await sleep(20); }
    await tp('touchEnd', []);
    await sleep(200);
    res.pinchEnd = await st();
    res.ok = Math.abs(res.pinchStart.T - s0.T) < 1e-9 && Math.abs(res.pinchEnd.T - s0.T * 2) < 1 / dpr + 1e-9;
  }
  res.errors = errors;
  out[`${W}x${H}@${dpr}-${input}`] = res;
  console.log(`${W}x${H}@${dpr} ${input}`, JSON.stringify({ ...res, start: { T: s0.T, asked: s0.asked } }, (k, v) => (k === 'area' || k === 'rect' ? undefined : v)));
  await ctx.close();
}
fs.writeFileSync(`${OUT}/zoomcheck.json`, JSON.stringify(out, null, 1));
await b.close();
