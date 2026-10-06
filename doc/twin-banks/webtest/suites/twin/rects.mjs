// Twin banks on the page, at every test window: each key's DOM rect against
// layout()'s (within 0.5 px), no overlaps, the map drawn inside its area
// (measure.mjs), and the same banks both ways once the budget has seen a turn.
// Each pair starts in landscape, turns to portrait and back.  A browser tab on
// Lucas's phone (896x363 / 443x859, screen 443x939) has its own pair.
//   node rects.mjs            -> rects.json, shots/rects-*.png
//   DPR=2.4375 node rects.mjs -> rects-2.4375.json
import { launch, ctxOptions, openPage, resumeGame, OUT, STATE, sleep, writeJson } from './common.mjs';
import { measure, parity } from './measure.mjs';

const DPR = Number(process.env.DPR || 1);
const PAIRS = [
  { l: [896, 443], p: [443, 939] }, { l: [640, 360], p: [360, 640] }, { l: [915, 412], p: [412, 915] },
  { l: [844, 390], p: [390, 844] }, { l: [896, 363], p: [443, 859], screen: [443, 939], tag: 'tab' },
];
const b = await launch();
const res = [];
let fails = 0;
for (const pr of PAIRS) {
  const [lw, lh] = pr.l, [pw, ph] = pr.p;
  const screen = pr.screen ? { width: pr.screen[0], height: pr.screen[1] } : { width: pw, height: ph };
  const ctx = await b.newContext({ ...ctxOptions(lw, lh, 'touch', { deviceScaleFactor: DPR, screen }), storageState: STATE });
  const p = await openPage(ctx, {});
  await resumeGame(p);
  const steps = [];
  const at = async (w, h, label) => {
    await p.setViewportSize({ width: w, height: h });
    await sleep(700);
    const m = await measure(p);
    await p.screenshot({ path: `${OUT}/shots/rects-${DPR}-${pr.tag || ''}${w}x${h}-${label}.png` });
    steps.push({ label, ...m });
    fails += (m.bad || []).length + (m.twin ? 0 : 1);
    console.log(`${w}x${h} @${DPR} ${label}: ${m.twin ? `${m.fit.level}, pad ${m.fit.pad}, worst ${m.worst.toFixed(3)} px, cell ${m.cell.toFixed(2)}; ${m.bad.length ? m.bad.slice(0, 6).join(' | ') : 'ok'}` : `NOT TWIN (${m.fallback})`}`);
    return m;
  };
  const L1 = await at(lw, lh, 'first');
  const P1 = await at(pw, ph, 'turned');
  const L2 = await at(lw, lh, 'back');
  const par = L2.twin && P1.twin ? parity(L2, P1) : ['not twin'];
  const same = L1.twin && L2.twin ? parity(L1, L2) : ['not twin'];
  if (par.length) fails++;
  console.log(`  parity ${pr.l.join('x')} / ${pr.p.join('x')}: ${par.length ? par.slice(0, 4).join(' | ') : '36 of 36 keys at the same corner offsets'}; first landscape vs after the turn: ${same.length ? `${same.length} differ (the budget's estimate corrected)` : 'the same'}; cell ${P1.cell && P1.cell.toFixed(2)} / ${L2.cell && L2.cell.toFixed(2)}`);
  res.push({ pair: pr, steps, parity: par, landscapeBeforeAfter: same, errors: p.errors });
  if (p.errors.length) { fails++; console.log('  console errors:', p.errors); }
  await ctx.close();
}
writeJson(`rects${DPR === 1 ? '' : `-${DPR}`}.json`, res);
console.log(fails ? `FAILURES: ${fails}` : 'all windows match layout()');
await b.close();
