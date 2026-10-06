import { launch, newCtx, openPage, resume, sleep, SHOTS } from './common.mjs';
const b = await launch();
for (const [w, h] of [[896, 363], [443, 859], [844, 340], [915, 330]]) {
  const ctx = await newCtx(b, { w, h, dpr: 1, screen: null });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const r = await p.evaluate(() => {
    const g = globalThis.__bt.geom, R = (id) => { const q = document.getElementById(id).getBoundingClientRect(); return [q.x, q.y, q.width, q.height].map((v) => Math.round(v)); };
    return { over: g.headerOver, rows: g.msgRows, cell: g.cell, mb: R('msgband'), sb: R('statband'), map: R('map'), parent: document.getElementById('bands').parentNode.id, keysTop: Math.min(...[...document.querySelectorAll('[data-tw]')].map((e) => e.getBoundingClientRect().top)) };
  });
  console.log(`${w}x${h}`, JSON.stringify(r));
  await p.screenshot({ path: `${SHOTS}/tab-${w}x${h}.png` });
  await ctx.close();
}
await b.close();
