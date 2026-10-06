// A page at rest, the phone turned (the band then shows the page's last
// rows, which need not begin a band's worth), then more on the same page
// before the player acts: another message (the page-full --More--), or the
// game's own --More-- (moreToEnd with no new message).  Also with the Layout
// setting switched to classic at rest instead of the turn.  node samepage.mjs DPR
// Fails when, at any --More--, the band's last row runs under the --More--
// (their drawn boxes overlap), when a letter of a page is never on the band
// at a --More-- or at rest, or when, at rest at the end, the band does not
// end on the page's newest row or does not hold the newest message whole
// though its rows at the page's end fit the band.
import * as C from '../header/fix/common.mjs';
import { FX } from './fxhook.mjs';
const DPR = Number(process.argv[2] || 1);
const ORIGIN = process.env.ORIGIN || C.WORK;
const XH = `
;globalThis.__sp = {
  own() { this.p = moreToEnd().then(() => 'done'); return true; },
  async settle() { return Promise.race([this.p, new Promise((r) => setTimeout(() => r('waiting'), 150))]); },
  // the band's last drawn row and the --More--, as boxes
  boxes() {
    const rs = [...$('msgband').querySelectorAll('.r')], last = rs[rs.length - 1], slot = $('msgband').querySelector('.moreprompt');
    if (!last || !slot) return null;
    const rg = document.createRange(); rg.selectNodeContents(last);
    const a = rg.getBoundingClientRect(), b = slot.getBoundingClientRect();
    return { text: last.textContent, a: [a.left, a.top, a.right, a.bottom], b: [b.left, b.top, b.right, b.bottom] };
  },
  // the newest entry's rows at the page's end (a row's room for --More-- depends on where it falls)
  newest() { const m = bandMetrics(), n = pageRowsOf(page, m).length - pageRowsOf(page.slice(0, -1), m).length;
    return { text: page[page.length - 1].text, fits: n <= m.rows, n, alone: wrapRows(page[page.length - 1].text, 0, m).length }; },
};
`;
const SUF = ['', 'a', 'bb', 'ccc', 'dddd', 'eeeee'];
const words = (i, n) => Array.from({ length: n }, (_, j) => `m${i}w${j}${SUF[j % 6]}`).join(' ') + '.';
const SETS = {
  kill: ['You kill the jackal!', 'You see here a jackal corpse.'],
  fight: ['You hit the jackal.', 'The jackal bites!', 'You kill the jackal!', 'Welcome to experience level 2, you feel more confident now.'],
  wrap2: [words(0, 3), words(1, 9)],
  wrap3: [words(0, 2), words(1, 14)],
  long: [words(0, 22)],
  many: [words(0, 2), words(1, 3), words(2, 2), words(3, 6)],
};
const NEXT = { short: 'You hear a door open.', long: words(9, 18) };
const b = await C.launch();
let runs = 0, bad = 0, offRuns = 0, backRuns = 0, longer = 0;
const out = [];
for (const tag of (process.env.TAGS || 'small,p412,lucas,p390').split(',')) {
  const pr = C.PHONES.find((x) => x.tag === tag);
  const scr = { P: pr.scr, L: [pr.scr[1], pr.scr[0]] };
  for (const first of ['P', 'L']) for (const how of ['turn', 'classic']) for (const [name, msgs] of Object.entries(SETS)) for (const next of ['short', 'long', 'own']) {
    let o = first;
    const ctx = await C.newCtx(b, { origin: ORIGIN, w: pr[o][0], h: pr[o][1], dpr: DPR, screen: { width: scr[o][0], height: scr[o][1] }, prefs: {} });
    await ctx.unroute('**/web.js');
    await ctx.route('**/web.js', async (route) => {
      const resp = await route.fetch();
      await route.fulfill({ response: resp, body: (await resp.text()) + C.HOOK + XH + FX, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
    });
    const p = await C.openPage(ctx);
    await C.resume(p);
    const t = await C.touch(ctx, p);
    await p.evaluate(() => globalThis.__bt.msg.begin());
    const pages = new Map(), probs = [];
    const look = async (when) => {
      const s = await p.evaluate(() => globalThis.__fx.shown());
      if (!s.dom.length || !s.dom.join('').trim()) probs.push(`empty band ${when}`);
      const pg = pages.get(s.key) || { total: 0, got: [] };
      pg.total = Math.max(pg.total, s.total);
      pg.got.push(...s.ranges);
      pages.set(s.key, pg);
      if (await p.evaluate(() => globalThis.__bt.moreShown)) {
        const bx = await p.evaluate(() => globalThis.__sp.boxes());
        if (bx && bx.a[2] > bx.b[0] + 0.5 && bx.a[3] > bx.b[1] + 0.5 && bx.a[1] < bx.b[3] - 0.5) probs.push(`--More-- over the last row "${bx.text}" ${when} (text right ${bx.a[2].toFixed(1)} > slot left ${bx.b[0].toFixed(1)})`);
      }
      return s;
    };
    const drain = async (r, label) => {
      let k = 0;
      while (r === 'waiting' && k < 20) {
        k++;
        await look(`${label} at --More-- ${k}`);
        await p.evaluate(() => globalThis.__bt.msg.key(32));
        r = await p.evaluate(() => globalThis.__bt.msg.settle());
      }
      return k;
    };
    for (const m of msgs) {
      await p.evaluate((x) => globalThis.__bt.msg.put(x), m);
      await drain(await p.evaluate(() => globalThis.__bt.msg.settle()), 'first');
    }
    await look('at rest');
    if (how === 'turn') { o = o === 'L' ? 'P' : 'L'; await t.rotate(pr[o][0], pr[o][1], DPR, scr[o]); }
    else { await p.evaluate(async () => { const P = await import('./prefs.js'); P.set('layout', 'classic'); }); await C.sleep(800); }
    const rest = await look('at rest, laid out again');
    const info = await p.evaluate(() => ({ sr: globalThis.__fx.scrollRow, rows: globalThis.__bt.bandMetrics().rows }));
    const off = info.sr % info.rows !== 0;
    if (off) offRuns++;
    const nw = await p.evaluate(() => globalThis.__sp.newest());
    const flat = (a) => a.join(' ').replace(/\s+/g, ' ');
    if (!nw.fits && nw.alone <= info.rows) longer++;   // fits alone, but a row longer where it falls in the page
    if (nw.fits && !flat(rest.dom).includes(nw.text.replace(/\s+/g, ' '))) probs.push(`newest "${nw.text.slice(0, 30)}" not whole on the band after the re-layout [${rest.dom.join(' | ')}]`);
    if (rest.hi !== rest.n) probs.push(`after the re-layout the band shows rows ${rest.lo}-${rest.hi - 1} of ${rest.n}`);
    // more on the same page, before the player acts
    let r;
    if (next === 'own') { await p.evaluate(() => globalThis.__sp.own()); r = await p.evaluate(() => globalThis.__sp.settle()); }
    else { await p.evaluate((x) => globalThis.__bt.msg.put(x), NEXT[next]); r = await p.evaluate(() => globalThis.__bt.msg.settle()); }
    const srAtMore = await p.evaluate(() => globalThis.__fx.scrollRow);
    if (off && srAtMore !== info.sr) backRuns++;
    const n2 = await drain(r, 'then');
    if (next === 'own') await p.evaluate(() => globalThis.__sp.settle());
    const end = await look('at rest at the end');
    if (end.hi !== end.n) probs.push(`at the end the band shows rows ${end.lo}-${end.hi - 1} of ${end.n}`);
    if (next !== 'own') {
      const nw2 = await p.evaluate(() => globalThis.__sp.newest());
      if (nw2.fits && !flat(end.dom).includes(nw2.text.replace(/\s+/g, ' '))) probs.push(`newest "${nw2.text.slice(0, 30)}" not whole at the end [${end.dom.join(' | ')}]`);
    }
    for (const [key, pg] of pages) {
      const got = pg.got.sort((x, y) => x[0] - y[0]);
      let at = 0;
      for (const [a, z] of got) { if (a > at) break; at = Math.max(at, z); }
      if (at < pg.total) probs.push(`page "${key.slice(0, 24)}...": letters ${at}-${pg.total} never read`);
    }
    if (p.errors.length) probs.push(`console: ${p.errors.join(' | ')}`);
    runs++;
    const what = `${tag} ${first}-first ${how} ${name} then ${next}: rest sr ${info.sr}/${info.rows} rows${off ? ' (off)' : ''} [${rest.dom.join(' | ')}]; ${n2} --More-- after, at --More-- sr ${srAtMore}; end [${end.dom.join(' | ')}]`;
    if (probs.length) { bad++; out.push(`FAIL ${what}: ${probs.join('; ')}`); await t.shot(`${C.DIR.replace('header/fix', 'hfix2')}/shots/samepage-${DPR}-${tag}-${first}-${how}-${name}-${next}.png`); }
    else out.push(`ok   ${what}`);
    await p.evaluate(() => globalThis.__bt.msg.end());
    await ctx.close();
  }
}
await b.close();
console.log(out.join('\n'));
console.log(`samepage @${DPR} ${ORIGIN}: ${runs} runs, ${bad} failed (${offRuns} at rest off a band's start, ${backRuns} of them went back for the --More--; ${longer} with a newest message that would fit alone but takes a row more in its page)`);
