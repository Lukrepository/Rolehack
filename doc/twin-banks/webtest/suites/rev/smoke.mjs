import { launch, ctxOptions, openPage, resumeGame, OUT, STATE, sleep } from './common.mjs';
const b = await launch();
for (const [W, H] of [[896, 443], [443, 939]]) {
  const ctx = await b.newContext({ ...ctxOptions(W, H, 'touch'), storageState: STATE });
  const p = await openPage(ctx, {});
  await resumeGame(p);
  await sleep(500);
  await p.screenshot({ path: `${OUT}/shots/smoke-${W}x${H}.png` });
  const info = await p.evaluate(() => ({ ui: document.documentElement.dataset.ui, fb: globalThis.__rh.overlay.twinFallback, map: globalThis.__rh.geom.map, glass: globalThis.__rh.geom.glass, cell: globalThis.__rh.geom.cell, T: globalThis.__rh.view.T }));
  console.log(W, H, JSON.stringify(info), p.errors);
  await ctx.close();
}
await b.close();
