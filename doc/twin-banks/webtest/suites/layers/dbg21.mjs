// debug: does a held drawer item stay in hand after the lift?  HEAD/WORK, classic/twin
import { launch, newCtx, openPage, resume, touch, sleep, HEAD, WORK } from './common.mjs';
const b = await launch();
for (const [origin, layout] of [[HEAD, 'classic'], [HEAD, 'twin'], [WORK, 'classic'], [WORK, 'twin']]) {
  const ctx = await newCtx(b, { w: 896, h: 443, dpr: 1, origin, prefs: { layout, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p); await sleep(300);
  const t = await touch(ctx, p);
  await p.evaluate(() => globalThis.__bt.overlay.openDrawer('world'));
  await sleep(300);
  const item = await p.evaluate(() => { const k = document.querySelector('#drawer .grid .k'); const r = k.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: item.x, y: item.y }] });
  await sleep(700);
  const during = await p.evaluate(() => globalThis.__bt.overlay.assign?.word || null);
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(200);
  const after = await p.evaluate(() => globalThis.__bt.overlay.assign?.word || null);
  console.log(origin, layout, { during, after });
  await ctx.close();
}
await b.close();
