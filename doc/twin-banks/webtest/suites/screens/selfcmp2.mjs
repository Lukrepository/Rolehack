// 5 loads each of WORK and HEAD at 443x859 (no panels): which of two corner renderings each gets
import { launch, newCtx, openPage, resume, sleep, WORK, HEAD } from './common.mjs';
import fs from 'node:fs';
const b = await launch();
const cmp = await (await b.newContext()).newPage();
const px = (png) => cmp.evaluate(async (src) => { const i = new Image(); await new Promise((r) => { i.onload = r; i.src = src; });
  const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return [...g.getImageData(435, 497, 1, 1).data.slice(0, 3)].join(','); }, 'data:image/png;base64,' + png.toString('base64'));
const out = { work: [], head: [] };
for (let k = 0; k < 5; k++) for (const [name, origin] of [['work', WORK], ['head', HEAD]]) {
  const ctx = await newCtx(b, { w: 443, h: 859, dpr: 1, touch: true, origin, screen: { width: 443, height: 939 } });
  const p = await openPage(ctx); await resume(p); await sleep(700);
  out[name].push(await px(await p.screenshot()));
  await ctx.close();
}
console.log(JSON.stringify(out));
await b.close();
