// Load the restored game at each test window, report console errors, the
// cells and halos built, and take a screenshot.  node smoke.mjs
import { launch, newCtx, openPage, resume, SHOTS, sleep } from './common.mjs';
const WINS = [[896, 443], [443, 939], [360, 640], [390, 844]];
const b = await launch();
for (const [w, h] of WINS) {
  const ctx = await newCtx(b, { w, h, dpr: 1 });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(500);
  const info = await p.evaluate(() => {
    const o = globalThis.__bt.overlay;
    const n = (sel) => document.querySelectorAll(sel).length;
    return { ui: document.documentElement.dataset.ui, halos: n('#keys > .halo'), seams: n('#keys > .seam'), caps: n('.k > .cap'),
      cells: o.twin ? o.twin.guard.cells.size : 0, pin2: o.atkSlotKeys };
  });
  await p.screenshot({ path: `${SHOTS}/smoke-${w}x${h}.png` });
  console.log(w, h, JSON.stringify(info), 'errors:', p.errors);
  await ctx.close();
}
await b.close();
