// A long message, --More-- answered band by band; the phone is turned at the
// K-th --More--.  After the last --More-- is answered the band must show text.
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, PHONES } from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const TAGS = (process.argv[3] || 'lucas,small,p390').split(',');
const WORDS = 'the quick brown fox jumps over a lazy dog while an ancient red dragon breathes fire upon thee and thy faithful kitten'.split(' ');
const msgOf = (n) => Array.from({ length: n }, (_, i) => WORDS[(i * 7) % WORDS.length]).join(' ') + '.';
const b = await launch();
for (const tag of TAGS) for (const first of ['L', 'P']) {
  const pr = [...PHONES, { tag: 'tablet', L: [1024, 768], P: [768, 1024], scr: [768, 1024] }, { tag: 'desk', L: [1366, 768], P: [1024, 768], scr: [768, 1366] }, { tag: 'p412', L: [915, 412], P: [412, 915], scr: [412, 915] }].find((x) => x.tag === tag);
  const scrOf = (o) => (o === 'P' ? pr.scr : [pr.scr[1], pr.scr[0]]);
  let o = first;
  const ctx = await newCtx(b, { w: pr[o][0], h: pr[o][1], dpr: DPR, screen: { width: scrOf(o)[0], height: scrOf(o)[1] }, prefs: {} });
  const p = await openPage(ctx);
  await resume(p);
  const k = await touch(ctx, p);
  const turn = async () => { o = o === 'L' ? 'P' : 'L'; await k.rotate(pr[o][0], pr[o][1], DPR, scrOf(o)); };
  const shown = () => p.evaluate(() => {
    const mb = document.getElementById('msgband');
    return { rows: [...mb.querySelectorAll('.r')].map((e) => e.textContent), more: globalThis.__bt.moreShown, m: globalThis.__bt.bandMetrics(), sr: globalThis.__bt.scrollRow, N: globalThis.__bt.rowsOf(globalThis.__bt.page.map((e) => e.text)).length };
  });
  let bad = 0, cases = 0;
  for (let n = 30; n <= 150; n += 5) for (const K of [2, 3, 4]) {
    if (o !== first) await turn();
    await p.evaluate(() => globalThis.__bt.msg.begin());
    await p.evaluate((x) => globalThis.__bt.msg.put(x), msgOf(n));
    let r = await p.evaluate(() => globalThis.__bt.msg.settle());
    let mores = 0, turned = false, log = [];
    while (r === 'waiting') {
      mores++;
      if (mores === K) { await turn(); turned = true; const s = await shown(); log.push(`turned: sr ${s.sr} N ${s.N} rows ${s.m.rows} shown ${s.rows.length}`); if (s.more && s.N - s.sr <= s.m.rows) log.push(`--More-- on a band that holds the rest (${s.N - s.sr} of ${s.m.rows} rows)`); }
      await p.evaluate(() => globalThis.__bt.msg.key(32));
      r = await p.evaluate(() => globalThis.__bt.msg.settle());
    }
    const s = await shown();
    cases += turned ? 1 : 0;
    const blank = !s.rows.join('').trim();
    if (turned && (blank || log.length > 1)) {
      bad++;
      console.log(`${tag} ${first}-first n=${n} K=${K}: ${blank ? 'BLANK band after the last --More--' : 'shows text'}; final sr ${s.sr} N ${s.N}; ${log.join('; ')}`);
      if (blank && bad < 3) await k.shot(`${SHOTS}/blank-${tag}-${first}-${n}-${K}-${DPR}.png`);
    }
    await p.evaluate(() => globalThis.__bt.msg.end());
  }
  console.log(`${tag} ${first}-first: ${cases} turned cases, ${bad} bad; errors ${p.errors.length ? p.errors.join('|') : 0}`);
  await ctx.close();
}
await b.close();
