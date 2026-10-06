import { launch, newCtx, openPage, resume, sleep } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, dpr: 1 });
const p = await openPage(ctx);
await resume(p);
const r = await p.evaluate(() => {
  const o = globalThis.__bt.overlay, f = (q) => [q.x, q.y, q.w ?? q.width, q.h ?? q.height].map((v) => Math.round(v * 10) / 10).join(',');
  return ['world', 'rest', 'm3', 'keys', 'pad_y', 'msgs', 'apply'].map((id) => {
    const e = o.twinEl(id);
    return `${id} spec ${f(o.tw(id))} cell ${f(o.twin.guard.cells.get(id))} el ${f(e.getBoundingClientRect())} cap ${f(o.twinCapRect(id))} style ${e.style.left} ${e.style.top} ${e.style.width} ${e.style.height}`;
  });
});
console.log(r.join('\n'));
await b.close();
