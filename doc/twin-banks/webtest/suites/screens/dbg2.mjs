import { launch, newCtx, openPage, resume, settle, sleep } from './common.mjs';
import { readPage, maxDiff } from './lib.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 1000, h: 600, dpr: 1, touch: false, screen: { width: 2560, height: 1440 } });
const p = await openPage(ctx);
await resume(p);
const scr = () => p.evaluate(() => [screen.width, screen.height, innerWidth, innerHeight]);
console.log('screen', await scr());
for (let h = 598; h >= 420; h -= 2) { await p.setViewportSize({ width: 1000, height: h }); await sleep(40); }
console.log('screen', await scr());
for (const wait of [100, 500, 2000]) {
  await sleep(wait);
  const s = await readPage(p);
  const bad = s.spec.controls.filter(c => !c.behind && s.keys[c.id] && maxDiff(c, s.keys[c.id]) > 0.1).map(c => `${c.id} spec ${[c.x,c.y]} dom ${[s.keys[c.id].x, s.keys[c.id].y]}`);
  const el = await p.evaluate(() => { const e = document.querySelector('#keys [data-tw="pad_b"]'); const k = e.querySelector('.kcap'); return { el: e.style.cssText, kcap: k.style.cssText, keys: document.getElementById('keys').style.cssText }; });
  console.log(wait, s.W, s.H, bad.length, bad.slice(0, 3), el);
}
await b.close();
