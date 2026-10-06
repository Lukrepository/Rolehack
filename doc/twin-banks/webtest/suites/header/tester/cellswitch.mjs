// The map cell changed at run time (Settings -> Map cell, prefs mapCell): the
// page lays out again at once -- keys and bands at layout()'s rects for the
// new cell, the header moving over the banks or back -- and the drawn cell
// follows; also with a prayer's y/n question up (its chips must stay inside
// the map), and after turning the phone.
//   node cellswitch.mjs <dpr>  -> cellswitch-<dpr>.json
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, PHONES, BIG, writeJson } from './common.mjs';
import { twinCheck } from './pagecheck.mjs';

const DPR = Number(process.argv[2] || 1);
const b = await launch();
const out = [];
let fails = 0;
const setCell = (p, v) => p.evaluate(async (v) => { const P = await import('./prefs.js'); P.set('mapCell', v); }, v);
const check = async (p) => { await sleep(500); return p.evaluate(twinCheck, {}); };

const WINS = [...PHONES.map((ph) => ph.L), ...PHONES.map((ph) => ph.P), ...BIG];
for (const [w, h] of WINS) {
  const name = `cellswitch-${DPR}-${w}x${h}`;
  const ctx = await newCtx(b, { w, h, dpr: DPR, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  const T = await touch(ctx, p);
  await T.rotate(w, h, DPR);
  await resume(p);
  const bad = [], trail = [];
  const step = async (label) => {
    const r = await check(p);
    trail.push(`${label}: T=${r.info.T?.toFixed(2)} over=${r.info.over} rows=${r.info.rows} drawn=${r.info.Td}`);
    bad.push(...r.bad.map((x) => `${label}: ${x}`));
    return r;
  };
  const a = await step('columns');
  await setCell(p, 'rows');
  const r1 = await step('switched to rows');
  await T.shot(`${SHOTS}/${name}-rows.png`);
  // with a question up
  await p.evaluate(() => globalThis.__T.send('#pray\n'));
  await sleep(600);
  await setCell(p, 'columns');
  const r2 = await step('back to columns, question up');
  const chips = await p.evaluate(() => document.getElementById('chips').children.length);
  if (!chips) bad.push('the question\'s chips are gone after the switch');
  await setCell(p, 'rows');
  await step('rows again, question up');
  await T.shot(`${SHOTS}/${name}-rows-question.png`);
  await p.keyboard.press('Escape');
  await sleep(300);
  await resume(p);
  await setCell(p, 'columns');
  const r3 = await step('columns at the end');
  if (a.info.Td !== r3.info.Td) bad.push(`the drawn cell did not come back: ${a.info.Td} -> ${r3.info.Td}`);
  if (r1.info.T !== a.info.T && r1.info.Td === a.info.Td && Math.floor(r1.info.T * DPR) !== Math.floor(a.info.T * DPR)) bad.push('the rows cell changed T but not the drawn cell');
  bad.push(...p.errors.splice(0).map((x) => `console: ${x}`));
  fails += bad.length;
  out.push({ name, w, h, dpr: DPR, trail, bad });
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${name}\n     ${trail.join('\n     ')}${bad.length ? `\n     ${bad.slice(0, 8).join('\n     ')}` : ''}`);
  await ctx.close();
}
writeJson(`cellswitch-${DPR}.json`, out);
console.log(`${fails} failures in ${out.length} windows`);
await b.close();
