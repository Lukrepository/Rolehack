// Twin banks on the page, played: the restored game on Lucas's phone
// (896x443 / 443x939), touched through CDP as a thumb would.  Walking,
// fighting (an armed Fight, and the COMBAT layer then a direction),
// inventory, eating, the flick, Long rest's swipe, SACRIFICE and its pray
// hold, drawers, the layers on the pad (the counts, the pad centre's and
// CONTEXT's HERE, since the layers stage), the
// ghost deck, taps outside the map (cased and caseless), rotation keeping an
// armed Fight, an open drawer and an assignment, and the Layout setting.
// Every pop-up is checked to open inside the map area and over no key.
//   node behave.mjs [dpr]   -> behave.json, shots/behave-*.png
import { launch, ctxOptions, openPage, resumeGame, touchKit, centreOf, OUT, STATE, sleep, writeJson } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const b = await launch();
const ctx = await b.newContext({ ...ctxOptions(896, 443, 'touch', { deviceScaleFactor: DPR, screen: { width: 443, height: 939 } }), storageState: STATE });
const p = await openPage(ctx, {});
await resumeGame(p);
const T = await touchKit(ctx, p);
const results = [];
const check = (name, ok, note = '') => { results.push({ name, ok: !!ok, note }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${note ? ` -- ${note}` : ''}`); };
const ev = (fn, arg) => p.evaluate(fn, arg);
const shot = (n) => p.screenshot({ path: `${OUT}/shots/behave-${DPR}-${n}.png` });
const mark = () => ev(() => (globalThis.__pushed = globalThis.__pushed || []).length);
const since = (n) => ev((k) => globalThis.__pushed.slice(k), n);
const keysSince = async (n) => (await since(n)).filter((e) => e.key !== undefined).map((e) => e.key);
const str = (ks) => ks.map((k) => (k >= 32 && k < 127 ? String.fromCharCode(k) : `<${k}>`)).join('');
async function settle(ms = 4000) {
  const t0 = Date.now();
  for (;;) {
    const s = await ev(() => ({ w: globalThis.__rh.waiting, q: globalThis.__rh.queue, more: globalThis.__rh.moreShown,
      ask: !!globalThis.__rh.overlay.answering }));
    if (s.more) { await p.keyboard.press('Space'); await sleep(150); continue; }
    // a question the game put on the pad ("Really attack Hachi?"): no
    if (s.ask) { await p.keyboard.press('Escape'); await sleep(150); continue; }
    if (s.w && !s.q) return true;
    if (Date.now() - t0 > ms) return false;
    await sleep(100);
  }
}
const tapId = async (id, hold = 0) => { const c = await centreOf(p, id); await T.tap(c.x, c.y, hold); return c; };
// a pop-up's rect: inside the map area, and over no key
// ('flick': the flick key's two nodes)
const popCheck = (sel) => ev((q) => {
  const O = globalThis.__rh.overlay, S = O.twin.spec, A = S.mapArea;
  const els = (q === 'flick' ? O.flickNodes.map((k) => k.el) : [...document.querySelectorAll(q)])
    .filter((e) => e.offsetParent !== null || getComputedStyle(e).display !== 'none');
  const out = [];
  for (const e of els) {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.x < A.x - 0.5 || r.y < A.y - 0.5 || r.right > A.x + A.w + 0.5 || r.bottom > A.y + A.h + 0.5) out.push(`${e.className || e.id} ${r.x.toFixed(1)},${r.y.toFixed(1)} ${r.width.toFixed(1)}x${r.height.toFixed(1)} leaves the map area ${A.x},${A.y} ${A.w}x${A.h}`);
    for (const c of S.controls) {
      if (c.behind) continue;
      if (r.x < c.x + c.w - 0.01 && c.x < r.right - 0.01 && r.y < c.y + c.h - 0.01 && c.y < r.bottom - 0.01) out.push(`${e.className || e.id} over ${c.id}`);
    }
  }
  return { n: els.length, out };
}, sel);
const rotate = async (w, h) => { await p.setViewportSize({ width: w, height: h }); await sleep(800); };
const state = () => ev(() => {
  const O = globalThis.__rh.overlay;
  const lamp = (id) => { const e = O.twinEl(id); const l = e && e.querySelector('.lamp.armed'); return l ? l.classList.contains('on') : null; };
  return { armed: O.armed && O.armed.key, armedBy: O.armedBy, drawer: O.drawerOpen, assigning: !!O.assigning, fan: O.fanOpen, chips: O.chipsOpen,
    radial: O.radialOpen, ctx: O.ctxRadialOpen, cand: O.candOpen, assign: O.assign && O.assign.key, combatLamp: lamp('combat'),
    layer: O.padLayer ? `${O.padLayer.kind}${O.padLayer.from === 'context' || O.padLayer.from === 'centre' ? ':' + O.padLayer.from : ''}` : null,
    banner: O.banner && O.banner.el.style.display !== 'none', ui: document.documentElement.dataset.ui, W: O.twin && O.twin.W,
    modal: !document.getElementById('modal').hidden, form: !document.getElementById('formwrap').hidden, msg: document.getElementById('msgband').innerText };
});

await settle();
// 1. walking
{
  const c0 = await ev(() => ({ ...globalThis.__rh.cursor }));
  let n = await mark();
  await tapId('pad_l'); await settle();
  let ks = await keysSince(n);
  const c1 = await ev(() => ({ ...globalThis.__rh.cursor }));
  n = await mark();
  await tapId('pad_h'); await settle();
  const ks2 = await keysSince(n);
  check('walk: pad → sends l, then h', str(ks) === 'l' && str(ks2) === 'h', `sent ${str(ks)} / ${str(ks2)}; hero ${c0.x},${c0.y} -> ${c1.x},${c1.y}`);
}
// 2. an armed Fight survives a turn of the phone; a direction fights
{
  await tapId('combat'); await sleep(150);
  let s = await state();
  check('fight: COMBAT arms Fight; ARMED lit on COMBAT; banner up', s.armed === 'F' && s.combatLamp === true && s.banner, JSON.stringify({ armed: s.armed, lamp: s.combatLamp, banner: s.banner }));
  const pb = await popCheck('#keys > button.k[style*="z-index: 4"]');
  check('fight: the banner opens inside the map, over no key', pb.n >= 1 && !pb.out.length, pb.out.join('; '));
  await shot('armed-landscape');
  await rotate(443, 939);
  s = await state();
  check('rotation keeps an armed Fight (and its lamp and banner)', s.armed === 'F' && s.combatLamp === true && s.banner && s.W === 443, JSON.stringify(s).slice(0, 160));
  await shot('armed-portrait');
  const n = await mark();
  await tapId('pad_h'); await settle();
  const ks = await keysSince(n);
  s = await state();
  check('fight: a direction sends F h and disarms', str(ks) === 'Fh' && !s.armed && s.combatLamp === false, JSON.stringify({ ks: str(ks), armed: s.armed, lamp: s.combatLamp, armedBy: s.armedBy, layer: s.layer, modal: s.modal, msg: s.msg }));
  await rotate(896, 443);
}
// 3. the COMBAT layer, then a direction (Kick, the layer's ← place)
{
  await tapId('combat', 520); await sleep(150);
  let s = await state();
  check('COMBAT layer: a hold paints it on the pad', s.fan === 'fight');
  const pill = await popCheck('#keys > .layerpill.on');
  check('COMBAT layer: its name pill inside the map, over no key', pill.n === 1 && !pill.out.length, pill.out.join('; '));
  await shot('combat-layer');
  let n = await mark();
  await tapId('pad_h'); await sleep(400);
  const dirAsked = await ev(() => globalThis.__rh.overlay.expectsDirection);
  await tapId('pad_l'); await settle();
  const ks = await keysSince(n);
  s = await state();
  check('COMBAT layer: Kick, then a direction', str(ks) === '<4>l' && dirAsked && !s.fan, `sent ${str(ks)}, direction asked ${dirAsked}; ${s.msg.replace(/\n/g, ' ').slice(0, 80)}`);
}
// 4. a drawer: inside the map, 3 columns, min(420, map w - 12) wide, <= 352 tall, bottom-anchored; it survives a turn
{
  await tapId('world'); await sleep(250);
  const dr = () => ev(() => {
    const O = globalThis.__rh.overlay, A = O.twin.spec.mapArea, pn = document.querySelector('#drawer .panel'), r = pn.getBoundingClientRect();
    const cols = getComputedStyle(O.drawerGrid).gridTemplateColumns.split(' ').length;
    return { on: document.getElementById('drawer').classList.contains('on'), r: { x: r.x, y: r.y, w: r.width, h: r.height }, A, cols,
      wantW: Math.min(420, A.w - 12), bottomGap: A.y + A.h - r.bottom };
  });
  let d = await dr();
  const okBox = (q) => q.on && q.cols === 3 && Math.abs(q.r.w - q.wantW) < 0.6 && q.r.h <= 352.5 && Math.abs(q.bottomGap - 4) < 0.6
    && Math.abs(q.r.x + q.r.w / 2 - (q.A.x + q.A.w / 2)) < 0.6 && q.r.y >= q.A.y - 0.5;
  const pd = await popCheck('#drawer .panel');
  check('drawer: WORLD opens 3 columns, centred and bottom-anchored in the map, over no key', okBox(d) && !pd.out.length, `${JSON.stringify(d.r)} cols ${d.cols} want w ${d.wantW}; ${pd.out.join('; ')}`);
  await shot('drawer-landscape');
  await rotate(443, 939);
  const s = await state();
  d = await dr();
  const pd2 = await popCheck('#drawer .panel');
  check('rotation keeps an open drawer, re-placed in the new map area', s.drawer === 'world' && okBox(d) && !pd2.out.length, `${JSON.stringify(d.r)}; ${pd2.out.join('; ')}`);
  await shot('drawer-portrait');
  // a tap on the drawer's scrim, outside the panel, closes it
  await T.tap(20, 20);
  check('drawer: a tap outside it closes it', !(await state()).drawer);
  await rotate(896, 443);
}
// 5. an assignment in progress (an empty pin's tap opens its picker) survives a turn
{
  await tapId('pin1'); await sleep(250);
  let s = await state();
  check('empty PIN 1: a tap opens its picker (the drawer, assigning)', s.drawer === 'fight' && s.assigning, JSON.stringify({ drawer: s.drawer, assigning: s.assigning }));
  await rotate(443, 939);
  s = await state();
  check('rotation keeps the picker and its assignment', s.drawer === 'fight' && s.assigning, JSON.stringify({ drawer: s.drawer, assigning: s.assigning }));
  // the picker still fills PIN 1 after the turn: Fire, the drawer's first command
  const first = await ev(() => {
    const k = [...document.querySelectorAll('#drawer .grid button.k')][0], r = k.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: k.getAttribute('aria-label') };
  });
  await T.tap(first.x, first.y); await sleep(250);
  const pinned = await ev(() => ({ slots: globalThis.__rh.overlay.atkSlotKeys.slice(), label: globalThis.__rh.overlay.twinEl('pin1').getAttribute('aria-label'), drawer: globalThis.__rh.overlay.drawerOpen }));
  check('after the turn, the picked command fills PIN 1', pinned.slots[0] && !pinned.drawer, `${first.label} -> ${JSON.stringify(pinned)}`);
  // and PIN 1 empties again (a hold clears a filled pin)
  await tapId('pin1', 520); await sleep(200);
  check('a hold clears PIN 1 again', !(await ev(() => globalThis.__rh.overlay.atkSlotKeys[0])));
  await rotate(896, 443);
}
// 5b. an open layer and an open count row survive a turn
{
  await tapId('combat', 520); await sleep(150);
  await rotate(443, 939);
  let s = await state();
  const pill = await popCheck('#keys > .layerpill.on');
  check('rotation keeps an open layer (COMBAT\'s), its pill inside the new map', s.fan === 'fight' && pill.n === 1 && !pill.out.length, pill.out.join('; '));
  await T.tap(220, 30); await sleep(150);
  // the counts are a layer on the pad since the layers stage; held 750 ms it stays up
  await tapId('search', 750); await sleep(150);
  await rotate(896, 443);
  s = await state();
  const pr = await popCheck('#keys > .layerpill.on');
  check('rotation keeps a count layer held up (SEARCH\'s), its pill inside the new map', s.chips === 's' && s.layer === 'count' && pr.n === 1 && !pr.out.length, `${s.chips} ${s.layer}; ${pr.out.join('; ')}`);
  await T.tap(448, 30); await sleep(150);
}
// 6. inventory and eating
{
  let n = await mark();
  await tapId('inventory'); await sleep(600);
  let s = await state();
  check('INVENTORY: sends i, the menu opens', str(await keysSince(n)) === 'i' && s.modal);
  await shot('inventory');
  await p.keyboard.press('Escape'); await settle();
  n = await mark();
  await tapId('eat'); await sleep(600);
  s = await state();
  check('EAT: sends e, the game answers', str(await keysSince(n)) === 'e', s.msg.replace(/\n/g, ' ').slice(0, 90));
  await shot('eat');
  await p.keyboard.press('Escape'); await settle();
}
// 7. the flick: up is Kick; a hold shows its two nodes inside the map
{
  const c = await centreOf(p, 'flick');
  const n = await mark();
  await T.drag(c.x, c.y, 2, -60, 5);
  await sleep(300);
  const ks = await keysSince(n);
  check('FLICK: a flick up sends its macro (Kick, ^D)', str(ks) === '<4>', `sent ${str(ks)}`);
  await p.keyboard.press('Escape'); await settle();
  // the legend shows while FLICK is held, and goes with the lift when
  // nothing is in hand (the layers stage, the design's section 7)
  await T.down(c.x, c.y); await sleep(500);
  const s = await state();
  const pf = await popCheck('flick');
  check('FLICK: a hold shows its two nodes inside the map, over no key', s.radial === 'flick' && pf.n === 2 && !pf.out.length, `${s.radial} ${pf.n} nodes; ${pf.out.join('; ')}`);
  await shot('flick-nodes');
  await T.up(); await sleep(150);
  check('FLICK: the lift puts the nodes away', !(await state()).radial);
}
// 8. REST's count row, then Long rest swiped up out of REST's slot
{
  await tapId('rest', 750); await sleep(150);
  let s = await state();
  const pr = await popCheck('#keys > .layerpill.on');
  check('REST: a hold puts its counts on the pad, its pill inside the map, over no key', s.chips === '.' && s.layer === 'count' && pr.n === 1 && !pr.out.length, `${s.chips} ${s.layer} ${pr.n}; ${pr.out.join('; ')}`);
  await shot('rest-counts');
  await T.tap(448, 30); await sleep(150);
  const c = await centreOf(p, 'rest');
  await T.drag(c.x, c.y + 10, 0, -40, 5);
  await sleep(250);
  const rev = await ev(() => {
    const O = globalThis.__rh.overlay, slot = O.twinEl('rest').getBoundingClientRect(), lr = O.twinEl('longrest').getBoundingClientRect();
    return { revealed: O.restWell.revealed, inSlot: Math.abs(lr.y - slot.y) < 1 && Math.abs(lr.x - slot.x) < 1 };
  });
  check('Long rest: a swipe up out of REST shows it in the slot', rev.revealed && rev.inSlot, JSON.stringify(rev));
  await shot('longrest');
  const n = await mark();
  await T.tap(c.x, c.y); await sleep(300);
  const ks = await keysSince(n);
  check('Long rest: its tap rests a long count (200s)', str(ks) === '200s', `sent ${str(ks)}`);
  await settle(20000);
}
// 9. SACRIFICE: a tap offers, Lucas's 380 ms hold prays (and the game asks)
{
  let n = await mark();
  await tapId('sacrifice'); await sleep(500);
  check('SACRIFICE: a tap sends #offer (M-o)', str(await keysSince(n)) === '<239>', (await state()).msg.replace(/\n/g, ' ').slice(0, 80));
  await p.keyboard.press('Escape'); await settle();
  n = await mark();
  await tapId('sacrifice', 420); await sleep(600);
  const s = await state();
  check('SACRIFICE: a 380 ms hold prays (M-p), and the game asks', str(await keysSince(n)) === '<240>' && /pray/i.test(s.msg), s.msg.replace(/\n/g, ' ').slice(0, 80));
  await p.keyboard.press('n'); await settle();
}
// 10. the pad centre: a tap rests or picks up; a hold opens its list inside the map
{
  const n = await mark();
  await tapId('pad_centre'); await settle();
  const ks = str(await keysSince(n));
  check('pad centre: a tap searches or picks up', ks === 's' || ks === ',', `sent ${ks}`);
  // HERE on the pad, slide-only (the layers stage): held, then slid to ↘
  const cc = await centreOf(p, 'pad_centre'), se = await centreOf(p, 'pad_n');
  await T.down(cc.x, cc.y); await sleep(520);
  const s = await state();
  const pc = await popCheck('#keys > .layerpill.on');
  check('pad centre: a hold puts HERE on the pad, its pill inside the map, over no key', s.layer === 'here:centre' && pc.n === 1 && !pc.out.length, `${s.layer}; ${pc.out.join('; ')}`);
  await shot('pad-centre');
  const n2 = await mark();
  for (let i = 1; i <= 6; i++) { await T.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cc.x + ((se.x - cc.x) * i) / 6, y: cc.y + ((se.y - cc.y) * i) / 6 }] }); await sleep(16); }
  await T.up(); await settle();
  check('pad centre: slid to ↘ and lifted, Look here (:)', str(await keysSince(n2)) === ':' && !(await state()).layer, `sent ${str(await keysSince(n2))}`);
}
// 11. CONTEXT with several actions: its candidates open inside the map
{
  await ev(() => globalThis.__rh.overlay.setHere(0x04 | 0x08, ''));   // up stairs and a closed door
  await tapId('context'); await sleep(150);
  const s = await state();
  const pc = await popCheck('#keys > .layerpill.on');
  check('CONTEXT: several actions put HERE on the pad to stay up, its pill inside the map, over no key', s.layer === 'here:context' && pc.n === 1 && !pc.out.length, `${s.layer}; ${pc.out.join('; ')}`);
  await shot('context-candidates');
  await T.tap(448, 30); await sleep(150);
  await ev(() => globalThis.__rh.overlay.setHere(-1, ''));
  await settle();
}
// 12. the ghost deck: a tap on the old COMBAT spot previews; the same cell again walks
{
  const spot = await ev(() => {
    const O = globalThis.__rh.overlay, A = O.twin.spec.mapArea;
    return O.ghostSpots.map((g) => ({ id: g.id, cx: g.r.x + g.r.w / 2, cy: g.r.y + g.r.h / 2, inMap: g.r.x + g.r.w / 2 > A.x && g.r.x + g.r.w / 2 < A.x + A.w && g.r.y + g.r.h / 2 > A.y && g.r.y + g.r.h / 2 < A.y + A.h }));
  });
  check('ghost deck: the five old deck spots, their centres on the map', spot.length === 5 && spot.every((g) => g.inMap), spot.map((g) => `${g.id}@${g.cx.toFixed(0)},${g.cy.toFixed(0)}${g.inMap ? '' : ' OFF'}`).join(' '));
  await ev(() => { globalThis.__swallowClicks = true; globalThis.__clicks = []; });
  const g = spot.find((q) => q.id === 'combat');
  await T.tap(g.cx, g.cy); await sleep(150);
  let st = await ev(() => ({ clicks: globalThis.__clicks.length, preview: globalThis.__rh.ghostPreview && { x: globalThis.__rh.ghostPreview.x, y: globalThis.__rh.ghostPreview.y },
    flash: document.querySelector('#keys > .ghost.on') ? document.querySelector('#keys > .ghost.on').textContent : null }));
  await shot('ghost-preview');
  check('ghost deck: the first tap previews (no click; COMBAT flashes, the cell outlined)', st.clicks === 0 && st.preview && st.flash === 'COMBAT', JSON.stringify(st));
  await T.tap(g.cx, g.cy); await sleep(150);
  st = await ev(() => ({ clicks: globalThis.__clicks.length, preview: !!globalThis.__rh.ghostPreview }));
  check('ghost deck: a second tap on the same cell within 2 s walks', st.clicks === 1 && !st.preview, JSON.stringify(st));
  // a deep map tap off the old spots travels at once
  const A = await ev(() => globalThis.__rh.overlay.twin.spec.mapArea);
  await T.tap(A.x + A.w / 2, A.y + 20); await sleep(150);
  st = await ev(() => ({ clicks: globalThis.__clicks.length }));
  check('ghost deck: a map tap off the old spots clicks at once', st.clicks === 2, JSON.stringify(st));
  await ev(() => { globalThis.__swallowClicks = false; });
}
// 13. taps outside the map area never reach the map, cased and caseless, in
// both orientations.  A tap a few px off a key may fire that key: Chrome's own
// touch adjustment snaps it, as the design's halo will (section 6); a tap far
// from every key fires nothing.
for (const [caseless, W, H] of [[false, 896, 443], [true, 896, 443], [false, 443, 939], [true, 443, 939]]) {
  await rotate(W, H);
  if (caseless) { await ev(async () => { const P = await import('./prefs.js'); P.set('case', false); }); await sleep(500); }
  const pts = await ev(() => {
    const O = globalThis.__rh.overlay, S = O.twin.spec, A = S.mapArea;
    const k = (id) => S.controls.find((c) => c.id === id);
    const u = k('pad_u'), l = k('pad_l'), m3 = k('m3'), apply = k('apply'), rest = k('rest');
    const far = (x, y) => S.controls.every((c) => x < c.x - 14 || x > c.x + c.w + 14 || y < c.y - 14 || y > c.y + c.h + 14);
    return [
      ['halo right of the pad', l.x + l.w + 6, l.y + l.h / 2],
      ['halo over the left bank', u.x + u.w / 2, rest.y - 6],
      ['gap between pad keys', l.x - 4, l.y + l.h / 2],
      ['above the right bank', m3.x + m3.w / 2, m3.y - 30],
      ['the status band', A.x + A.w / 2, S.bands[1].y + 10],
      ['the glass under the map', A.x + A.w / 2, A.y + A.h + 2],
      ['the glass under the map, deeper', A.x + A.w / 2, A.y + A.h + 30],
      ['screen corner under APPLY', apply.x + apply.w + 6, apply.y + apply.h + 6],
    ].filter(([, x, y]) => x >= 0 && y >= 0 && x < S.W && y < S.H).map(([n, x, y]) => [n, x, y, far(x, y)]);
  });
  await ev(() => { globalThis.__swallowClicks = true; globalThis.__clicks = []; });
  const log = [];
  let clicks = 0, farKeys = 0;
  for (const [name, x, y, isFar] of pts) {
    const n = await mark(), c0 = await ev(() => globalThis.__clicks.length);
    await T.tap(x, y); await sleep(120);
    const c = (await ev(() => globalThis.__clicks.length)) - c0, ks = str(await keysSince(n));
    clicks += c;
    if (isFar && ks) farKeys++;
    log.push(`${name}${isFar ? ' (far)' : ''}: ${c ? `${c} CLICK` : ks ? `key ${ks}` : 'nothing'}`);
    if (ks) { await p.keyboard.press('Escape'); await settle(); }
  }
  check(`taps outside the map never reach it (${caseless ? 'caseless' : 'cased'}, ${W}x${H})`, clicks === 0 && farKeys === 0, log.join('; '));
  await shot(`${caseless ? 'caseless' : 'cased'}-${W}x${H}`);
  await ev(() => { globalThis.__swallowClicks = false; });
  if (caseless) { await ev(async () => { const P = await import('./prefs.js'); P.set('case', true); }); await sleep(400); }
}
await rotate(896, 443);
// 14. the Layout setting: classic and back, from MENU -> Settings
{
  await tapId('menu'); await sleep(400);
  const has = await ev(() => [...document.querySelectorAll('#form label')].some((l) => /^Layout:/.test(l.textContent)));
  check('Settings: the Layout setting is there', has);
  await shot('settings');
  const pick = (label) => ev((t) => {
    const lab = [...document.querySelectorAll('#form label')].find((l) => /^Layout:/.test(l.textContent));
    const btn = [...lab.querySelectorAll('button')].find((x) => x.textContent.trim() === t);
    btn.click();
    const done = [...document.querySelectorAll('#form .caps button')].find((x) => /Done/i.test(x.textContent));
    done.click();
  }, label);
  await pick('Classic'); await sleep(600);
  let s = await state();
  check('Settings: Classic shows the classic case', s.ui === 'classic' && !(await ev(() => globalThis.__rh.overlay.twin)));
  await shot('to-classic');
  // classic, switched to at run time, puts every key where a fresh classic page does
  // (classic-before.json, the page before twin banks, at this window)
  if (DPR === 1) {
    const before = JSON.parse((await import('node:fs')).readFileSync(`${OUT}/classic-before.json`, 'utf8'))['896x443'];
    const now = await ev(() => {
      const rr = (e) => { const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
      return { keys: [...document.querySelectorAll('#keys button.k')].filter((e) => e.offsetParent || getComputedStyle(e).display !== 'none').map(rr),
        glass: rr(document.getElementById('glass')), map: rr(document.getElementById('map')), meta: document.querySelector('meta[name=viewport]').content };
    });
    const diffs = before.keys.map((k, i) => (now.keys[i] && ['x', 'y', 'w', 'h'].every((f) => Math.abs(k[f] - now.keys[i][f]) <= 0.01) ? null : `${k.label}`)).filter(Boolean);
    const same = now.keys.length === before.keys.length && !diffs.length && JSON.stringify(now.glass) === JSON.stringify(before.glass) && JSON.stringify(now.map) === JSON.stringify(before.map);
    check('Settings: classic at run time matches the old page (every key, the glass, the map; the old viewport meta)', same && !/viewport-fit/.test(now.meta),
      `${now.keys.length}/${before.keys.length} keys, differ: ${diffs.slice(0, 5).join(', ')}; meta "${now.meta}"`);
  }
  // MENU is the classic top-right key now
  await ev(() => globalThis.__rh.overlay.openSettings()); await sleep(300);
  await pick('Twin banks'); await sleep(600);
  s = await state();
  check('Settings: Twin banks comes back', s.ui === 'twin' && !!(await ev(() => globalThis.__rh.overlay.twin)));
}
check('no console errors', !p.errors.length, p.errors.join(' | '));
writeJson(`behave${DPR === 1 ? '' : `-${DPR}`}.json`, results);
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `${bad.length} FAILED` : `all ${results.length} checks passed`);
await b.close();
