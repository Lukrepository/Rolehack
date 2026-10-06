import { launch, newCtx, openPage, resume, touch, sleep } from './common.mjs';
const b = await launch();
for (const DPR of [1, 2.4375]) {
  const ctx = await newCtx(b, { w: 896, h: 443, dpr: DPR, screen: { width: 939, height: 443 }, prefs: { mapCell: 'rows' } });
  const p = await openPage(ctx);
  await resume(p);
  const k = await touch(ctx, p);
  const m = await p.evaluate(() => { const r = document.getElementById('map').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; });
  const v = () => p.evaluate(() => ({ T: globalThis.__bt.view.T, ov: globalThis.__bt.overview, zf: localStorage.getItem('rh.zoomFactor'), clicks: (globalThis.__clicks || []).length }));
  const T0 = (await v()).T;
  await k.down([[m.cx - 40, m.cy], [m.cx + 40, m.cy]]); await sleep(400);
  const a = await v();
  await k.up(); await sleep(100);
  const b1 = await v();
  await k.down([[m.cx - 40, m.cy], [m.cx + 40, m.cy]]); await sleep(30);
  for (let i = 1; i <= 8; i++) { await k.move([[m.cx - 40 - 5 * i, m.cy], [m.cx + 40 + 5 * i, m.cy]]); await sleep(16); }
  const c = await v();
  await k.up(); await sleep(100);
  const d = await v();
  console.log(DPR, `T0 ${T0.toFixed(3)} | still: overview ${a.ov} T ${a.T.toFixed(3)} | lifted: ${b1.ov} T ${b1.T.toFixed(3)} | spread: overview ${c.ov} T ${c.T.toFixed(3)} zf ${c.zf} | lifted: T ${d.T.toFixed(3)} zf ${d.zf} clicks ${d.clicks}`, p.errors);
  await ctx.close();
}
await b.close();
