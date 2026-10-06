// A real turn of several messages (#pray at turn 1), paged through --More--
// by taps on the status band, the phone turned at the first --More--.
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, evs, clearEvs } from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await launch();
for (const [mc, turnAt] of [['rows', 0], ['rows', 1], ['columns', 0], ['columns', 1]]) {
  const ctx = await newCtx(b, { w: 896, h: 443, dpr: DPR, screen: { width: 939, height: 443 }, prefs: { mapCell: mc } });
  const p = await openPage(ctx);
  await resume(p);
  const k = await touch(ctx, p);
  let o = 'L';
  const turn = async () => { o = o === 'L' ? 'P' : 'L'; if (o === 'P') await k.rotate(443, 939, DPR, [443, 939]); else await k.rotate(896, 443, DPR, [939, 443]); };
  const st = () => p.evaluate(() => ({ rows: [...document.getElementById('msgband').querySelectorAll('.r')].map((e) => e.textContent), more: globalThis.__bt.moreShown, modal: globalThis.__bt.modalOpen, chips: [...document.querySelectorAll('#chips button')].map((e) => e.textContent), mrows: globalThis.__bt.bandMetrics().rows, waiting: globalThis.__bt.waiting }));
  await p.evaluate(() => globalThis.__bt.send('#pray\n'));
  await sleep(800);
  let s = await st();
  const log = [`start: modal ${s.modal} chips ${s.chips.join('')} rows [${s.rows.join(' | ')}]`];
  if (s.modal) { await p.keyboard.press('y'); await sleep(800); s = await st(); log.push(`after y: [${s.rows.join(' | ')}] more ${s.more}`); }
  else if (s.chips.includes('y')) { await p.evaluate(() => globalThis.__bt.send('y')); await sleep(800); s = await st(); log.push(`after y: [${s.rows.join(' | ')}] more ${s.more}`); }
  let n = 0;
  const seen = [];
  while (s.more && n < 12) {
    seen.push(...s.rows);
    if (n === turnAt) { await turn(); s = await st(); log.push(`turned ${o}: [${s.rows.join(' | ')}] more ${s.more} rows ${s.mrows}`); seen.push(...s.rows); }
    const q = await p.evaluate(() => { const r = document.getElementById('statband').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await k.tap(q[0], q[1]);
    await sleep(600);
    s = await st();
    n++;
    log.push(`tap ${n}: [${s.rows.join(' | ')}] more ${s.more}`);
  }
  seen.push(...s.rows);
  const hist = await p.evaluate(() => globalThis.__bt.history.slice(-8));
  const joined = seen.join(' ').replace(/\s+/g, ' ');
  const unseen = hist.filter((h) => /pray|Tyr|feel|finish|shimmer|You/.test(h) && !joined.includes(h.replace(/\s+/g, ' ').slice(0, 20)));
  console.log(`${mc} turn@${turnAt} @${DPR}:\n  ${log.join('\n  ')}\n  history: ${JSON.stringify(hist)}\n  not seen on the band: ${JSON.stringify(unseen)}  errors ${p.errors.length}`);
  await k.shot(`${SHOTS}/pray-${mc}-${turnAt}-${DPR}.png`);
  await ctx.close();
}
await b.close();
