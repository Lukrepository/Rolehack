// Classic's own turns keep its rows as they were: the same messages, the
// phone turned at rest and at a --More--, then more on the same page, must
// show the same bands, --More-- for --More--, on the work tree as on HEAD
// (07fb2ef, port 8791).  node classicturn.mjs DPR
import * as C from '../header/fix/common.mjs';
import { FX } from './fxhook.mjs';
const DPR = Number(process.argv[2] || 1);
const ORIGINS = (process.env.ORIGINS || 'http://localhost:8766,http://localhost:8791').split(',');
const XH = `
;globalThis.__sp = {
  own() { this.p = moreToEnd().then(() => 'done'); return true; },
  async settle() { return Promise.race([this.p, new Promise((r) => setTimeout(() => r('waiting'), 150))]); },
};
`;
const SUF = ['', 'a', 'bb', 'ccc', 'dddd', 'eeeee'];
const words = (i, n) => Array.from({ length: n }, (_, j) => `m${i}w${j}${SUF[j % 6]}`).join(' ') + '.';
const SETS = {
  kill: ['You kill the jackal!', 'You see here a jackal corpse.'],
  long: [words(0, 22)],
  many: [words(0, 2), words(1, 3), words(2, 2), words(3, 6)],
  wrap3: [words(0, 2), words(1, 14)],
};
const b = await C.launch();
let runs = 0, bad = 0;
const out = [];
for (const tag of (process.env.TAGS || 'small,p412,lucas').split(',')) {
  const pr = C.PHONES.find((x) => x.tag === tag);
  const scr = { P: pr.scr, L: [pr.scr[1], pr.scr[0]] };
  for (const first of ['P', 'L']) for (const [name, msgs] of Object.entries(SETS)) for (const turnAt of ['rest', 'more']) for (const next of ['short', 'long', 'own']) {
    const seqs = [];
    for (const origin of ORIGINS) {
      let o = first;
      const ctx = await C.newCtx(b, { origin, w: pr[o][0], h: pr[o][1], dpr: DPR, screen: { width: scr[o][0], height: scr[o][1] }, prefs: { layout: 'classic' } });
      await ctx.unroute('**/web.js');
      await ctx.route('**/web.js', async (route) => {
        const resp = await route.fetch();
        await route.fulfill({ response: resp, body: (await resp.text()) + C.HOOK + XH + FX, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
      });
      const p = await C.openPage(ctx);
      await C.resume(p);
      const t = await C.touch(ctx, p);
      await p.evaluate(() => globalThis.__bt.msg.begin());
      const seq = [];
      const snap = async (when) => {
        const s = await p.evaluate(() => ({ band: globalThis.__fx.band(), sr: globalThis.__fx.scrollRow, more: globalThis.__bt.moreShown, ui: document.documentElement.dataset.ui }));
        seq.push(`${when}: ${s.ui} sr ${s.sr}${s.more ? ' --More--' : ''} [${s.band.join(' | ')}]`);
      };
      let turned = false;
      const turn = async () => { o = o === 'L' ? 'P' : 'L'; await t.rotate(pr[o][0], pr[o][1], DPR, scr[o]); turned = true; };
      const drain = async (r, label) => {
        let k = 0;
        while (r === 'waiting' && k < 20) {
          k++;
          await snap(`${label} --More-- ${k}`);
          if (turnAt === 'more' && !turned) { await turn(); await snap(`${label} --More-- ${k} turned`); }
          await p.evaluate(() => globalThis.__bt.msg.key(32));
          r = await p.evaluate(() => globalThis.__bt.msg.settle());
        }
      };
      for (const m of msgs) {
        await p.evaluate((x) => globalThis.__bt.msg.put(x), m);
        await drain(await p.evaluate(() => globalThis.__bt.msg.settle()), 'first');
      }
      await snap('rest');
      if (!turned) { await turn(); await snap('rest turned'); }
      if (next === 'own') { await p.evaluate(() => globalThis.__sp.own()); await drain(await p.evaluate(() => globalThis.__sp.settle()), 'then'); }
      else { await p.evaluate((x) => globalThis.__bt.msg.put(x), next === 'long' ? words(9, 18) : 'You hear a door open.'); await drain(await p.evaluate(() => globalThis.__bt.msg.settle()), 'then'); }
      await snap('end');
      if (p.errors.length) seq.push(`console: ${p.errors.join(' | ')}`);
      seqs.push(seq);
      await p.evaluate(() => globalThis.__bt.msg.end());
      await ctx.close();
    }
    runs++;
    const same = seqs.every((s) => s.join('\n') === seqs[0].join('\n')) && !seqs[0].some((x) => x.startsWith('console'));
    if (!same) bad++;
    out.push(`${same ? 'same' : 'DIFF'} ${tag} ${first}-first ${name} turned at ${turnAt} then ${next}${same ? `: ${seqs[0].length} bands` : `\n  work: ${seqs[0].join('\n        ')}\n  head: ${seqs[1].join('\n        ')}`}`);
  }
}
await b.close();
console.log(out.join('\n'));
console.log(`classicturn @${DPR}: ${runs} runs, ${bad} differ from HEAD`);
