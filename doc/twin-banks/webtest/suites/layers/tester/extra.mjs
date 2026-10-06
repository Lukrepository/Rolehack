// More of the stage's behaviours: a hub's layer on the pad (its 4 s idle and
// a map tap), the layers kept across a turn of the device, and PIN 2's Fire
// with the core answering.
//   node extra.mjs <dpr> [WxH]
import { launch, newCtx, openPage, resume, toucher, SIZES, SHOTS, writeJson, Checks, sleep } from './common.mjs';
import { cap, spec, mark, pushed, state, reset, popups, waitFor } from './probe.mjs';

const dpr = Number(process.argv[2] || 1);
const only = process.argv[3] || null;
const MACROS = [{ name: 'M1', keys: 'Q' }, { name: 'M2', keys: 'Q' }, { name: 'M3', keys: 'Q' }, { name: 'Tap', keys: 'A' }, { name: 'Kick', keys: '^D' }, { name: 'UR', keys: 'B' }];
const has = (log, w) => log.some((l) => l === w || l.startsWith(`${w}:`));
const b = await launch();
const all = [];
for (const [W, H] of SIZES) {
  if (only && only !== `${W}x${H}`) continue;
  const tag = `${dpr}-${W}x${H}`;
  const C = new Checks(`extra ${tag}`);
  const ctx = await newCtx(b, { w: W, h: H, dpr, prefs: { ghostDeck: { on: false, clean: 3, session: null }, macros: MACROS } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  await p.evaluate(() => { globalThis.__swallowAll = true; });
  const t = await toucher(ctx, p);
  let K = {};
  const caps = async () => { const S = await spec(p); K = {}; for (const c of S.controls) if (!c.behind) K[c.id] = await cap(p, c.id); };
  await caps();
  const ctr = (id) => [K[id].cx, K[id].cy];
  const deep = await p.evaluate(() => {
    const o = globalThis.__tt.overlay, m = o.twin.spec.mapArea, v = globalThis.__tt.view, r = document.getElementById('map').getBoundingClientRect();
    for (let y = m.y + m.h / 2; y < m.y + m.h - 10; y += 4) for (let x = m.x + m.w / 2; x < m.x + m.w - 10; x += 4) {
      const cx = Math.floor((x - r.left - v.left) / v.T), cy = Math.floor((y - r.top - v.top) / v.T);
      if (cx >= 0 && cx < 80 && cy >= 0 && cy < 21 && o.keyDistance(x, y) > 60) return { x, y, cx, cy };
    }
    return null;
  });

  // a hub's layer: hold COMBAT, the pad becomes its places; 4 s idle closes it
  await reset(p); await mark(p);
  await t.tap(...ctr('combat'), { hold: 500 }); await sleep(150);
  let s = await state(p);
  C.ok('COMBAT held: its layer on the pad', !!s.fan, s.fan);
  const q = await popups(p);
  C.ok('COMBAT layer: nothing over a key', q.bad.length === 0, q.bad);
  await p.screenshot({ path: `${SHOTS}/extra-${tag}-combat-layer.png` });
  await reset(p); await mark(p);
  const t0 = Date.now();
  await t.tap(...ctr('combat'), { hold: 500 });
  await sleep(3000);
  s = await state(p);
  C.ok('COMBAT layer: still up 3 s after the lift', !!s.fan, { fan: s.fan, ms: Date.now() - t0 });
  await sleep(1600);
  s = await state(p);
  C.ok('COMBAT layer: closed after 4 s idle', !s.fan, s.fan);
  if (deep) {
    await reset(p); await mark(p);
    await t.tap(...ctr('combat'), { hold: 500 }); await sleep(150);
    await t.tap(deep.x, deep.y); await sleep(100);
    s = await state(p);
    C.ok('COMBAT layer + map tap: closed, no travel', !s.fan && !(await pushed(p)).includes('@'), { fan: s.fan, sent: await pushed(p) });
  }
  // chord: COMBAT held, the other thumb taps a place
  await reset(p); await mark(p);
  await t.raw('touchStart', [{ x: K.combat.cx, y: K.combat.cy, id: 0 }]);
  await sleep(500);
  await t.raw('touchStart', [{ x: K.combat.cx, y: K.combat.cy, id: 0 }, { x: K.pad_l.cx, y: K.pad_l.cy, id: 1 }]);
  await sleep(60);
  await t.raw('touchEnd', [{ x: K.pad_l.cx, y: K.pad_l.cy, id: 1 }]);
  await sleep(80);
  await t.raw('touchEnd', []); await sleep(120);
  s = await state(p);
  C.ok('COMBAT chord → place: a command sent, layer closed', (await pushed(p)).length > 0 && !s.fan, { sent: await pushed(p), fan: s.fan });

  // the layers kept across a turn of the device (only from the landscape window).
  // A turn renders, and render() hands the overlay the game's own here-flags,
  // so the stairs are tested with the hero's real square (the saved game
  // starts on the up stairs); HERE's lit place with injected flags and a
  // rebuild alone (no render).
  if (W > H) {
    const turn = async (w, h) => { await p.setViewportSize({ width: w, height: h }); await sleep(900); await caps(); };
    await reset(p); await mark(p);
    await t.start(...ctr('rest')); await sleep(750); await t.end(); await sleep(150);
    await turn(H, W);
    s = await state(p);
    C.ok('turned: the sticky count layer is still up', s.layer && s.layer.kind === 'count' && s.pad[1].t === '×5', { layer: s.layer, pad: s.pad.map((f) => f.t) });
    await t.tap(...ctr('pad_k')); await sleep(100);
    s = await state(p);
    C.ok('turned: its ↑ picks x5', s.counts['.'] === 5 && !s.layer, { counts: s.counts, layer: s.layer });
    await turn(W, H);
    const real = await p.evaluate(() => globalThis.__tt.overlay.here);
    const stairs = real >= 0 && (real & 0x06) ? ((real & 0x04) ? '<' : '>') : null;
    if (stairs) {
      await reset(p); await mark(p);
      await t.tap(...ctr('context')); await sleep(120);
      s = await state(p);
      C.ok(`real stairs (${stairs}): CONTEXT's first tap lights the stairs`, s.layer && s.layer.kind === 'stairs', s.layer);
      await turn(H, W);
      s = await state(p);
      C.ok('turned: the stairs\' first tap is kept', s.layer && s.layer.kind === 'stairs', s.layer);
      await t.tap(...ctr('context')); await sleep(120);
      C.ok(`turned: CONTEXT's second tap goes (${stairs})`, (await pushed(p)) === stairs, await pushed(p));
      await turn(W, H);
    } else C.ok('the saved hero stands on stairs (for the turn test)', false, real);
    // HERE from CONTEXT with ↓ lit, then a rebuild (no render)
    await reset(p); await p.evaluate(() => globalThis.__tt.overlay.setHere(0x02 | 0x08, globalThis.__tt.overlay.hereMon)); await mark(p);
    await t.tap(...ctr('context')); await sleep(120);
    await t.tap(...ctr('pad_j')); await sleep(120);
    s = await state(p);
    C.ok('HERE(CONTEXT): ↓ lit by its first tap', s.layer && s.layer.lit === 7, s.layer);
    await p.evaluate(() => { const o = globalThis.__tt.overlay; o.twinSig = o.twinSig; o.rebuild(); });
    await sleep(300); await caps();
    s = await state(p);
    C.ok('rebuilt: HERE(CONTEXT) still up', s.layer && s.layer.kind === 'here', s.layer);
    C.ok('rebuilt: ↓ still lit (its second tap would go)', s.layer && s.layer.lit === 7 && s.pad[4].t === 'Descend', { layer: s.layer, centre: s.pad[4] });
    await mark(p);
    await t.tap(...ctr('pad_centre')); await sleep(120);
    C.ok('rebuilt: the centre\'s tap goes (>)', (await pushed(p)) === '>', await pushed(p));
    await reset(p);
    await p.evaluate(() => { globalThis.__tt.renderMap(); });
  }

  // Pray: SACRIFICE held 380 ms or more prays (M-p); its tap offers (M-o)
  await reset(p); await mark(p);
  await t.tap(...ctr('sacrifice'), { hold: 450 }); await sleep(120);
  C.ok('SACRIFICE held 450 ms: Pray (M-p)', (await pushed(p)) === 'M-p', await pushed(p));
  await reset(p); await mark(p);
  await t.tap(...ctr('sacrifice')); await sleep(120);
  C.ok('SACRIFICE tap: offer (M-o)', (await pushed(p)) === 'M-o', await pushed(p));
  // the legend lights the node a slow stroke points at
  await reset(p); await mark(p);
  {
    const f = K.flick, up = (-85 * Math.PI) / 180, ur = (-40 * Math.PI) / 180;
    await t.start(f.cx, f.cy);
    for (let i = 1; i <= 6; i++) { await t.move(f.cx + Math.cos(up) * 7 * i, f.cy + Math.sin(up) * 7 * i); await sleep(50); }
    const a = await p.evaluate(() => { const o = globalThis.__tt.overlay; return { open: o.radialOpen, lit: o.flickNodes.map((n) => !!n.pressed) }; });
    for (let i = 1; i <= 6; i++) { await t.move(f.cx + Math.cos(ur) * 7 * i, f.cy + Math.sin(ur) * 7 * i); await sleep(50); }
    const c = await p.evaluate(() => { const o = globalThis.__tt.overlay; return { open: o.radialOpen, lit: o.flickNodes.map((n) => !!n.pressed) }; });
    await t.end(); await sleep(120);
    C.ok('slow stroke up: legend shown, ↑ node lit', a.open === 'flick' && a.lit[0] && !a.lit[1], a);
    C.ok('stroke turned up-right: ↗ node lit', c.open === 'flick' && !c.lit[0] && c.lit[1], c);
    C.ok('slow stroke up-right lifted: B sent, legend gone', (await pushed(p)) === 'B' && !(await state(p)).radial, await pushed(p));
  }

  // PIN 2 Fire with the core answering: it asks; a map tap answers nothing; Esc
  await reset(p);
  await p.evaluate(() => { globalThis.__swallowAll = false; });
  const hero0 = await p.evaluate(() => ({ ...globalThis.__tt.cursor }));
  await mark(p);
  await t.tap(...ctr('pin2')); await sleep(400);
  const msg = await p.evaluate(() => document.getElementById('msgband').innerText.replace(/\s+/g, ' ').slice(0, 120));
  s = await state(p);
  C.ok('PIN 2 with the core: f sent, the game asks', (await pushed(p)).startsWith('f') && (/fire|direction|ammunition|quiver|throw/i.test(msg) || s.answering || s.modal), { sent: await pushed(p), msg, answering: s.answering, modal: s.modal });
  if (deep) { await t.tap(deep.x, deep.y); await sleep(200); }
  await p.keyboard.press('Escape'); await sleep(200);
  await resume(p);
  const hero1 = await p.evaluate(() => ({ ...globalThis.__tt.cursor }));
  C.ok('PIN 2 then a map tap then Esc: the hero stayed', hero0.x === hero1.x && hero0.y === hero1.y, { hero0, hero1 });
  C.ok('console clean', p.errors.length === 0, p.errors.slice(0, 5));
  all.push(...C.list);
  await ctx.close();
}
await b.close();
writeJson(`extra-${dpr}${only ? '-' + only : ''}.json`, { checks: all });
const f = all.filter((c) => !c.pass);
console.log(`extra ${dpr}: ${all.length - f.length}/${all.length} pass`);
