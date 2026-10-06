// A hub's layer held open for 3 s, then lifted: how long does it stay?
// (a count layer held 3 s, for comparison)
import { launch, newCtx, openPage, resume, toucher, sleep } from './common.mjs';
import { cap, state, reset, mark } from './probe.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, prefs: { ghostDeck: { on: false, clean: 3, session: null } } });
const p = await openPage(ctx);
await resume(p);
await p.evaluate(() => { globalThis.__swallowAll = true; });
const t = await toucher(ctx, p);
for (const id of ['combat', 'rest']) {
  const k = await cap(p, id);
  await reset(p); await mark(p);
  await t.start(k.cx, k.cy); await sleep(3000); await t.end();
  const t0 = Date.now();
  const seen = [];
  for (let i = 0; i < 12; i++) {
    const s = await state(p);
    seen.push(`${((Date.now() - t0) / 1000).toFixed(1)}s:${s.fan || (s.layer && s.layer.kind) || '-'}`);
    await sleep(400);
  }
  console.log(id, 'held 3 s, after the lift:', seen.join(' '));
}
await b.close();
