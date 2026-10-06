// A page full of short messages, the game at --More-- before the next one,
// and the phone turned to the orientation whose band has fewer rows.
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, PHONES } from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const ORIGIN = process.argv[3] || 'http://localhost:8766';
const b = await launch();
for (const tag of ['lucas', 'small', 'p390']) {
  const pr = PHONES.find((x) => x.tag === tag);
  const scrOf = (o) => (o === 'P' ? pr.scr : [pr.scr[1], pr.scr[0]]);
  // first in the orientation with more rows
  const ctx = await newCtx(b, { w: pr.P[0], h: pr.P[1], dpr: DPR, origin: ORIGIN, screen: { width: scrOf('P')[0], height: scrOf('P')[1] }, prefs: {} });
  const p = await openPage(ctx);
  await resume(p);
  const k = await touch(ctx, p);
  const shown = () => p.evaluate(() => ({ rows: [...document.getElementById('msgband').querySelectorAll('.r')].map((e) => e.textContent), more: globalThis.__bt.moreShown, m: globalThis.__bt.bandMetrics() }));
  let rowsP = (await shown()).m.rows;
  // rotate once to learn the landscape rows, then back
  await k.rotate(pr.L[0], pr.L[1], DPR, scrOf('L'));
  let rowsL = (await shown()).m.rows;
  await k.rotate(pr.P[0], pr.P[1], DPR, scrOf('P'));
  let [from, to] = rowsP >= rowsL ? ['P', 'L'] : ['L', 'P'];
  if (from === 'L') await k.rotate(pr.L[0], pr.L[1], DPR, scrOf('L'));
  const R = (await shown()).m.rows;
  await p.evaluate(() => globalThis.__bt.msg.begin());
  const msgs = Array.from({ length: R + 1 }, (_, i) => `Message ${i + 1}.`);
  for (const t of msgs) { await p.evaluate((x) => globalThis.__bt.msg.put(x), t); await p.evaluate(() => globalThis.__bt.msg.settle()); }
  const before = await shown();
  await k.rotate(pr[to][0], pr[to][1], DPR, scrOf(to));
  const after = await shown();
  await k.shot(`${SHOTS}/pagefull-${tag}-${ORIGIN.slice(-4)}-${DPR}.png`);
  await p.evaluate(() => globalThis.__bt.msg.key(32));
  await p.evaluate(() => globalThis.__bt.msg.settle());
  const end = await shown();
  const seen = new Set([...after.rows, ...end.rows]);
  const lost = msgs.filter((t) => !seen.has(t));
  console.log(`${tag} ${ORIGIN.slice(-4)}: rows ${from} ${before.m.rows} -> ${to} ${after.m.rows}; at --More-- before the turn: [${before.rows.join(' | ')}] more=${before.more}; after the turn: [${after.rows.join(' | ')}] more=${after.more}; after Space: [${end.rows.join(' | ')}]; never shown after the turn: ${lost.join(', ') || 'none'}; errors ${p.errors.length}`);
  await p.evaluate(() => globalThis.__bt.msg.end());
  await ctx.close();
}
await b.close();
