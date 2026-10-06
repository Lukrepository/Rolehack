// Does Chrome's touch adjustment move a fat touch near a key onto it?
import { launch, newCtx, openPage, resume, touch, sleep } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, dpr: 1, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
const t = await touch(ctx, p);
if (process.env.CAPNONE) await p.addStyleTag({ content: '.k > .cap { pointer-events: none; }' });
await p.evaluate(() => { globalThis.__pe = []; window.addEventListener('pointerdown', (e) => globalThis.__pe.push((e.isTrusted ? '' : 'fwd ') + `${e.clientX},${e.clientY} w${e.width}:${(e.target.closest('[data-tw]') || e.target).dataset?.tw || e.target.id || e.target.className}`), true); });
const run = async (pts, r) => {
  await p.evaluate(() => { globalThis.__pe = []; });
  for (const [x, y] of pts) {
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, radiusX: r, radiusY: r }] }); await sleep(15);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await sleep(15);
  }
  return (await p.evaluate(() => globalThis.__pe)).join('  ');
};
// pad_l keycap: x 150..208, y 301..359; the halo 208..220; the map from 220 (ring to 240)
const pts = [[212, 330], [216, 330], [218, 330], [222, 330], [226, 330], [230, 330], [236, 330], [250, 330]];
for (const r of [1, 5, 10, 15, 20]) console.log(`r${r}:`, await run(pts, r));
await b.close();
