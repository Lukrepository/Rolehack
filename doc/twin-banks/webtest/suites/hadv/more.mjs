// --More-- exactly when the message band is full.  At each window the page's
// own putMessage() is fed a run of messages of every length (the core's wait
// set aside meanwhile, common.mjs msg), and at every step the band is checked
// against an oracle that does not use the page's paging code: a hidden copy
// of the band -- the band's own font, size, line height and inner width, its
// spaces kept, one block per message, and the --More-- slot's width kept free
// on the last row of every band's worth -- laid out by the browser, whose line
// count says whether the page fits (to within the canvas's measure, tol).
//  - When --More-- shows before a message, the page with that message would
//    not fit in the band's rows; when a message is added without --More--, the
//    page fits.  A message longer than the band is shown a band at a time.
//  - Every row shown lies inside the band and is not cut short at its right
//    end, the --More-- slot lies in the band, on the last row and after its
//    text, and the band shows exactly the layout's rows.
//  - Read in order, the screens shown (at each --More-- and at the end) are
//    every message, whole, once.
//   node more.mjs [dpr]   -> more-<dpr>.json, shots/more-<dpr>-*.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, writeJson, PHONES, BIG } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const only = process.env.ONLY;
const MSGS = [
  'You hit the newt.', 'The newt bites!', 'You kill the newt!',
  'Welcome to experience level 2.  You feel more confident in your weapon skills.',
  'You see here a +0 dagger.', 'The kitten picks up a gnome lord corpse.',
  'There is a staircase down here.  You see here 14 gold pieces, a scroll labeled ELBIB YLOH, a blessed +2 '
    + 'pair of hard shoes, an uncursed potion of see invisible and a ring mail.',
  'You hear the footsteps of a guard on patrol.', 'Ok.',
  'The hill orc swings her crossbow at you.  The hill orc hits!  The hill orc throws a dagger!  You are hit by '
    + 'a dagger.  The hill orc picks up a dagger.  You hit the hill orc.  The hill orc misses you.  The hill orc '
    + 'hits!  You hear some noises in the distance.  You feel a strange vibration under your feet.  Your '
    + 'movements are slowed slightly because of your load.  You have a little trouble lifting a heavy iron ball.',
  'You feel hungry.', 'A trap door opens up under you!', 'The dog bites!', 'You die...',
];

const ORACLE = () => {
  // The band's lines for these messages, laid out by the browser: one block
  // per message (each starts a row), and on every row that ends a band's worth
  // -- rows-1, 2 rows-1, ... from the page's first -- a float as wide as the
  // --More-- slot, which tty keeps free on the band's last line.
  globalThis.__lines = (texts, slotW, rows, dw = 0) => {
    const mb = document.getElementById('msgband'), cs = getComputedStyle(mb), lh = parseFloat(cs.lineHeight);
    let d = globalThis.__probe;
    if (!d) { d = globalThis.__probe = document.createElement('div'); document.body.appendChild(d); }
    const w = mb.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + dw;
    d.style.cssText = `position:fixed;left:-5000px;top:0;visibility:hidden;width:${w}px;font-family:${cs.fontFamily};`
      + `font-size:${cs.fontSize};line-height:${cs.lineHeight};white-space:pre-wrap;overflow-wrap:anywhere;display:flow-root`;
    d.innerHTML = '';
    // each slot float spans the middle half of its row only, so a line box's
    // rounding (a 64th of a pixel a line) never lets it touch the rows beside
    for (let k = 0; k < 40; k++) {
      const gap = document.createElement('div');
      gap.style.cssText = `float:right;clear:right;width:0;height:${(rows - 1 + (k ? 0.5 : 0.25)) * lh}px`;
      const slot = document.createElement('div');
      slot.style.cssText = `float:right;clear:right;width:${slotW}px;height:${0.5 * lh}px`;
      d.append(gap, slot);
    }
    for (const t of texts) { const e = document.createElement('div'); e.textContent = t; d.appendChild(e); }
    const last = d.lastElementChild.getBoundingClientRect(), top = d.getBoundingClientRect().top;
    return Math.round((last.bottom - top) / lh);
  };
};

async function state(p) {
  return p.evaluate(() => {
    const R = globalThis.__bt, mb = document.getElementById('msgband'), cs = getComputedStyle(mb);
    const b = mb.getBoundingClientRect(), m = R.bandMetrics();
    const inner = { l: b.left + parseFloat(cs.paddingLeft), r: b.right - parseFloat(cs.paddingRight), t: b.top + parseFloat(cs.paddingTop) - 0.5, b: b.bottom - parseFloat(cs.paddingBottom) + 1 };
    const rows = [...mb.querySelectorAll('.r')].map((e) => {
      const q = e.getBoundingClientRect(), rg = document.createRange();
      rg.selectNodeContents(e);
      const tr = rg.getBoundingClientRect();
      return { t: e.textContent, top: q.top, bottom: q.bottom, textR: tr.width ? tr.right : q.left, cut: e.scrollWidth > e.clientWidth + 1 };
    });
    const slot = mb.querySelector('.moreprompt');
    const sq = slot && slot.getBoundingClientRect();
    return { more: R.moreShown, page: R.page.map((e) => e.text), scroll: R.scrollRow, rows, inner, m,
      slot: sq && { l: sq.left, r: sq.right, t: sq.top, b: sq.bottom } };
  });
}

// The page measures its rows on a canvas, the oracle in the DOM; the two
// differ by a fraction of a pixel a row (canvas text comes out about 0.15%
// wider).  So --More-- is wrong only where the page would fit even a little
// narrower, and a missing one only where it would not fit even a little wider.
const tol = (s) => Math.max(1, 0.004 * s.m.width);

function checkShown(s, want, bad, where) {
  if (s.m.rows !== want) bad.push(`${where}: bandMetrics rows ${s.m.rows}, the layout's ${want}`);
  if (s.rows.length > s.m.rows) bad.push(`${where}: ${s.rows.length} rows shown in a ${s.m.rows}-row band`);
  for (const r of s.rows) {
    if (r.top < s.inner.t || r.bottom > s.inner.b) bad.push(`${where}: row "${r.t.slice(0, 20)}" ${r.top.toFixed(1)}-${r.bottom.toFixed(1)} outside the band ${s.inner.t.toFixed(1)}-${s.inner.b.toFixed(1)}`);
    if (r.cut || r.textR > s.inner.r + 0.5) bad.push(`${where}: row "${r.t.slice(0, 20)}" cut short at the right`);
  }
  if (s.more) {
    if (!s.slot) bad.push(`${where}: --More-- is not drawn`);
    else {
      if (s.slot.r > s.inner.r + 10.5 || s.slot.b > s.inner.b + 4 || s.slot.t < s.inner.t) bad.push(`${where}: the --More-- slot lies outside the band`);
      const last = s.rows[s.rows.length - 1];
      if (last && Math.min(last.bottom, s.slot.b) - Math.max(last.top, s.slot.t) > 4 && last.textR > s.slot.l + 0.5) bad.push(`${where}: --More-- on the last row's text ("${last.t}" ends at ${last.textR.toFixed(2)}, the slot starts at ${s.slot.l.toFixed(2)})`);
    }
  }
}

const b = await launch();
const out = [];
let fails = 0;
const CASES = [];
for (const pr of PHONES) for (const o of ['L', 'P']) CASES.push({ tag: `${pr.tag}-${o}`, w: pr[o][0], h: pr[o][1], prefs: {} });
for (const [w, h] of BIG) CASES.push({ tag: `${w}x${h}`, w, h, prefs: {} });
CASES.push({ tag: 'rows-lucas-L', w: 896, h: 443, prefs: { mapCell: 'rows' } });
CASES.push({ tag: 'big-text-lucas-L', w: 896, h: 443, prefs: { msgSize: 1.4 } });
CASES.push({ tag: 'big-text-lucas-P', w: 443, h: 939, prefs: { msgSize: 1.4 } });
CASES.push({ tag: 'vt323-lucas-L', w: 896, h: 443, prefs: { msgFont: 'screen' } });
CASES.push({ tag: 'vt323-small-P', w: 360, h: 640, prefs: { msgFont: 'screen' } });
for (const c of CASES) {
  if (only && !c.tag.startsWith(only)) continue;
  const ctx = await newCtx(b, { w: c.w, h: c.h, dpr: DPR, prefs: { ...c.prefs, budgets: {} } });
  await ctx.addInitScript(ORACLE);
  const p = await openPage(ctx);
  await resume(p);
  const k = await touch(ctx, p);
  await sleep(400);
  const want = await p.evaluate(() => globalThis.__bt.overlay.twin.info.fill.rows_msg);
  const bad = [], screens = [];
  let mores = 0, shotN = 0;
  await p.evaluate(() => globalThis.__bt.msg.begin());
  for (const [i, t] of MSGS.entries()) {
    const before = await state(p);
    await p.evaluate((x) => globalThis.__bt.msg.put(x), t);
    let r = await p.evaluate(() => globalThis.__bt.msg.settle());
    let first = true;
    while (r === 'waiting') {
      const s = await state(p);
      const where = `msg ${i} --More-- ${mores}`;
      if (!s.more) { bad.push(`${where}: the page waits with no --More--`); break; }
      mores++;
      checkShown(s, want, bad, where);
      const slotW = s.m.slot;
      if (s.page[s.page.length - 1] !== t) {
        // full before this message: the page with it would not fit
        if (!first) bad.push(`${where}: a second --More-- before the message`);
        const n = await p.evaluate(([texts, sw, n, dw]) => globalThis.__lines(texts, sw, n, dw), [[...s.page, t], slotW, s.m.rows, -tol(s)]);
        if (n - s.scroll <= s.m.rows) bad.push(`${where}: --More-- with room for "${t.slice(0, 24)}" (${n} lines from row ${s.scroll}, ${s.m.rows} rows)`);
      } else {
        // a message longer than the band, a band at a time
        const n = await p.evaluate(([texts, sw, n, dw]) => globalThis.__lines(texts, sw, n, dw), [s.page, slotW, s.m.rows, -tol(s)]);
        if (n - s.scroll <= s.m.rows) bad.push(`${where}: --More-- inside a message that fits (${n} lines from row ${s.scroll})`);
        if (s.rows.length !== s.m.rows) bad.push(`${where}: a long message's page shows ${s.rows.length} of ${s.m.rows} rows`);
      }
      screens.push(s.rows.map((x) => x.t).join(' '));
      if (shotN < 3) await k.shot(`${SHOTS}/more-${DPR}-${c.tag}-${shotN++}.png`);
      first = false;
      await p.evaluate(() => globalThis.__bt.msg.key(32));
      r = await p.evaluate(() => globalThis.__bt.msg.settle());
    }
    const s = await state(p);
    if (s.more) bad.push(`msg ${i}: --More-- left up`);
    checkShown(s, want, bad, `msg ${i} added`);
    const n = await p.evaluate(([texts, sw, n, dw]) => globalThis.__lines(texts, sw, n, dw), [s.page, s.m.slot, s.m.rows, tol(s)]);
    if (n - s.scroll > s.m.rows) bad.push(`msg ${i} added with no --More--, but the page needs ${n} lines from row ${s.scroll} in ${s.m.rows}`);
    if (!s.page.includes(t)) bad.push(`msg ${i} is not on the page`);
  }
  const fin = await state(p);
  screens.push(fin.rows.map((x) => x.t).join(' '));
  const norm = (x) => x.replace(/\s+/g, ' ').trim();
  if (norm(screens.join(' ')) !== norm(MSGS.join(' '))) {
    const A = norm(screens.join(' ')), B = norm(MSGS.join(' '));
    let at = 0; while (at < A.length && A[at] === B[at]) at++;
    bad.push(`the screens read in order are not the messages: from char ${at} "${A.slice(at, at + 40)}" vs "${B.slice(at, at + 40)}"`);
  }
  await k.shot(`${SHOTS}/more-${DPR}-${c.tag}-end.png`);
  await p.evaluate(() => globalThis.__bt.msg.end());
  // the game still plays after: a key walks
  await sleep(200);
  const waiting = await p.evaluate(() => globalThis.__bt.waiting);
  if (!waiting) bad.push('the core is not waiting after the test');
  if (p.errors.length) bad.push(`console: ${p.errors.join(' | ')}`);
  fails += bad.length;
  console.log(`${c.tag} ${c.w}x${c.h} @${DPR}: ${want} rows, width ${fin.m.width.toFixed(1)}, ${mores} --More--, ${screens.length} screens; ${bad.length ? `BAD ${bad.length}: ${bad.slice(0, 5).join(' | ')}` : 'ok'}`);
  out.push({ ...c, rows: want, width: fin.m.width, mores, screens, bad });
  await ctx.close();
}
writeJson(`more-${DPR}.json`, out);
console.log(fails ? `FAILURES: ${fails}` : 'ALL PASS');
await b.close();
