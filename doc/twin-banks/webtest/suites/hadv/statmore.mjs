// A tap on the status band at --More-- is one Space, in the glass and over the banks.
import { launch, newCtx, openPage, resume, touch, sleep, evs, clearEvs } from './common.mjs';
const b = await launch();
for (const DPR of [1, 2.4375]) for (const [mc, w, h, scr] of [['rows', 896, 443, [443, 939]], ['columns', 896, 443, [443, 939]], ['columns', 1024, 768, null]]) {
  const ctx = await newCtx(b, { w, h, dpr: DPR, screen: scr ? { width: scr[1], height: scr[0] } : null, prefs: { mapCell: mc } });
  const p = await openPage(ctx);
  await resume(p);
  const k = await touch(ctx, p);
  const res = [];
  for (const target of ['statband', 'msgband', 'glass-bezel']) {
    await p.evaluate(() => globalThis.__bt.msg.begin());
    const R = await p.evaluate(() => globalThis.__bt.bandMetrics().rows);
    for (let i = 0; i <= R; i++) { await p.evaluate((x) => globalThis.__bt.msg.put(x), `Message ${i + 1}.`); await p.evaluate(() => globalThis.__bt.msg.settle()); }
    const more0 = await p.evaluate(() => globalThis.__bt.moreShown);
    const pt = await p.evaluate((t) => {
      if (t === 'glass-bezel') { const g = document.getElementById('glass').getBoundingClientRect(), m = document.getElementById('map').getBoundingClientRect(); return [g.left + (m.left - g.left) / 2, (m.top + m.bottom) / 2, document.elementFromPoint(g.left + (m.left - g.left) / 2, (m.top + m.bottom) / 2)?.id]; }
      const q = document.getElementById(t).getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height - 6, document.elementFromPoint(q.left + q.width / 2, q.top + q.height - 6)?.id];
    }, target);
    await clearEvs(p);
    await k.tap(pt[0], pt[1]);
    await sleep(200);
    const e = await evs(p);
    const more1 = await p.evaluate(() => globalThis.__bt.moreShown);
    res.push(`${target}(${pt[2]}): more ${more0}->${more1}, spaces ${e.filter((x) => x.key === 32).length}, other ${JSON.stringify(e.filter((x) => x.key !== 32))}`);
    await p.evaluate(() => globalThis.__bt.msg.settle());
    await p.evaluate(() => globalThis.__bt.msg.end());
  }
  console.log(DPR, mc, `${w}x${h}`, res.join(' | '), p.errors.length ? p.errors : '');
  await ctx.close();
}
await b.close();
