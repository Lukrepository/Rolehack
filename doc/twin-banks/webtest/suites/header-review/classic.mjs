import { launch, newCtx, openPage, resume, sleep } from '../header/common.mjs';
import fs from 'node:fs';
const R = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/header-review';
const DPR = Number(process.argv[2] || 1);
const b = await launch();
const dump = (p) => p.evaluate(() => {
  const ids = ['bands', 'msgband', 'statband', 'chips', 'morelamp', 'map', 'glass'];
  const o = {};
  for (const id of ids) { const e = document.getElementById(id); if (!e) continue; const q = e.getBoundingClientRect(); o[id] = { parent: e.parentNode.id, style: e.getAttribute('style'), r: [q.x, q.y, q.width, q.height].map((v) => +v.toFixed(2)), cls: e.className, data: JSON.stringify(e.dataset) }; }
  o.msgHTML = document.getElementById('msgband').innerHTML.length; o.stat = document.getElementById('statband').innerHTML;
  return o;
});
for (const [w, h] of [[896, 443], [915, 412]]) {
  // HEAD classic
  const c1 = await newCtx(b, { w, h, dpr: DPR, origin: 'http://localhost:8768', prefs: { layout: 'classic' } });
  const p1 = await openPage(c1); await resume(p1); await sleep(500);
  const d1 = await dump(p1); await p1.screenshot({ path: `${R}/shots/cl-head-${w}x${h}.png` }); await c1.close();
  // work: rows (over) then classic
  const c2 = await newCtx(b, { w, h, dpr: DPR, prefs: { mapCell: 'rows' } });
  const p2 = await openPage(c2); await resume(p2); await sleep(500);
  console.log('over?', await p2.evaluate(() => __bt.geom.headerOver));
  await p2.evaluate(() => { localStorage.setItem('rh.layout', JSON.stringify('classic')); });
  // through the pref
  await p2.evaluate(async () => { const m = await import('./prefs.js'); m.set('layout', 'classic'); });
  await sleep(800);
  const d2 = await dump(p2); await p2.screenshot({ path: `${R}/shots/cl-work-${w}x${h}.png` });
  for (const k of Object.keys(d1)) if (JSON.stringify(d1[k]) !== JSON.stringify(d2[k])) console.log(w, h, 'DIFF', k, JSON.stringify(d1[k]).slice(0, 300), '\n   vs', JSON.stringify(d2[k]).slice(0, 300));
  console.log('errors', p2.errors);
  await c2.close();
}
await b.close();
