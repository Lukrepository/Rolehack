// REST's cell and keycap rects at 640x360, both densities
import { launch, newCtx, openPage, resume } from './common.mjs';
const b = await launch();
for (const dpr of [1, 2.4375]) {
  const ctx = await newCtx(b, { w: 640, h: 360, dpr, prefs: { budgets: {}, atkSlots: [null, null] } });
  const p = await openPage(ctx); await resume(p);
  console.log(dpr, await p.evaluate(() => { const o = globalThis.__bt.overlay; const r = (e) => { const q = e.getBoundingClientRect(); return [q.x, q.y, q.width, q.height].map((v) => +v.toFixed(2)); };
    const el = o.twinEl('rest'); return { el: el.className, rect: r(el), cap: (({x,y,width,height}) => [x,y,width,height].map((v) => +v.toFixed(2)))(o.twinCapRect('rest')), parent: el.parentElement.id || el.parentElement.className, kids: [...el.querySelectorAll('*')].slice(0,6).map((k) => k.className + ':' + r(k)) , shadow: getComputedStyle(el.querySelector('.kcap') || el).boxShadow }; }));
  await ctx.close();
}
await b.close();
