// rebuild cost on resize: with a full history (256) in the log panel
import { launch, newCtx, openPage, resume, sleep } from '../tablet/common.mjs';
const b = await launch();
const ctx = await newCtx(b, { origin: process.env.ORIGIN || 'http://localhost:8766', w: 1920, h: 1080, dpr: 1, touch: false, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(300);
const fill = async () => p.evaluate(() => { const B = globalThis.__bt; for (let i = 0; i < 300; i++) B.history.push(`Message number ${i}: You hear the footsteps of a guard on patrol, far away to the north.`); });
await p.evaluate(() => {
  const o = globalThis.__bt.overlay; const real = o.rebuild.bind(o);
  globalThis.__rb = [];
  o.rebuild = () => { const t0 = performance.now(); real(); globalThis.__rb.push(performance.now() - t0); };
});
const run = async (tag) => {
  await p.evaluate(() => { globalThis.__rb = []; });
  for (let i = 0; i < 20; i++) { await p.setViewportSize({ width: 1900 - i * 5, height: 1080 }); await sleep(60); }
  const r = await p.evaluate(() => globalThis.__rb);
  const avg = r.reduce((a, b) => a + b, 0) / r.length;
  console.log(tag, 'rebuilds', r.length, 'avg ms', avg.toFixed(1), 'max', Math.max(...r).toFixed(1));
};
await run('short history');
await fill();
await p.keyboard.press(':'); await sleep(400);
await run('history 256+');
// classic for comparison
await p.evaluate(() => { globalThis.__bt.P.set('layout', 'classic'); globalThis.__bt.overlay.rebuild(); });
await run('classic');
console.log('errors', p.errors);
await b.close();
