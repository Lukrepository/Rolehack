// Every point of each band answers as that band (not a halo, a key or the case).
import { launch, newCtx, openPage, resume, sleep } from './common.mjs';
const b = await launch();
for (const DPR of [1, 2.4375]) for (const [mc, w, h, scr, cs] of [['rows', 896, 443, [443, 939], true], ['rows', 915, 412, [412, 915], true], ['rows', 896, 443, [443, 939], false], ['columns', 896, 443, [443, 939], true], ['columns', 1024, 768, null, true], ['columns', 443, 939, [443, 939], false]]) {
  const ctx = await newCtx(b, { w, h, dpr: DPR, screen: scr ? { width: w > h ? scr[1] : scr[0], height: w > h ? scr[0] : scr[1] } : null, prefs: { mapCell: mc, case: cs } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const r = await p.evaluate(() => {
    const out = {};
    for (const id of ['msgband', 'statband']) {
      const e = document.getElementById(id), q = e.getBoundingClientRect();
      let bad = 0, n = 0, what = {};
      for (let x = q.left + 0.5; x < q.right; x += 3) for (let y = q.top + 0.5; y < q.bottom; y += 3) {
        n++;
        const t = document.elementFromPoint(x, y);
        if (!t || !e.contains(t)) { bad++; const k = t ? (t.id || t.className || t.tagName) : 'null'; what[k] = (what[k] || 0) + 1; }
      }
      out[id] = { n, bad, what };
    }
    return { over: globalThis.__bt.geom.headerOver, out };
  });
  console.log(DPR, mc, `${w}x${h}`, cs ? 'case' : 'caseless', JSON.stringify(r), p.errors.length ? p.errors : '');
  await ctx.close();
}
await b.close();
