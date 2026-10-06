// A phone turned while the game waits at --More--, through the real game
// (#wizloadlua in a debug-mode game): one message longer than the band and
// two short ones after it.  At the first --More-- the phone turns to
// portrait, at the second back to landscape (and so on), and each --More--
// is answered with Space.  At every --More-- the band must show text (never a
// blank band) and --More--, and over the whole run every word of every
// message must have been shown, in order (a page may show a row again, never
// skip one).  Message size 1 and 1.4; both map cells.
//   node more-turn.mjs <dpr>  -> more-turn-<dpr>.json, shots/more-turn-*.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, PHONES, WIZSTATE, writeJson } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const b = await launch();
const out = [];
let fails = 0;
const WORDS = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango uniform victor whiskey xray yankee zulu'.split(' ');
const long = (n) => Array.from({ length: n }, (_, i) => `${WORDS[i % 26]}${Math.floor(i / 26) || ''}`).join(' ');

async function waitFor(p, pred, ms = 5000) {
  const t0 = Date.now();
  for (;;) {
    const s = await p.evaluate(() => ({ more: globalThis.__T.moreShown, cw: globalThis.__T.commandWait }));
    if (pred(s) || Date.now() - t0 > ms) return s;
    await sleep(50);
  }
}

for (const cell of ['columns', 'rows']) for (const msgSize of [1, 1.4]) for (const ph of PHONES) {
  const name = `more-turn-${DPR}-${cell}-m${msgSize}-${ph.tag}`;
  const [lw, lh] = ph.L, [pw, phh] = ph.P;
  const ctx = await newCtx(b, { w: lw, h: lh, dpr: DPR, state: WIZSTATE, wiz: true, prefs: { mapCell: cell, msgSize, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  const T = await touch(ctx, p);
  await T.rotate(lw, lh, DPR);
  await resume(p, 'wizard');
  const bad = [];
  // the core's pline() keeps 255 characters (BUFSZ), so the long text is three messages
  const L70 = long(105).split(' ');
  const msgs = [L70.slice(0, 30).join(' '), L70.slice(30, 60).join(' '), 'after one short', L70.slice(60, 90).join(' '), 'after two short'];
  if (msgs.some((m) => m.length > 250)) throw new Error('message too long for pline');
  await p.evaluate((src) => globalThis.__T.M.FS.writeFile('/turn.lua', src), msgs.map((m) => `nh.pline("${m}")`).join('\n') + '\n');
  await p.evaluate(() => globalThis.__T.send('#wizloadlua\n'));
  for (let i = 0; i < 40; i++) { if (await p.evaluate(() => !!(document.getElementById('line') && document.getElementById('line').offsetParent))) break; await sleep(50); }
  await p.fill('#line', '/turn.lua'); await p.press('#line', 'Enter');
  const shown = [];
  let portrait = false, k = 0;
  // (80: a page re-paged after each turn, at Message size 1.4 on a 360 dp band, takes over 30)
  for (; k < 80; k++) {
    const s = await waitFor(p, (q) => q.more || q.cw);
    const band = async () => p.evaluate(() => [...document.querySelectorAll('#msgband div.r')].map((d) => d.textContent));
    const rows0 = await band();
    shown.push(...rows0);
    if (!s.more) break;
    if (!rows0.join('').trim()) bad.push(`--More-- ${k + 1}: the band is blank`);
    // turn the phone
    portrait = !portrait;
    await T.rotate(portrait ? pw : lw, portrait ? phh : lh, DPR);
    await sleep(300);
    const rows1 = await band();
    const st = await p.evaluate(() => ({ more: globalThis.__T.moreShown, prompt: !!document.querySelector('#msgband .moreprompt') }));
    if (k < 3) await T.shot(`${SHOTS}/${name}-${k + 1}-${portrait ? 'P' : 'L'}.png`);
    if (!rows1.join('').trim()) bad.push(`--More-- ${k + 1}: blank band after turning to ${portrait ? 'portrait' : 'landscape'}`);
    if (st.more && !st.prompt) bad.push(`--More-- ${k + 1}: no --More-- in the band after the turn`);
    shown.push(...rows1);
    await p.keyboard.press('Space');
    await sleep(120);
  }
  // every word, in order, somewhere in what the band showed
  const seen = shown.join(' ').split(/\s+/).filter(Boolean);
  let at = 0;
  const all = msgs.join(' ').split(' ');
  const missing = [];
  for (const wd of all) {
    const j = seen.indexOf(wd, at);
    if (j < 0) missing.push(wd); else at = j + 1;
  }
  if (missing.length) bad.push(`never shown (or out of order): ${missing.slice(0, 12).join(' ')}${missing.length > 12 ? ` ... ${missing.length} words` : ''}`);
  bad.push(...p.errors.splice(0).map((x) => `console: ${x}`));
  fails += bad.length;
  out.push({ name, dpr: DPR, cell, msgSize, mores: k, bad });
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${name} mores=${k}${bad.length ? `\n     ${bad.slice(0, 6).join('\n     ')}` : ''}`);
  await ctx.close();
}
writeJson(`more-turn-${DPR}.json`, out);
console.log(`${fails} failures in ${out.length} runs`);
await b.close();
