// A prompt chip that opens a menu under the finger: does the touch's click pick in it?
import * as C from './common.mjs';
const b = await C.launch();
for (const [origin, layout, W, H] of [['http://localhost:8766','twin',896,443],['http://localhost:8769','twin',896,443],['http://localhost:8766','twin',443,939],['http://localhost:8769','twin',443,939],['http://localhost:8766','classic',896,443],['http://localhost:8769','classic',896,443]]) {
  const ctx = await C.newCtx(b, { w: W, h: H, dpr: 1, origin, screen: H > W ? { width: W, height: H } : { width: H, height: W }, prefs: { budgets: {}, layout } });
  const p = await C.openPage(ctx);
  await C.resume(p);
  const k = await C.touch(ctx, p);
  await C.sleep(400);
  await C.clearEvs(p);
  await p.keyboard.press('e');
  await C.sleep(700);
  const bs = await p.evaluate(() => [...document.querySelectorAll('#chips button')].map((b) => { const r = b.getBoundingClientRect(); return [b.textContent, r.x + r.width / 2, r.y + r.height / 2]; }));
  const q = bs.find((x) => x[0] === '?');
  if (!q) { console.log(origin, layout, 'no ? chip', bs.map(x=>x[0])); await ctx.close(); continue; }
  await k.tap(q[1], q[2]);
  await C.sleep(900);
  const ev = await C.evs(p);
  const st = await p.evaluate(() => ({ modal: globalThis.__bt.modalOpen, msg: document.getElementById('msgband').innerText.replace(/\n/g,' / '), st: document.getElementById('statband').innerText.split('\n').find(l=>/T:/.test(l)) }));
  await k.shot(`${C.SHOTS}/chipghost-${origin.slice(-4)}-${layout}-${W}x${H}.png`);
  console.log(origin.slice(-4), layout, `${W}x${H}`, 'chip ? at', q.slice(1).map(Math.round), 'events', JSON.stringify(ev), JSON.stringify(st));
  await ctx.close();
}
await b.close();
