import { launch, newCtx, openPage, resume, touch, sleep } from './common.mjs';
const b = await launch();
for (const [w, h, dpr] of [[896, 443, 2.4375], [896, 443, 1], [443, 939, 2.4375]]) {
  const ctx = await newCtx(b, { w, h, dpr });
  const p = await openPage(ctx);
  const T = await touch(ctx, p);
  await T.rotate(w, h, dpr);
  await resume(p);
  console.log(w, h, dpr, JSON.stringify(await p.evaluate(() => ({ title: document.getElementById('statband').innerText.split('\n')[0], hist: globalThis.__T.history.slice(-4) }))));
  await ctx.close();
}
await b.close();
