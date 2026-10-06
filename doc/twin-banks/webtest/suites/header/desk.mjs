// Desk windows (a mouse, no touch): the header where the desk layout puts it,
// no band on a key or on the other band, the glass and map drawn, no console
// errors.  Not a design window of this stage; a smoke test of the desk path.
//   node desk.mjs -> shots/desk-*.png
import { launch, newCtx, openPage, resume, sleep, SHOTS } from './common.mjs';
const b = await launch();
let fails = 0;
for (const [w, h] of [[1280, 800], [1920, 1080], [1366, 768]]) {
  const ctx = await newCtx(b, { w, h, touch: false, prefs: { budgets: {} } });
  const p = await openPage(ctx); await resume(p); await sleep(400);
  const r = await p.evaluate(() => {
    const O = globalThis.__bt.overlay, $ = (id) => document.getElementById(id), bad = [];
    if (!O.twin) return { bad: [`no twin: ${O.twinFallback}`] };
    const box = (e) => e.getBoundingClientRect();
    const over = (a, b) => a.left + 0.01 < b.right && b.left + 0.01 < a.right && a.top + 0.01 < b.bottom && b.top + 0.01 < a.bottom;
    const mb = box($('msgband')), sb = box($('statband')), cv = box($('map'));
    for (const e of document.querySelectorAll('[data-tw]')) { const k = box(e); if (over(mb, k) || over(sb, k)) bad.push(`band over ${e.dataset.tw}`); if (over(cv, k)) bad.push(`map under ${e.dataset.tw}`); }
    if (over(mb, sb)) bad.push('bands overlap');
    const S = O.twin.spec;
    return { bad, pointer: S.pointer, bands: S.bands.map((q) => `${q.name.split(' (')[0]} ${q.x.toFixed(0)},${q.y.toFixed(0)} ${q.w.toFixed(0)}x${q.h.toFixed(0)}`), over: O.twin.info.G && O.twin.info.G.over, rows: globalThis.__bt.bandMetrics().rows };
  });
  await p.screenshot({ path: `${SHOTS}/desk-${w}x${h}.png` });
  const bad = [...r.bad, ...p.errors];
  fails += bad.length;
  console.log(`${w}x${h} ${r.pointer}: ${JSON.stringify(r.bands)} rows ${r.rows}; ${bad.length ? bad.join(' | ') : 'ok'}`);
  await ctx.close();
}
console.log(fails ? `FAILURES: ${fails}` : 'ALL PASS');
await b.close();
