import { launch, newCtx, openPage, resume, touch, sleep } from './common.mjs';
import { capOf } from './kit.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, dpr: 1, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
const t = await touch(ctx, p);
const cdp = t.cdp, ev = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
await p.evaluate(() => { globalThis.__pe = []; for (const ty of ['pointerdown', 'pointerup', 'pointercancel']) window.addEventListener(ty, (e) => globalThis.__pe.push(`${ty} ${e.pointerId} ${Math.round(e.clientX)},${Math.round(e.clientY)}`), true); });
const A = { x: 700, y: 100 }, B = { x: 300, y: 300 };
for (const [name, steps] of [
  ['ids 5,6 move[A]', [['touchStart', [{ ...A, id: 5 }]], ['touchStart', [{ ...A, id: 5 }, { ...B, id: 6 }]], ['touchMove', [{ ...A, id: 5 }]], ['touchEnd', []]]],
  ['B first', [['touchStart', [{ ...A, id: 0 }]], ['touchStart', [{ ...B, id: 1 }, { ...A, id: 0 }]], ['touchMove', [{ ...A, id: 0 }]], ['touchEnd', []]]],
  ['start[A] after', [['touchStart', [{ ...A, id: 0 }]], ['touchStart', [{ ...A, id: 0 }, { ...B, id: 1 }]], ['touchStart', [{ ...A, id: 0 }]], ['touchEnd', []]]],
]) {
  await p.evaluate(() => { globalThis.__pe = []; });
  for (const [ty, pts] of steps) { await ev(ty, pts); await sleep(60); }
  await sleep(100);
  console.log(name, await p.evaluate(() => globalThis.__pe.join(' | ')));
}
await b.close();
