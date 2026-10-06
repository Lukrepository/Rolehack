// The small phone at rest after a kill: two messages on a portrait band of 2
// rows, turned to landscape, whose band is narrower.  node killturn.mjs DPR
import * as C from '../header/fix/common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await C.launch();
for (const origin of (process.env.ORIGINS || 'http://localhost:8766,http://localhost:8779').split(',')) for (const [tag, msgs] of [
  ['small', ['You kill the jackal!', 'You see here a jackal corpse.']],
  ['small', ['You hit the newt.', 'You kill the newt!', 'There is a staircase down here.']],
  ['lucas', ['You hit the jackal.', 'The jackal bites!', 'You kill the jackal!', 'Welcome to experience level 2, you feel more confident now.']],
]) {
  const pr = C.PHONES.find((x) => x.tag === tag);
  const ctx = await C.newCtx(b, { origin, w: pr.P[0], h: pr.P[1], dpr: DPR, screen: { width: pr.scr[0], height: pr.scr[1] }, prefs: {} });
  const p = await C.openPage(ctx);
  await C.resume(p);
  const t = await C.touch(ctx, p);
  await p.evaluate(() => globalThis.__bt.msg.begin());
  for (const m of msgs) {
    await p.evaluate((x) => globalThis.__bt.msg.put(x), m);
    let r = await p.evaluate(() => globalThis.__bt.msg.settle());
    while (r === 'waiting') { await p.evaluate(() => globalThis.__bt.msg.key(32)); r = await p.evaluate(() => globalThis.__bt.msg.settle()); }
  }
  const before = await p.evaluate(() => globalThis.__fx.band());
  await t.rotate(pr.L[0], pr.L[1], DPR, [pr.scr[1], pr.scr[0]]);
  const after = await p.evaluate(() => globalThis.__fx.band());
  const mark = await p.evaluate(() => document.getElementById('msgband').querySelector('.slot') ? document.getElementById('msgband').querySelector('.slot').textContent : '');
  await t.shot(`${C.SHOTS.replace('header/fix', 'hrecheck')}/killturn-${origin.slice(-4)}-${tag}-${msgs.length}-${DPR}.png`);
  console.log(origin.slice(-4), tag, `portrait [${before.join(' | ')}] -> landscape [${after.join(' | ')}] marker "${mark}"`, p.errors);
  await p.evaluate(() => globalThis.__bt.msg.end());
  await ctx.close();
}
await b.close();
