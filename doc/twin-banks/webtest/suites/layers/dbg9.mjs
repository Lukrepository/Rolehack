import { launch, newCtx, openPage, resume, touch, sleep } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 360, h: 640, dpr: 1, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
const t = await touch(ctx, p);
await p.evaluate(() => { globalThis.__stk = []; const real = globalThis.__bt.send; window.addEventListener('pointerdown', (e) => globalThis.__stk.push(`down ${e.isTrusted} ${e.target.className || e.target.id} ${e.clientX},${e.clientY}`), true); window.addEventListener('pointerup', (e) => globalThis.__stk.push(`up ${e.target.className || e.target.id}`), true); window.addEventListener('pointercancel', (e) => globalThis.__stk.push(`cancel ${e.target.className || e.target.id}`), true); window.addEventListener('click', (e) => globalThis.__stk.push(`click ${e.target.className || e.target.id}`), true); window.addEventListener('keydown', (e) => globalThis.__stk.push(`key ${e.key}`), true); globalThis.__ev = []; });
for (const [x, y] of [[1.5, 606.25], [1.5, 500], [3, 606]]) {
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await sleep(25);
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await sleep(100);
  console.log(x, y, await p.evaluate(() => ({ stk: globalThis.__stk.splice(0), ev: (globalThis.__ev || []).splice(0) })));
}
await b.close();
