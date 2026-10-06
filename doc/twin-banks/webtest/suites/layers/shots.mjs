// Screenshots of the guard for review, at the stage's four windows: a ring
// preview (a real tap 22 dp off a key: the cell outlined), the halo's and a
// seam's swallow flash (a real touch in each; the shot is taken while the
// finger is still down, inside the 150 ms flash), and the guard's log.
//   node shots.mjs [dpr]  -> shots/review-<dpr>-<W>x<H>-{ring,halo,seam}.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS } from './common.mjs';
import { capOf } from './kit.mjs';
const DPR = Number(process.argv[2] || 1);
const WINS = [[896, 443], [443, 939], [360, 640], [390, 844]];
const b = await launch();
for (const [w, h] of WINS) {
  const ctx = await newCtx(b, { w, h, dpr: DPR, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p); await sleep(300);
  const t = await touch(ctx, p);
  await p.evaluate(() => { globalThis.__swallowClicks = true; globalThis.__bt.overlay.guardLog = []; });
  const tag = `${SHOTS}/review-${DPR}-${w}x${h}`;
  // a ring point: 20-26 dp from the nearest keycap, on the level
  const ring = await p.evaluate(() => {
    const o = globalThis.__bt.overlay, v = globalThis.__bt.view, m = o.twin.spec.mapArea, r = document.getElementById('map').getBoundingClientRect();
    for (let y = m.y + m.h - 4; y > m.y; y -= 2) for (let x = m.x + 4; x < m.x + m.w - 4; x += 2) {
      const d = o.keyDistance(x, y);
      const cx = Math.floor((x - r.left - v.left) / v.T), cy = Math.floor((y - r.top - v.top) / v.T);
      if (d >= 20 && d <= 26 && cx >= 0 && cx < 80 && cy >= 0 && cy < 21) return { x, y, d };
    }
    return null;
  });
  if (ring) { await t.tap(ring.x, ring.y); await sleep(150); await t.shot(`${tag}-ring.png`); await sleep(2200); }
  // the halo: 10 dp off the left bank's inner side, at the pad's middle row
  const pl = await capOf(p, 'pad_l');
  const outerLeft = await p.evaluate(() => globalThis.__bt.overlay.twin.guard.banks.L.outerLeft);
  const hp = { x: outerLeft ? pl.x + pl.w + 10 : pl.x - 10, y: pl.cy };
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [hp] });
  await sleep(30); await t.shot(`${tag}-halo.png`);
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300);
  // a seam: between SEARCH and APPLY
  const sc = await capOf(p, 'search'), ap = await capOf(p, 'apply');
  const sp = { x: ap.x > sc.x ? (sc.x + sc.w + ap.x) / 2 : (ap.x + ap.w + sc.x) / 2, y: sc.cy };
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [sp] });
  await sleep(30); await t.shot(`${tag}-seam.png`);
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(300);
  const log = await p.evaluate(() => (globalThis.__bt.overlay.guardLog || []).map((g) => `${g.what}${g.id ? `:${g.id}` : ''}@${g.x},${g.y}`));
  console.log(`${w}x${h}@${DPR}: ring ${ring ? `${ring.x},${ring.y} (${ring.d.toFixed(1)} dp)` : 'none'}; log ${log.join(' ')}; errors ${p.errors.length}`);
  await ctx.close();
}
await b.close();
