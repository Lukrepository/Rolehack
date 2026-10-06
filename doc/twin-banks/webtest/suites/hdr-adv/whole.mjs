import * as C from './common.mjs';
const b = await C.launch();
for (const dpr of [1, 1.25, 1.5, 2, 2.4375]) for (const [W,H] of [[1366,768],[1024,768],[1180,820],[1280,800]]) {
  const ctx = await C.newCtx(b, { w: W, h: H, dpr, prefs: { budgets: {} } });
  const p = await C.openPage(ctx);
  await C.resume(p);
  await C.sleep(300);
  const r = await p.evaluate(() => {
    const B = globalThis.__bt, cv = document.getElementById('map'), m = B.geom.map;
    const out = { area: [m.x, m.y, m.w, m.h].map(v => +v.toFixed(2)), canvas: [cv.width, cv.height], T: B.view.T, cell: B.geom.cell, levelPx: [80 * B.view.T * devicePixelRatio, 21 * B.view.T * devicePixelRatio].map(Math.round) };
    out.at = [0, 10, 20].map((y) => { const v = B.viewAt(40, y); return +v.top.toFixed(2); });
    return out;
  });
  console.log(dpr, W, H, JSON.stringify(r), r.levelPx[1] > r.canvas[1] || r.levelPx[0] > r.canvas[0] ? 'LEVEL DOES NOT FIT CANVAS' : 'fits');
  await ctx.close();
}
await b.close();
