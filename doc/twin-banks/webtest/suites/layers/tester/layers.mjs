// Layers on the pad, the flick legend and the pins, by real touches.
//   node layers.mjs <dpr> [WxH]
// COUNT (REST, SEARCH, Long rest) and HERE (pad centre, CONTEXT) by holding,
// sliding, chording and tapping; the stairs' second tap; the 600 ms and 4 s
// rules; the FLICK legend (held, its nodes as targets, the wedges at -62.5,
// while assigning); PIN 2 Fire and PIN 1's picker; and at every step, that
// nothing pops over a key.  The core is held back (nothing reaches it), so
// the hero never moves; what would have reached it is read from the hook.
import { launch, newCtx, openPage, resume, toucher, SIZES, SHOTS, writeJson, Checks, sleep } from './common.mjs';
import { cap, spec, mark, pushed, state, reset, popups, waitFor } from './probe.mjs';

const dpr = Number(process.argv[2] || 1);
const only = process.argv[3] || null;
const HERE_STAIRS_DOWN = 0x02, HERE_STAIRS_UP = 0x04, HERE_OBJECT = 0x01, ADJ_CLOSED_DOOR = 0x08;
// the flick's three macros told apart: tap A, up ^D (Kick), up-right B
const MACROS = [{ name: '', keys: '' }, { name: '', keys: '' }, { name: '', keys: '' },
  { name: 'TapA', keys: 'A' }, { name: 'Kick', keys: '^D' }, { name: 'UpRtB', keys: 'B' }];

const b = await launch();
const all = [];
const pops = [];
for (const [W, H] of SIZES) {
  if (only && only !== `${W}x${H}`) continue;
  const tag = `${dpr}-${W}x${H}`;
  const C = new Checks(`layers ${tag}`);
  const ctx = await newCtx(b, { w: W, h: H, dpr, prefs: { ghostDeck: { on: false, clean: 3, session: null }, macros: MACROS } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  await p.evaluate(() => { globalThis.__swallowAll = true; });
  const t = await toucher(ctx, p);
  const S = await spec(p);
  const K = {};
  for (const c of S.controls) if (!c.behind) K[c.id] = await cap(p, c.id);
  const ctr = (id) => [K[id].cx, K[id].cy];
  // a deep map point, in the level and far from every key (the hit model's 'map')
  const deep = await p.evaluate(() => {
    const o = globalThis.__tt.overlay, m = o.twin.spec.mapArea, v = globalThis.__tt.view, r = document.getElementById('map').getBoundingClientRect();
    let best = null;
    for (let y = m.y + 10; y < m.y + m.h - 10; y += 4) for (let x = m.x + 10; x < m.x + m.w - 10; x += 4) {
      const cx = Math.floor((x - r.left - v.left) / v.T), cy = Math.floor((y - r.top - v.top) / v.T);
      if (cx < 0 || cx >= 80 || cy < 0 || cy >= 21) continue;
      const d = o.keyDistance(x, y);
      if (d !== null && d > 60 && (!best || Math.abs(x - (m.x + m.w / 2)) + Math.abs(y - (m.y + m.h / 2)) < best.s)) best = { x, y, s: Math.abs(x - (m.x + m.w / 2)) + Math.abs(y - (m.y + m.h / 2)) };
    }
    return best;
  });
  const popCheck = async (what) => {
    const q = await popups(p);
    pops.push({ tag, what, ...q });
    C.ok(`nothing pops over a key: ${what}`, q.bad.length === 0, q.bad.length ? q.bad : q.shown.join(','));
    return q;
  };
  const shot = (name) => p.screenshot({ path: `${SHOTS}/layers-${tag}-${name}.png` });
  const setHere = (f) => p.evaluate((f) => globalThis.__tt.overlay.setHere(f, globalThis.__tt.overlay.hereMon), f);
  const counts = async () => (await state(p)).counts;

  // ---------------- COUNT: REST ----------------
  await reset(p); await setHere(0); await p.evaluate(() => localStorage.setItem('rh.counts', '{}'));
  await mark(p);
  // A1: a short hold shows the counts; the lift closes them
  await t.start(...ctr('rest'));
  await sleep(450);
  let s = await state(p);
  C.ok('REST hold: count layer up', s.layer && s.layer.kind === 'count', s.layer);
  C.ok('REST hold: pad shows x1 x5 x10 x20 at ↖ ↑ ↗ →', s.pad[0].t === '×1' && s.pad[1].t === '×5' && s.pad[2].t === '×10' && s.pad[5].t === '×20', s.pad.map((f) => f.t));
  C.ok('REST hold: blank places dimmed', [3, 6, 7, 8].every((i) => s.pad[i].dim), s.pad.map((f) => f.dim));
  C.ok('REST hold: pill names the layer', /REST/i.test(s.pill), s.pill);
  await t.end(); await sleep(120);
  s = await state(p);
  C.ok('REST short hold, no slide: closes on lift', !s.layer, s.layer);
  // again, held, for the pop-ups and the picture (the lift after is a long hold's)
  await t.start(...ctr('rest'));
  await sleep(450);
  await popCheck('REST count held');
  await shot('count-held');
  await t.end(); await sleep(120);
  await reset(p); await mark(p);
  C.ok('REST short hold: nothing sent', (await pushed(p)) === '', await pushed(p));
  // A2: slide to ×5
  await reset(p); await mark(p);
  await t.start(...ctr('rest'));
  await sleep(450);
  for (let i = 1; i <= 10; i++) { await t.move(K.rest.cx + ((K.pad_k.cx - K.rest.cx) * i) / 10, K.rest.cy + ((K.pad_k.cy - K.rest.cy) * i) / 10); await sleep(16); }
  s = await state(p);
  C.ok('REST slide: the place under the thumb is pressed', await p.evaluate(() => globalThis.__tt.overlay.padFace(1).pressed), '');
  await t.end(); await sleep(120);
  s = await state(p);
  C.ok('REST slide to ↑: count 5 saved', s.counts['.'] === 5, s.counts);
  C.ok('REST slide to ↑: layer closed', !s.layer, s.layer);
  C.ok('REST slide: nothing sent', (await pushed(p)) === '', await pushed(p));
  C.ok('REST face shows the count', /5/.test(s.rest), s.rest);
  // A3: a long hold stays up; tap ↗
  await reset(p); await mark(p);
  await t.start(...ctr('rest')); await sleep(750); await t.end(); await sleep(120);
  s = await state(p);
  C.ok('REST 750 ms hold: sticky after the lift', s.layer && s.layer.kind === 'count' && s.layer.sticky, s.layer);
  await popCheck('REST count sticky');
  await t.tap(...ctr('pad_u')); await sleep(80);
  s = await state(p);
  C.ok('REST sticky: tap ↗ picks x10', s.counts['.'] === 10 && !s.layer, { counts: s.counts, layer: s.layer });
  C.ok('REST sticky tap: nothing sent', (await pushed(p)) === '', await pushed(p));
  // A4: 4 s idle closes it
  await reset(p); await mark(p);
  await t.start(...ctr('rest')); await sleep(750); await t.end(); await sleep(3500);
  s = await state(p);
  C.ok('REST sticky: still up at 3.5 s', !!s.layer, s.layer);
  await sleep(900);
  s = await state(p);
  C.ok('REST sticky: closed after 4 s idle', !s.layer, s.layer);
  // A5: a map tap closes it and goes no further
  if (deep) {
    await reset(p); await mark(p);
    await t.start(...ctr('rest')); await sleep(750); await t.end(); await sleep(150);
    await t.tap(deep.x, deep.y); await sleep(100);
    s = await state(p);
    C.ok('REST sticky + map tap: layer closed', !s.layer, s.layer);
    C.ok('REST sticky + map tap: no travel', !(await pushed(p)).includes('@'), await pushed(p));
  }
  // A6: a chord: REST held, the other thumb taps → (x20)
  await reset(p); await mark(p);
  await t.raw('touchStart', [{ x: K.rest.cx, y: K.rest.cy, id: 0 }]);
  await sleep(450);
  await t.raw('touchStart', [{ x: K.rest.cx, y: K.rest.cy, id: 0 }, { x: K.pad_l.cx, y: K.pad_l.cy, id: 1 }]);
  await sleep(60);
  await t.raw('touchEnd', [{ x: K.pad_l.cx, y: K.pad_l.cy, id: 1 }]);
  await sleep(100);
  s = await state(p);
  C.ok('REST chord: → picks x20', s.counts['.'] === 20, s.counts);
  C.ok('REST chord: layer closed on the pick', !s.layer, s.layer);
  await t.raw('touchEnd', []); await sleep(120);
  s = await state(p);
  C.ok('REST chord: lifting REST after leaves nothing open', !s.layer && !s.scrim, { layer: s.layer, scrim: s.scrim });
  C.ok('REST chord: nothing sent', (await pushed(p)) === '', await pushed(p));
  // A7: blank place does nothing; the centre asks for any count
  await reset(p); await mark(p);
  await t.start(...ctr('rest')); await sleep(750); await t.end(); await sleep(120);
  await t.tap(...ctr('pad_h')); await sleep(80);
  s = await state(p);
  C.ok('REST sticky: blank ← does nothing, layer stays', s.layer && s.layer.kind === 'count' && s.counts['.'] === 20, { layer: s.layer, counts: s.counts });
  await t.tap(...ctr('pad_centre')); await sleep(250);
  s = await state(p);
  C.ok('REST sticky: centre asks for a count (a form)', s.form && !s.layer, { form: s.form, layer: s.layer });
  await p.keyboard.press('Escape'); await sleep(200);
  // A8: near misses of the pad with a layer up: 5 dp off pad_l's inner side snaps, 10 dp swallows
  await reset(p); await mark(p);
  await t.start(...ctr('rest')); await sleep(750); await t.end(); await sleep(150);
  const innerX = K.pad_l.x + K.pad_l.w; // the pad's inner side (left bank: right edge)
  await t.tap(innerX + 5, K.pad_l.cy); await sleep(100);
  s = await state(p);
  C.ok('count layer up: tap 5 dp off → snaps to → (x20)', s.counts['.'] === 20 && !s.layer, { counts: s.counts, layer: s.layer, log: s.log });
  await p.evaluate(() => localStorage.setItem('rh.counts', '{}'));
  await reset(p); await mark(p);
  await t.start(...ctr('rest')); await sleep(750); await t.end(); await sleep(150);
  await t.tap(innerX + 10, K.pad_l.cy); await sleep(100);
  s = await state(p);
  C.ok('count layer up: tap 10 dp off → swallowed, layer stays', !s.counts['.'] && s.layer && s.log.some((l) => /halo/.test(l)), { counts: s.counts, layer: s.layer, log: s.log });
  await reset(p);

  // ---------------- COUNT: SEARCH (chord) and a quick hold ----------------
  await mark(p);
  await t.raw('touchStart', [{ x: K.search.cx, y: K.search.cy, id: 0 }]);
  await sleep(450);
  s = await state(p);
  C.ok('SEARCH hold: count layer up', s.layer && s.layer.kind === 'count' && s.layer.act === 'search', s.layer);
  await popCheck('SEARCH count held');
  await t.raw('touchStart', [{ x: K.search.cx, y: K.search.cy, id: 0 }, { x: K.pad_k.cx, y: K.pad_k.cy, id: 1 }]);
  await sleep(60);
  await t.raw('touchEnd', [{ x: K.pad_k.cx, y: K.pad_k.cy, id: 1 }]);
  await sleep(80);
  await t.raw('touchEnd', []); await sleep(120);
  s = await state(p);
  C.ok('SEARCH chord ↑: x5 saved, closed', s.counts.s === 5 && !s.layer, { counts: s.counts, layer: s.layer });
  C.ok('SEARCH chord: nothing sent', (await pushed(p)) === '', await pushed(p));
  // a quick 380 ms hold of SEARCH then a walking tap: the tap must walk
  await reset(p); await mark(p);
  await t.tap(...ctr('search'), { hold: 400 }); await sleep(60);
  await t.tap(...ctr('pad_k')); await sleep(80);
  s = await state(p);
  C.ok('SEARCH 400 ms hold, then ↑: the hero steps (k), no x5', (await pushed(p)) === 'k' && s.counts.s === 5, { sent: await pushed(p), counts: s.counts });
  // SEARCH's tap after: sends the count
  await reset(p); await mark(p);
  await t.tap(...ctr('search')); await sleep(80);
  C.ok('SEARCH tap sends 5s', (await pushed(p)) === '5s', await pushed(p));
  await reset(p);

  // ---------------- COUNT: Long rest ----------------
  await mark(p);
  await t.slide(ctr('rest'), [K.rest.cx, K.rest.cy - K.rest.h - 6], { steps: 8 });
  await sleep(250);
  s = await state(p);
  C.ok('REST swiped up: Long rest shows', s.restRevealed, s.restRevealed);
  await t.start(...ctr('rest')); await sleep(450);
  s = await state(p);
  C.ok('Long rest hold: its counts x100..x400', s.layer && s.layer.act === 'longrest' && s.pad[0].t === '×100' && s.pad[1].t === '×200' && s.pad[2].t === '×300' && s.pad[5].t === '×400', { layer: s.layer, pad: s.pad.map((f) => f.t) });
  await popCheck('Long rest count held');
  await shot('longrest');
  for (let i = 1; i <= 10; i++) { await t.move(K.rest.cx + ((K.pad_u.cx - K.rest.cx) * i) / 10, K.rest.cy + ((K.pad_u.cy - K.rest.cy) * i) / 10); await sleep(16); }
  await t.end(); await sleep(120);
  s = await state(p);
  C.ok('Long rest slide ↗: x300 saved', s.counts.longrest === 300 && !s.layer, { counts: s.counts, layer: s.layer });
  C.ok('Long rest: nothing sent', (await pushed(p)) === '', await pushed(p));
  await reset(p);

  // ---------------- HERE: the pad centre, slide-only ----------------
  await setHere(HERE_STAIRS_DOWN); await mark(p);
  await t.start(...ctr('pad_centre')); await sleep(520);
  s = await state(p);
  C.ok('centre hold: HERE up', s.layer && s.layer.kind === 'here' && s.layer.from === 'centre', s.layer);
  C.ok('centre hold: ↓ Descend live, ↑ Ascend dimmed, ↘ Look here live', !s.pad[7].dim && s.pad[1].dim && !s.pad[8].dim, s.pad);
  C.ok('centre hold: pill HERE', /HERE/.test(s.pill), s.pill);
  await popCheck('HERE held');
  await shot('here-held');
  await t.end(); await sleep(120);
  s = await state(p);
  C.ok('centre hold, no slide: closes on lift, nothing sent', !s.layer && (await pushed(p)) === '', { layer: s.layer, sent: await pushed(p) });
  // slide to ↓ on the stairs: descends at once
  await reset(p); await mark(p);
  await t.start(...ctr('pad_centre')); await sleep(520);
  for (let i = 1; i <= 8; i++) { await t.move(K.pad_centre.cx + ((K.pad_j.cx - K.pad_centre.cx) * i) / 8, K.pad_centre.cy + ((K.pad_j.cy - K.pad_centre.cy) * i) / 8); await sleep(16); }
  await t.end(); await sleep(120);
  s = await state(p);
  C.ok('centre slide ↓ on stairs: > sent at once, closed', (await pushed(p)) === '>' && !s.layer, { sent: await pushed(p), layer: s.layer });
  // slide to ↘ Look here
  await reset(p); await mark(p);
  await t.start(...ctr('pad_centre')); await sleep(520);
  for (let i = 1; i <= 8; i++) { await t.move(K.pad_centre.cx + ((K.pad_n.cx - K.pad_centre.cx) * i) / 8, K.pad_centre.cy + ((K.pad_n.cy - K.pad_centre.cy) * i) / 8); await sleep(16); }
  await t.end(); await sleep(120);
  C.ok('centre slide ↘: : sent', (await pushed(p)) === ':', await pushed(p));
  // a dimmed place: nothing
  await reset(p); await setHere(0); await mark(p);
  await t.start(...ctr('pad_centre')); await sleep(520);
  for (let i = 1; i <= 8; i++) { await t.move(K.pad_centre.cx + ((K.pad_j.cx - K.pad_centre.cx) * i) / 8, K.pad_centre.cy + ((K.pad_j.cy - K.pad_centre.cy) * i) / 8); await sleep(16); }
  await t.end(); await sleep(120);
  s = await state(p);
  C.ok('centre slide to dimmed ↓: nothing sent, closed', (await pushed(p)) === '' && !s.layer, { sent: await pushed(p), layer: s.layer });
  // a slow press on the stairs then a step south walks (P4)
  await reset(p); await setHere(HERE_STAIRS_DOWN); await mark(p);
  await t.tap(...ctr('pad_centre'), { hold: 650 }); await sleep(80);
  await t.tap(...ctr('pad_j')); await sleep(80);
  C.ok('slow centre press on stairs, then ↓: steps (j), never >', (await pushed(p)) === 'j', await pushed(p));
  await reset(p);

  // ---------------- CONTEXT: stairs take a second tap ----------------
  await setHere(HERE_STAIRS_DOWN); await sleep(50); await mark(p);
  s = await state(p);
  C.ok('on stairs: CONTEXT offers Descend', /Descend/i.test(await p.evaluate(() => globalThis.__tt.overlay.ctxStrip[1].lg.textContent)), await p.evaluate(() => globalThis.__tt.overlay.ctxStrip[1].lg.textContent));
  await t.tap(...ctr('context')); await sleep(100);
  s = await state(p);
  C.ok('CONTEXT 1st tap: the centre lit with Descend, nothing sent', s.layer && s.layer.kind === 'stairs' && s.pad[4].t === 'Descend' && !s.pad[4].dim && s.pad[7].dim && (await pushed(p)) === '', { layer: s.layer, centre: s.pad[4], down: s.pad[7], sent: await pushed(p) });
  C.ok('CONTEXT 1st tap: pill says tap the centre', /^DESCEND\? CENTRE$/.test(s.pill), s.pill);
  await popCheck('stairs first tap');
  await shot('stairs');
  await t.tap(...ctr('context')); await sleep(100);
  C.ok('CONTEXT 2nd tap: > sent', (await pushed(p)) === '>', await pushed(p));
  await reset(p); await mark(p);
  await t.tap(...ctr('context')); await sleep(100);
  await t.tap(...ctr('pad_j')); await sleep(100);
  s = await state(p);
  C.ok('CONTEXT then ↓ (the aim after a near miss of COMBAT): nothing sent, put away', (await pushed(p)) === '' && !s.layer, { layer: s.layer, sent: await pushed(p) });
  await reset(p); await mark(p);
  await t.tap(...ctr('context')); await sleep(100);
  await t.tap(...ctr('pad_centre')); await sleep(100);
  C.ok('CONTEXT then the lit centre: > sent', (await pushed(p)) === '>', await pushed(p));
  await reset(p); await mark(p);
  await t.tap(...ctr('context')); await sleep(2300);
  s = await state(p);
  C.ok('CONTEXT 1st tap lapses after 2 s', !s.layer, s.layer);
  await t.tap(...ctr('pad_j')); await sleep(100);
  C.ok('after the lapse ↓ walks (j)', (await pushed(p)) === 'j', await pushed(p));
  await reset(p); await mark(p);
  await t.tap(...ctr('context')); await sleep(100);
  await t.tap(...ctr('pad_k')); await sleep(100);
  s = await state(p);
  C.ok('CONTEXT then another place: stairs put away, nothing sent', !s.layer && (await pushed(p)) === '', { layer: s.layer, sent: await pushed(p) });
  // several actions: HERE sticky from CONTEXT
  await reset(p); await setHere(HERE_STAIRS_DOWN | HERE_OBJECT | ADJ_CLOSED_DOOR); await sleep(50); await mark(p);
  await t.tap(...ctr('context')); await sleep(100);
  s = await state(p);
  C.ok('CONTEXT with several: HERE sticky', s.layer && s.layer.kind === 'here' && s.layer.from === 'context', s.layer);
  await popCheck('HERE from CONTEXT');
  await shot('here-context');
  await t.tap(...ctr('pad_j')); await sleep(100);
  s = await state(p);
  C.ok('HERE(CONTEXT) ↓ first tap: the centre lit with it, nothing sent', s.layer && s.layer.lit === 7 && s.pad[4].t === 'Descend' && (await pushed(p)) === '', { layer: s.layer, centre: s.pad[4], sent: await pushed(p) });
  await t.tap(...ctr('pad_j')); await sleep(100);
  s = await state(p);
  C.ok('HERE(CONTEXT) ↓ second tap (two aims): nothing sent, still lit', s.layer && s.layer.lit === 7 && (await pushed(p)) === '', { layer: s.layer, sent: await pushed(p) });
  await t.tap(...ctr('pad_centre')); await sleep(100);
  C.ok('HERE(CONTEXT) ↓ then the centre: > sent', (await pushed(p)) === '>', await pushed(p));
  await reset(p); await mark(p);
  await t.tap(...ctr('context')); await sleep(100);
  await t.tap(...ctr('pad_j')); await sleep(100);
  await t.tap(...ctr('context')); await sleep(100);
  C.ok('HERE(CONTEXT) ↓ then CONTEXT: > sent', (await pushed(p)) === '>', await pushed(p));
  await reset(p); await mark(p);
  await t.tap(...ctr('context')); await sleep(100);
  await t.tap(...ctr('pad_u')); await sleep(100);
  C.ok('HERE(CONTEXT) ↗ Pick up: , sent at once', (await pushed(p)) === ',', await pushed(p));
  await reset(p); await mark(p);
  await t.tap(...ctr('context')); await sleep(100);
  await t.tap(...ctr('pad_y')); await sleep(100);
  s = await state(p);
  C.ok('HERE(CONTEXT) dimmed ↖: nothing, layer stays', s.layer && (await pushed(p)) === '', { layer: s.layer, sent: await pushed(p) });
  await sleep(4300);
  s = await state(p);
  C.ok('HERE(CONTEXT): closed after 4 s idle', !s.layer, s.layer);
  if (deep) {
    await reset(p); await mark(p);
    await t.tap(...ctr('context')); await sleep(150);
    await t.tap(deep.x, deep.y); await sleep(100);
    s = await state(p);
    C.ok('HERE(CONTEXT) + map tap: closed, no travel', !s.layer && !(await pushed(p)).includes('@'), { layer: s.layer, sent: await pushed(p) });
  }
  // ALL: the HERE drawer from the centre (tap)
  await reset(p); await mark(p);
  await t.tap(...ctr('context')); await sleep(100);
  await t.tap(...ctr('pad_centre')); await sleep(250);
  s = await state(p);
  C.ok('HERE(CONTEXT) centre: the HERE drawer', s.drawer === 'here' && !s.layer, { drawer: s.drawer, layer: s.layer });
  await popCheck('HERE drawer');
  await reset(p); await setHere(0); await sleep(50);

  // ---------------- FLICK legend ----------------
  await mark(p);
  await t.raw('touchStart', [{ x: K.flick.cx, y: K.flick.cy, id: 0 }]);
  await sleep(450);
  s = await state(p);
  const leg = await p.evaluate(() => (globalThis.__tt.overlay.flickNodes || []).map((n) => n.el.innerText.replace(/\s+/g, ' ').trim()));
  C.ok('FLICK held: legend up', s.radial === 'flick', s.radial);
  C.ok('FLICK legend nodes show ↑ Kick and ↗ the second macro', /↑/.test(leg[0]) && /Kick/.test(leg[0]) && /↗/.test(leg[1]) && /UpRtB/.test(leg[1]), leg);
  await popCheck('FLICK held');
  await shot('flick-held');
  // the other thumb taps the ↑ node: Kick
  const nodes = await p.evaluate(() => globalThis.__tt.overlay.flickNodes.map((n) => { const r = (n.capEl || n.el).getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; }));
  await t.raw('touchStart', [{ x: K.flick.cx, y: K.flick.cy, id: 0 }, { x: nodes[0].cx, y: nodes[0].cy, id: 1 }]);
  await sleep(60);
  await t.raw('touchEnd', [{ x: nodes[0].cx, y: nodes[0].cy, id: 1 }]);
  await sleep(100);
  C.ok('FLICK held + tap ↑ node: Kick (^D) sent', (await pushed(p)) === '^D', await pushed(p));
  await t.raw('touchEnd', []); await sleep(150);
  s = await state(p);
  C.ok('FLICK lifted: legend gone, nothing open', !s.radial && !s.scrim, { radial: s.radial, scrim: s.scrim });
  // the other thumb holds the ↗ node: its editor
  await reset(p); await mark(p);
  await t.raw('touchStart', [{ x: K.flick.cx, y: K.flick.cy, id: 0 }]);
  await sleep(450);
  await t.raw('touchStart', [{ x: K.flick.cx, y: K.flick.cy, id: 0 }, { x: nodes[1].cx, y: nodes[1].cy, id: 1 }]);
  await sleep(500);
  await t.raw('touchEnd', [{ x: nodes[1].cx, y: nodes[1].cy, id: 1 }]);
  await sleep(150);
  await t.raw('touchEnd', []); await sleep(150);
  s = await state(p);
  C.ok('FLICK held + hold ↗ node: its macro editor opens', s.form, { form: s.form, title: await p.evaluate(() => document.getElementById('formwrap').innerText.slice(0, 60)) });
  await p.keyboard.press('Escape'); await sleep(150);
  // strokes: the wedges split at -62.5, run -125..0
  const stroke = async (deg, len = 40, steps = 5) => {
    await reset(p); await mark(p);
    const a = (deg * Math.PI) / 180;
    await t.slide(ctr('flick'), [K.flick.cx + Math.cos(a) * len, K.flick.cy + Math.sin(a) * len], { steps });
    await sleep(120);
    return pushed(p);
  };
  for (const [deg, want] of [[-85, '^D'], [-40, 'B'], [-120, '^D'], [-128, ''], [-64, '^D'], [-61, 'B'], [-3, 'B'], [4, ''], [-100, '^D'], [180, ''], [90, '']]) {
    const got = await stroke(deg);
    C.ok(`flick stroke ${deg}°: ${want || 'nothing'}`, got === want, got);
  }
  { const t0 = Date.now(); const got = await stroke(-85, 18, 2); C.ok('flick stroke 18 px (under FLICK_MIN 26): the tap (A)', got === 'A', { got, ms: Date.now() - t0 }); }
  // while assigning: pin a drawer item by holding it, then FLICK's ↗ node takes it
  await reset(p); await mark(p);
  await t.tap(...ctr('world')); await sleep(300);
  const item = await p.evaluate(() => {
    const o = globalThis.__tt.overlay, g = o.drawerGrid;
    if (!g) return null;
    const gr = g.getBoundingClientRect();
    const seen = [...g.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(); return r.y >= gr.y - 0.5 && r.y + r.height <= gr.y + gr.height + 0.5; });
    const it = seen.find((b) => /search/i.test(b.innerText)) || seen[0];
    if (!it) return null;
    const r = it.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: it.innerText.replace(/\s+/g, ' ') };
  });
  C.ok('WORLD drawer has items', !!item, item);
  if (item) {
    await t.tap(item.x, item.y, { hold: 650 }); await sleep(200);
    s = await state(p);
    C.ok('a drawer item held: the command is in hand (assigning)', s.assign, { assign: s.assign, drawer: s.drawer, scrim: s.scrim });
    if (s.assign) {
      await t.tap(...ctr('flick')); await sleep(200);
      s = await state(p);
      C.ok('assigning: FLICK opens its legend as targets', s.radial === 'flick', s.radial);
      await popCheck('FLICK legend while assigning');
      await t.tap(nodes[1].cx, nodes[1].cy); await sleep(200);
      const m = await p.evaluate(() => JSON.parse(localStorage.getItem('rh.macros') || '[]'));
      C.ok('assigning: the ↗ node takes the command', m[5] && m[5].keys && m[5].keys !== 'B', m[5]);
      await p.evaluate((M) => localStorage.setItem('rh.macros', JSON.stringify(M)), MACROS);
    }
  }
  await reset(p);

  // ---------------- PIN 2 Fire, PIN 1's picker ----------------
  await mark(p);
  const pin2 = await p.evaluate(() => globalThis.__tt.overlay.twinEl('pin2').innerText.replace(/\s+/g, ' ').trim());
  C.ok('PIN 2 wears Fire by default', /fire/i.test(pin2), pin2);
  await t.tap(...ctr('pin2')); await sleep(120);
  C.ok('PIN 2 tap sends f', (await pushed(p)) === 'f', await pushed(p));
  await reset(p); await mark(p);
  const pin1 = await p.evaluate(() => globalThis.__tt.overlay.twinEl('pin1').innerText.replace(/\s+/g, ' ').trim());
  await t.tap(...ctr('pin1')); await sleep(250);
  s = await state(p);
  C.ok('empty PIN 1 tap opens its picker', !!s.drawer && (await pushed(p)) === '', { pin1, drawer: s.drawer, sent: await pushed(p) });
  await popCheck('PIN 1 picker');
  await reset(p);

  C.ok('console clean', p.errors.length === 0, p.errors.slice(0, 5));
  all.push(...C.list);
  await ctx.close();
}
await b.close();
writeJson(`layers-${dpr}${only ? '-' + only : ''}.json`, { checks: all, popups: pops });
const f = all.filter((c) => !c.pass);
console.log(`layers ${dpr}: ${all.length - f.length}/${all.length} pass`);
