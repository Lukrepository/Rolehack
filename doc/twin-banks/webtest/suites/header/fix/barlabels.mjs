// The HP/Pw bar names at the system's text size (node barlabels.mjs DPR): Page.setFontSizes
// at 1, 1.5 and 2; the names' font size against 11 px x the text size, capped at the bars' height.
import * as C from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await C.launch();
let bad = 0;
for (const scale of [1, 1.5, 2]) for (const [W, H] of [[1024, 768], [443, 939], [1366, 768]]) {
  const ctx = await C.newCtx(b, { w: W, h: H, dpr: DPR, screen: H > W ? { width: W, height: H } : { width: H, height: W }, prefs: { budgets: {} } });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); });
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Page.enable');
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: Math.round(16 * scale), fixed: Math.round(13 * scale) } });
  await p.goto(`${ctx.origin}/index.html`);
  await p.waitForFunction(() => globalThis.__bt && !document.getElementById('boot'), null, { timeout: 60000 });
  await C.resume(p);
  await C.sleep(400);
  const r = await p.evaluate(() => {
    const bars = document.querySelector('#statband .bars'), lab = bars && bars.querySelector('b');
    return { ts: globalThis.__bt.geom.textScale, bars: bars ? bars.getBoundingClientRect().height : null, font: lab ? parseFloat(getComputedStyle(lab).fontSize) : null,
      labBottom: lab ? lab.getBoundingClientRect().bottom : null, sbBottom: document.getElementById('statband').getBoundingClientRect().bottom };
  });
  const want = r.bars == null ? null : Math.min(11 * r.ts, r.bars);
  const ok = (r.bars == null || Math.abs(r.font - want) < 0.05) && (r.labBottom == null || r.labBottom <= r.sbBottom + 0.5) && !p.errors.length;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} text ${scale} ${W}x${H}: ${JSON.stringify(r)} want ${want}${p.errors.length ? ' ' + p.errors.join(' | ') : ''}`);
  await cdp.send('Page.captureScreenshot', { format: 'png' }).then((s) => import('node:fs').then((fs) => fs.writeFileSync(`${C.SHOTS}/bars-${DPR}-${scale}-${W}x${H}.png`, Buffer.from(s.data, 'base64'))));
  await ctx.close();
}
await b.close();
console.log(`barlabels @${DPR}: ${bad} failed`);
