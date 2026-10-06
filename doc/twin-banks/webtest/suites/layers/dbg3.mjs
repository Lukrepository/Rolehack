import { launch, newCtx, openPage, resume } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, dpr: 1 });
const p = await openPage(ctx);
await resume(p);
console.log(await p.evaluate(() => {
  const id = (x, y) => { const n = document.elementFromPoint(x, y); return (n.closest('[data-tw]') || n).dataset?.tw || n.className; };
  const xs = []; for (let x = 79; x <= 80.01; x += 0.1) xs.push(Math.round(x * 100) / 100);
  return [100, 110].map((y) => xs.map((x) => `${x}:${id(x, y)}`).join(' ')).join('\n');
}));
await b.close();
