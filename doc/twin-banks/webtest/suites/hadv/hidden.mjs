import { launch, newCtx, openPage, resume, sleep, SHOTS } from './common.mjs';
const b = await launch();
for (const sl of ['full', 'compact', 'hidden']) for (const [mc, w, h, scr] of [['columns', 896, 443, [443, 939]], ['columns', 443, 939, [443, 939]], ['rows', 896, 443, [443, 939]]]) {
  const ctx = await newCtx(b, { w, h, screen: { width: w > h ? scr[1] : scr[0], height: w > h ? scr[0] : scr[1] }, prefs: { mapCell: mc, statusLines: sl } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const r = await p.evaluate(() => {
    const g = globalThis.__bt.geom, R = (id) => { const q = document.getElementById(id).getBoundingClientRect(); return [Math.round(q.x), Math.round(q.y), Math.round(q.width), Math.round(q.height)]; };
    return { mb: R('msgband'), sb: g.statusBand && [g.statusBand.x, g.statusBand.y, g.statusBand.w, g.statusBand.h].map(Math.round), sbShown: getComputedStyle(document.getElementById('statband')).display, map: R('map'), msgRows: g.msgRows, over: g.headerOver };
  });
  console.log(sl, mc, `${w}x${h}`, JSON.stringify(r));
  await p.screenshot({ path: `${SHOTS}/status-${sl}-${mc}-${w}x${h}.png` });
  await ctx.close();
}
await b.close();
