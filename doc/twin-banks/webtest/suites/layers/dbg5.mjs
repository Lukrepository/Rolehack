import { launch, newCtx, openPage, resume, touch, sleep } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, dpr: 1, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
const t = await touch(ctx, p);
if (process.env.CAPNONE) await p.addStyleTag({ content: '.k > .cap { pointer-events: none; }' });
await p.evaluate(() => { globalThis.__pe = []; window.addEventListener('pointerdown', (e) => globalThis.__pe.push(`${e.clientX},${e.clientY}:${(e.target.closest('[data-tw]') || e.target).dataset?.tw || e.target.id || e.target.className}`), true); });
const run = async (pts) => {
  await p.evaluate(() => { globalThis.__pe = []; });
  for (const [x, y] of pts) {
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await sleep(15);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await sleep(15);
  }
  return (await p.evaluate(() => globalThis.__pe)).join('  ');
};
console.log('rows msgs|pad_y at x=40 (boundary 227):', await run([[40, 225], [40, 226], [40, 227], [40, 227.5], [40, 228], [40, 229], [40, 229.5], [40, 230]]));
console.log('rows rest|game at x=40 (boundary 122):', await run([[40, 120], [40, 121], [40, 122], [40, 123], [40, 124], [40, 125]]));
console.log('cols pad_y|pad_k at y=264 (boundary 80):', await run([[77, 264], [78, 264], [79, 264], [80, 264], [81, 264], [82, 264], [83, 264]]));
console.log('cols msgs|drop at y=200 (boundary 80):', await run([[77, 200], [78, 200], [79, 200], [80, 200], [81, 200], [82, 200]]));
console.log('rows pad_y|pad_h (boundary 297):', await run([[40, 295], [40, 296], [40, 297], [40, 298], [40, 299]]));
await b.close();
