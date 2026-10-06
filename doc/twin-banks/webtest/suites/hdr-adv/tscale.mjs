// OS text size through CDP Page.setFontSizes (medium = 16 * scale), and Message size.
import * as C from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const SCALE = Number(process.argv[3] || 1.3);
const MSGSIZE = Number(process.argv[4] || 1);
const extra = JSON.parse(process.argv[5] || '{}');
const WINS = [[896,443],[443,939],[1024,768],[768,1024],[1366,768],[640,360],[360,640]];
const b = await C.launch();
for (const [W,H] of WINS) {
  const ctx = await C.newCtx(b, { w: W, h: H, dpr: DPR, screen: H > W ? { width: W, height: H } : { width: H, height: W }, prefs: { budgets: {}, msgSize: MSGSIZE, ...extra } });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); });
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Page.enable');
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: Math.round(16 * SCALE), fixed: Math.round(13 * SCALE) } });
  await p.goto(`${ctx.origin}/index.html`);
  await p.waitForFunction(() => globalThis.__bt && !document.getElementById('boot'), null, { timeout: 60000 });
  await C.resume(p);
  await C.sleep(600);
  const r = await p.evaluate(() => {
    const B = globalThis.__bt, G = B.geom;
    const R = (e) => { const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; };
    const over = (a, b, m = 0) => a.x - m < b.x + b.w && b.x - m < a.x + a.w && a.y - m < b.y + b.h && b.y - m < a.y + a.h;
    const keys = [...document.querySelectorAll('[data-tw]')].filter((e) => e.offsetParent).map((e) => ({ id: e.dataset.tw, r: R(e) })).filter(k => k.r.w > 0);
    const msg = R(document.getElementById('msgband')), st = R(document.getElementById('statband')), map = R(document.getElementById('map'));
    const bad = [];
    for (const k of keys) { if (over(msg, k.r, 11.5)) bad.push(`msg~${k.id}`); if (st.h > 0 && over(st, k.r, 11.5)) bad.push(`stat~${k.id}`); }
    if (over(msg, st, -0.01)) bad.push('msg/stat'); if (over(msg, map, -0.01)) bad.push('msg/map'); if (over(st, map, -0.01)) bad.push('stat/map');
    const sb = document.getElementById('statband'), mb = document.getElementById('msgband');
    const rowsEl = [...sb.querySelectorAll('.row')];
    const lastRow = rowsEl.length ? R(rowsEl[rowsEl.length - 1]) : null;
    const barsEl = sb.querySelector('.bars');
    const bars = barsEl ? R(barsEl) : null;
    return { ts: G.textScale, over: G.headerOver, rows: G.msgRows, cell: +G.cell.toFixed(2), fb: !!B.overlay.twinFallback, usable: !!B.overlay.twin, bad,
      st: [st.y, st.h].map(v => +v.toFixed(1)), lastRowBottom: lastRow && +(lastRow.y + lastRow.h).toFixed(1), bars: bars && [+(bars.y).toFixed(1), +(bars.y + bars.h).toFixed(1)], stBottom: +(st.y + st.h).toFixed(1),
      statFont: sb.style.fontSize, msgFont: mb.style.fontSize, statOverflow: sb.scrollHeight - sb.clientHeight, msgOverflow: mb.scrollHeight - mb.clientHeight,
      widest: Math.max(...rowsEl.map(e => e.scrollWidth)), avail: sb.clientWidth - 20 };
  });
  await p.screenshot({ path: `${C.SHOTS}/ts-${SCALE}-${MSGSIZE}-${DPR}-${W}x${H}.png` });
  console.log(W, H, JSON.stringify(r), p.errors.length ? p.errors : '');
  await ctx.close();
}
await b.close();
