// Tap drift at a high density: taps at the drawn hero outline's cell and its
// neighbours (read from the canvas draw calls) must click those cells.
import * as C from './common.mjs';
const DPR = Number(process.argv[2] || 2.4375);
const b = await C.launch();
const res = [];
for (const [W, H, zf] of [[896,443,1],[443,939,1],[896,443,1.7],[443,939,2.3],[1366,768,1],[1024,768,1]]) {
  const ctx = await C.newCtx(b, { w: W, h: H, dpr: DPR, screen: H > W ? { width: W, height: H } : { width: H, height: W }, prefs: { budgets: {}, zoomFactor: zf } });
  const p = await C.openPage(ctx);
  await C.resume(p);
  const k = await C.touch(ctx, p);
  await C.sleep(400);
  await p.evaluate(() => { globalThis.__swallowClicks = true; globalThis.__clicks = []; globalThis.__bt.renderMap(); });
  const f = await p.evaluate(() => {
    const F = globalThis.__frame, cv = document.getElementById('map').getBoundingClientRect(), c = globalThis.__bt.cursor;
    const s = F.strokes.find((q) => q.w > 4 && q.w < 200 && Math.abs(q.w - q.h) < 0.01);
    return { s, cv: { x: cv.x, y: cv.y }, c, dpr: devicePixelRatio, T: globalThis.__bt.view.T };
  });
  const lw = f.s.lw, Td = f.s.w + lw, x0 = f.s.x - lw / 2, y0 = f.s.y - lw / 2;   // device px of the hero cell
  const bad = [];
  for (const [dx, dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[3,2],[-4,-3],[7,1]]) {
    for (const [fx, fy] of [[0.5,0.5],[0.1,0.1],[0.9,0.9]]) {
      const px = f.cv.x + (x0 + (dx + fx) * Td) / f.dpr, py = f.cv.y + (y0 + (dy + fy) * Td) / f.dpr;
      await p.evaluate(() => { globalThis.__clicks = []; });
      await k.tap(px, py);
      await C.sleep(60);
      const cl = await p.evaluate(() => globalThis.__clicks.slice(-1)[0]);
      const want = { x: f.c.x + dx, y: f.c.y + dy };
      if (!cl || cl.x !== want.x || cl.y !== want.y) bad.push(`${dx},${dy}@${fx}: got ${cl ? cl.x + ',' + cl.y : 'none'} want ${want.x},${want.y}`);
    }
  }
  console.log(W, H, zf, 'T', f.T, 'Td', Td, bad.length ? bad.slice(0, 6) : 'ok', p.errors);
  await ctx.close();
}
await b.close();
