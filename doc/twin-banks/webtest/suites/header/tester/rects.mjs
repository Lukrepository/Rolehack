// Every window: keys and bands against layout(), overlaps, the halo, what a
// finger reaches, the band's rows, the status lines and bars, the canvas and
// the drawn cell; a prayer's y/n chips inside the map.  Phones open in
// landscape, turn to portrait and back (window and screen swap); the tablet
// and laptop windows open alone.  Both map cells (columns: the header in the
// glass; rows: over the banks where it fits).  Screenshots of each state.
//   node rects.mjs <dpr> [columns|rows]  -> rects-<dpr>-<cell>.json, shots/rects-*.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, PHONES, BIG, writeJson } from './common.mjs';
import { twinCheck } from './pagecheck.mjs';

const DPR = Number(process.argv[2] || 1);
const CELLS = process.argv[3] ? [process.argv[3]] : ['columns', 'rows'];
// a variant: VARIANT=name, with extra prefs (VPREFS, JSON) and a system text size (TEXT, 1 = 16 px)
const VARIANT = process.env.VARIANT || '';
const VPREFS = JSON.parse(process.env.VPREFS || '{}');
const TEXT = Number(process.env.TEXT || 1);
const VT = VARIANT ? `${VARIANT}-` : '';
const b = await launch();
const out = [];
let fails = 0;

async function settle(p) {
  await p.evaluate(() => document.fonts && document.fonts.ready);
  await sleep(400);
  await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

async function chipsCheck(p) {
  // a y/n question: Are you sure you want to pray?
  await p.evaluate(() => globalThis.__T.send('#pray\n'));
  for (let i = 0; i < 20; i++) { await sleep(150); if (await p.evaluate(() => document.getElementById('chips').children.length > 0)) break; }
  await settle(p);
  const res = await p.evaluate(twinCheck, { textScale: TEXT });
  const chips = await p.evaluate(() => [...document.getElementById('chips').children].map((c) => c.textContent));
  return { res, chips };
}

async function record(p, T, tag, cell) {
  await settle(p);
  const res = await p.evaluate(twinCheck, { textScale: TEXT });
  const name = `rects-${DPR}-${VT}${cell}-${tag}`;
  await T.shot(`${SHOTS}/${name}.png`);
  const errs = p.errors.splice(0);
  if (errs.length) res.bad.push(...errs.map((e) => `console: ${e}`));
  out.push({ tag, cell, dpr: DPR, shot: `${SHOTS}/${name}.png`, ...res });
  fails += res.bad.length;
  console.log(`${res.bad.length ? 'FAIL' : 'ok  '} ${name} ${res.info.W}x${res.info.H} T=${res.info.T} drawn=${res.info.cellCss} over=${res.info.over} rows=${res.info.rows} bars=${res.info.bars} keyDev=${res.info.keyMaxDev}`
    + `${res.bad.length ? `\n     ${res.bad.slice(0, 8).join('\n     ')}` : ''}${res.notes.length ? `\n     note: ${res.notes.join('; ')}` : ''}`);
  return res;
}

for (const cell of CELLS) {
  for (const ph of PHONES) {
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(ph.tag)) continue;
    const [lw, lh] = ph.L, [pw, phh] = ph.P;
    const ctx = await newCtx(b, { w: lw, h: lh, dpr: DPR, prefs: { mapCell: cell, ghostDeck: { on: false, clean: 0, session: null }, ...VPREFS } });
    const p = await openPage(ctx, { fontSize: TEXT !== 1 ? 16 * TEXT : 0 });
    const T = await touch(ctx, p);
    await T.rotate(lw, lh, DPR);
    await resume(p);
    const a = await record(p, T, `${ph.tag}-L-${lw}x${lh}`, cell);
    const ch = await chipsCheck(p);
    await T.shot(`${SHOTS}/rects-${DPR}-${VT}${cell}-${ph.tag}-L-chips.png`);
    if (!ch.chips.length) ch.res.bad.push('no chips for the prayer question');
    out.push({ tag: `${ph.tag}-L-chips`, cell, dpr: DPR, chips: ch.chips, ...ch.res });
    fails += ch.res.bad.length;
    console.log(`${ch.res.bad.length ? 'FAIL' : 'ok  '} chips ${ph.tag} L [${ch.chips.join(' ')}] ${JSON.stringify(ch.res.info.chips)}${ch.res.bad.length ? `\n     ${ch.res.bad.slice(0, 6).join('\n     ')}` : ''}`);
    // turn with the question up, then answer it in portrait
    await T.rotate(pw, phh, DPR);
    const c2 = await chipsCheck(p).catch(() => null);
    if (c2) { out.push({ tag: `${ph.tag}-P-chips`, cell, dpr: DPR, chips: c2.chips, ...c2.res }); fails += c2.res.bad.length;
      console.log(`${c2.res.bad.length ? 'FAIL' : 'ok  '} chips ${ph.tag} P [${c2.chips.join(' ')}]${c2.res.bad.length ? `\n     ${c2.res.bad.slice(0, 6).join('\n     ')}` : ''}`); }
    await p.keyboard.press('Escape'); await sleep(300); await p.keyboard.press('Escape'); await sleep(300);
    await resume(p);
    const bP = await record(p, T, `${ph.tag}-P-${pw}x${phh}`, cell);
    await T.rotate(lw, lh, DPR);
    const c = await record(p, T, `${ph.tag}-L2-${lw}x${lh}`, cell);
    // rotation keeps the glyph size
    const tds = [a, bP, c].map((r) => r.info.Td);
    const ok = tds.every((v) => v === tds[0]);
    const rot = { tag: `${ph.tag}-rotation`, cell, dpr: DPR, bad: ok ? [] : [`drawn cell L/P/L ${tds.join(' / ')} device px`], notes: [], info: { Td: tds, T: [a, bP, c].map((r) => r.info.T) } };
    out.push(rot); fails += rot.bad.length;
    console.log(`${ok ? 'ok  ' : 'FAIL'} rotation ${ph.tag} ${cell}: drawn cell ${tds.join(' / ')} device px (T ${rot.info.T.join(' / ')})`);
    await ctx.close();
  }
  for (const [w, h] of BIG) {
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(`${w}x${h}`)) continue;
    const ctx = await newCtx(b, { w, h, dpr: DPR, prefs: { mapCell: cell, ghostDeck: { on: false, clean: 0, session: null }, ...VPREFS } });
    const p = await openPage(ctx, { fontSize: TEXT !== 1 ? 16 * TEXT : 0 });
    const T = await touch(ctx, p);
    await T.rotate(w, h, DPR);
    await resume(p);
    await record(p, T, `${w}x${h}`, cell);
    const ch = await chipsCheck(p);
    await T.shot(`${SHOTS}/rects-${DPR}-${VT}${cell}-${w}x${h}-chips.png`);
    if (!ch.chips.length) ch.res.bad.push('no chips for the prayer question');
    out.push({ tag: `${w}x${h}-chips`, cell, dpr: DPR, chips: ch.chips, ...ch.res }); fails += ch.res.bad.length;
    console.log(`${ch.res.bad.length ? 'FAIL' : 'ok  '} chips ${w}x${h} [${ch.chips.join(' ')}]${ch.res.bad.length ? `\n     ${ch.res.bad.slice(0, 6).join('\n     ')}` : ''}`);
    await p.keyboard.press('Escape');
    await ctx.close();
  }
}
writeJson(`rects-${DPR}-${VT}${CELLS.join('+')}.json`, out);
console.log(`${fails} failures in ${out.length} states`);
await b.close();
