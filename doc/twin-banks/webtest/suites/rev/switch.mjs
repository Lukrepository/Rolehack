// twin -> classic at run time against a fresh classic load; classic -> twin against a fresh twin load
import { launch, ctxOptions, openPage, resumeGame, OUT, STATE, sleep } from './common.mjs';
import fs from 'node:fs';
const b = await launch();
const sizes = [[896, 443], [443, 939], [640, 360]];
const grab = (p) => p.evaluate(() => {
  const st = (id) => { const e = document.getElementById(id); return e ? e.getAttribute('style') : null; };
  const cv = document.getElementById('map');
  const keys = [...document.querySelectorAll('#keys button.k')].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return [e.getAttribute('aria-label'), r.x, r.y, r.width, r.height].join(','); });
  return { glass: st('glass'), bands: st('bands'), msg: st('msgband'), stat: st('statband'), chips: st('chips'), map: st('map'), cw: cv.width, ch: cv.height,
    caseHTML: document.getElementById('case').innerHTML.length, caseStyle: st('case'), keysStyle: st('keys'),
    root: { ...document.documentElement.dataset }, rootStyle: document.documentElement.getAttribute('style'),
    meta: document.querySelector('meta[name=viewport]').content, keys, app: document.getElementById('app').getBoundingClientRect().toJSON(),
    view: { ...globalThis.__rh.view, area: globalThis.__rh.view.area } };
});
async function fresh(W, H, layout) {
  const ctx = await b.newContext({ ...ctxOptions(W, H, 'touch'), storageState: STATE });
  const p = await openPage(ctx, { layout });
  await resumeGame(p); await sleep(600);
  return { ctx, p };
}
for (const [W, H] of sizes) {
  const A = await fresh(W, H, 'classic');
  const a = await grab(A.p); await A.p.screenshot({ path: `${OUT}/shots/sw-${W}x${H}-classic-fresh.png` });
  await A.ctx.close();
  const B = await fresh(W, H, 'twin');
  await B.p.evaluate(async () => { const P = await import('./prefs.js'); P.set('layout', 'classic'); });
  await sleep(600);
  const bb = await grab(B.p); await B.p.screenshot({ path: `${OUT}/shots/sw-${W}x${H}-classic-switched.png` });
  console.log(W, H, 'errors', B.p.errors);
  await B.ctx.close();
  const diffs = [];
  for (const k of Object.keys(a)) if (JSON.stringify(a[k]) !== JSON.stringify(bb[k])) diffs.push([k, JSON.stringify(a[k]).slice(0, 300), JSON.stringify(bb[k]).slice(0, 300)]);
  console.log(W, H, 'fresh classic vs twin->classic diffs:', diffs.length);
  for (const d of diffs) console.log('  ', d[0], '\n     fresh:', d[1], '\n     switched:', d[2]);
  const f1 = fs.readFileSync(`${OUT}/shots/sw-${W}x${H}-classic-fresh.png`), f2 = fs.readFileSync(`${OUT}/shots/sw-${W}x${H}-classic-switched.png`);
  console.log('   png identical:', f1.equals(f2));
}
await b.close();
