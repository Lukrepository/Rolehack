// A question up on the band (no --More--), the phone turned: is the whole
// question still on the band?  Messages before it fill 0-3 rows; questions of
// several lengths.  node qsplit.mjs DPR [origin]
import * as C from '../header/fix/common.mjs';
const DPR = Number(process.argv[2] || 1);
const ORIGIN = process.argv[3] || C.WORK;
const QH = `
;globalThis.__q = {
  ask(q) { this.p = handlers.shim_yn_function(q, 'ynq', 110); return true; },
  band() { return [...$('msgband').querySelectorAll('.r')].map((e) => e.textContent); },
  info() { const m = bandMetrics(); return { rows: m.rows, width: Math.round(m.width), n: pageRowsOf(page, m).length, sr: scrollRow, more: moreShown }; },
};
`;
const b = await C.launch();
const W = (pre, n) => Array.from({ length: n }, (_, j) => `${pre}${j}${['', 'xx', 'yyyy', 'z'][j % 4]}`).join(' ');
let runs = 0, bad = 0;
const out = [];
for (const tag of (process.env.TAGS || 'lucas,small,p412,p390').split(',')) {
  const pr = C.PHONES.find((x) => x.tag === tag);
  const scr = { P: pr.scr, L: [pr.scr[1], pr.scr[0]] };
  for (const first of (process.env.FIRST || 'P,L').split(',')) for (const pre of (process.env.PRE || '0,1,2,3').split(',').map(Number)) for (const qn of (process.env.QN || '4,8,12,16').split(',').map(Number)) {
    let o = first;
    const ctx = await C.newCtx(b, { origin: ORIGIN, w: pr[o][0], h: pr[o][1], dpr: DPR, screen: { width: scr[o][0], height: scr[o][1] }, prefs: {} });
    await ctx.unroute('**/web.js');
    await ctx.route('**/web.js', async (route) => {
      const resp = await route.fetch();
      await route.fulfill({ response: resp, body: (await resp.text()) + C.HOOK + QH, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
    });
    const p = await C.openPage(ctx);
    await C.resume(p);
    const t = await C.touch(ctx, p);
    await p.evaluate(() => globalThis.__bt.msg.begin());
    for (let i = 0; i < pre; i++) {
      await p.evaluate((x) => globalThis.__bt.msg.put(x), `Note${i} said.`);
      let r = await p.evaluate(() => globalThis.__bt.msg.settle());
      while (r === 'waiting') { await p.evaluate(() => globalThis.__bt.msg.key(32)); r = await p.evaluate(() => globalThis.__bt.msg.settle()); }
    }
    const q = `${W('q', qn)} end?`;
    const MSG = process.env.MODE === 'msg';
    if (MSG) {
      await p.evaluate((x) => globalThis.__bt.msg.put(x), q);
      let r = await p.evaluate(() => globalThis.__bt.msg.settle());
      while (r === 'waiting') { await p.evaluate(() => globalThis.__bt.msg.key(32)); r = await p.evaluate(() => globalThis.__bt.msg.settle()); }
    } else await p.evaluate((x) => globalThis.__q.ask(x), q);
    await C.sleep(300);
    // a page-full --More-- before the question
    for (let i = 0; i < 4 && await p.evaluate(() => globalThis.__bt.moreShown); i++) { await p.evaluate(() => globalThis.__bt.msg.key(32)); await C.sleep(250); }
    const full = (process.env.MODE === 'msg' ? q : `${q} [ynq] (n)`).replace(/\s+/g, ' ');
    const has = (rows) => rows.join(' ').replace(/\s+/g, ' ').includes(full);
    const before = { band: await p.evaluate(() => globalThis.__q.band()), ...(await p.evaluate(() => globalThis.__q.info())) };
    o = o === 'L' ? 'P' : 'L';
    await t.rotate(pr[o][0], pr[o][1], DPR, scr[o]);
    const after = { band: await p.evaluate(() => globalThis.__q.band()), ...(await p.evaluate(() => globalThis.__q.info())) };
    runs++;
    const okB = has(before.band), okA = has(after.band);
    // fits: could the band have shown the whole question?
    const qRows = await p.evaluate((x) => globalThis.__bt.rowsOf([x]).length, process.env.MODE === 'msg' ? q : `${q} [ynq] (n)`);
    const could = qRows <= after.rows;
    const fail = okB && !okA && could;
    if (fail) { bad++; await t.shot(`${'/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/hfix2/shots'}/qsplit${process.env.MODE || ''}-${ORIGIN.slice(-4)}-${DPR}-${tag}-${first}-${pre}-${qn}.png`); }
    out.push(`${fail ? 'FAIL' : 'ok  '} ${tag} ${first}->${o} pre ${pre} q ${qn}w (${qRows} rows alone): before ${okB ? 'whole' : 'part'} [${before.band.join(' | ')}] rows ${before.rows} n ${before.n} sr ${before.sr}; after ${okA ? 'whole' : 'PART'} [${after.band.join(' | ')}] rows ${after.rows} n ${after.n} sr ${after.sr}${p.errors.length ? ` console: ${p.errors.join(' | ')}` : ''}`);
    if (!MSG) await p.evaluate(() => globalThis.__bt.msg.key(110));
    await C.sleep(200);
    await p.evaluate(() => globalThis.__bt.msg.end());
    await ctx.close();
  }
}
await b.close();
console.log(out.join('\n'));
console.log(`qsplit @${DPR} ${ORIGIN}: ${runs} runs, ${bad} lose a question that fits`);
