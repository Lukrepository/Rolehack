// Bands vs keys / each other / map, at the review's windows; screenshots.
import * as C from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const extra = JSON.parse(process.argv[3] || '{}');
const tag = process.argv[4] || 'def';
const WINS = [[896,443],[443,939],[1024,768],[768,1024],[1366,768],[640,360],[360,640],[915,412],[844,390]];
const b = await C.launch();
const out = [];
for (const [W,H] of WINS) {
  const ctx = await C.newCtx(b, { w: W, h: H, dpr: DPR, screen: H > W ? { width: W, height: H } : { width: H, height: W }, prefs: { budgets: {}, ...extra } });
  const p = await C.openPage(ctx);
  await C.resume(p);
  await C.sleep(500);
  const r = await p.evaluate(() => {
    const B = globalThis.__bt, G = B.geom;
    const R = (e) => { const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; };
    const over = (a, b, m = 0) => a.x - m < b.x + b.w && b.x - m < a.x + a.w && a.y - m < b.y + b.h && b.y - m < a.y + a.h;
    const keys = [...document.querySelectorAll('[data-tw]')].filter((e) => e.offsetParent).map((e) => ({ id: e.dataset.tw, r: R(e) })).filter(k => k.r.w > 0);
    const msg = R(document.getElementById('msgband')), st = R(document.getElementById('statband')), map = R(document.getElementById('map'));
    const bad = [];
    for (const k of keys) {
      if (over(msg, k.r, 11.5)) bad.push(`msg within 12 of ${k.id}`);
      if (st.h > 0 && over(st, k.r, 11.5)) bad.push(`stat within 12 of ${k.id}`);
    }
    if (st.h > 0 && over(msg, st, -0.01)) bad.push('msg over stat');
    if (over(msg, map, -0.01)) bad.push('msg over map');
    if (st.h > 0 && over(st, map, -0.01)) bad.push('stat over map');
    const sb = document.getElementById('statband');
    const rows = [...sb.querySelectorAll('.row')].map((e) => [e.scrollWidth, e.clientWidth]);
    const statClip = sb.scrollHeight > sb.clientHeight + 1 ? `stat content ${sb.scrollHeight} > ${sb.clientHeight}` : '';
    const mb = document.getElementById('msgband');
    const bars = !!sb.querySelector('.bars');
    return { W: innerWidth, H: innerHeight, over: G.headerOver, rows: G.msgRows, cell: G.cell, T: B.view.T, msg, st, map, bad, statClip, bars, msgClip: mb.scrollHeight > mb.clientHeight + 1 ? `${mb.scrollHeight}>${mb.clientHeight}` : '', statFont: sb.style.fontSize, bm: B.bandMetrics(), cols: map.w / B.view.T, rowsShown: map.h / B.view.T, usable: !!(B.overlay.twin) , fallback: !!B.overlay.twinFallback };
  });
  await p.screenshot({ path: `${C.SHOTS}/sz-${tag}-${DPR}-${W}x${H}.png` });
  r.errors = p.errors;
  out.push(r);
  console.log(W, H, JSON.stringify({ over: r.over, rows: r.rows, cell: +r.cell.toFixed(2), T: +r.T.toFixed(3), cols: +r.cols.toFixed(1), rowsShown: +r.rowsShown.toFixed(1), bars: r.bars, bad: r.bad, statClip: r.statClip, msgClip: r.msgClip, statFont: r.statFont, errors: r.errors, fb: r.fallback }));
  await ctx.close();
}
C.writeJson(`sizes-${tag}-${DPR}.json`, out);
await b.close();
