// Re-check probes: stairs after a COMBAT near miss, and the pray habit vs REST's own holds.
//   node live.mjs WxH dpr scen[,scen]
process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/layers/rc/probes';
const { launch, newCtx, openPage, resume, touch, sleep } = await import('../../common.mjs');
const { capOf, PAD, state, mark, pushed } = await import('../../kit.mjs');
const [wh, dprS, list] = process.argv.slice(2);
const [w, h] = wh.split('x').map(Number);
const DPR = Number(dprS || 1);
const deckOn = process.env.DECK !== 'off';
const b = await launch();
const ctx = await newCtx(b, { w, h, dpr: DPR, prefs: deckOn ? {} : { ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(300);
const t = await touch(ctx, p);
const out = (...a) => console.log(...a);
const cap = async (id) => { const c = await capOf(p, id); return { x: c.cx, y: c.cy, r: c }; };
const caught = () => p.evaluate(() => { const g = globalThis.__bt.P.get('ghostDeck'); return g && g.session ? !!g.session.caught : null; });
const glog = () => p.evaluate(() => (globalThis.__bt.overlay.guardLog || []).map((g) => g.what));
const resetCaught = () => p.evaluate(() => { const P = globalThis.__bt.P, g = P.get('ghostDeck'); if (g && g.session) P.set('ghostDeck', { ...g, session: { ...g.session, caught: false } }); globalThis.__bt.overlay.guardLog = []; });
const ghostShown = () => p.evaluate(() => { const e = globalThis.__bt.overlay.ghostEl; return e && e.classList.contains('on') ? e.textContent : null; });
async function holdSlide(from, to, holdMs, steps = 8, after = 0) {
  await t.down([[from.x, from.y]]);
  await sleep(holdMs);
  if (to) for (let i = 1; i <= steps; i++) { await t.move([[from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps]]); await sleep(16); }
  if (after) await sleep(after);
  await t.up();
}
await p.evaluate(() => { globalThis.__pt = {}; window.addEventListener('pointerdown', (e) => { if (e.isTrusted) globalThis.__pt.d = performance.now(); }, true); window.addEventListener('pointerup', (e) => { if (e.isTrusted) globalThis.__pt.u = performance.now(); }, true); });
const held = () => p.evaluate(() => Math.round(globalThis.__pt.u - globalThis.__pt.d));
const S = {};

S.stairs = async () => {
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const ctxk = await cap('context');
  let s = await state(p);
  out('context legend', s.context);
  for (let i = 0; i < 9; i++) {
    await resume(p);
    await mark(p);
    await t.tap(ctxk.x, ctxk.y); await sleep(150);
    const s1 = await state(p);
    const q = await cap(PAD[i]);
    await t.tap(q.x, q.y); await sleep(250);
    s = await state(p);
    out(`CONTEXT then ${PAD[i]}: first layer ${JSON.stringify(s1.layer)} pill ${s1.pill}; after: pushed ${JSON.stringify(await pushed(p))} layer ${JSON.stringify(s.layer)} answering ${s.answering}`);
    if (s.answering) { await p.keyboard.press('n'); await sleep(300); }
    await sleep(2300);
  }
  // CONTEXT twice
  await resume(p); await mark(p);
  await t.tap(ctxk.x, ctxk.y); await sleep(120); await t.tap(ctxk.x, ctxk.y); await sleep(300);
  out('CONTEXT twice: pushed', JSON.stringify(await pushed(p)), 'msg', await p.evaluate(() => document.getElementById('msgband').innerText));
  await p.keyboard.press('n'); await sleep(300); await resume(p);
  // COMBAT near-miss variant: tap at the seam side of CONTEXT nearest COMBAT, then aim ↑ / ↓ twice
  for (const aim of ['pad_k', 'pad_j']) {
    await mark(p);
    await t.tap(ctxk.x, ctxk.y); await sleep(120);
    const a = await cap(aim);
    await t.tap(a.x, a.y); await sleep(150);
    await t.tap(a.x, a.y); await sleep(250);
    s = await state(p);
    out(`CONTEXT then ${aim} twice: pushed ${JSON.stringify(await pushed(p))} layer ${JSON.stringify(s.layer)}`);
    if ((await state(p)).answering) { await p.keyboard.press('n'); await sleep(300); }
    await resume(p);
  }
  // HERE (several actions) via setHere: ↑, then ↑ again, then ↓, then ↓ again
  for (const seq of [['pad_k', 'pad_k'], ['pad_k', 'pad_j', 'pad_j'], ['pad_j', 'pad_k', 'pad_k']]) {
    await p.evaluate(() => globalThis.__bt.overlay.setHere(0x04 | 0x08, ''));
    await mark(p);
    await t.tap(ctxk.x, ctxk.y); await sleep(150);
    for (const k of seq) { const a = await cap(k); await t.tap(a.x, a.y); await sleep(130); }
    await sleep(150);
    s = await state(p);
    out(`HERE: CONTEXT then ${seq.join(',')}: pushed ${JSON.stringify(await pushed(p))} layer ${JSON.stringify(s.layer)} pill ${s.pill}`);
    if ((await state(p)).answering) { await p.keyboard.press('n'); await sleep(300); }
    await p.keyboard.press('Escape'); await sleep(200);
    await resume(p);
    await sleep(2200);
  }
};

S.dbg = async () => {
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const ctxk = await cap('context');
  for (const k of (process.env.SEQ || 'pad_l,pad_b,pad_b,pad_j').split(',')) {
    await resume(p);
    await mark(p);
    await p.evaluate(() => { globalThis.__bt.overlay.guardLog = []; globalThis.__pd2 = []; });
    let s0 = await state(p);
    const cur0 = await p.evaluate(() => globalThis.__bt.cursor);
    await t.tap(ctxk.x, ctxk.y); await sleep(150);
    const s1 = await state(p);
    const q = await cap(k);
    await t.tap(q.x, q.y); await sleep(250);
    const s2 = await state(p);
    out(`ctx legend ${s0.context}/${s0.contextSub} cursor ${JSON.stringify(cur0)} waiting ${s0.waiting} cw ${s0.commandWait}; after CONTEXT: layer ${JSON.stringify(s1.layer)} log ${JSON.stringify(s1.log)} pushed-so-far ${JSON.stringify(await pushed(p))}; then ${k}: pushed ${JSON.stringify(await pushed(p))} layer ${JSON.stringify(s2.layer)} log ${JSON.stringify(s2.log)} msg ${JSON.stringify(await p.evaluate(() => document.getElementById('msgband').innerText))}`);
    if (s2.answering) { await p.keyboard.press('n'); await sleep(300); out('  answered n; msg', JSON.stringify(await p.evaluate(() => document.getElementById('msgband').innerText)), 'state', JSON.stringify(await state(p).then((s) => ({ layer: s.layer, ctx: s.context, waiting: s.waiting, cw: s.commandWait, answering: s.answering })))); }
    await sleep(2300);
  }
};

S.swipe = async () => {
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const rest = await cap('rest'), padL = await cap('pad_l');
  const go = async (dir, ms) => {
    await t.down([[rest.x, rest.y]]);
    const n = 10;
    for (let i = 1; i <= n; i++) { await t.move([[rest.x, rest.y + dir * (rest.r.h * 1.2 * i) / n]]); await sleep(ms / n); }
    await t.up();
    const rv = await p.evaluate(() => globalThis.__bt.overlay.restWell.revealed);
    await sleep(60);
    const g1 = await ghostShown();
    if (process.env.SHOT) await t.shot(`${process.env.OUTDIR}/shots/swipe-${dir < 0 ? 'up' : 'down'}-${ms}-${w}x${h}.png`);
    await mark(p);
    await t.tap(padL.x, padL.y); await sleep(200);
    out(`swipe ${dir < 0 ? 'up' : 'down'} held ${await held()} ms: revealed ${rv}; ghost ${JSON.stringify(g1)}; pad_l pushed ${JSON.stringify(await pushed(p))}; guard ${JSON.stringify(await glog())}; caught ${await caught()}`);
    await resetCaught();
    await sleep(1700);
  };
  await resetCaught();
  await go(-1, 450);
  await go(1, 450);
  await go(-1, 300);
};

S.neigh = async () => {
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const pr = await p.evaluate(() => JSON.parse(JSON.stringify(globalThis.__bt.overlay.habitSpots.pray)));
  const padL = await cap('pad_l');
  for (const id of ['world', 'm1', 'game', 'msgs']) {
    const k = (await cap(id)).r;
    // the point of the key's cap nearest the spot's middle, inside the spot
    const mx = pr.x + pr.w / 2, my = pr.y + pr.h / 2;
    const x = Math.min(Math.max(mx, k.x + 2, pr.x + 1), k.x + k.w - 2, pr.x + pr.w - 1), y = Math.min(Math.max(my, k.y + 2, pr.y + 1), k.y + k.h - 2, pr.y + pr.h - 1);
    const inSpot = x >= pr.x && x <= pr.x + pr.w && y >= pr.y && y <= pr.y + pr.h, onKey = x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h;
    if (!inSpot || !onKey) { out(`${id}: no point on its cap inside the spot`); continue; }
    await resetCaught();
    await t.down([[x, y]]); await sleep(450); await t.up();
    await sleep(80);
    const g1 = await ghostShown();
    const s1 = await state(p);
    await mark(p);
    await t.tap(padL.x, padL.y); await sleep(200);
    out(`${id} held 450 at (${x.toFixed(1)},${y.toFixed(1)}): ghost ${JSON.stringify(g1)}; state drawer ${s1.drawer} fan ${s1.fan} modal ${s1.modal} form ${s1.form} layer ${JSON.stringify(s1.layer)}; then pad_l pushed ${JSON.stringify(await pushed(p))} guard ${JSON.stringify(await glog())} caught ${await caught()}`);
    await p.keyboard.press('Escape'); await sleep(300);
    await p.keyboard.press('Escape'); await sleep(300);
    await resume(p);
    await sleep(1600);
  }
};

S.wobble = async () => {
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const c = await cap('pad_centre');
  const cell = await p.evaluate(() => { const r = globalThis.__bt.overlay.twin.guard.cells.get('pad_centre'); return { x: r.x, y: r.y, w: r.w, h: r.h }; });
  out('centre keycap', JSON.stringify(c.r), 'cell', JSON.stringify(cell));
  for (const [label, x0, y0, dx, dy] of [
    ['middle, still', c.x, c.y, 0, 0],
    ['keycap edge (2 px in), 5 px out and back', c.r.x + c.r.w - 2, c.y, 5, 0],
    ['keycap edge (2 px in), 3 px out and back', c.r.x + c.r.w - 2, c.y, 3, 0],
    ['cell edge (2 px in), 4 px out and back', cell.x + cell.w - 2, c.y, 4, 0],
  ]) {
    await mark(p);
    await t.down([[x0, y0]]); await sleep(500);
    if (dx || dy) { await t.move([[x0 + dx, y0 + dy]]); await sleep(40); await t.move([[x0, y0]]); await sleep(40); }
    await sleep(80);
    await t.up(); await sleep(250);
    const s = await state(p);
    out(`centre hold 500 at ${label}: drawer ${s.drawer} layer ${JSON.stringify(s.layer)} pill ${JSON.stringify(s.pill)} pushed ${JSON.stringify(await pushed(p))}`);
    if (s.drawer) { await p.keyboard.press('Escape'); await sleep(300); }
    await sleep(1600);
  }
};

S.scrim = async () => {
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const rest = await cap('rest');
  const R = Number(process.env.RAD || 16);
  for (const [k, side, d] of [['pad_u', 'right', 6], ['pad_u', 'right', 10], ['pad_u', 'right', 14], ['pad_u', 'up', 14], ['pad_y', 'up', 6], ['pad_l', 'right', 20]]) {
    await p.evaluate(() => { const P = globalThis.__bt.P; P.saveCount && P.saveCount('.', 20); });
    await holdSlide(rest, null, 700);
    const s0 = await state(p);
    const q = (await cap(k)).r;
    const x = side === 'right' ? q.x + q.w + d : q.cx, y = side === 'up' ? q.y - d : q.cy;
    const under = await p.evaluate(([x, y]) => { const n = document.elementFromPoint(x, y); return n ? (n.id || n.className) : null; }, [x, y]);
    await p.evaluate(() => { globalThis.__bt.overlay.guardLog = []; });
    await mark(p);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, radiusX: R, radiusY: R }] });
    await sleep(50);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(250);
    const s = await state(p);
    out(`count layer sticky ${s0.layer && s0.layer.sticky}; r${R} tap ${d} dp ${side} of ${k} on [${under}]: layer ${JSON.stringify(s.layer)} counts ${JSON.stringify(s.counts)} guard ${JSON.stringify(s.log)} pushed ${JSON.stringify(await pushed(p))}`);
    await p.evaluate(() => globalThis.__bt.overlay.closePadLayer());
    await sleep(300);
  }
};

S.pray = async () => {
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const spots = await p.evaluate(() => JSON.parse(JSON.stringify(globalThis.__bt.overlay.habitSpots)));
  const pr = spots.pray, prc = { x: pr.x + pr.w / 2, y: pr.y + pr.h / 2 };
  const under = await p.evaluate(([x, y]) => { const n = document.elementFromPoint(x, y); return n ? ((n.closest('[data-tw]') || n).dataset?.tw || n.id || n.className) : null; }, [prc.x, prc.y]);
  out('pray spot', JSON.stringify(pr), 'under its middle:', under, 'deck on', deckOn);
  const rest = await cap('rest');
  const padL = await cap('pad_l');
  const up = await cap('pad_k'), ur = await cap('pad_u');
  const step = async (label) => {
    await sleep(60);
    const g1 = await ghostShown();
    await mark(p);
    await t.tap(padL.x, padL.y); await sleep(200);
    const s = await state(p);
    out(`${label}: ghost shown at lift ${JSON.stringify(g1)}; then pad_l pushed ${JSON.stringify(await pushed(p))}; guard ${JSON.stringify(await glog())}; caught ${await caught()}; layer ${JSON.stringify(s.layer)} counts ${JSON.stringify(s.counts)}`);
    await p.keyboard.press('Escape'); await sleep(150);
    await resetCaught();
    await sleep(1700);
  };
  await resetCaught();
  // 1. REST hold 450, slide to ↑ (×5)
  await holdSlide(rest, up, 450); await step('REST hold 450 + slide to ×5');
  // 2. REST hold 700 (sticky), lift on REST, then pick ↗ with a tap
  await holdSlide(rest, null, 700);
  let s = await state(p);
  out('  sticky layer after 700 ms hold:', JSON.stringify(s.layer));
  await t.tap(ur.x, ur.y); await sleep(150);
  await step('REST sticky hold 700 + tap ×10');
  // 3. REST hold 450, no slide (the habit, by design)
  await holdSlide(rest, null, 450); await step('REST hold 450, lifted, nothing set (the habit)');
  // 4. slow swipe up to reveal Long rest (500 ms), then a pad tap
  for (const ms of (process.env.SW || '60,150,250,450').split(',').map(Number)) {
    await t.down([[rest.x, rest.y]]);
    const n = 10;
    for (let i = 1; i <= n; i++) { await t.move([[rest.x, rest.y - (rest.r.h * 1.2 * i) / n]]); await sleep(ms / n); }
    await t.up();
    const rv = await p.evaluate(() => globalThis.__bt.overlay.restWell.revealed);
    await step(`swipe up to Long rest, down to up ${await held()} ms (revealed ${rv})`);
    // put Long rest away again
    if (await p.evaluate(() => globalThis.__bt.overlay.restWell.revealed)) await p.evaluate(() => globalThis.__bt.overlay.scrollWell(false));
    await sleep(200);
  }
  // 5. Long rest revealed, count hold 450 on it and slide ×5
  await p.evaluate(() => globalThis.__bt.overlay.scrollWell(true));
  await sleep(200);
  const lr = await cap('rest');
  await holdSlide(lr, up, 450); await step('Long rest hold 450 + slide to ×5');
  await p.evaluate(() => globalThis.__bt.overlay.scrollWell(false));
};

for (const name of (list || '').split(',').filter(Boolean)) {
  out(`== ${name} ${wh}@${DPR}`);
  try { await S[name](); } catch (e) { out('ERROR', e.stack); }
}
out('console errors:', JSON.stringify(p.errors));
await b.close();
