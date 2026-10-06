// a monitor window dragged across 2408 dp: the cell and the panels
import { launch, newCtx, openPage, resume, sleep } from '../tablet/common.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/tablet-review/shots';
const b = await launch();
const ctx = await newCtx(b, { w: 2400, h: 1080, dpr: 1, touch: false, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(300);
const st = () => p.evaluate(() => { const o = globalThis.__bt.overlay, g = globalThis.__bt.geom; return { T: o.twin.info.T, map: [g.map.w, g.map.h].map(Math.round), panels: g.panels.map((q) => `${q.kind}@${Math.round(q.x)},${Math.round(q.y)} ${Math.round(q.w)}x${Math.round(q.h)}`).join(' | ') }; });
for (const w of [2400, 2406, 2408, 2406, 2408, 2412]) {
  await p.setViewportSize({ width: w, height: 1080 }); await sleep(500);
  console.log(`${w}x1080`, JSON.stringify(await st()));
  await p.screenshot({ path: `${OUT}/z11-${w}.png` });
}
console.log('errors', p.errors);
await b.close();
