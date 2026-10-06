// Phones opened in portrait first (no budget yet), turned to landscape and
// back: the drawn cell in each state, keys and bands against layout() each
// time.  Lucas's phone is letterboxed in landscape (896 wide, portrait 939
// tall), so its first visit in portrait estimates a 939-wide landscape: the
// design's accepted risk 7 (one re-fit after the first turn).
//   node rotate-p.mjs <dpr>  -> rotate-p-<dpr>.json
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, PHONES, writeJson } from './common.mjs';
import { twinCheck } from './pagecheck.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await launch();
const out = [];
let fails = 0;
for (const cell of ['columns', 'rows']) for (const ph of PHONES) {
  const [lw, lh] = ph.L, [pw, phh] = ph.P;
  const name = `rotate-p-${DPR}-${cell}-${ph.tag}`;
  const ctx = await newCtx(b, { w: pw, h: phh, dpr: DPR, prefs: { mapCell: cell, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  const T = await touch(ctx, p);
  await T.rotate(pw, phh, DPR);
  await resume(p);
  const bad = [], tds = [], ts = [];
  for (const [w, h, tag] of [[pw, phh, 'P'], [lw, lh, 'L'], [pw, phh, 'P2'], [lw, lh, 'L2']]) {
    if (tag !== 'P') await T.rotate(w, h, DPR);
    await sleep(400);
    const r = await p.evaluate(twinCheck, {});
    bad.push(...r.bad.map((x) => `${tag}: ${x}`));
    tds.push(r.info.Td); ts.push(r.info.T && +r.info.T.toFixed(2));
  }
  // after the first turn the cell must hold
  if (!(tds[1] === tds[2] && tds[2] === tds[3])) bad.push(`after the first turn the drawn cell still changes: ${tds.join(' / ')}`);
  const note = tds[0] !== tds[1] ? `first visit in portrait: cell ${tds[0]} then ${tds[1]} after the first turn` : '';
  bad.push(...p.errors.splice(0).map((x) => `console: ${x}`));
  fails += bad.length;
  out.push({ name, tds, ts, note, bad });
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${name} drawn P/L/P/L ${tds.join(' / ')} (T ${ts.join(' / ')})${note ? ` note: ${note}` : ''}${bad.length ? `\n     ${bad.slice(0, 6).join('\n     ')}` : ''}`);
  await ctx.close();
}
writeJson(`rotate-p-${DPR}.json`, out);
console.log(`${fails} failures in ${out.length} phones`);
await b.close();
