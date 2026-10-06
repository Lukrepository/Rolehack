// --More-- across a turn of the device.  The band is laid out again (another
// width, often another number of rows) while a page is up and the game waits
// at --More--, inside a message longer than the band and between messages.
// Fed the same run of messages as more.mjs (the core's wait set aside), the
// phone is turned at the second --More-- and again at the fifth; then:
//  - the band always shows at least one row, every row inside the band;
//  - read in order, the screens shown never skip any text: each screen starts
//    no later than where the text shown so far ends (a row may show twice
//    after a turn, as the band goes back to the start of its band's worth);
//  - at the end every message has been shown.
//   node more-turn.mjs [dpr]   -> more-turn-<dpr>.json, shots/more-turn-*.png
import fs from 'node:fs';
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, writeJson, PHONES } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const src = fs.readFileSync(new URL('./more.mjs', import.meta.url), 'utf8');
const MSGS = eval(src.slice(src.indexOf('const MSGS = ') + 13, src.indexOf('];', src.indexOf('const MSGS = ')) + 1));
const norm = (x) => x.replace(/\s+/g, ' ').trim();
const STREAM = norm(MSGS.join(' '));

const b = await launch();
const out = [];
let fails = 0;
const CASES = [];
for (const tag of ['lucas', 'small', 'p390', 'tab']) for (const first of ['L', 'P']) CASES.push({ pr: PHONES.find((x) => x.tag === tag), first, prefs: {} });
for (const first of ['L', 'P']) CASES.push({ pr: PHONES.find((x) => x.tag === 'small'), first, prefs: { msgSize: 1.4 }, name: 'big-text' });
for (const c of CASES) {
  const { pr, first } = c;
  const tag = `${c.name ? `${c.name}-` : ''}${pr.tag}-${first}first`;
  if (process.env.ONLY && !tag.startsWith(process.env.ONLY)) continue;
  const scrOf = (o) => (o === 'P' ? pr.scr : [pr.scr[1], pr.scr[0]]);
  let o = first;
  const [w0, h0] = pr[o];
  const ctx = await newCtx(b, { w: w0, h: h0, dpr: DPR, screen: { width: scrOf(o)[0], height: scrOf(o)[1] }, prefs: { ...c.prefs, budgets: {} } });
  const p = await openPage(ctx);
  await resume(p);
  const k = await touch(ctx, p);
  await sleep(400);
  const turn = async () => { o = o === 'L' ? 'P' : 'L'; await k.rotate(pr[o][0], pr[o][1], DPR, scrOf(o)); };
  const shown = () => p.evaluate(() => {
    const mb = document.getElementById('msgband'), b = mb.getBoundingClientRect();
    const rows = [...mb.querySelectorAll('.r')].map((e) => { const q = e.getBoundingClientRect(); return { t: e.textContent, top: q.top, bottom: q.bottom }; });
    return { rows, top: b.top, bottom: b.bottom, more: globalThis.__bt.moreShown, m: globalThis.__bt.bandMetrics() };
  });
  const bad = [], screens = [];
  let mores = 0, turns = 0;
  const take = (s, where) => {
    if (!s.rows.length || !norm(s.rows.map((r) => r.t).join(' '))) bad.push(`${where}: the band shows nothing`);
    for (const r of s.rows) if (r.top < s.top - 0.5 || r.bottom > s.bottom + 0.5) bad.push(`${where}: a row outside the band`);
    if (s.rows.length > s.m.rows) bad.push(`${where}: ${s.rows.length} rows in a ${s.m.rows}-row band`);
    screens.push({ where, text: norm(s.rows.map((r) => r.t).join(' ')) });
  };
  await p.evaluate(() => globalThis.__bt.msg.begin());
  for (const [i, t] of MSGS.entries()) {
    await p.evaluate((x) => globalThis.__bt.msg.put(x), t);
    let r = await p.evaluate(() => globalThis.__bt.msg.settle());
    while (r === 'waiting') {
      mores++;
      take(await shown(), `msg ${i} --More-- ${mores}`);
      if (mores === 2 || mores === 5) {
        await turn();
        turns++;
        const s = await shown();
        if (!s.more) bad.push(`after the turn at --More-- ${mores}, --More-- is gone`);
        take(s, `msg ${i} --More-- ${mores}, turned to ${pr[o][0]}x${pr[o][1]}`);
        await k.shot(`${SHOTS}/more-turn-${DPR}-${tag}-${mores}.png`);
      }
      await p.evaluate(() => globalThis.__bt.msg.key(32));
      r = await p.evaluate(() => globalThis.__bt.msg.settle());
    }
  }
  take(await shown(), 'the end');
  await p.evaluate(() => globalThis.__bt.msg.end());
  // no text skipped: each screen starts no later than the one before it ended
  // (after a turn a screen may start before the one before it: a repeat)
  let end = 0;
  for (const sc of screens) {
    if (!sc.text) continue;
    let at = STREAM.lastIndexOf(sc.text, end + 1);
    if (at < 0) {
      at = STREAM.indexOf(sc.text, end);
      if (at < 0) { bad.push(`${sc.where}: "${sc.text.slice(0, 40)}" is not the messages' text`); continue; }
      bad.push(`${sc.where}: skipped "${STREAM.slice(end, at).slice(0, 60)}"`);
    }
    end = Math.max(end, at + sc.text.length);
  }
  if (end < STREAM.length) bad.push(`never shown: "${STREAM.slice(end, end + 60)}"`);
  if (p.errors.length) bad.push(`console: ${p.errors.join(' | ')}`);
  fails += bad.length;
  console.log(`${tag} @${DPR}: ${mores} --More--, ${turns} turns, ${screens.length} screens; ${bad.length ? `BAD ${bad.length}: ${bad.slice(0, 5).join(' | ')}` : 'ok'}`);
  out.push({ tag, mores, turns, screens, bad });
  await ctx.close();
}
writeJson(`more-turn-${DPR}.json`, out);
console.log(fails ? `FAILURES: ${fails}` : 'ALL PASS');
await b.close();
