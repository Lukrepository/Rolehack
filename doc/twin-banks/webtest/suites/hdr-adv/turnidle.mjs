// A full portrait page (4 rows, no --More-- pending), the phone turned to landscape (3 rows).
import * as C from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await C.launch();
const ctx = await C.newCtx(b, { w: 443, h: 939, dpr: DPR, screen: { width: 443, height: 939 }, prefs: { budgets: {} } });
const p = await C.openPage(ctx);
await C.resume(p);
const k = await C.touch(ctx, p);
await C.sleep(400);
const shown = () => p.evaluate(() => [...document.getElementById('msgband').querySelectorAll('.r')].map((e) => e.textContent).join(' / ') + (globalThis.__bt.moreShown ? '  [--More--]' : '') + `  (rows ${globalThis.__bt.bandMetrics().rows}) ` + document.getElementById('msgband').innerText.includes('+'));
await p.evaluate(() => globalThis.__bt.msg.begin());
for (const t of ['You hit the jackal.', 'The jackal bites!', 'You kill the jackal!', 'Welcome to experience level 2.']) {
  await p.evaluate((x) => globalThis.__bt.msg.put(x), t);
  console.log(t, await p.evaluate(() => globalThis.__bt.msg.settle()));
}
console.log('portrait:', await shown());
await k.rotate(896, 443, DPR, [939, 443]);
console.log('landscape:', await shown());
await k.shot(`${C.SHOTS}/turnidle-${DPR}.png`);
await p.evaluate(() => globalThis.__bt.msg.end());
console.log('errors', p.errors);
await b.close();
