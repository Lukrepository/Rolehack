import { launch, newCtx, openPage, resume, sleep } from '../header/common.mjs';
const R = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/header-review';
const DPR = Number(process.argv[2] || 1);
const FS = Number(process.argv[3] || 24);
const b = await launch();
for (const [w, h, prefs] of [[896, 443, {}], [443, 939, {}], [896, 443, { mapCell: 'rows' }], [1366, 768, {}], [640, 360, {}], [360, 640, {}]]) {
  const ctx = await newCtx(b, { w, h, dpr: DPR, prefs });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); });
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Page.enable');
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: FS } });
  await p.goto(`${ctx.origin}/index.html`);
  await p.waitForFunction(() => globalThis.__bt && !document.getElementById('boot'), null, { timeout: 60000 });
  await resume(p); await sleep(500);
  const info = await p.evaluate(() => {
    const g = __bt.geom, rr = (e) => { const q = e.getBoundingClientRect(); return [q.x, q.y, q.width, q.height].map((v) => +v.toFixed(1)); };
    const sb = document.getElementById('statband');
    const rows = [...sb.querySelectorAll('.row, .bars')].map(rr);
    const keys = [...document.querySelectorAll('#keys [data-tw]')].map(rr);
    const bands = [rr(document.getElementById('msgband')), rr(sb)];
    const hit = [];
    for (const bnd of bands) for (const k of keys) if (bnd[0] < k[0] + k[2] && k[0] < bnd[0] + bnd[2] && bnd[1] < k[1] + k[3] && k[1] < bnd[1] + bnd[3]) hit.push([bnd, k]);
    return { ts: g.textScale, over: g.headerOver, rowsMsg: g.msgRows, sbH: g.statusBand.h, linesH: g.statusLinesH, sbR: rr(sb), rows, scroll: [sb.scrollHeight, sb.clientHeight, sb.scrollWidth, sb.clientWidth], font: sb.style.fontSize, hit: hit.length, fit: __bt.overlay.twin && __bt.overlay.twin.spec.fit.level, ui: document.documentElement.dataset.ui };
  });
  console.log(w, h, JSON.stringify(prefs), JSON.stringify(info));
  await p.screenshot({ path: `${R}/shots/ts${FS}-${w}x${h}${prefs.mapCell ? '-rows' : ''}.png` });
  if (p.errors.length) console.log('ERR', p.errors);
  await ctx.close();
}
await b.close();
