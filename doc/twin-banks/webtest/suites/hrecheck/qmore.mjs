// A page full of messages, then a question: the page-full --More-- before
// it, the phone turned there to the band of fewer rows.  Every message must
// be shown before the question's page, and the question whole after.
// node qmore.mjs DPR [origin]
import * as C from '../header/fix/common.mjs';
const DPR = Number(process.argv[2] || 1);
const ORIGIN = process.argv[3] || C.WORK;
const QH = `
;globalThis.__q = {
  ask(q) { this.p = handlers.shim_yn_function(q, 'ynq', 110); return true; },
  band() { return [...$('msgband').querySelectorAll('.r')].map((e) => e.textContent); },
  info() { const m = bandMetrics(); return { rows: m.rows, n: pageRowsOf(page, m).length, sr: scrollRow, more: moreShown }; },
};
`;
const b = await C.launch();
let runs = 0, bad = 0;
const out = [];
for (const tag of ['lucas', 'p412', 'p390', 'small']) {
  const pr = C.PHONES.find((x) => x.tag === tag);
  const scr = { P: pr.scr, L: [pr.scr[1], pr.scr[0]] };
  for (const extra of [0, 1]) {
    let o = 'P';
    const ctx = await C.newCtx(b, { origin: ORIGIN, w: pr.P[0], h: pr.P[1], dpr: DPR, screen: { width: scr.P[0], height: scr.P[1] }, prefs: {} });
    await ctx.unroute('**/web.js');
    await ctx.route('**/web.js', async (route) => {
      const resp = await route.fetch();
      await route.fulfill({ response: resp, body: (await resp.text()) + C.HOOK + QH, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
    });
    const p = await C.openPage(ctx);
    await C.resume(p);
    const t = await C.touch(ctx, p);
    await p.evaluate(() => globalThis.__bt.msg.begin());
    const R = (await p.evaluate(() => globalThis.__q.info())).rows;
    const msgs = Array.from({ length: R }, (_, i) => `Message ${i + 1}.`);
    for (const m of msgs) {
      await p.evaluate((x) => globalThis.__bt.msg.put(x), m);
      let r = await p.evaluate(() => globalThis.__bt.msg.settle());
      while (r === 'waiting') { await p.evaluate(() => globalThis.__bt.msg.key(32)); r = await p.evaluate(() => globalThis.__bt.msg.settle()); }
    }
    const q = extra ? 'There is a large box here with a heavy iron lock, loot it?' : 'Really attack the jackal?';
    await p.evaluate((x) => globalThis.__q.ask(x), q);
    await C.sleep(300);
    const seen = new Set();
    const before = await p.evaluate(() => ({ band: globalThis.__q.band(), ...globalThis.__q.info() }));
    before.band.forEach((x) => seen.add(x));
    o = 'L';
    await t.rotate(pr.L[0], pr.L[1], DPR, scr.L);
    const turned = await p.evaluate(() => ({ band: globalThis.__q.band(), ...globalThis.__q.info() }));
    const lost0 = msgs.filter((m) => !turned.band.includes(m));
    const steps = [];
    for (let i = 0; i < 8 && (await p.evaluate(() => globalThis.__bt.moreShown)); i++) {
      await p.evaluate(() => globalThis.__bt.msg.key(32));
      await C.sleep(250);
      const s = await p.evaluate(() => ({ band: globalThis.__q.band(), ...globalThis.__q.info() }));
      s.band.forEach((x) => seen.add(x));
      steps.push(`[${s.band.join(' | ')}]${s.more ? ' --More--' : ''}`);
    }
    turned.band.forEach((x) => seen.add(x));
    const fin = await p.evaluate(() => globalThis.__q.band());
    const lost = msgs.filter((m) => !turned.band.includes(m) && !steps.some((s) => s.includes(m)));
    const full = `${q} [ynq] (n)`;
    const qWhole = fin.join(' ').replace(/\s+/g, ' ').includes(full);
    runs++;
    const okk = before.more && !lost.length && qWhole && !p.errors.length;
    if (!okk) bad++;
    out.push(`${okk ? 'ok  ' : 'FAIL'} ${tag} rows ${before.rows}->${turned.rows} q ${extra ? 'long' : 'short'}: at --More-- [${before.band.join(' | ')}]${before.more ? ' --More--' : ' (no --More--)'}; turned [${turned.band.join(' | ')}]; then ${steps.join(' ; ')}; messages never shown after the turn: ${lost.join(', ') || 'none'}; question whole at the end: ${qWhole}${p.errors.length ? ` console: ${p.errors.join(' | ')}` : ''}`);
    await p.evaluate(() => globalThis.__bt.msg.key(110));
    await C.sleep(200);
    await p.evaluate(() => globalThis.__bt.msg.end());
    await ctx.close();
  }
}
await b.close();
console.log(out.join('\n'));
console.log(`qmore @${DPR} ${ORIGIN}: ${runs} runs, ${bad} failed`);
