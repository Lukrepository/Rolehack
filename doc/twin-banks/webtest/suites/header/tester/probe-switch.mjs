// twin -> classic at run time: what the message band shows, on HEAD and on the work
import { launch, newCtx, openPage, resume, touch, sleep, ORIGIN, HEAD } from './common.mjs';
const b = await launch();
const [w, h] = (process.argv[2] || '360x640').split('x').map(Number);
for (const origin of [HEAD, ORIGIN]) for (const cell of ['columns', 'rows']) {
  const ctx = await newCtx(b, { w, h, origin, prefs: { layout: 'twin', mapCell: cell } });
  const p = await openPage(ctx);
  const T = await touch(ctx, p);
  await T.rotate(w, h, 1);
  await resume(p);
  const band = () => p.evaluate(() => ({ rows: [...document.querySelectorAll('#msgband div.r')].map((d) => d.textContent), scroll: globalThis.__T.scrollRow, ui: document.documentElement.dataset.ui, w: document.getElementById('msgband').clientWidth }));
  const before = await band();
  await p.evaluate(async () => { const P = await import('./prefs.js'); P.set('layout', 'classic'); });
  await sleep(700);
  const after = await band();
  console.log(origin === HEAD ? 'HEAD' : 'WORK', cell, JSON.stringify(before), '->', JSON.stringify(after));
  await ctx.close();
}
await b.close();
