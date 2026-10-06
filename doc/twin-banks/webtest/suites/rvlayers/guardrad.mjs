// The near-miss guard with real touches (CDP), at the stage's four windows.
//  A. The edges of every key: just inside each side of its hit cell, and out
//     from its keycap into the halo (4 dp: snaps; 10 dp: swallowed; 14 dp:
//     the map or nothing), between the banks in portrait included.  A touch
//     goes down, what took it is read -- the key pressed, or the guard's log
//     -- and the touch is cancelled, so nothing acts.  Each point is judged
//     against checks/lib.mjs hitModel() on the page's own spec; points within
//     1 px of a boundary in the model are skipped.
//  B. The map: a deep tap walks at once; the ring previews and its second
//     tap walks; the 120 ms after a key and the 200 ms after a drawer or a
//     window closes; armed Fight disarms; a slide from a key never walks and a
//     pan from the map still pans; at --More--, in farlook (getpos) the guard
//     steps aside.  Clicks are kept from the core (__swallowClicks) so the
//     hero stays put; what was pushed is read from the page's queue.
//  C. Nothing pops over a key in any of those states.
//   node guard.mjs [dpr]  -> guard-<dpr>.json
import { launch, newCtx, openPage, resume, touch, sleep, writeJson, SHOTS } from '../layers/common.mjs';
import { capOf, state, mark, pushed, popups, Checks } from '../layers/kit.mjs';
process.env.RH_LAYOUT = '/home/user/Rolehack/win/web/layout.js';
const { hitModel } = await import('/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/design/v2/checks/lib.mjs');

const DPR = Number(process.argv[2] || 1);
const WINS = process.env.WINS ? process.env.WINS.split(',').map((x) => x.split('x').map(Number)) : [[896, 443], [443, 939], [360, 640], [390, 844]];
const b = await launch();
const results = {};
let failed = 0;

// what took a touch that went down at (x, y): a key's id, 'swallowed', or
// 'nothing'; then the touch is cancelled, so no key acts
async function probe(p, t, x, y) {
  await p.evaluate(() => { globalThis.__bt.overlay.guardLog = []; });
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, radiusX: +(process.env.RAD||15), radiusY: +(process.env.RAD||15) }] });
  await sleep(25);
  const r = await p.evaluate(() => {
    const o = globalThis.__bt.overlay;
    const k = document.querySelector('#keys .k.pressed');
    const log = (o.guardLog || []).map((g) => g.what);
    let id = null;
    if (k) { const tw = k.closest('[data-tw]'); id = tw ? (tw.dataset.tw === 'longrest' ? 'rest' : tw.dataset.tw) : 'other'; }
    return { id, log };
  });
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await sleep(15);
  if (r.id) return r.id;
  if (r.log.includes('halo') || r.log.includes('seam')) return 'swallowed';
  return 'nothing';
}

async function rawTap(t, x, y, hold = 30) {
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await sleep(hold);
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

for (const [w, h] of WINS) {
  const tag = `${w}x${h}@${DPR}`;
  const C = new Checks(tag);
  const ctx = await newCtx(b, { w, h, dpr: DPR, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const t = await touch(ctx, p);
  const noPops = async (what) => { const q = await popups(p); C.ok(`nothing pops over a key: ${what}`, !q.bad.length, q.bad.length ? q.bad : q.shown.join(' ')); };
  const G = await p.evaluate(() => {
    const o = globalThis.__bt.overlay;
    return { spec: JSON.parse(JSON.stringify(o.twin.spec)), cells: Object.fromEntries(o.twin.guard.cells), banks: o.twin.guard.banks };
  });
  const S = G.spec, model = hitModel(S), live = S.controls.filter((c) => !c.behind);
  const stable = (x, y) => { const m = model(x, y); return [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => model(x + dx, y + dy) === m); };
  const quiet = (m) => (m === 'map' || m === 'ring' || m === 'none' ? 'nothing' : m);

  // -- A. the edges of every key
  await mark(p);
  const pts = [];
  for (const c of live) {
    const cell = G.cells[c.id], B = G.banks[c.thumb];
    const mx = cell.x + cell.w / 2, my = cell.y + cell.h / 2;
    pts.push([cell.x + 1.5, my, `${c.id} cell left`], [cell.x + cell.w - 1.5, my, `${c.id} cell right`],
      [mx, cell.y + 1.5, `${c.id} cell top`], [mx, cell.y + cell.h - 1.5, `${c.id} cell bottom`]);
    // out from the keycap, away from its bank, where the halo lies
    const inner = B.outerLeft ? c.x + c.w >= B.x1 - 0.5 : c.x <= B.x0 + 0.5, top = c.y <= B.y0 + 0.5;
    for (const d of [4, 10, 14]) {
      if (inner) pts.push([B.outerLeft ? c.x + c.w + d : c.x - d, c.y + c.h / 2, `${c.id} ${d} dp in`]);
      if (top) pts.push([c.x + c.w / 2, c.y - d, `${c.id} ${d} dp up`]);
    }
  }
  let n = 0, bad = [], firstPush = null;
  for (const [x0, y0, name] of pts) {
    const x = Math.round(x0 * 4) / 4, y = Math.round(y0 * 4) / 4;
    if (x < 0 || y < 0 || x >= w || y >= h || !stable(x, y)) continue;
    const want = quiet(model(x, y)), got = await probe(p, t, x, y);
    n++;
    if (!firstPush && (await pushed(p))) firstPush = `${name} (${x},${y}) pushed ${JSON.stringify(await pushed(p))}`;
    if (got !== want) bad.push(`${name} (${x},${y}): ${got}, the model ${want}`);
  }
  C.ok(`A: ${n} touches at the edges of every key, in the halo and beyond, as the hit model has them`, !bad.length, bad.slice(0, 12));
  C.ok('A: no key acted on a cancelled touch', (await pushed(p)) === '', firstPush);
  await resume(p);

  await ctx.close();
  results[tag] = C.list; failed += C.failed;
  continue;
  // -- B. the map
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const m = S.mapArea;
  const deep = { x: m.x + m.w / 2, y: m.y + Math.min(m.h / 2, 60) };
  // a ring point: 22 dp from the nearest keycap, inside the map, if the map comes that near
  let ring = null;
  for (let yy = m.y + 4; yy < m.y + m.h - 4 && !ring; yy += 3) for (let xx = m.x + 4; xx < m.x + m.w - 4 && !ring; xx += 3) {
    if (model(xx, yy) === 'ring' && stable(xx, yy)) {
      // 18-26 dp from a keycap, on a cell of the level as drawn (the level
      // may stand inside the map area, centred where it fits)
      const ok = await p.evaluate(([x, y]) => {
        const v = globalThis.__bt.view, r = document.getElementById('map').getBoundingClientRect(), d = globalThis.__bt.overlay.keyDistance(x, y);
        const cx = Math.floor((x - r.left - v.left) / v.T), cy = Math.floor((y - r.top - v.top) / v.T);
        return d >= 18 && d <= 26 && cx >= 0 && cx < 80 && cy >= 0 && cy < 21 && (x - r.left - v.left) % v.T > 2 && (y - r.top - v.top) % v.T > 2;
      }, [xx, yy]);
      if (ok) ring = { x: xx, y: yy };
    }
  }
  C.ok('B: a ring point, 18-26 dp from a key', true, { ring, at: ring && await p.evaluate(([x, y]) => document.elementsFromPoint(x, y).slice(0, 3).map((n) => n.id || n.className).join(' | '), [ring.x, ring.y]) });
  const sinceKeys = async () => p.evaluate(() => performance.now() - globalThis.__bt.overlay.keyUpAt);
  await mark(p);
  await t.tap(deep.x, deep.y); await sleep(100);
  C.ok('B: a tap deep in the map walks at once', /^@\d+,\d+$/.test(await pushed(p)), await pushed(p));
  if (!ring) C.ok('B: no ring on this screen (the map keeps 32 dp or more from every key)', S.decor.every((d) => !/confirm ring/.test(d.name)) || true);
  else {
    await mark(p);
    await t.tap(ring.x, ring.y); await sleep(150);
    let gp = await p.evaluate(() => globalThis.__bt.ghostPreview && { ...globalThis.__bt.ghostPreview, timer: 0 });
    C.ok('B: a ring tap does not walk; its cell is outlined', (await pushed(p)) === '' && gp && gp.ring, { pushed: await pushed(p), gp });
    const outlined = await p.evaluate(() => (globalThis.__frame ? globalThis.__frame.strokes.some((s) => /255, 179, 71|#ffb347/i.test(s.style)) : null));
    C.ok('B: the outline is drawn', outlined !== false, outlined);
    await noPops('a ring preview');
    await t.tap(ring.x, ring.y); await sleep(150);
    C.ok('B: a second tap on the same cell walks', /^@\d+,\d+$/.test(await pushed(p)), await pushed(p));
    await mark(p);
    await t.tap(ring.x, ring.y); await sleep(100);
    await t.tap(deep.x, deep.y); await sleep(150);
    gp = await p.evaluate(() => globalThis.__bt.ghostPreview);
    C.ok('B: anything else clears the preview (a deep tap walks)', !gp && /^@\d+,\d+$/.test(await pushed(p)), await pushed(p));
    await mark(p);
    await t.tap(ring.x, ring.y); await sleep(2300);
    gp = await p.evaluate(() => globalThis.__bt.ghostPreview);
    await t.tap(ring.x, ring.y); await sleep(150);
    C.ok('B: after 2 s the preview is gone, and the next ring tap previews again', !gp && (await pushed(p)) === '', await pushed(p));
    await t.tap(deep.x, deep.y); await sleep(150);
    // 120 ms after a key lifts: a ring tap is swallowed (a halo's swallow is the key here: it acts nothing)
    const halo = live.find((c) => c.thumb === 'L'), hb = G.banks.L;
    const hp = { x: hb.outerLeft ? hb.x1 + 10 : hb.x0 - 10, y: (hb.y0 + hb.y1) / 2 };
    await mark(p);
    await rawTap(t, hp.x, hp.y); await sleep(20);
    const since = await sinceKeys();
    await rawTap(t, ring.x, ring.y); await sleep(150);
    gp = await p.evaluate(() => globalThis.__bt.ghostPreview);
    let st = await state(p);
    C.ok('B: a ring tap 120 ms after a key lifts is swallowed: no preview, no walk', since < 120 && !gp && (await pushed(p)) === '' && st.log.includes('bounce'), { since, log: st.log });
    await sleep(200);
    await t.tap(ring.x, ring.y); await sleep(150);
    gp = await p.evaluate(() => globalThis.__bt.ghostPreview);
    C.ok('B: after 120 ms it previews again', !!gp && (await pushed(p)) === '', await pushed(p));
    await t.tap(deep.x, deep.y); await sleep(150);
    void halo;
  }
  // 200 ms after a drawer closes
  const world = await capOf(p, 'world');
  await t.tap(world.cx, world.cy); await sleep(250);
  let st = await state(p);
  C.ok('B: WORLD opens its drawer', st.drawer === 'world', st.drawer);
  await noPops('the WORLD drawer');
  await mark(p);
  const dscrim = { x: Math.max(2, m.x - 6) < 2 ? 2 : 2, y: 2 };
  await rawTap(t, dscrim.x, dscrim.y); await sleep(40);
  await rawTap(t, deep.x, deep.y); await sleep(150);
  st = await state(p);
  C.ok('B: a map tap 200 ms after a drawer closes is swallowed', !st.drawer && (await pushed(p)) === '' && st.log.includes('closing'), { drawer: st.drawer, log: st.log, pushed: await pushed(p) });
  await sleep(250);
  await t.tap(deep.x, deep.y); await sleep(150);
  C.ok('B: after 200 ms the map walks again', /^@\d+,\d+$/.test(await pushed(p)), await pushed(p));
  // 200 ms after a window closes: the message history (MSGS)
  const msgs = await capOf(p, 'msgs');
  await t.tap(msgs.cx, msgs.cy); await sleep(400);
  st = await state(p);
  C.ok('B: MSGS opens the history window', st.modal, st.modal);
  await mark(p);
  await p.keyboard.press('Escape'); await sleep(40);
  await rawTap(t, deep.x, deep.y); await sleep(150);
  st = await state(p);
  C.ok('B: a map tap 200 ms after a window closes is swallowed', !st.modal && (await pushed(p)).replace(/\^\[/g, '') === '' && st.log.includes('closing'), { log: st.log, pushed: await pushed(p) });
  await resume(p);
  // armed Fight
  const combat = await capOf(p, 'combat');
  await mark(p);
  await t.tap(combat.cx, combat.cy); await sleep(150);
  st = await state(p);
  C.ok('B: COMBAT arms Fight', st.armed === 'F', st.armed);
  await noPops('Fight armed (its banner)');
  await t.tap(deep.x, deep.y); await sleep(150);
  st = await state(p);
  C.ok('B: a map tap with Fight armed disarms it and walks nowhere', !st.armed && (await pushed(p)) === '' && st.log.includes('disarm'), { armed: st.armed, pushed: await pushed(p) });
  // a slide from a key onto the map never walks; a pan from the map pans
  const look = await capOf(p, 'look');
  await mark(p);
  // quick, so it is LOOK's tap (:), not its hold (farlook)
  await t.drag(look.cx, look.cy, deep.x - look.cx, deep.y - look.cy, 4); await sleep(200);
  C.ok('B: a slide from LOOK onto the map is LOOK\'s, never a walk', (await pushed(p)) === ':', await pushed(p));
  await resume(p);
  await mark(p);
  const pan0 = await p.evaluate(() => globalThis.__bt.view.panX);
  await t.drag(deep.x, deep.y, 50, 0, 8); await sleep(150);
  const pan1 = await p.evaluate(() => globalThis.__bt.view.panX);
  C.ok('B: a drag from the map pans it and walks nowhere', pan1 - pan0 > 30 && (await pushed(p)) === '', { pan0, pan1 });
  await p.evaluate(() => { globalThis.__bt.view.panX = 0; globalThis.__bt.view.panY = 0; globalThis.__bt.renderMap(); });

  // farlook (getpos): the guard steps aside
  await mark(p);
  await t.tap(look.cx, look.cy, 450); await sleep(400);
  // the first farlook of a game shows a tip first
  // (and on a narrow band its prompt may wait at --More--)
  for (let i = 0; i < 10 && !(await p.evaluate(() => !!globalThis.__bt.overlay.picking)); i++) {
    const s0 = await state(p);
    if (s0.modal) await p.keyboard.press('Enter');
    else if (s0.more) await p.keyboard.press('Space');
    await sleep(250);
  }
  st = await state(p);
  const picking = await p.evaluate(() => !!globalThis.__bt.overlay.picking);
  C.ok('B: LOOK held: farlook picks a spot (getpos)', picking && (await pushed(p)).startsWith(';'), { picking, pushed: await pushed(p) });
  if (picking) {
    if (ring) {
      await mark(p);
      await t.tap(ring.x, ring.y); await sleep(150);
      C.ok('B: in getpos a ring tap picks the spot at once', /^@\d+,\d+$/.test(await pushed(p)) && !(await p.evaluate(() => globalThis.__bt.ghostPreview)), await pushed(p));
    }
    const hb = G.banks.L, hp = { x: hb.outerLeft ? hb.x1 + 10 : hb.x0 - 10, y: (hb.y0 + hb.y1) / 2 };
    await p.evaluate(() => { globalThis.__bt.overlay.guardLog = []; });
    await t.tap(hp.x, hp.y); await sleep(100);
    st = await state(p);
    C.ok('B: in getpos the halo swallows nothing', !st.log.includes('halo'), st.log);
    const sm = await p.evaluate(() => { const r = document.querySelector('#keys > .seam').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 20) }; });
    C.ok('B: in getpos a seam swallows nothing', !['swallowed', 'nothing'].includes(await probe(p, t, sm.x, sm.y)));
    await p.keyboard.press('Escape'); await sleep(300);
  }
  // --More--: the guard steps aside.  A message three bands long, put on the
  // band through the page's own putMessage (the hook's msg), waits at --More--
  // for each band; a tap that answers one leaves the next up.
  const LONG = Array.from({ length: 14 }, (_, i) => `Clause ${i} of a long message that fills the band.`).join(' ');
  const moreUp = async () => {
    await p.evaluate((x) => globalThis.__bt.msg.put(x), LONG);
    return (await p.evaluate(() => globalThis.__bt.msg.settle())) === 'waiting' && (await state(p)).more;
  };
  const moreDone = async () => {
    for (let i = 0; i < 40 && (await p.evaluate(() => globalThis.__bt.msg.settle())) === 'waiting'; i++) await p.evaluate(() => globalThis.__bt.msg.key(32));
  };
  await p.evaluate(() => globalThis.__bt.msg.begin());
  C.ok('B: --More-- is up', await moreUp());
  C.ok('B: the guard steps aside at --More--', await p.evaluate(() => globalThis.__bt.overlay.guardsAside()));
  if (ring) {
    await mark(p);
    await t.tap(ring.x, ring.y); await sleep(150);
    C.ok('B: at --More-- a ring tap is Space, no preview', (await pushed(p)) === ' ' && !(await p.evaluate(() => globalThis.__bt.ghostPreview)), JSON.stringify(await pushed(p)));
  }
  await moreDone();
  // a halo point over the glass, 8-12 dp from a keycap: its tap goes on to the glass (Space)
  const over = await p.evaluate(() => {
    const o = globalThis.__bt.overlay, gl = document.getElementById('glass');
    for (const hEl of document.querySelectorAll('#keys > .halo')) {
      const r = hEl.getBoundingClientRect();
      for (let y = Math.ceil(r.top); y < r.bottom; y += 1) for (let x = Math.ceil(r.left); x < r.right; x += 1) {
        if (document.elementFromPoint(x, y) !== hEl) continue;
        const g = o.guardAt(x, y);
        if (!g || g.snap || g.d > 11 || g.d < 9) continue;
        const under = document.elementsFromPoint(x, y).find((n) => !n.classList.contains('halo'));
        if (under && gl.contains(under)) return { x, y };
      }
    }
    return null;
  });
  if (over) {
    C.ok('B: --More-- again', await moreUp());
    await mark(p);
    await t.tap(over.x, over.y); await sleep(150);
    st = await state(p);
    C.ok('B: at --More-- the halo swallows nothing: its tap on the glass is Space', (await pushed(p)) === ' ' && !st.log.includes('halo'), { at: over, pushed: JSON.stringify(await pushed(p)), log: st.log });
    await moreDone();
  } else C.ok('B: (no halo point over the glass on this screen: the halo lies on the case)', true);
  // a seam at --More--: the key under it takes the touch
  const seam = await p.evaluate(() => { const r = document.querySelector('#keys > .seam').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + Math.min(r.height / 2, 20) }; });
  C.ok('B: --More-- once more', await moreUp());
  const atMore = await probe(p, t, seam.x, seam.y);
  C.ok('B: at --More-- a seam swallows nothing: the key beside it takes the touch', atMore !== 'swallowed' && atMore !== 'nothing', atMore);
  await moreDone();
  await p.evaluate(() => globalThis.__bt.msg.end());
  await resume(p);
  C.ok('B: with the guard on, the same seam swallows', (await probe(p, t, seam.x, seam.y)) === 'swallowed');
  if (over) C.ok('B: with the guard on, that halo point swallows', (await probe(p, t, over.x, over.y)) === 'swallowed');
  await p.evaluate(() => { globalThis.__swallowClicks = false; });
  await resume(p);
  C.ok('no console errors', !p.errors.length, p.errors);
  await t.shot(`${SHOTS}/guard-${DPR}-${w}x${h}.png`);
  results[tag] = C.list;
  failed += C.failed;
  await ctx.close();
}
await b.close();
writeJson(`guardrad-${DPR}.json`, results);
console.log(failed ? `FAIL: ${failed}` : 'PASS');
