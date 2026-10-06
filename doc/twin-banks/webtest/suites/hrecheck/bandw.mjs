import * as C from '../header/fix/common.mjs';
const b = await C.launch();
for (const tag of ['lucas', 'small', 'p412', 'p390']) {
  const pr = C.PHONES.find((x) => x.tag === tag);
  for (const o of ['P', 'L']) {
    const scr = o === 'P' ? pr.scr : [pr.scr[1], pr.scr[0]];
    const ctx = await C.newCtx(b, { w: pr[o][0], h: pr[o][1], dpr: 1, screen: { width: scr[0], height: scr[1] }, prefs: {} });
    const p = await C.openPage(ctx);
    await C.resume(p);
    const m = await p.evaluate(() => globalThis.__bt.bandMetrics());
    const rows = await p.evaluate((t) => globalThis.__bt.rowsOf(t), ['You kill the jackal!', 'You see here a jackal corpse.']);
    const rows2 = await p.evaluate((t) => globalThis.__bt.rowsOf(t), ['You hit the newt.', 'You kill the newt!', 'There is a staircase down here.', 'You see here a newt corpse.']);
    console.log(tag, o, pr[o].join('x'), JSON.stringify({ w: Math.round(m.width), slot: Math.round(m.slot), rows: m.rows }), JSON.stringify(rows), JSON.stringify(rows2));
    await ctx.close();
  }
}
await b.close();
