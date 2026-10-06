import { launch, newCtx, openPage, resume, sleep, SHOTS } from './common.mjs';
const b = await launch();
for (const origin of ['http://localhost:8766', 'http://localhost:8779']) for (const [w, h] of [[896, 443], [443, 939]]) {
  const ctx = await newCtx(b, { w, h, origin, screen: { width: w > h ? 939 : 443, height: w > h ? 443 : 939 }, prefs: { statusLines: 'hidden' } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const r = await p.evaluate(() => {
    const g = globalThis.__bt.geom, q = (id) => document.getElementById(id).getBoundingClientRect();
    return { msgBottom: Math.round(q('msgband').bottom), mapTop: Math.round(q('map').top), statusBand: g.statusBand && Math.round(g.statusBand.h), barsInDom: !!document.querySelector('#statband .bars') };
  });
  console.log(origin.slice(-4), `${w}x${h}`, JSON.stringify(r));
  await ctx.close();
}
await b.close();
