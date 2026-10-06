// --More-- paging across a re-layout, the review's three cases and their
// neighbours (node paging.mjs DPR [tags]):
//  - a long message, the phone turned at its k-th --More-- (the band went
//    blank after the last Space, 390-class phone, landscape first);
//  - a page full of short messages at --More--, turned to a band of fewer
//    rows (the page's last rows never came back);
//  - a turn with no --More-- up, after the messages (the newest went);
//  - the same turn when the newer band wraps the newest message onto a row
//    more and it falls across a band's boundary (the re-check, 2026-10-03:
//    only its tail stayed): a kill and its corpse, and a question.
// Every word of every message has a token of its own.  Each run turns the
// phone once at the k-th --More-- (k = 1..6, while there is one), and once
// more at rest.  It fails when a token is never on the band at a --More--
// or at rest (what the player can read), when the band is empty there, or
// when the band at rest, before or after the last turn, does not end with
// the last message's last token, or does not hold the newest message whole
// when its rows fit the band.  Then a question up after 0-3 messages, the
// phone turned with it: the band ends on the question, whole when it fits.
// Also the Layout setting switched with a long message paged, both ways.
import * as C from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const TAGS = (process.argv[3] || 'lucas,small,p390,p412').split(',');
const SUF = ['', 'a', 'bb', 'ccc', 'dddd'];
const words = (i, n) => Array.from({ length: n }, (_, j) => `m${i}w${j}${SUF[j % 5]}`);
const SCEN = {
  long: [words(0, 40)],
  short: Array.from({ length: 6 }, (_, i) => words(i, 2)),
  mixed: [words(0, 3), words(1, 24), words(2, 2), words(3, 3), words(4, 2)],
  // the 360x640 phone, portrait's band of 2 rows turned to landscape's
  // narrower one: the corpse message takes 2 rows, across the boundary
  kill: ['You kill the jackal!', 'You see here a jackal corpse.'],
  fight: ['You hit the jackal.', 'The jackal bites!', 'You kill the jackal!', 'Welcome to experience level 2, you feel more confident now.'],
};
const text = (m) => (Array.isArray(m) ? `${m.join(' ')}.` : m);
// the newest page entry whole on the band, when its rows fit the band
const whole = async (p, s, when, probs) => {
  const nw = await p.evaluate(() => globalThis.__fx.newest());
  if (nw.fits && (s.lo > nw.from || s.hi < nw.n)) probs.push(`${when} the band shows rows ${s.lo}-${s.hi - 1} of ${s.n}, the newest "${nw.text.slice(0, 32)}" is rows ${nw.from}-${nw.n - 1}: not whole [${s.dom.join(' | ')}]`);
};
const b = await C.launch();
const out = [];
let runs = 0, bad = 0;
for (const tag of TAGS) {
  const pr = C.PHONES.find((x) => x.tag === tag);
  const scr = { P: pr.scr, L: [pr.scr[1], pr.scr[0]] };
  for (const first of ['L', 'P']) for (const size of tag === 'small' ? [1, 1.4] : [1]) for (const [name, msgs] of Object.entries(SCEN)) {
    for (let k = 1; k <= 6; k++) {
      let o = first;
      const ctx = await C.newCtx(b, { origin: process.env.ORIGIN || C.WORK, w: pr[o][0], h: pr[o][1], dpr: DPR, screen: { width: scr[o][0], height: scr[o][1] }, prefs: { msgSize: size } });
      const p = await C.openPage(ctx);
      await C.resume(p);
      const t = await C.touch(ctx, p);
      const turn = async () => { o = o === 'L' ? 'P' : 'L'; await t.rotate(pr[o][0], pr[o][1], DPR, scr[o]); };
      await p.evaluate(() => globalThis.__bt.msg.begin());
      // what the player can read: the band at each --More-- and at rest, as
      // letter ranges of its page (keyed by the page's first message)
      const pages = new Map(), probs = [];
      const look = async (when) => {
        const s = await p.evaluate(() => globalThis.__fx.shown());
        if (!s.dom.length || !s.dom.join('').trim()) probs.push(`empty band ${when}`);
        if (s.dom.join('|') !== s.rows.join('|')) probs.push(`band drawn [${s.dom.join(' | ')}] is not the page's rows [${s.rows.join(' | ')}] ${when}`);
        const pg = pages.get(s.key) || { total: 0, got: [] };
        pg.total = Math.max(pg.total, s.total);
        pg.got.push(...s.ranges);
        pages.set(s.key, pg);
        return s;
      };
      let mores = 0, turned = false;
      for (const m of msgs) {
        await p.evaluate((x) => globalThis.__bt.msg.put(x), text(m));
        let r = await p.evaluate(() => globalThis.__bt.msg.settle());
        while (r === 'waiting') {
          mores++;
          await look(`at --More-- ${mores}`);
          if (mores === k) { await turn(); turned = true; await look(`at --More-- ${mores}, turned`); }
          await p.evaluate(() => globalThis.__bt.msg.key(32));
          r = await p.evaluate(() => globalThis.__bt.msg.settle());
        }
      }
      if (!turned && k > 1) { await ctx.close(); break; }   // no k-th --More--: k is done with
      runs++;
      const rest = await look('at rest');
      if (rest.hi !== rest.n) probs.push(`at rest the band shows rows ${rest.lo}-${rest.hi - 1} of ${rest.n}, not the page's end`);
      await whole(p, rest, 'at rest', probs);
      await turn();
      const idle = await look('at rest, turned');
      if (idle.hi !== idle.n) probs.push(`turned at rest the band shows rows ${idle.lo}-${idle.hi - 1} of ${idle.n}, not the page's end`);
      await whole(p, idle, 'turned at rest', probs);
      // every letter of every page read at a --More-- or at rest
      for (const [key, pg] of pages) {
        const got = pg.got.sort((x, y) => x[0] - y[0]);
        let at = 0;
        for (const [a, z] of got) { if (a > at) break; at = Math.max(at, z); }
        if (at < pg.total) probs.push(`page "${key.slice(0, 24)}...": letters ${at}-${pg.total} never read`);
      }
      if (p.errors.length) probs.push(`console: ${p.errors.join(' | ')}`);
      await p.evaluate(() => globalThis.__bt.msg.end());
      const what = `${tag} ${first}-first size ${size} ${name} turn at --More-- ${turned ? k : '(none)'} of ${mores}`;
      if (probs.length) { bad++; out.push(`FAIL ${what}: ${probs.join('; ')}`); await t.shot(`${C.SHOTS}/paging-${DPR}-${tag}-${first}-${size}-${name}-${k}.png`); }
      else out.push(`ok   ${what}`);
      await ctx.close();
      if (!turned) break;
    }
  }
}

// A question up, after 0-3 messages, the phone turned with it: the band ends
// on the question, and holds it whole when its rows fit.  The question as on
// the 915x412 phone, portrait's 3 rows "Note0 said. | q0 .. q7z | end? [ynq]
// (n)" turned to landscape's band of 2, kept only "[ynq] (n)".
const QW = (n) => Array.from({ length: n }, (_, j) => `q${j}${['', 'xx', 'yyyy', 'z'][j % 4]}`).join(' ');
for (const tag of TAGS) {
  const pr = C.PHONES.find((x) => x.tag === tag);
  const scr = { P: pr.scr, L: [pr.scr[1], pr.scr[0]] };
  for (const first of ['P', 'L']) for (const pre of [0, 1, 2, 3]) for (const qn of [4, 8, 12]) {
    let o = first;
    const ctx = await C.newCtx(b, { origin: process.env.ORIGIN || C.WORK, w: pr[o][0], h: pr[o][1], dpr: DPR, screen: { width: scr[o][0], height: scr[o][1] } });
    const p = await C.openPage(ctx);
    await C.resume(p);
    const t = await C.touch(ctx, p);
    await p.evaluate(() => globalThis.__bt.msg.begin());
    const probs = [];
    for (let i = 0; i < pre; i++) {
      await p.evaluate((x) => globalThis.__bt.msg.put(x), `Note${i} said.`);
      let r = await p.evaluate(() => globalThis.__bt.msg.settle());
      while (r === 'waiting') { await p.evaluate(() => globalThis.__bt.msg.key(32)); r = await p.evaluate(() => globalThis.__bt.msg.settle()); }
    }
    await p.evaluate((x) => globalThis.__fx.ask(x), `${QW(qn)} end?`);
    await C.sleep(300);
    for (let i = 0; i < 4 && await p.evaluate(() => globalThis.__bt.moreShown); i++) { await p.evaluate(() => globalThis.__bt.msg.key(32)); await C.sleep(250); }
    const asked = await p.evaluate(() => globalThis.__fx.shown());
    await whole(p, asked, 'asked', probs);
    o = o === 'L' ? 'P' : 'L';
    await t.rotate(pr[o][0], pr[o][1], DPR, scr[o]);
    const s = await p.evaluate(() => globalThis.__fx.shown());
    if (s.hi !== s.n) probs.push(`turned the band shows rows ${s.lo}-${s.hi - 1} of ${s.n}, not the question's end`);
    if (s.dom.join('|') !== s.rows.join('|')) probs.push(`band drawn [${s.dom.join(' | ')}] is not the page's rows [${s.rows.join(' | ')}]`);
    await whole(p, s, 'turned', probs);
    if (p.errors.length) probs.push(`console: ${p.errors.join(' | ')}`);
    runs++;
    const what = `question ${tag} ${first}-first pre ${pre} q ${qn}w: asked [${asked.dom.join(' | ')}] turned [${s.dom.join(' | ')}]`;
    if (probs.length) { bad++; out.push(`FAIL ${what}: ${probs.join('; ')}`); await t.shot(`${C.SHOTS}/paging-${DPR}-q-${tag}-${first}-${pre}-${qn}.png`); }
    else out.push(`ok   ${what}`);
    await p.evaluate(() => globalThis.__bt.msg.key(110));
    await C.sleep(200);
    await p.evaluate(() => globalThis.__bt.msg.end());
    await ctx.close();
  }
}

// The Layout setting switched with a long message paged to its end, both ways.
for (const [from, to] of [['twin', 'classic'], ['classic', 'twin']]) for (const tag of ['small', 'lucas']) for (const o of ['P', 'L']) {
  const pr = C.PHONES.find((x) => x.tag === tag);
  const scr = { P: pr.scr, L: [pr.scr[1], pr.scr[0]] };
  const ctx = await C.newCtx(b, { origin: process.env.ORIGIN || C.WORK, w: pr[o][0], h: pr[o][1], dpr: DPR, screen: { width: scr[o][0], height: scr[o][1] }, prefs: { layout: from } });
  const p = await C.openPage(ctx);
  await C.resume(p);
  await p.evaluate(() => globalThis.__bt.msg.begin());
  const msg = words(0, 40);
  await p.evaluate((x) => globalThis.__bt.msg.put(x), `${msg.join(' ')}.`);
  let r = await p.evaluate(() => globalThis.__bt.msg.settle());
  while (r === 'waiting') { await p.evaluate(() => globalThis.__bt.msg.key(32)); r = await p.evaluate(() => globalThis.__bt.msg.settle()); }
  const before = await p.evaluate(() => ({ rows: globalThis.__fx.band(), sr: globalThis.__fx.scrollRow }));
  await p.evaluate(async (l) => { const P = await import('./prefs.js'); P.set('layout', l); }, to);
  await C.sleep(800);
  const after = await p.evaluate(() => ({ rows: globalThis.__fx.band(), sr: globalThis.__fx.scrollRow, ui: document.documentElement.dataset.ui }));
  runs++;
  const ok = after.ui === to && after.rows.join(' ').includes(msg.at(-1)) && !p.errors.length;
  if (!ok) bad++;
  out.push(`${ok ? 'ok  ' : 'FAIL'} switch ${from} -> ${to} ${tag} ${o}: scrollRow ${before.sr} [${before.rows.join(' | ')}] -> ${after.sr} [${after.rows.join(' | ')}] ui ${after.ui}${p.errors.length ? ` console: ${p.errors.join(' | ')}` : ''}`);
  await p.evaluate(() => globalThis.__bt.msg.end());
  await ctx.close();
}
await b.close();
console.log(out.join('\n'));
console.log(`paging @${DPR}: ${runs} runs, ${bad} failed`);
