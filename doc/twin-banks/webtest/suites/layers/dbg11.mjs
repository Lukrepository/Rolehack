import { launch, newCtx, openPage, resume, sleep, HEAD, WORK } from './common.mjs';
const b = await launch();
for (const origin of [HEAD, WORK]) {
  const ctx = await newCtx(b, { w: 360, h: 640, dpr: 1, origin, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(500);
  console.log(origin, await p.evaluate(() => {
    const o = globalThis.__bt.overlay, k = o.twin.keys.get('eq_remove');
    const cs = (e, props) => props.map((q) => `${q}=${getComputedStyle(e)[q]}`).join(' ');
    return [cs(k.tp, ['left', 'right', 'width', 'min-width', 'box-sizing', 'display']), cs(k.lg, ['width', 'max-width', 'font-size']), k.lg.scrollWidth, (k.capEl || k.el).getBoundingClientRect().width].join(' | ');
  }));
  await ctx.close();
}
await b.close();
