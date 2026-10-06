import { launch, newCtx, openPage, resume, sleep, SHOTS } from './common.mjs';
const b = await launch();
for (const [w, h] of [[1280, 800], [1920, 1080], [1366, 768], [2560, 1440], [1024, 600]]) {
  const ctx = await newCtx(b, { w, h, touch: false });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const r = await p.evaluate(() => {
    const g = globalThis.__bt.geom, R = (e) => e.getBoundingClientRect();
    const keys = [...document.querySelectorAll('[data-tw]')].map(R);
    const ov = (a, c) => a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5;
    const mb = R(document.getElementById('msgband')), sb = R(document.getElementById('statband')), mp = R(document.getElementById('map'));
    return { ui: document.documentElement.dataset.ui, twin: !!g.twin, over: g.headerOver, rows: g.msgRows, cell: g.cell, T: globalThis.__bt.view.T,
      mb: [mb.x, mb.y, mb.width, mb.height].map(Math.round), sb: [sb.x, sb.y, sb.width, sb.height].map(Math.round), map: [mp.x, mp.y, mp.width, mp.height].map(Math.round),
      bandsOnKey: keys.some((k) => ov(mb, k) || ov(sb, k)), bandsOverlap: ov(mb, sb), bars: !!document.querySelector('#statband .bars') };
  });
  console.log(`${w}x${h}`, JSON.stringify(r), p.errors.length ? p.errors : '');
  await p.screenshot({ path: `${SHOTS}/desk-${w}x${h}.png` });
  await ctx.close();
}
await b.close();
