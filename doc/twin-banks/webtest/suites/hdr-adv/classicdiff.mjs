import * as C from './common.mjs';
import fs from 'node:fs';
const b = await C.launch();
const res = [];
for (const [W, H, dpr] of [[896,443,1],[443,939,1],[896,443,2.4375],[1024,768,1]]) {
  const shots = [];
  for (const origin of ['http://localhost:8766', 'http://localhost:8769']) {
    const ctx = await C.newCtx(b, { w: W, h: H, dpr, origin, screen: H > W ? { width: W, height: H } : { width: H, height: W }, prefs: { budgets: {}, layout: 'classic' } });
    const p = await C.openPage(ctx);
    await C.resume(p);
    await C.sleep(800);
    await p.evaluate(() => { const s = document.createElement('style'); s.textContent = '*{animation:none!important;transition:none!important;caret-color:transparent!important}'; document.head.appendChild(s); });
    await C.sleep(300);
    const buf = await p.screenshot();
    const rects = await p.evaluate(() => ['glass','bands','msgband','statband','chips','map'].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return [id, r.x, r.y, r.width, r.height].join(' '); }).join('|'));
    shots.push({ buf, rects, errors: p.errors });
    await ctx.close();
  }
  console.log(W, H, dpr, 'png identical:', Buffer.compare(shots[0].buf, shots[1].buf) === 0, 'rects identical:', shots[0].rects === shots[1].rects, shots[0].errors, shots[1].errors);
  if (shots[0].rects !== shots[1].rects) console.log(' work', shots[0].rects, '\n head', shots[1].rects);
  fs.writeFileSync(`${C.SHOTS}/classic-work-${W}x${H}-${dpr}.png`, shots[0].buf); fs.writeFileSync(`${C.SHOTS}/classic-head-${W}x${H}-${dpr}.png`, shots[1].buf);
}
await b.close();
