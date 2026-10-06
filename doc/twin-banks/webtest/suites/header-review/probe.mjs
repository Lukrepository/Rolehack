import { launch, newCtx, openPage, resume, sleep, touch } from '../header/common.mjs';
const R = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/header-review';
const b = await launch();
const cases = [
  { w: 896, h: 443, prefs: {} }, { w: 443, h: 939, prefs: {} },
  { w: 896, h: 443, prefs: { mapCell: 'rows' } }, { w: 915, h: 412, prefs: { mapCell: 'rows' } },
  { w: 1024, h: 768, prefs: {} }, { w: 768, h: 1024, prefs: {} }, { w: 1366, h: 768, prefs: {} },
  { w: 640, h: 360, prefs: {} }, { w: 360, h: 640, prefs: {} },
];
const dpr = Number(process.argv[2] || 1);
for (const c of cases) {
  const ctx = await newCtx(b, { w: c.w, h: c.h, dpr, prefs: c.prefs });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(400);
  const info = await p.evaluate(() => {
    const g = __bt.geom, r = (id) => { const e = document.getElementById(id); if (!e) return null; const q = e.getBoundingClientRect(); return [q.x, q.y, q.width, q.height].map((v) => +v.toFixed(2)); };
    return { ui: document.documentElement.dataset.ui, over: g.headerOver, cell: g.cell, msgRows: g.msgRows, mb: g.msgBand, sb: g.statusBand, map: g.map,
      msgbandR: r('msgband'), statR: r('statband'), canvasR: r('map'), lampR: r('morelamp'), bars: !!document.querySelector('#statband .bars'),
      barsR: (() => { const e = document.querySelector('#statband .bars'); if (!e) return null; const q = e.getBoundingClientRect(); return [q.x, q.y, q.width, q.height]; })(),
      bandsParent: document.getElementById('bands').parentNode.id, T: __bt.view.T, metrics: __bt.bandMetrics(), statText: document.getElementById('statband').innerText,
      statScroll: [document.getElementById('statband').scrollHeight, document.getElementById('statband').clientHeight],
      msgScroll: [document.getElementById('msgband').scrollHeight, document.getElementById('msgband').clientHeight] };
  });
  console.log(c.w, c.h, JSON.stringify(c.prefs), JSON.stringify(info));
  await p.screenshot({ path: `${R}/shots/probe-${dpr}-${c.w}x${c.h}${c.prefs.mapCell ? '-rows' : ''}.png` });
  if (p.errors.length) console.log('ERRORS', p.errors);
  await ctx.close();
}
await b.close();
