// --More-- comes exactly when the band is full, through the real game: a Lua
// script of nh.pline() calls run with #wizloadlua in a debug-mode game, so the
// messages reach the page the way the game's own do and the core really waits
// at each --More--.  The messages are made in the page for the band as drawn:
// short ones (one row) and long ones whose rows are measured by the browser's
// own line breaking in a probe of the band's font and content width (two or
// three rows, the count the same 6 px either side, the last row short of the
// --More-- slot).  The expected pages follow the band's rule, from that
// measure and the rows the band's height holds:
//   a message that does not fit in the rows left starts a new page after a
//   --More--; a message longer than the band shows a band at a time.
// At every --More--: the page holds the expected messages; the band shows
// exactly their rows, none clipped; --More-- sits inside the band, clear of
// the text; the remaining rows could not have held the next message.  The
// second --More-- is answered by a tap on the message band, the third on the
// status band, the fourth on the map, the rest with Space.  Afterwards the
// last page stands with no --More--.
//   node more.mjs <dpr>   -> more-<dpr>.json, shots/more-*.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, PHONES, BIG, WIZSTATE, writeJson } from './common.mjs';
import { twinCheck } from './pagecheck.mjs';

const DPR = Number(process.argv[2] || 1);
const b = await launch();
const out = [];
let fails = 0;

const WINS = [...PHONES.flatMap((p) => [[...p.L, p.tag], [...p.P, p.tag]]), ...BIG.map(([w, h]) => [w, h, 'big'])];
const VARIANTS = [
  { name: 'default', prefs: {} },
  { name: 'rows', prefs: { mapCell: 'rows' } },
  { name: 'msg1.4', prefs: { msgSize: 1.4 }, only: ['lucas', 'small'] },
];
// the order of message kinds: S one row, L two rows, X three
const PATTERN = 'SSSSSLSLLSSLXSSLLSSSLX';

async function waitFor(p, pred, ms = 6000) {
  const t0 = Date.now();
  for (;;) {
    const s = await p.evaluate(() => ({ more: globalThis.__T.moreShown, cw: globalThis.__T.commandWait, line: !!(document.getElementById('line') && document.getElementById('line').offsetParent) }));
    if (pred(s)) return s;
    if (Date.now() - t0 > ms) return s;
    await sleep(60);
  }
}

// Messages for the band as drawn, and the pages they should make.  Rows are
// broken here by the browser's own text measure (a nowrap probe in the
// band's font), greedily at spaces, each page's last row short by the
// --More-- slot (tty keeps 8 columns for it: the slot is "--More--" plus 14
// px, web.js's constant); a break within 2 px of the room is ambiguous and
// the window's result is marked so.  The pages follow the band's rule:
//   a message that does not fit in the rows left starts a new page after a
//   --More--; a message longer than the band shows a band at a time.
const makeMessages = ({ pattern, R }) => {
  const mb = document.getElementById('msgband'), cs = getComputedStyle(mb);
  const w = mb.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const span = document.createElement('span');
  Object.assign(span.style, { position: 'absolute', left: '-9999px', top: '0', whiteSpace: 'pre', fontFamily: cs.fontFamily, fontSize: cs.fontSize,
    fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing });
  document.body.appendChild(span);
  const width = (t) => { span.textContent = t; return span.getBoundingClientRect().width; };
  const slot = width('--More--') + 14;
  let ambiguous = 0;
  const wrap = (text, start) => {
    let n = 0, row = '', r = start;
    const room = () => w - ((r % R) === R - 1 ? slot : 0);
    for (const word of text.split(' ')) {
      const trial = row ? `${row} ${word}` : word, tw = width(trial);
      if (Math.abs(room() - tw) < 2) ambiguous++;
      if (tw <= room() || !row) row = trial;
      else { n++; r++; row = word; }
    }
    return n + 1;
  };
  const words = 'the gnome lord swings his crossbow and misses you while a newt bites the jackal near the fountain where coins glitter faintly'.split(' ');
  const make = (rows, n) => {
    let t = `m${String(n).padStart(2, '0')}`, i = n;
    for (let guard = 0; guard < 400; guard++) {
      const trial = `${t} ${words[i++ % words.length]}`;
      // the core's pline() keeps 255 characters (BUFSZ)
      if (wrap(trial, 0) > rows || trial.length > 240) break;
      t = trial;
    }
    return t;
  };
  ambiguous = 0;
  const msgs = [...pattern].map((k, n) => (k === 'S' ? `m${String(n).padStart(2, '0')} short note` : make({ L: 2, X: 3 }[k], n)));
  ambiguous = 0;
  const mores = [];
  let page = [], used = 0, scroll = 0;
  const rows = [];
  for (const [i, t] of msgs.entries()) {
    let k = wrap(t, used);
    if (used > 0 && used + k > scroll + R) { mores.push({ page: [...page], scroll, why: `${used - scroll} of ${R} rows used, next needs ${k} from there` }); page = []; used = 0; scroll = 0; k = wrap(t, 0); }
    page.push(i); used += k; rows.push(k);
    while (used - scroll > R) { mores.push({ page: [...page], scroll, why: 'longer than the band' }); scroll += R; }
  }
  const alone = msgs.map((t) => ({ t, rows: wrap(t, 0) }));
  span.remove();
  return { msgs: alone, w, slot, ambiguous, exp: { mores, last: { page, scroll } }, pageRows: rows };
};

for (const v of VARIANTS) {
  for (const [w, h, tag] of WINS) {
    if (v.only && !v.only.includes(tag)) continue;
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(`${v.name}:${w}x${h}`)) continue;
    const name = `more-${DPR}-${v.name}-${w}x${h}`;
    const ctx = await newCtx(b, { w, h, dpr: DPR, state: WIZSTATE, wiz: true, prefs: { ...v.prefs, ghostDeck: { on: false, clean: 0, session: null } } });
    const p = await openPage(ctx);
    const T = await touch(ctx, p);
    await T.rotate(w, h, DPR);
    await resume(p, 'wizard');
    await p.evaluate(() => document.fonts && document.fonts.ready);
    await sleep(300);
    const base = await p.evaluate(twinCheck, {});
    const bad = [...base.bad.map((x) => `layout: ${x}`)];
    const R = base.info.bandRowsFit;
    const { msgs, w: bw, slot, ambiguous, exp, pageRows } = await p.evaluate(makeMessages, { pattern: PATTERN, R });
    const lua = msgs.map((m) => `nh.pline("${m.t.replace(/["\\]/g, '')}")`).join('\n') + '\n';
    await p.evaluate((src) => globalThis.__T.M.FS.writeFile('/more.lua', src), lua);
    await p.evaluate(() => globalThis.__T.send('#wizloadlua\n'));
    const s0 = await waitFor(p, (s) => s.line);
    if (!s0.line) { bad.push('no "Load which lua file?" line'); }
    else { await p.fill('#line', '/more.lua'); await p.press('#line', 'Enter'); }
    const seen = [];
    for (let k = 0; k < exp.mores.length + 3; k++) {
      const s = await waitFor(p, (q) => q.more || q.cw);
      const st = await p.evaluate(() => {
        const T_ = globalThis.__T, mb = document.getElementById('msgband'), cs = getComputedStyle(mb), r = mb.getBoundingClientRect();
        const content = { x: r.x + parseFloat(cs.paddingLeft), y: r.y + parseFloat(cs.paddingTop), w: r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), h: r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) };
        const rows = [...mb.querySelectorAll('div.r')].map((d) => {
          const q = d.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(d);
          const tr = [...rg.getClientRects()]; const tw = tr.length ? Math.max(...tr.map((x) => x.right)) : q.x;
          return { t: d.textContent, x: q.x, y: q.y, w: q.width, h: q.height, textRight: tw, lines: tr.length };
        });
        const mp = mb.querySelector('.moreprompt');
        const mr = mp && mp.getBoundingClientRect();
        return { more: T_.moreShown, page: T_.page, scroll: T_.scrollRow, rows, band: { x: r.x, y: r.y, w: r.width, h: r.height }, content,
          prompt: mr && { x: mr.x, y: mr.y, w: mr.width, h: mr.height }, overflow: cs.overflow };
      });
      const idx = (t) => msgs.findIndex((m) => m.t === t);
      const pageIds = st.page.map(idx);
      if (!st.more) {
        // the end: the last page, no --More--
        if (k < exp.mores.length) bad.push(`--More-- ${k + 1} never came (expected page ${JSON.stringify(exp.mores[k].page)} because ${exp.mores[k].why}); band shows page ${JSON.stringify(pageIds)}`);
        else if (JSON.stringify(pageIds.filter((i) => i >= 0)) !== JSON.stringify(exp.last.page)) bad.push(`last page ${JSON.stringify(pageIds)} expected ${JSON.stringify(exp.last.page)}`);
        seen.push({ end: true, page: pageIds, rows: st.rows.length });
        break;
      }
      const e = exp.mores[k];
      seen.push({ page: pageIds, scroll: st.scroll, rows: st.rows.map((r) => r.t) });
      if (k === 0) await T.shot(`${SHOTS}/${name}.png`);
      if (!e) bad.push(`an extra --More-- ${k + 1} with page ${JSON.stringify(pageIds)}`);
      else {
        if (JSON.stringify(pageIds) !== JSON.stringify(e.page) || st.scroll !== e.scroll) bad.push(`--More-- ${k + 1}: page ${JSON.stringify(pageIds)} scroll ${st.scroll}, expected ${JSON.stringify(e.page)} scroll ${e.scroll} (${e.why})`);
        const usedRows = e.page.reduce((a, i) => a + pageRows[i], 0) - e.scroll;
        const shownRows = Math.min(R, usedRows);
        if (st.rows.length !== shownRows) bad.push(`--More-- ${k + 1}: the band shows ${st.rows.length} rows, its page has ${shownRows}`);
      }
      // no row clipped, each one line, --More-- inside the band and clear of the text
      for (const [i, r] of st.rows.entries()) {
        if (r.y < st.content.y - 0.6 || r.y + r.h > st.content.y + st.content.h + 0.6) bad.push(`--More-- ${k + 1}: row ${i + 1} "${r.t.slice(0, 20)}" ${r.y.toFixed(1)}+${r.h.toFixed(1)} outside the band's content ${st.content.y.toFixed(1)}+${st.content.h.toFixed(1)}`);
        if (r.lines > 1) bad.push(`--More-- ${k + 1}: row ${i + 1} breaks into ${r.lines} lines in the band`);
        if (r.textRight > st.content.x + st.content.w + 0.6) bad.push(`--More-- ${k + 1}: row ${i + 1} runs ${(r.textRight - st.content.x - st.content.w).toFixed(1)} px past the band`);
      }
      if (!st.prompt) bad.push(`--More-- ${k + 1}: no --More-- in the band`);
      else {
        const q = st.prompt, bd = st.band;
        if (q.x < bd.x - 0.5 || q.y < bd.y - 0.5 || q.x + q.w > bd.x + bd.w + 0.5 || q.y + q.h > bd.y + bd.h + 0.5) bad.push(`--More-- ${k + 1}: the prompt ${JSON.stringify(q)} leaves the band ${JSON.stringify(bd)}`);
        const last = st.rows[st.rows.length - 1];
        if (last && last.textRight > q.x - 1 && q.y < last.y + last.h - 1 && q.y + q.h > last.y + 1) bad.push(`--More-- ${k + 1}: the prompt overlaps the last row's text (text ends ${last.textRight.toFixed(1)}, prompt at ${q.x.toFixed(1)})`);
      }
      // answer: a tap on the message band, the status band, the map, else Space
      const how = k === 1 ? 'msgband' : k === 2 ? 'statband' : k === 3 ? 'map' : 'space';
      if (how === 'space') await p.keyboard.press('Space');
      else {
        const q = await p.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x + r.width * 0.3, y: r.y + r.height * 0.5 }; }, how);
        await T.tap(q.x, q.y);
      }
      const moved = await waitFor(p, (q) => !q.more || q.cw, 1500);
      const after = await p.evaluate(() => globalThis.__T.page.length);
      if (how !== 'space' && moved.more && await p.evaluate((n) => globalThis.__T.page.join('|') === n, st.page.join('|'))) bad.push(`--More-- ${k + 1}: a tap on the ${how} did not answer it`);
    }
    const errs = p.errors.splice(0);
    bad.push(...errs.map((x) => `console: ${x}`));
    fails += bad.length;
    // a page of one row in a band of more, at --More--: the band was not full to the eye
    const lone = seen.filter((q) => !q.end && q.rows && q.rows.length < R).length;
    out.push({ name, w, h, dpr: DPR, variant: v.name, R, bandW: bw, slot, ambiguous, lone, kinds: msgs.map((m) => m.rows).join(''), expected: exp, seen, bad, shot: `${SHOTS}/${name}.png` });
    console.log(`${bad.length ? 'FAIL' : 'ok  '} ${name} rows=${R} band=${bw.toFixed(0)} slot=${slot.toFixed(0)} short-pages=${lone}${ambiguous ? ` AMBIGUOUS=${ambiguous}` : ''} msgs=${msgs.length} [${msgs.map((m) => m.rows).join('')}] mores=${exp.mores.length} seen=${seen.length - 1}${bad.length ? `\n     ${bad.slice(0, 8).join('\n     ')}` : ''}`);
    await ctx.close();
  }
}
writeJson(`more-${DPR}${process.env.ONLY ? '-only' : ''}.json`, out);
console.log(`${fails} failures in ${out.length} windows`);
await b.close();
