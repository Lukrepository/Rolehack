import { launch, ctxOptions, openPage, resumeGame, OUT, STATE, sleep } from './common.mjs';
const b = await launch();
const ctx = await b.newContext({ ...ctxOptions(896, 443, 'touch'), storageState: STATE });
const p = await openPage(ctx, {});
await resumeGame(p);
await sleep(500);
const r = await p.evaluate(async () => {
  const o = globalThis.__rh.overlay;
  const t0 = performance.now();
  for (let i = 0; i < 20; i++) o.rebuild();
  const t1 = performance.now();
  // layout() alone
  const L = await import('./layout.js');
  const t2 = performance.now();
  for (let i = 0; i < 20; i++) L.layout(896, 443, 'touch', o.twin.settings);
  const t3 = performance.now();
  // count of budget writes
  let writes = 0; const orig = localStorage.setItem.bind(localStorage);
  localStorage.setItem = (k, v) => { if (k === 'rh.budgets') writes++; orig(k, v); };
  return { rebuildMs: (t1 - t0) / 20, layoutMs: (t3 - t2) / 20, keys: document.querySelectorAll('#keys button.k').length };
});
console.log(r);
// simulate a window drag resize: many sizes
const sizes = []; for (let w = 896; w > 700; w -= 7) sizes.push([w, 443]);
const t0 = Date.now();
for (const [w, h] of sizes) { await p.setViewportSize({ width: w, height: h }); }
await sleep(300);
console.log('resize steps', sizes.length, 'ms', Date.now() - t0);
const rb = await p.evaluate(() => JSON.parse(localStorage.getItem('rh.budgets')));
console.log('budgets', JSON.stringify(rb));
console.log('errors', p.errors);
await b.close();
