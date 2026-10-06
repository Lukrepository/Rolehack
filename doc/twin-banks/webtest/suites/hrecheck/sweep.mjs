// One long message, the phone turned at its k-th --More--: the band is read at
// every --More--, right after the message's paging ends (before anything else
// is put), and after a second turn at rest.  Fails on an empty band, a band
// at rest that does not show the message's last row, or letters never shown.
// One page per phone and first orientation, reused across runs.
// node sweep.mjs DPR [origin]
import * as C from '../header/fix/common.mjs';
const DPR = Number(process.argv[2] || 1);
const ORIGIN = process.argv[3] || C.WORK;
const SUF = ['', 'a', 'bb', 'ccc', 'dddd'];
const words = (n) => Array.from({ length: n }, (_, j) => `w${j}${SUF[j % 5]}`).join(' ') + '.';
const b = await C.launch();
let runs = 0, bad = 0;
const fails = [];
for (const tag of (process.env.TAGS || 'p390,p412,small,lucas').split(',')) {
  const pr = C.PHONES.find((x) => x.tag === tag);
  const scr = { P: pr.scr, L: [pr.scr[1], pr.scr[0]] };
  for (const first of ['L', 'P']) {
    let o = first;
    const ctx = await C.newCtx(b, { origin: ORIGIN, w: pr[o][0], h: pr[o][1], dpr: DPR, screen: { width: scr[o][0], height: scr[o][1] }, prefs: {} });
    const p = await C.openPage(ctx);
    await C.resume(p);
    const t = await C.touch(ctx, p);
    const turnTo = async (to) => { if (o !== to) { o = to; await t.rotate(pr[o][0], pr[o][1], DPR, scr[o]); } };
    for (let n = 20; n <= 150; n += 10) for (let k = 1; k <= 8; k++) {
      await turnTo(first);
      await p.evaluate(() => globalThis.__bt.msg.begin());
      const probs = [], got = [];
      let total = 0, mores = 0, turned = false;
      const look = async (when, wantEnd) => {
        const s = await p.evaluate(() => globalThis.__fx.shown());
        total = Math.max(total, s.total);
        got.push(...s.ranges);
        if (!s.dom.join('').trim()) probs.push(`empty band ${when} (sr ${s.lo}, rows ${s.n})`);
        if (wantEnd && s.hi !== s.n) probs.push(`${when}: rows ${s.lo}-${s.hi - 1} of ${s.n}`);
      };
      await p.evaluate((x) => globalThis.__bt.msg.put(x), words(n));
      let r = await p.evaluate(() => globalThis.__bt.msg.settle());
      while (r === 'waiting') {
        mores++;
        await look(`at --More-- ${mores}`);
        if (mores === k) { await turnTo(first === 'L' ? 'P' : 'L'); turned = true; await look(`at --More-- ${mores}, turned`); }
        await p.evaluate(() => globalThis.__bt.msg.key(32));
        r = await p.evaluate(() => globalThis.__bt.msg.settle());
        if (mores > 60) { probs.push('runaway'); break; }
      }
      if (!turned) { await p.evaluate(() => globalThis.__bt.msg.end()); break; }
      runs++;
      await look('right after the paging', true);
      await turnTo(o === 'L' ? 'P' : 'L');
      await look('at rest, turned back', true);
      got.sort((x, y) => x[0] - y[0]);
      let at = 0;
      for (const [a, z] of got) { if (a > at) break; at = Math.max(at, z); }
      if (at < total) probs.push(`letters ${at}-${total} never shown`);
      if (p.errors.length) probs.push(`console: ${p.errors.join(' | ')}`);
      if (probs.length) {
        bad++;
        fails.push(`FAIL ${tag} ${first}-first n=${n} turn at --More-- ${k} of ${mores}: ${probs.join('; ')}`);
        await t.shot(`${C.SHOTS.replace('header/fix', 'hrecheck')}/sweep-${ORIGIN.slice(-4)}-${DPR}-${tag}-${first}-${n}-${k}.png`);
      }
      await p.evaluate(() => globalThis.__bt.msg.end());
    }
    await ctx.close();
  }
}
await b.close();
console.log(fails.join('\n'));
console.log(`sweep @${DPR} ${ORIGIN}: ${runs} turned runs, ${bad} failed`);
