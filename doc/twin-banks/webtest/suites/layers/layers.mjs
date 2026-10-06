// The layers on the pad, held, slid, chorded and tapped, with real touches
// (CDP), at the stage's four windows: the count layer (REST, SEARCH, Long rest),
// HERE from the pad centre (slide-only) and from CONTEXT (sticky, the stairs'
// second tap), CONTEXT's one-action stairs, the 4 s idle, the map tap that
// closes a layer, the FLICK legend and its wedges, PIN 2's Fire, and that
// nothing pops over a key in any of those states.  The ghost deck is retired
// here (its habit guards are habits.mjs's), so no habit swallows a tap.
//   node layers.mjs [dpr]  -> layers-<dpr>.json, shots/layers-<dpr>-<W>x<H>-*.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, writeJson } from './common.mjs';
import { capOf, PAD, state, mark, pushed, popups, Checks } from './kit.mjs';

const DPR = Number(process.argv[2] || 1);
const WINS = process.env.WINS ? process.env.WINS.split(',').map((x) => x.split('x').map(Number)) : [[896, 443], [443, 939], [360, 640], [390, 844]];
const b = await launch();
const results = {};
let failed = 0;

const ARROWS = (s) => s.pad.every((f, i) => i === 4 || (f.t === '' && !f.dim));

// wait for the game's yes/no on the pad and answer it from the keyboard
async function answer(p, key) {
  for (let i = 0; i < 30; i++) {
    const a = await p.evaluate(() => !!globalThis.__bt.overlay.answering || /\[yn/.test(document.getElementById('msgband').innerText));
    if (a) { await p.keyboard.press(key); await sleep(250); return true; }
    await sleep(100);
  }
  return false;
}

for (const [w, h] of WINS) {
  const tag = `${w}x${h}@${DPR}`;
  const C = new Checks(tag);
  const ctx = await newCtx(b, { w, h, dpr: DPR, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const t = await touch(ctx, p);
  const shot = (n) => t.shot(`${SHOTS}/layers-${DPR}-${w}x${h}-${n}.png`);
  const noPops = async (what) => { const q = await popups(p); C.ok(`nothing pops over a key: ${what}`, !q.bad.length, q.bad.length ? q.bad : q.shown.join(' ')); };
  const map = await p.evaluate(() => { const m = globalThis.__bt.overlay.twin.spec.mapArea; return { x: m.x + m.w / 2, y: m.y + m.h / 2 }; });
  const cap = async (id) => { const c = await capOf(p, id); return { x: c.cx, y: c.cy }; };
  const rest = await cap('rest'), search = await cap('search'), centre = await cap('pad_centre');
  const place = async (i) => cap(PAD[i]);
  await mark(p);

  // -- COUNT
  await t.down([[rest.x, rest.y]]); await sleep(450);
  let s = await state(p);
  C.ok('REST held: the count layer is up', s.layer && s.layer.kind === 'count' && s.layer.from === 'rest', s.layer);
  C.ok('count places ↖×1 ↑×5 ↗×10 →×20, centre ×n, the rest blank', s.pad.map((f) => f.t).join('|') === '×1|×5|×10||×n|×20|||', s.pad.map((f) => f.t).join('|'));
  C.ok('the count in use (×20) lit', s.pad[5].lit && !s.pad[0].lit, s.pad.map((f) => f.lit));
  C.ok('the pill names it', /^REST ×20$/.test(s.pill), s.pill);
  await shot('count-held');
  await noPops('REST held');
  await t.up(); await sleep(120);
  s = await state(p);
  C.ok('a 450 ms hold closes on the lift', !s.layer && ARROWS(s) && !s.pill, s.layer);
  await t.down([[rest.x, rest.y]]); await sleep(750); await t.up(); await sleep(120);
  s = await state(p);
  C.ok('a 750 ms hold stays up after the lift', s.layer && s.layer.sticky, s.layer);
  const up = await place(1);
  await t.tap(up.x, up.y); await sleep(150);
  s = await state(p);
  C.ok('then a tap on ↑ sets REST ×5 and closes it', s.counts['.'] === 5 && !s.layer && /×5/.test(s.rest), { counts: s.counts, rest: s.rest });
  // slide from REST onto ↗
  const ur = await place(2);
  await t.down([[rest.x, rest.y]]); await sleep(450);
  for (let i = 1; i <= 10; i++) { await t.move([[rest.x + ((ur.x - rest.x) * i) / 10, rest.y + ((ur.y - rest.y) * i) / 10]]); await sleep(16); }
  s = await state(p);
  C.ok('sliding REST onto ↗ presses ×10 under the thumb', s.layer && s.layer.kind === 'count', s.layer);
  await t.up(); await sleep(150);
  s = await state(p);
  C.ok('lifting there sets REST ×10', s.counts['.'] === 10 && !s.layer && !(await p.evaluate(() => globalThis.__bt.overlay.restWell.revealed)), s.counts);
  // A chord: SEARCH held, the other thumb taps →.  CDP's touches lift only
  // all together, so the other thumb is the mouse: its own pointer, real
  // pointer events, while the touch on SEARCH stays down.
  const right = await place(5);
  await t.down([[search.x, search.y]]); await sleep(450);
  s = await state(p);
  C.ok('SEARCH held: its count layer', s.layer && s.layer.kind === 'count' && s.layer.from === 'search' && s.pad[0].lit, s.layer);
  await p.mouse.move(right.x, right.y); await p.mouse.down(); await sleep(60); await p.mouse.up(); await sleep(80);
  s = await state(p);
  C.ok('the other thumb\'s tap on → while SEARCH is held picks it at once', s.counts.s === 20 && !s.layer, s.counts);
  await t.up(); await sleep(150);
  s = await state(p);
  C.ok('a chord on → sets SEARCH ×20', s.counts.s === 20 && !s.layer && /×20/.test(s.search), { counts: s.counts, search: s.search });
  // the 4 s idle
  await t.down([[search.x, search.y]]); await sleep(750); await t.up(); await sleep(3000);
  s = await state(p);
  C.ok('a sticky count layer is still up after 3 s', s.layer && s.layer.sticky);
  await sleep(1400);
  s = await state(p);
  C.ok('and back to arrows after 4 s idle', !s.layer && ARROWS(s), s.layer);
  // a map tap closes it, and does not travel
  await t.down([[search.x, search.y]]); await sleep(750); await t.up(); await sleep(100);
  await mark(p);
  await t.tap(map.x, map.y); await sleep(200);
  s = await state(p);
  C.ok('a map tap closes a sticky layer and walks nowhere', !s.layer && (await pushed(p)) === '', await pushed(p));
  // the centre types a count
  await t.down([[search.x, search.y]]); await sleep(750); await t.up(); await sleep(100);
  await t.tap(centre.x, centre.y); await sleep(250);
  s = await state(p);
  C.ok('the centre (×n) asks for any count', s.form && !s.layer, { form: s.form });
  await p.keyboard.press('Escape'); await sleep(200);
  // Long rest, swiped up out of REST; its counts from a hold
  await t.drag(rest.x, rest.y, 0, -36, 8); await sleep(250);
  const revealed = await p.evaluate(() => globalThis.__bt.overlay.restWell.revealed);
  C.ok('a swipe up on REST brings Long rest in', revealed);
  const lr = await cap('rest');
  await t.down([[lr.x, lr.y]]); await sleep(750); await t.up(); await sleep(120);
  s = await state(p);
  C.ok('Long rest held: ×100 to ×400', s.layer && s.layer.kind === 'count' && s.pad.map((f) => f.t).join('|') === '×100|×200|×300||×n|×400|||' && s.pad[1].lit, s.pad.map((f) => f.t).join('|'));
  await shot('longrest');
  await noPops('Long rest counts');
  await t.tap(ur.x, ur.y); await sleep(150);
  s = await state(p);
  C.ok('a tap on ↗ sets Long rest ×300', s.counts.longrest === 300 && !s.layer, s.counts);
  await p.evaluate(() => globalThis.__bt.overlay.scrollWell(false));
  await sleep(300);   // the strip's slide back to REST
  C.ok('no key went to the game in all that', (await pushed(p)) === '', await pushed(p));

  // -- the guard with a layer up: only the keys lifted over the scrim answer,
  // and the guard guards them -- the halo snaps a near miss to the lifted pad
  // and swallows beside it, a seam beside a lifted key swallows, and any other
  // touch is the scrim's, which closes the layer
  {
    const padL = await capOf(p, 'pad_l');
    const outerLeft = await p.evaluate(() => globalThis.__bt.overlay.twin.guard.banks.L.outerLeft);
    const off = (d) => (outerLeft ? padL.x + padL.w + d : padL.x - d);
    const sticky = async (at) => { await t.down([[at.x, at.y]]); await sleep(750); await t.up(); await sleep(150); };
    await p.evaluate(() => { globalThis.__bt.overlay.guardLog = []; });
    await sticky(rest);
    await t.tap(off(5), padL.cy); await sleep(150);
    s = await state(p);
    C.ok('guard, layer up: a tap 5 dp off the pad\'s → snaps to it (REST ×20)', s.counts['.'] === 20 && !s.layer && s.log.includes('snap:pad_l'), { counts: s.counts, log: s.log, layer: s.layer });
    await sticky(rest);
    await t.tap(off(10), padL.cy); await sleep(150);
    s = await state(p);
    C.ok('guard, layer up: 10 dp off it is swallowed, and the layer stays', s.layer && s.layer.kind === 'count' && s.log.includes('halo:pad_l'), { log: s.log, layer: s.layer });
    const msgsCap = await capOf(p, 'msgs');
    await t.tap(msgsCap.cx, msgsCap.cy); await sleep(200);
    s = await state(p);
    C.ok('guard, layer up: a tap on a key under the scrim (MSGS) only closes the layer', !s.layer && !s.modal && ARROWS(s), { layer: s.layer, modal: s.modal });
    // a seam beside the lifted SEARCH swallows; beside APPLY, under the scrim, it is the scrim's
    const sc = await capOf(p, 'search'), ap = await capOf(p, 'apply');
    const right = ap.x > sc.x;
    const nearSearch = { x: right ? sc.x + sc.w + 1 : sc.x - 1, y: sc.cy }, nearApply = { x: right ? ap.x - 1 : ap.x + ap.w + 1, y: sc.cy };
    const onSeam = (q) => p.evaluate(([x, y]) => [...document.querySelectorAll('#keys > .seam')].some((e) => { const r = e.getBoundingClientRect(); return x >= r.left && x < r.right && y >= r.top && y < r.bottom; }), [q.x, q.y]);
    C.ok('the points beside SEARCH and APPLY lie on their seam', (await onSeam(nearSearch)) && (await onSeam(nearApply)), { nearSearch, nearApply });
    await sticky(search);
    await t.tap(nearSearch.x, nearSearch.y); await sleep(150);
    s = await state(p);
    C.ok('guard, SEARCH\'s layer up: the seam beside SEARCH swallows, the layer stays', s.layer && s.layer.from === 'search' && s.log.includes('seam'), { log: s.log, layer: s.layer });
    await p.evaluate(() => { globalThis.__bt.overlay.guardLog = []; });
    await t.tap(nearApply.x, nearApply.y); await sleep(150);
    s = await state(p);
    C.ok('guard, SEARCH\'s layer up: the seam beside APPLY (under the scrim) only closes the layer', !s.layer && !s.log.includes('seam'), { log: s.log, layer: s.layer });
    C.ok('and nothing went to the game', (await pushed(p)) === '', await pushed(p));
  }

  // -- HERE from the pad centre: slide only
  const flags = await p.evaluate(() => globalThis.__bt.overlay.here);
  await mark(p);
  await t.down([[centre.x, centre.y]]); await sleep(550);
  s = await state(p);
  C.ok('the pad centre held: HERE', s.layer && s.layer.kind === 'here' && s.layer.from === 'centre', s.layer);
  C.ok('HERE\'s fixed places', s.pad.map((f) => f.t).join('|') === 'Sacrifice|Ascend|Pick up|Open door|ALL|Close door|Loot|Descend|Look here', s.pad.map((f) => f.t).join('|'));
  const live = await p.evaluate(() => { const o = globalThis.__bt.overlay; return [0x40, 0x04, 0x01, 0x08, 0, 0x80, 0x20, 0x02, 0].map((bit, i) => i === 4 || !bit || o.hereHas(bit)); });
  C.ok('places the turn does not offer are dimmed', s.pad.every((f, i) => f.dim === !live[i]), { dim: s.pad.map((f) => f.dim), live });
  C.ok('the pill says HERE', s.pill === 'HERE', s.pill);
  await shot('here-held');
  await noPops('HERE held');
  const se = await place(8);
  for (let i = 1; i <= 8; i++) { await t.move([[centre.x + ((se.x - centre.x) * i) / 8, centre.y + ((se.y - centre.y) * i) / 8]]); await sleep(16); }
  await t.up(); await sleep(250);
  s = await state(p);
  C.ok('slid to ↘ and lifted: Look here (:), and the pad is arrows', (await pushed(p)) === ':' && !s.layer, await pushed(p));
  await resume(p);
  await mark(p);
  await t.down([[centre.x, centre.y]]); await sleep(550); await t.up(); await sleep(200);
  s = await state(p);
  C.ok('held and lifted without a slide: closed, nothing sent', !s.layer && (await pushed(p)) === '' && ARROWS(s), await pushed(p));
  // slid off the centre and back: ALL, the HERE drawer (the final review)
  {
    const nn = await place(1);
    await t.down([[centre.x, centre.y]]); await sleep(550);
    for (let i = 1; i <= 6; i++) { await t.move([[centre.x, centre.y + ((nn.y - centre.y) * i) / 6]]); await sleep(16); }
    for (let i = 5; i >= 0; i--) { await t.move([[centre.x, centre.y + ((nn.y - centre.y) * i) / 6]]); await sleep(16); }
    await t.up(); await sleep(250);
    s = await state(p);
    C.ok('slid up and back onto the centre: ALL, its drawer, and no "HERE: SLIDE"', s.drawer === 'here' && !s.layer && s.pill !== 'HERE: SLIDE' && (await pushed(p)) === '', { drawer: s.drawer, pill: s.pill });
    await p.keyboard.press('Escape'); await sleep(250);
  }
  const dimAt = live.findIndex((v, i) => !v && i !== 4);
  if (dimAt >= 0) {
    const d = await place(dimAt);
    await t.down([[centre.x, centre.y]]); await sleep(550);
    for (let i = 1; i <= 8; i++) { await t.move([[centre.x + ((d.x - centre.x) * i) / 8, centre.y + ((d.y - centre.y) * i) / 8]]); await sleep(16); }
    await t.up(); await sleep(200);
    s = await state(p);
    C.ok(`slid to a dimmed place (${PAD[dimAt]}) and lifted: nothing`, !s.layer && (await pushed(p)) === '', await pushed(p));
  }

  // -- CONTEXT: one action (the up stairs the game starts on)
  const ctxk = await cap('context');
  s = await state(p);
  const onStairs = /ASCEND/i.test(s.context);
  C.ok('the hero starts on the up stairs: CONTEXT is Ascend', onStairs, s.context);
  if (onStairs) {
    await mark(p);
    await t.tap(ctxk.x, ctxk.y); await sleep(150);
    s = await state(p);
    C.ok('CONTEXT\'s first tap lights the centre with Ascend and names it', s.layer && s.layer.kind === 'stairs' && s.pad[4].t === 'Ascend' && !s.pad[4].dim && s.pad.every((f, i) => i === 4 || f.dim) && s.pill === 'ASCEND? CENTRE' && s.contextSub === 'tap again', { layer: s.layer, pill: s.pill, sub: s.contextSub, pad: s.pad });
    C.ok('and sends nothing', (await pushed(p)) === '');
    await shot('stairs');
    await noPops('the stairs\' first tap');
    await sleep(2200);
    s = await state(p);
    C.ok('after 2 s it goes, unsent', !s.layer && (await pushed(p)) === '' && ARROWS(s), s.layer);
    await t.tap(ctxk.x, ctxk.y); await sleep(120);
    const r5 = await place(5);
    await t.tap(r5.x, r5.y); await sleep(150);
    s = await state(p);
    C.ok('another place\'s tap puts it away and does nothing', !s.layer && (await pushed(p)) === '', await pushed(p));
    await t.tap(ctxk.x, ctxk.y); await sleep(120);
    await t.tap(ctxk.x, ctxk.y); await sleep(200);
    C.ok('CONTEXT twice: Ascend (<)', (await pushed(p)) === '<', await pushed(p));
    C.ok('the game asks, and is told no', await answer(p, 'n'));
    await resume(p);
    await mark(p);
    // a near miss of COMBAT onto CONTEXT, then the aiming tap on ↑: never the stairs
    await t.tap(ctxk.x, ctxk.y); await sleep(120);
    await t.tap(up.x, up.y); await sleep(200);
    s = await state(p);
    C.ok('CONTEXT then ↑ (an aim): nothing sent, the stairs put away', (await pushed(p)) === '' && !s.layer && ARROWS(s), { sent: await pushed(p), layer: s.layer });
    await t.tap(ctxk.x, ctxk.y); await sleep(120);
    await t.tap(centre.x, centre.y); await sleep(200);
    C.ok('CONTEXT then the lit centre: Ascend (<)', (await pushed(p)) === '<', await pushed(p));
    C.ok('the game asks again, and is told no', await answer(p, 'n'));
    await resume(p);
  }

  // -- HERE from CONTEXT, several actions: the up stairs and a closed door
  await p.evaluate(() => globalThis.__bt.overlay.setHere(0x04 | 0x08, ''));
  await mark(p);
  await t.tap(ctxk.x, ctxk.y); await sleep(200);
  s = await state(p);
  C.ok('CONTEXT with two actions: HERE, sticky', s.layer && s.layer.kind === 'here' && s.layer.from === 'context' && /^pick/.test(s.contextSub), { layer: s.layer, sub: s.contextSub });
  // live (L) or dimmed (d), in the pad's order: ↑ Ascend, ← Open, ALL and ↘ Look here live
  C.ok('Ascend and Open live, the rest but Look here dimmed', s.pad.map((f) => (f.dim ? 'd' : 'L')).join('') === 'dLdLLdddL', s.pad.map((f) => (f.dim ? 'd' : 'L')).join(''));
  await shot('here-context');
  await noPops('CONTEXT\'s HERE');
  await t.tap(up.x, up.y); await sleep(150);
  s = await state(p);
  C.ok('↑ from CONTEXT\'s HERE: the centre lit with it and named, not sent', s.layer && s.layer.lit === 1 && s.pad[4].t === 'Ascend' && s.pill === 'ASCEND? CENTRE' && (await pushed(p)) === '', { layer: s.layer, pill: s.pill, centre: s.pad[4] });
  await sleep(2200);
  s = await state(p);
  C.ok('2 s later it is unlit, the layer still up', s.layer && s.layer.lit === null && s.pill === 'HERE', { layer: s.layer, pill: s.pill });
  const ll = await place(6);
  await t.tap(ll.x, ll.y); await sleep(150);
  s = await state(p);
  C.ok('a dimmed place (Loot) does nothing and keeps the layer', s.layer && (await pushed(p)) === '', await pushed(p));
  await t.tap(up.x, up.y); await sleep(120);
  await t.tap(up.x, up.y); await sleep(200);
  s = await state(p);
  C.ok('↑ twice within 2 s (two aims): nothing sent, still lit', (await pushed(p)) === '' && s.layer && s.layer.lit === 1, { sent: await pushed(p), layer: s.layer });
  await t.tap(centre.x, centre.y); await sleep(200);
  C.ok('then the lit centre: Ascend (<)', (await pushed(p)) === '<', await pushed(p));
  C.ok('no to the game', await answer(p, 'n'));
  await resume(p);
  await p.evaluate(() => globalThis.__bt.overlay.setHere(0x04 | 0x08, ''));
  await mark(p);
  await t.tap(ctxk.x, ctxk.y); await sleep(150);
  await t.tap(up.x, up.y); await sleep(120);
  await t.tap(ctxk.x, ctxk.y); await sleep(200);
  C.ok('↑ then CONTEXT: Ascend (<)', (await pushed(p)) === '<', await pushed(p));
  C.ok('no to the game, again', await answer(p, 'n'));
  await resume(p);
  await p.evaluate(() => globalThis.__bt.overlay.setHere(0x04 | 0x08, ''));
  await mark(p);
  await t.tap(ctxk.x, ctxk.y); await sleep(150);
  const lf = await place(3);
  await t.tap(lf.x, lf.y); await sleep(250);
  C.ok('← Open from CONTEXT\'s HERE: o, at once', (await pushed(p)) === 'o', await pushed(p));
  await sleep(300);
  s = await state(p);
  C.ok('Open asks a direction, and the pad is arrows for it', !s.layer && ARROWS(s));
  await p.keyboard.press('Escape'); await sleep(250); await resume(p);
  await p.evaluate(() => globalThis.__bt.overlay.setHere(0x04 | 0x08, ''));
  await t.tap(ctxk.x, ctxk.y); await sleep(150);
  await t.tap(centre.x, centre.y); await sleep(250);
  s = await state(p);
  C.ok('HERE\'s centre opens its ALL drawer', s.drawer === 'here' && !s.layer, s.drawer);
  await noPops('HERE\'s ALL drawer');
  await p.keyboard.press('Escape'); await sleep(250);
  await t.tap(ctxk.x, ctxk.y); await sleep(150);
  await sleep(4300);
  s = await state(p);
  C.ok('CONTEXT\'s HERE goes after 4 s idle', !s.layer && ARROWS(s), s.layer);
  await t.tap(ctxk.x, ctxk.y); await sleep(150);
  await t.tap(ctxk.x, ctxk.y); await sleep(150);
  s = await state(p);
  C.ok('CONTEXT\'s second tap puts its HERE away', !s.layer);
  await p.evaluate((f) => globalThis.__bt.overlay.setHere(f, ''), flags);

  // -- FLICK: the legend while held, the wedges
  const fl = await cap('flick');
  await mark(p);
  await t.down([[fl.x, fl.y]]); await sleep(450);
  s = await state(p);
  const legend = await p.evaluate(() => { const o = globalThis.__bt.overlay, m = o.twin.spec.mapArea;
    return o.flickNodes.map((n) => { const r = n.el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, inMap: r.x >= m.x - 0.5 && r.y >= m.y - 0.5 && r.right <= m.x + m.w + 0.5 && r.bottom <= m.y + m.h + 0.5, shown: getComputedStyle(n.el.parentElement).display !== 'none', arrow: n.rk.textContent, label: n.lg.textContent }; }); });
  C.ok('FLICK held: its legend, inside the map', s.radial === 'flick' && legend.every((n) => n.shown && n.inMap), legend);
  C.ok('the legend\'s nodes wear their strokes: ↑ Kick, ↗ the second macro', legend.map((n) => n.arrow).join('') === '↑↗' && /kick/i.test(legend[0].label), legend.map((n) => `${n.arrow} ${n.label}`));
  await shot('flick-held');
  await noPops('FLICK held');
  await t.up(); await sleep(150);
  s = await state(p);
  C.ok('FLICK lifted: the legend goes', !s.radial && !s.scrim, s.radial);
  // the nodes are targets while FLICK is held: the other thumb (the mouse,
  // its own pointer, as in the chord above) taps ↑ Kick
  await mark(p);
  await t.down([[fl.x, fl.y]]); await sleep(450);
  const kick = { x: legend[0].x + legend[0].w / 2, y: legend[0].y + legend[0].h / 2 };
  await p.mouse.move(kick.x, kick.y); await p.mouse.down(); await sleep(60); await p.mouse.up(); await sleep(150);
  C.ok('FLICK held, the other thumb taps ↑ on the legend: Kick (^D)', (await pushed(p)) === '^D', await pushed(p));
  await t.up(); await sleep(150);
  s = await state(p);
  C.ok('then FLICK lifts: nothing more, the legend gone', !s.radial && (await pushed(p)) === '^D', { radial: s.radial, pushed: await pushed(p) });
  await p.keyboard.press('Escape'); await sleep(250); await resume(p);
  // ... and while a command is being placed: WORLD's drawer, a held item
  // picked up, FLICK's tap opens its three places, ↗ on the legend takes it
  await mark(p);
  const worldKey = await cap('world');
  await t.tap(worldKey.x, worldKey.y); await sleep(300);
  const item = await p.evaluate(() => { const k = [...document.querySelectorAll('#drawer .grid .k')].find((e) => /pray/i.test(e.textContent)) || document.querySelector('#drawer .grid .k');
    const r = k.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: k.querySelector('.lg').textContent }; });
  await t.tap(item.x, item.y, 650); await sleep(200);
  const held = await p.evaluate(() => { const o = globalThis.__bt.overlay; return o.assign ? { word: o.assign.word, key: o.assign.key } : null; });
  C.ok(`a held drawer item (${item.t}) is in hand`, !!held, held);
  await t.tap(fl.x, fl.y); await sleep(200);
  s = await state(p);
  C.ok('FLICK\'s tap with a command in hand opens its legend', s.radial === 'flick', s.radial);
  await noPops('the legend while placing a command');
  const second = { x: legend[1].x + legend[1].w / 2, y: legend[1].y + legend[1].h / 2 };
  await t.tap(second.x, second.y); await sleep(200);
  const m5 = await p.evaluate(() => globalThis.__bt.P.macros()[5]);
  s = await state(p);
  C.ok('↗ on the legend takes it: the second flick macro', held && m5 && m5.keys === held.key && !s.radial && !(await p.evaluate(() => !!globalThis.__bt.overlay.assign)), { m5, held });
  C.ok('placing it sent nothing', (await pushed(p)) === '', await pushed(p));
  // the second flick macro empty again, as the strokes below expect
  await p.evaluate(() => { globalThis.__bt.P.saveMacro(5, '', ''); globalThis.__bt.overlay.refreshFlick(); });
  s = await state(p);
  if (s.form || s.modal || s.drawer || s.radial) { await p.keyboard.press('Escape'); await sleep(250); }
  await resume(p);
  const stroke = async (deg, len = 46) => {
    const a = (deg * Math.PI) / 180;
    await t.down([[fl.x, fl.y]]);
    for (let i = 1; i <= 8; i++) { await t.move([[fl.x + (Math.cos(a) * len * i) / 8, fl.y + (Math.sin(a) * len * i) / 8]]); await sleep(16); }
    await t.up(); await sleep(250);
  };
  for (const [deg, want, name] of [[-90, '^D', 'up'], [-120, '^D', 'up, 5 inside its -125 edge'], [-66, '^D', 'up, at -66'], [-59, 'form', 'up-right, at -59'], [-6, 'form', 'up-right, at -6'], [-131, '', 'past -125: nothing'], [30, '', 'down-right: nothing']]) {
    await mark(p);
    await stroke(deg);
    s = await state(p);
    const got = s.form ? 'form' : await pushed(p);
    C.ok(`flick ${name}: ${want || 'nothing'}`, got === want, got);
    if (s.form) { await p.keyboard.press('Escape'); await sleep(200); }
    if (got === '^D') { await p.keyboard.press('Escape'); await sleep(250); }
    await resume(p);
  }

  // -- PIN 2 is Fire
  const pin2 = await p.evaluate(() => globalThis.__bt.overlay.hubs.find((h) => h.hub.id === 'fight').slotFaces[1].lg.textContent);
  C.ok('PIN 2 shows Fire', /^fire$/i.test(pin2), pin2);
  const p2 = await cap('pin2');
  await mark(p);
  await t.tap(p2.x, p2.y); await sleep(300);
  C.ok('PIN 2\'s tap sends f', (await pushed(p)) === 'f', await pushed(p));
  await p.keyboard.press('Escape'); await sleep(300); await resume(p);
  // PIN 1 stays empty, and an empty pin's tap opens its picker (Lucas, 2026-10-02)
  const p1 = await cap('pin1');
  await t.tap(p1.x, p1.y); await sleep(300);
  const pk = await p.evaluate(() => { const o = globalThis.__bt.overlay; return { drawer: o.drawerOpen, assigning: !!o.assigning, fill: o.fill ? o.fill.n : null }; });
  C.ok('PIN 1 is empty, and its tap opens the picker (COMBAT\'s drawer, assigning)', pk.drawer === 'fight' && pk.assigning && pk.fill === 0, pk);
  await noPops('the picker');
  await p.keyboard.press('Escape'); await sleep(250);
  C.ok('no console errors', !p.errors.length, p.errors);
  results[tag] = C.list;
  failed += C.failed;
  await ctx.close();
}
await b.close();
writeJson(`layers-${DPR}.json`, results);
console.log(failed ? `FAIL: ${failed}` : 'PASS');
