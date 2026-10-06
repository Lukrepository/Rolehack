// Nothing pops over a key, anywhere: every key tapped and every key held
// (hubs, pins, the flick key, REST, the pad centre...), the ghost deck's
// previews and its two habit guards, each with its pop-ups read and checked
// against every keycap and the map area.
//   node popsweep.mjs <dpr> [WxH]
import { launch, newCtx, openPage, resume, toucher, SIZES, SHOTS, writeJson, Checks, sleep } from './common.mjs';
import { cap, spec, mark, state, reset, popups } from './probe.mjs';

const dpr = Number(process.argv[2] || 1);
const only = process.argv[3] || null;
const MACROS = [{ name: 'M1', keys: 'Q' }, { name: 'M2', keys: 'Q' }, { name: 'M3', keys: 'Q' }, { name: 'Tap', keys: 'Q' }, { name: 'Kick', keys: '^D' }, { name: 'UR', keys: 'Q' }];
const b = await launch();
const all = [];
const seen = [];
for (const [W, H] of SIZES) {
  if (only && only !== `${W}x${H}`) continue;
  const tag = `${dpr}-${W}x${H}`;
  const C = new Checks(`pops ${tag}`);
  // the ghost deck on, so its flashes are among the pop-ups
  const ctx = await newCtx(b, { w: W, h: H, dpr, prefs: { macros: MACROS, ghostDeck: { on: true, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  await p.evaluate(() => { globalThis.__swallowAll = true; });
  const t = await toucher(ctx, p);
  const S = await spec(p);
  const bad = [];
  const check = async (what) => {
    const q = await popups(p);
    seen.push({ tag, what, shown: q.shown });
    if (q.bad.length) bad.push({ what, bad: q.bad });
    C.ok(`no pop-up over a key: ${what}`, q.bad.length === 0, q.bad.length ? q.bad : '');
  };
  for (const c of S.controls) {
    if (c.behind) continue;
    const k = await cap(p, c.id);
    // tap
    await reset(p); await mark(p);
    await t.tap(k.cx, k.cy, { after: 120 });
    await check(`tap ${c.id}`);
    if ((await state(p)).form) await p.keyboard.press('Escape');
    // hold, checked while held and after the lift
    await reset(p); await mark(p);
    await t.start(k.cx, k.cy);
    await sleep(700);
    await check(`hold ${c.id} (held)`);
    await t.end(); await sleep(150);
    await check(`hold ${c.id} (lifted)`);
    if ((await state(p)).form) await p.keyboard.press('Escape');
  }
  // the ghost deck's spots (landscape): a tap there previews with the old key's name
  const spots = await p.evaluate(() => (globalThis.__tt.overlay.ghostSpots || []).map((g) => ({ id: g.id, x: g.r.x + g.r.w / 2, y: g.r.y + g.r.h / 2 })));
  for (const g of spots) {
    await reset(p); await mark(p);
    await t.tap(g.x, g.y, { after: 150 });
    const s = await state(p);
    await check(`ghost spot ${g.id} (${s.preview ? 'preview' : 'no preview'})`);
    if (g === spots[0]) await p.screenshot({ path: `${SHOTS}/pops-${tag}-ghost.png` });
  }
  // the habit guards: a pad-centre hold that lifts with no slide, then a tap on an old node spot
  await reset(p); await mark(p);
  const pc = await cap(p, 'pad_centre');
  await t.start(pc.cx, pc.cy); await sleep(600); await t.end(); await sleep(100);
  const hs = await p.evaluate(() => globalThis.__tt.overlay.habitSpots);
  await check('habit: HERE: SLIDE flash');
  const pill = (await state(p)).pill;
  C.ok('habit: the pill says HERE: SLIDE after a centre hold with no slide', /SLIDE/i.test(pill), pill);
  if (hs && hs.radial && hs.radial.length) {
    const r = hs.radial[0];
    await mark(p);
    await t.tap(r.x + r.w / 2, r.y + r.h / 2, { after: 100 });
    const s = await state(p);
    C.ok('habit: a tap on an old radial spot within 1.5 s is swallowed', s.log.some((l) => /habit/.test(l)) && s.downs.length === 0, { log: s.log, downs: s.downs });
    await check('habit: radial spot tapped');
  }
  // the old SACRIFICE spot held 400 ms: an arrow to SACRIFICE
  if (hs && hs.pray) {
    await reset(p); await mark(p);
    await sleep(1600);
    const r = hs.pray;
    await t.start(r.x + r.w / 2, r.y + r.h / 2); await sleep(450);
    await check('habit: old SACRIFICE spot held');
    await t.end(); await sleep(100);
    // the arrow to SACRIFICE shows as the hold lifts (it set nothing)
    await check('habit: old SACRIFICE spot lifted, its flash');
    await p.screenshot({ path: `${SHOTS}/pops-${tag}-pray-habit.png` });
  }
  C.ok('console clean', p.errors.length === 0, p.errors.slice(0, 5));
  all.push(...C.list);
  await ctx.close();
}
await b.close();
writeJson(`pops-${dpr}${only ? '-' + only : ''}.json`, { checks: all, seen });
const f = all.filter((c) => !c.pass);
console.log(`pops ${dpr}: ${all.length - f.length}/${all.length} pass`);
