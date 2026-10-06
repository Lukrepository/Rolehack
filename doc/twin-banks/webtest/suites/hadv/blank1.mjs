// One case: a 390-class phone in landscape (2-row band), a 50-word message,
// turned to portrait (4-row band) at the third --More--, then Space.
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS } from './common.mjs';
const WORDS = 'the quick brown fox jumps over a lazy dog while an ancient red dragon breathes fire upon thee and thy faithful kitten'.split(' ');
const msg = Array.from({ length: 50 }, (_, i) => WORDS[(i * 7) % WORDS.length]).join(' ') + '.';
const b = await launch();
for (const origin of ['http://localhost:8766', 'http://localhost:8779']) for (const DPR of [1, 2.4375]) {
  const ctx = await newCtx(b, { w: 844, h: 390, dpr: DPR, origin, screen: { width: 844, height: 390 } });
  const p = await openPage(ctx);
  await resume(p);
  const k = await touch(ctx, p);
  const shown = () => p.evaluate(() => ({ rows: [...document.getElementById('msgband').querySelectorAll('.r')].map((e) => e.textContent), more: globalThis.__bt.moreShown, R: globalThis.__bt.bandMetrics().rows }));
  await p.evaluate(() => globalThis.__bt.msg.begin());
  await p.evaluate((x) => globalThis.__bt.msg.put(x), msg);
  const log = [];
  let r = await p.evaluate(() => globalThis.__bt.msg.settle()), n = 0;
  while (r === 'waiting') {
    n++;
    if (n === 3) { await k.rotate(390, 844, DPR, [390, 844]); const s = await shown(); log.push(`turned at --More-- 3: ${s.R}-row band shows ${s.rows.length} rows, --More-- ${s.more}`); }
    await p.evaluate(() => globalThis.__bt.msg.key(32));
    r = await p.evaluate(() => globalThis.__bt.msg.settle());
  }
  const s = await shown();
  log.push(`after the last Space: ${s.rows.length} rows [${s.rows.join(' | ')}]`);
  console.log(origin.slice(-4), DPR, log.join('; '), p.errors.length ? p.errors : '');
  await k.shot(`${SHOTS}/blank1-${origin.slice(-4)}-${DPR}.png`);
  await ctx.close();
}
await b.close();
