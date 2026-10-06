import * as C from './common.mjs';
const b = await C.launch();
for (const [origin, layout, W, H] of [['http://localhost:8766','twin',896,443],['http://localhost:8766','twin',443,939],['http://localhost:8766','classic',896,443]]) {
  const ctx = await C.newCtx(b, { w: W, h: H, dpr: 1, origin, screen: H > W ? { width: W, height: H } : { width: H, height: W }, prefs: { budgets: {}, layout } });
  const p = await C.openPage(ctx);
  await C.resume(p);
  const k = await C.touch(ctx, p);
  await C.sleep(400);
  const out = [];
  for (const dy of [4, 24, 44]) {
    await p.evaluate(() => { globalThis.__ev = []; globalThis.__bt.chips(['i']); });
    const r = await p.evaluate(() => { const q = document.querySelector('#chips button').getBoundingClientRect(); return [q.x, q.y, q.width, q.height]; });
    await k.tap(r[0] + r[2] / 2, r[1] + dy);
    await C.sleep(800);
    const ev = await p.evaluate(() => globalThis.__ev.map((e) => e.key !== undefined ? String.fromCharCode(e.key) : JSON.stringify(e)).join(''));
    const t = await p.evaluate(() => document.getElementById('modal-title').textContent);
    out.push(`dy${dy}:${ev}${ev.length > 1 ? ` -> "${t}"` : ''}`);
    for (let n = 0; n < 3; n++) { await p.keyboard.press('Escape'); await C.sleep(250); }
  }
  console.log(origin.slice(-4), layout, `${W}x${H}`, out.join('  '), p.errors);
  await ctx.close();
}
await b.close();
