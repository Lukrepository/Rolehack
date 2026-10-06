import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, PHONES } from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await launch();
const wins = [[896,443,[443,939]],[443,939,[443,939]],[640,360,[360,640]],[360,640,[360,640]],[1024,768],[768,1024],[1366,768],[915,412,[412,915]]];
for (const mc of ['columns','rows']) for (const [w,h,scr] of wins) {
  const ctx = await newCtx(b, { w, h, dpr: DPR, screen: scr ? { width: w>h?scr[1]:scr[0], height: w>h?scr[0]:scr[1] } : null, touch: true, prefs: { mapCell: mc, budgets: {} } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const r = await p.evaluate(() => {
    const g = globalThis.__bt.geom, R = (id) => { const e = document.getElementById(id); if (!e) return null; const q = e.getBoundingClientRect(); return [Math.round(q.x*10)/10, Math.round(q.y*10)/10, Math.round(q.width*10)/10, Math.round(q.height*10)/10]; };
    const sb = document.getElementById('statband');
    return { over: g.headerOver, rows: g.msgRows, cell: g.cell, mb: R('msgband'), sb: R('statband'), map: R('map'), bars: !!sb.querySelector('.bars'), sbScroll: [sb.scrollHeight, sb.clientHeight], m: globalThis.__bt.bandMetrics(), parent: document.getElementById('bands').parentNode.id, T: globalThis.__bt.view.T, errs: 0 };
  });
  console.log(mc, `${w}x${h}`, JSON.stringify(r), p.errors.length ? p.errors : '');
  await p.screenshot({ path: `${SHOTS}/probe-${mc}-${w}x${h}-${DPR}.png` });
  await ctx.close();
}
await b.close();
