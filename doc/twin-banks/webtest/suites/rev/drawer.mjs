import { launch, ctxOptions, openPage, resumeGame, touchKit, centreOf, OUT, STATE, sleep } from './common.mjs';
const b = await launch();
for (const [W, H] of [[640, 360], [360, 640], [844, 390], [390, 844], [1024, 768], [768, 1024]]) {
  const ctx = await b.newContext({ ...ctxOptions(W, H, 'touch'), storageState: STATE });
  const p = await openPage(ctx, {});
  await resumeGame(p); await sleep(300);
  const T = await touchKit(ctx, p);
  const w = await centreOf(p, 'world');
  await T.tap(w.x, w.y); await sleep(400);
  const r = await p.evaluate(() => {
    const o = globalThis.__rh.overlay, m = o.twin.spec.mapArea, pop = o.twin.spec.popups.find((q) => q.owner === 'world');
    const pr = document.querySelector('#drawer .panel').getBoundingClientRect();
    const cols = getComputedStyle(o.drawerGrid).gridTemplateColumns.split(' ').length;
    const keys = [...o.twin.keys.entries()].map(([id, k]) => [id, (k.el || k).getBoundingClientRect()]);
    const over = keys.filter(([, kr]) => kr.x < pr.right - 0.01 && pr.x < kr.right - 0.01 && kr.y < pr.bottom - 0.01 && pr.y < kr.bottom - 0.01).map(([id]) => id);
    const want = Math.min(420, m.w - 12);
    return { map: m, pop, panel: { x: pr.x, y: pr.y, w: pr.width, h: pr.height }, cols, want, centred: Math.abs((pr.x + pr.width / 2) - (m.x + m.w / 2)), bottomGap: (m.y + m.h) - pr.bottom, over, scroll: o.drawerGrid.scrollHeight > o.drawerGrid.clientHeight };
  });
  console.log(W, H, JSON.stringify(r));
  await p.screenshot({ path: `${OUT}/shots/drawer-${W}x${H}.png` });
  if (p.errors.length) console.log(p.errors);
  await ctx.close();
}
await b.close();
