// A full page at --More-- (scrollRow 0), the phone turned to an orientation with fewer rows.
import { launch, newCtx, openPage, resume, touch, sleep } from '../header/common.mjs';
const R = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/header-review';
const DPR = Number(process.argv[2] || 1);
const site = process.argv[3] || 'http://localhost:8766';
const b = await launch();
const ctx = await newCtx(b, { w: 443, h: 939, dpr: DPR, screen: { width: 443, height: 939 }, origin: site, prefs: { budgets: {} } });
const p = await openPage(ctx);
await resume(p);
const k = await touch(ctx, p);
await sleep(400);
const shown = () => p.evaluate(() => ({ rows: [...document.querySelectorAll('#msgband .r')].map((e) => e.textContent), more: __bt.moreShown, m: __bt.bandMetrics(), page: __bt.page.map((e) => e.text) }));
await p.evaluate(() => __bt.msg.begin());
const MSGS = ['You hit the newt.  It is a long first line that fills up a row.', 'The newt bites!  And another long line that fills a row.', 'You kill the newt!  A third row of text, long enough to fill it.', 'FOURTH: You see here a +0 dagger, and this fills the fourth row.', 'FIFTH: There is a staircase down here.'];
for (const t of MSGS) {
  await p.evaluate((x) => __bt.msg.put(x), t);
  const r = await p.evaluate(() => __bt.msg.settle());
  if (r === 'waiting') {
    console.log('at --More-- before', JSON.stringify(t.slice(0, 10)), JSON.stringify(await shown()));
    await k.rotate(896, 443, DPR, [939, 443]);
    console.log('turned', JSON.stringify(await shown()));
    await k.shot(`${R}/shots/moreturn-${DPR}.png`);
    await p.evaluate(() => __bt.msg.key(32));
    await p.evaluate(() => __bt.msg.settle());
    console.log('after Space', JSON.stringify(await shown()));
  }
}
console.log('errors', p.errors);
await b.close();
