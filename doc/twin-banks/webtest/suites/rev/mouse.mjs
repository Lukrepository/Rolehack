import { launch, ctxOptions, openPage, resumeGame, OUT, STATE, sleep } from './common.mjs';
import { measure } from './measure.mjs';
const b = await launch();
for (const [W, H] of [[400, 800], [800, 600], [1280, 720], [600, 400]]) {
  const ctx = await b.newContext({ ...ctxOptions(W, H, 'mouse'), screen: { width: 1920, height: 1080 }, storageState: STATE });
  const p = await openPage(ctx, {});
  await resumeGame(p); await sleep(400);
  const m = await measure(p);
  const info = await p.evaluate(() => { const o = globalThis.__rh.overlay; return { ui: document.documentElement.dataset.ui, fb: o.twinFallback, pointer: o.twin && o.twin.pointer, fit: o.twin && o.twin.spec.fit, cell: o.twin && o.twin.info.T, pad: o.twin && o.tw('pad_k') }; });
  console.log(W, H, JSON.stringify(info), m.twin ? `bad ${m.bad.length} ${m.bad.slice(0,3).join(' | ')}` : '', p.errors);
  await p.screenshot({ path: `${OUT}/shots/mouse-${W}x${H}.png` });
  await ctx.close();
}
await b.close();
