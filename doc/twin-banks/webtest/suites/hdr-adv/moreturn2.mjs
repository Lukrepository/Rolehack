// A full portrait page (4 rows) at --More--, the phone turned to landscape (3 rows).
import * as C from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const FIRST = process.argv[3] || 'P';
const b = await C.launch();
const pr = { P: [443, 939], L: [896, 443] };
let o = FIRST;
const ctx = await C.newCtx(b, { origin: process.env.ORIGIN || C.WORK, w: pr[o][0], h: pr[o][1], dpr: DPR, screen: { width: 443, height: 939 }, prefs: { budgets: {} } });
const p = await C.openPage(ctx);
await C.resume(p);
const k = await C.touch(ctx, p);
await C.sleep(400);
const shown = () => p.evaluate(() => [...document.getElementById('msgband').querySelectorAll('.r')].map((e) => e.textContent).join(' / ') + (globalThis.__bt.moreShown ? '  [--More--]' : '') + `  (rows ${globalThis.__bt.bandMetrics().rows})`);
await p.evaluate(() => globalThis.__bt.msg.begin());
const rowsN = FIRST === 'P' ? 4 : 3;
const msgs = ['You hit the jackal.', 'The jackal bites!', 'You kill the jackal!', 'Welcome to experience level 2.', 'You feel more confident.', 'You see here a jackal corpse.'];
const log = [];
for (const [i, t] of msgs.entries()) {
  await p.evaluate((x) => globalThis.__bt.msg.put(x), t);
  let r = await p.evaluate(() => globalThis.__bt.msg.settle());
  while (r === 'waiting') {
    log.push(`at msg ${i} --More--: ${await shown()}`);
    if (!log.turned) {
      log.turned = true;
      o = o === 'P' ? 'L' : 'P';
      await k.rotate(pr[o][0], pr[o][1], DPR, o === 'P' ? [443, 939] : [939, 443]);
      log.push(`  turned to ${pr[o].join('x')}: ${await shown()}`);
      await k.shot(`${C.SHOTS}/moreturn2-${FIRST}-${DPR}.png`);
    }
    await p.evaluate(() => globalThis.__bt.msg.key(32));
    r = await p.evaluate(() => globalThis.__bt.msg.settle());
    log.push(`  after Space: ${await shown()}`);
  }
}
log.push(`end: ${await shown()}`);
await p.evaluate(() => globalThis.__bt.msg.end());
console.log(log.join('\n'));
console.log('errors', p.errors);
await b.close();
