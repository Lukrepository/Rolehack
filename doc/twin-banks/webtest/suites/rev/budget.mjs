import { launch, ctxOptions, openPage, resumeGame, OUT, STATE, sleep } from './common.mjs';
import { measure } from './measure.mjs';
const b = await launch();
for (const [W, H, sw, sh, tag] of [[390, 664, 390, 844, 'iPhone 12-14 Safari, first visit in portrait'], [390, 664, 390, 664, 'same window, screen=window'], [412, 787, 412, 915, 'Android 412 class, 3-button nav, portrait tab'], [375, 553, 375, 667, 'iPhone SE Safari portrait']]) {
  const ctx = await b.newContext({ ...ctxOptions(W, H, 'touch'), screen: { width: sw, height: sh }, storageState: STATE });
  const p = await openPage(ctx, {});
  await resumeGame(p); await sleep(400);
  const m = await measure(p);
  const info = await p.evaluate(() => { const o = globalThis.__rh.overlay; return { ui: document.documentElement.dataset.ui, fb: o.twinFallback, budget: o.twin && o.twin.settings.budget, pad: o.twin && o.twin.spec.fit, cell: o.twin && o.twin.info.T, map: o.twin && o.twin.spec.mapArea, padKey: o.twin && o.tw('pad_k') }; });
  console.log(tag, W, H, JSON.stringify(info), m.twin ? `bad ${m.bad.length}` : '', p.errors);
  await p.screenshot({ path: `${OUT}/shots/budget-${W}x${H}-${sw}x${sh}.png` });
  await ctx.close();
}
await b.close();
