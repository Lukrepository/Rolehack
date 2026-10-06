// The system text size through the browser's default font size (Page.setFontSizes).
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS } from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await launch();
for (const fs of [16, 20, 24, 32]) for (const [mc, w, h, scr] of [['columns', 896, 443, [443, 939]], ['columns', 443, 939, [443, 939]], ['rows', 896, 443, [443, 939]], ['columns', 1024, 768, null], ['columns', 360, 640, [360, 640]]]) {
  const ctx = await newCtx(b, { w, h, dpr: DPR, screen: scr ? { width: w > h ? scr[1] : scr[0], height: w > h ? scr[0] : scr[1] } : null, prefs: { mapCell: mc } });
  await ctx.addInitScript(() => {});
  const p = await ctx.newPage();
  p.errors = [];
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); });
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Page.enable');
  await cdp.send('Page.setFontSizes', { fontSizes: { standard: fs, fixed: Math.round(fs * 13 / 16) } });
  await p.goto(`${ctx.origin}/index.html`);
  await p.waitForFunction(() => globalThis.__bt && !document.getElementById('boot'), null, { timeout: 60000 });
  await resume(p);
  await sleep(300);
  const r = await p.evaluate(() => {
    const g = globalThis.__bt.geom, R = (e) => e.getBoundingClientRect();
    const sb = document.getElementById('statband'), mb = document.getElementById('msgband');
    const keys = [...document.querySelectorAll('[data-tw]')].map(R);
    const ov = (a, c) => a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5;
    const rows = [...sb.querySelectorAll('.row')].map(R), bars = sb.querySelector('.bars');
    const sbr = R(sb), mbr = R(mb);
    const content = [...rows, ...(bars ? [R(bars)] : [])];
    const lowest = Math.max(...content.map((q) => q.bottom));
    const widest = Math.max(...[...sb.querySelectorAll('.row')].map((e) => e.scrollWidth));
    const mrows = [...mb.querySelectorAll('.r')].map(R);
    return { ts: g.textScale, over: g.headerOver, rowsMsg: g.msgRows, cell: Math.round(g.cell * 100) / 100,
      sb: [Math.round(sbr.top), Math.round(sbr.bottom), Math.round(sbr.width)], contentBottom: Math.round(lowest * 10) / 10, statusOverflow: Math.round((lowest - (sbr.bottom - parseFloat(getComputedStyle(sb).paddingBottom))) * 10) / 10,
      font: getComputedStyle(sb).fontSize, rowsFit: widest <= sb.clientWidth - 20 + 0.5, widest, avail: sb.clientWidth - 20,
      bars: !!bars, onKey: keys.some((k) => ov(sbr, k) || ov(mbr, k)), msgRowBottom: mrows.length ? Math.round(Math.max(...mrows.map((q) => q.bottom))) : null, mbBottom: Math.round(mbr.bottom) };
  });
  console.log(`fs ${fs} ${mc} ${w}x${h}: ${JSON.stringify(r)}${p.errors.length ? ' ERR ' + p.errors.join('|') : ''}`);
  await p.screenshot({ path: `${SHOTS}/ts-${fs}-${mc}-${w}x${h}-${DPR}.png` });
  await ctx.close();
}
await b.close();
