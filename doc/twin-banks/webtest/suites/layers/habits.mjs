// The ghost deck's two habit guards (the design's section 6, item 8, and
// section 15), with the deck on, and off; and the deck's own preview, with the
// ring beside it, in landscape.  Real touches (CDP).
//  - a hold of the pad centre that lifts without a slide says HERE: SLIDE on
//    the pill, and for 1.5 s a tap on an old radial node's spot is swallowed;
//  - a hold of 380 ms on the old SACRIFICE spot that set nothing shows, as
//    it lifts, where SACRIFICE went, and the next pad tap within 1.5 s is
//    swallowed; a hold that set a count (a slide, or a layer left up and
//    tapped) is REST's own and arms nothing (the final review); so is a slow
//    swipe of REST's strip, up to show Long rest or down to put it away, and
//    a key's own hold (M1's macro editor) where it reaches into the spot
//    (the re-check, 2026-10-03);
//  - both are catches (the deck's session marks it caught);
//  - retired, neither acts.
//   node habits.mjs [dpr]  -> habits-<dpr>.json
import { launch, newCtx, openPage, resume, touch, sleep, writeJson, SHOTS } from './common.mjs';
import { capOf, state, mark, pushed, popups, Checks } from './kit.mjs';

const DPR = Number(process.argv[2] || 1);
const WINS = process.env.WINS ? process.env.WINS.split(',').map((x) => x.split('x').map(Number)) : [[896, 443], [443, 939], [360, 640], [390, 844], [844, 390]];
const b = await launch();
const results = {};
let failed = 0;

for (const [w, h] of WINS) {
  for (const on of [true, false]) {
    const tag = `${w}x${h}@${DPR} deck ${on ? 'on' : 'retired'}`;
    const C = new Checks(tag);
    const ctx = await newCtx(b, { w, h, dpr: DPR, prefs: on ? {} : { ghostDeck: { on: false, clean: 0, session: null } } });
    const p = await openPage(ctx);
    await resume(p);
    await sleep(300);
    const t = await touch(ctx, p);
    await p.evaluate(() => { globalThis.__swallowClicks = true; });
    const spots = await p.evaluate(() => JSON.parse(JSON.stringify(globalThis.__bt.overlay.habitSpots)));
    const caught = () => p.evaluate(() => { const g = JSON.parse(localStorage.getItem('rh.ghostDeck') || 'null'); return !!(g && g.session && g.session.caught); });
    const centre = await capOf(p, 'pad_centre');
    // a radial node spot whose middle is on screen and off the pad centre
    const node = spots.radial.map((r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })).find((q) => q.x > 2 && q.y > 2 && q.x < w - 2 && q.y < h - 2
      && Math.hypot(q.x - centre.cx, q.y - centre.cy) > 40);
    const under = await p.evaluate(([x, y]) => { const n = document.elementFromPoint(x, y); return n ? ((n.closest('[data-tw]') || n).dataset?.tw || n.id || n.className) : null; }, [node.x, node.y]);
    // 1. the pad centre's habit
    await mark(p);
    await t.down([[centre.cx, centre.cy]]); await sleep(550); await t.up(); await sleep(80);
    let s = await state(p);
    C.ok('the pad centre held and lifted without a slide: HERE closes', !s.layer);
    C.ok(on ? 'the pill says HERE: SLIDE' : 'no word on the pill', on ? s.pill === 'HERE: SLIDE' : s.pill === '', s.pill);
    await t.tap(node.x, node.y); await sleep(200);
    s = await state(p);
    if (on) {
      C.ok(`a tap on an old radial node's spot (now ${under}) is swallowed`, (await pushed(p)) === '' && !s.form && !s.drawer && s.log.includes('habit radial'), { pushed: await pushed(p), log: s.log, under });
      C.ok('and is a catch', await caught());
      await sleep(1500);
      await mark(p);
    }
    await t.tap(node.x, node.y); await sleep(250);
    s = await state(p);
    const acted = (await pushed(p)) !== '' || s.form || s.drawer || s.modal || !!s.layer;
    C.ok(on ? 'after 1.5 s the same spot does what lies there' : 'retired: the spot does what lies there at once', acted, { under, pushed: await pushed(p), form: s.form, drawer: s.drawer });
    if (s.form || s.modal) await p.keyboard.press('Escape');
    if (s.drawer) await p.keyboard.press('Escape');
    await sleep(200);
    await resume(p);
    // 2. the pray habit on the old SACRIFICE spot
    const pray = { x: spots.pray.x + spots.pray.w / 2, y: spots.pray.y + spots.pray.h / 2 };
    const prayUnder = await p.evaluate(([x, y]) => { const n = document.elementFromPoint(x, y); return n ? ((n.closest('[data-tw]') || n).dataset?.tw || n.id || n.className) : null; }, [pray.x, pray.y]);
    const yk = await capOf(p, 'pad_y');
    await mark(p);
    await t.down([[pray.x, pray.y]]); await sleep(450);
    const ghostHeld = await p.evaluate(() => { const g = globalThis.__bt.overlay.ghostEl; return g.classList.contains('on') ? g.textContent : ''; });
    C.ok('no flash while the hold is down (a count may yet be set)', !ghostHeld, ghostHeld);
    await t.up(); await sleep(60);
    const ghost = await p.evaluate(() => { const g = globalThis.__bt.overlay.ghostEl; return g.classList.contains('on') ? g.textContent : ''; });
    C.ok(on ? `a 450 ms hold on the old SACRIFICE spot (now ${prayUnder}) shows, as it lifts, where SACRIFICE went` : 'retired: no flash', on ? /SACRIFICE/.test(ghost) : !ghost, ghost);
    if (on) await noPopsOk(C, p, 'the SACRIFICE flash');
    s = await state(p);
    if (s.form || s.modal || s.drawer) { await p.keyboard.press('Escape'); await sleep(150); }
    s = await state(p);
    await mark(p);
    await t.tap(yk.cx, yk.cy); await sleep(200);
    s = await state(p);
    if (on && !s.layer) C.ok('the next pad tap (↖, the y) is swallowed', (await pushed(p)) === '' && s.log.includes('habit pray'), { pushed: await pushed(p), log: s.log });
    else if (!on) C.ok('retired: the pad tap walks (y)', (await pushed(p)) === 'y', await pushed(p));
    await resume(p);
    if (on) {
      // a hold that leaves the counts up: the next pad tap is a count, not swallowed
      await t.down([[pray.x, pray.y]]); await sleep(750); await t.up(); await sleep(80);
      s = await state(p);
      if (s.layer && s.layer.kind === 'count') {
        await mark(p);
        await t.tap(yk.cx, yk.cy); await sleep(200);
        s = await state(p);
        C.ok('with the counts left up by the hold, ↖ picks ×1 instead', !s.layer && s.counts['.'] === 1 && (await pushed(p)) === '', { counts: s.counts, log: s.log });
        await sleep(1600);
      } else {
        if (s.form || s.modal || s.drawer) { await p.keyboard.press('Escape'); await sleep(150); }
        C.ok(`(the old SACRIFICE spot is ${prayUnder}, which leaves no count layer)`, true);
      }
      await resume(p);
      if (prayUnder === 'rest') {
        // REST's own count hold, by a slide: no flash, nothing swallowed after
        const r1 = await capOf(p, 'pad_k'), nk = await capOf(p, 'pad_n');
        await p.evaluate(() => { globalThis.__bt.overlay.guardLog = []; globalThis.__bt.overlay.ghostEl.classList.remove('on'); });
        await t.down([[pray.x, pray.y]]); await sleep(450);
        for (let i = 1; i <= 10; i++) { await t.move([[pray.x + ((r1.cx - pray.x) * i) / 10, pray.y + ((r1.cy - pray.y) * i) / 10]]); await sleep(16); }
        await t.up(); await sleep(80);
        s = await state(p);
        const fl = await p.evaluate(() => globalThis.__bt.overlay.ghostEl.classList.contains('on'));
        C.ok('REST held and slid onto ↑: ×5 set, no SACRIFICE flash', s.counts['.'] === 5 && !s.layer && !fl, { counts: s.counts, flash: fl });
        await mark(p);
        await t.tap(yk.cx, yk.cy); await sleep(200);
        s = await state(p);
        C.ok('and the next pad tap walks (y), no habit swallow', (await pushed(p)) === 'y' && !s.log.includes('habit pray'), { pushed: await pushed(p), log: s.log });
        await resume(p);
        // a sticky count layer, used: the next pad tap walks too
        await t.down([[pray.x, pray.y]]); await sleep(750); await t.up(); await sleep(80);
        const ur = await capOf(p, 'pad_u');
        await t.tap(ur.cx, ur.cy); await sleep(150);
        s = await state(p);
        C.ok('REST held 750 ms, ×10 tapped: set', s.counts['.'] === 10 && !s.layer, s.counts);
        await mark(p);
        await t.tap(nk.cx, nk.cy); await sleep(200);
        s = await state(p);
        C.ok('and the next pad tap walks (n), no habit swallow', (await pushed(p)) === 'n' && !s.log.includes('habit pray'), { pushed: await pushed(p), log: s.log });
        await resume(p);
        // REST's strip swiped slowly (450 ms, touch to lift), up to show Long
        // rest and down to put it away: the strip's own gesture, no habit
        const rc = await capOf(p, 'rest');
        for (const dir of [-1, 1]) {
          await uncatch(p);
          await sleep(1600);
          const t0 = await p.evaluate(() => performance.now());
          await t.down([[pray.x, pray.y]]);
          for (let i = 1; i <= 10; i++) { await t.move([[pray.x, pray.y + (dir * rc.h * 1.2 * i) / 10]]); await sleep(22); }
          await t.up();
          const ms = Math.round((await p.evaluate(() => performance.now())) - t0);
          await sleep(80);
          const rv = await p.evaluate(() => globalThis.__bt.overlay.restWell.revealed);
          const fl = await p.evaluate(() => { const g = globalThis.__bt.overlay.ghostEl; return g.classList.contains('on') ? g.textContent : ''; });
          const what = dir < 0 ? 'up: Long rest shown' : 'down: Long rest put away';
          C.ok(`REST's strip swiped ${what} (${ms} ms), no SACRIFICE flash`, rv === (dir < 0) && !fl && ms >= 400, { revealed: rv, flash: fl, ms });
          await mark(p);
          await t.tap(yk.cx, yk.cy); await sleep(200);
          s = await state(p);
          C.ok('and the next pad tap walks (y), no habit swallow, no catch', (await pushed(p)) === 'y' && !s.log.includes('habit pray') && !(await caught()),
            { pushed: await pushed(p), log: s.log, caught: await caught() });
          await resume(p);
        }
      }
      // a key's own hold where its keycap reaches into the spot (M1: its
      // macro editor) was meant: no flash over what it opened, nothing armed
      for (const id of ['m1']) {
        const k = await capOf(p, id);
        const mx = spots.pray.x + spots.pray.w / 2, my = spots.pray.y + spots.pray.h / 2;
        const x = Math.min(Math.max(mx, k.x + 2, spots.pray.x + 1), k.x + k.w - 2, spots.pray.x + spots.pray.w - 1);
        const y = Math.min(Math.max(my, k.y + 2, spots.pray.y + 1), k.y + k.h - 2, spots.pray.y + spots.pray.h - 1);
        const inSpot = x >= spots.pray.x && x <= spots.pray.x + spots.pray.w && y >= spots.pray.y && y <= spots.pray.y + spots.pray.h;
        if (!inSpot || x < k.x || x > k.x + k.w || y < k.y || y > k.y + k.h) { C.ok(`(${id}'s keycap does not reach into the spot)`, true); continue; }
        await uncatch(p);
        await sleep(1600);
        await t.down([[x, y]]); await sleep(450); await t.up(); await sleep(80);
        s = await state(p);
        const fl = await p.evaluate(() => { const g = globalThis.__bt.overlay.ghostEl; return g.classList.contains('on') ? g.textContent : ''; });
        C.ok(`${id} held 450 ms inside the spot: its editor opens, no SACRIFICE flash`, s.form && !fl, { form: s.form, flash: fl });
        await p.keyboard.press('Escape'); await sleep(250);
        await mark(p);
        await t.tap(yk.cx, yk.cy); await sleep(200);
        s = await state(p);
        C.ok('and, the editor put away, the next pad tap walks (y)', (await pushed(p)) === 'y' && !s.log.includes('habit pray') && !(await caught()),
          { pushed: await pushed(p), log: s.log, caught: await caught() });
        await resume(p);
      }
    }
    // 3. the ghost deck's own preview, landscape
    if (on && w > h) {
      const deck = await p.evaluate(() => JSON.parse(JSON.stringify(globalThis.__bt.overlay.ghostSpots)));
      const m = await p.evaluate(() => globalThis.__bt.overlay.twin.spec.mapArea);
      const g = deck.find((d) => { const x = d.r.x + d.r.w / 2, y = d.r.y + d.r.h / 2; return x > m.x + 2 && x < m.x + m.w - 2 && y > m.y + 2 && y < m.y + m.h - 2; });
      if (g) {
        const x = g.r.x + g.r.w / 2, y = g.r.y + g.r.h / 2;
        await mark(p);
        await t.tap(x, y); await sleep(150);
        const fl = await p.evaluate(() => { const g = globalThis.__bt.overlay.ghostEl; return g.classList.contains('on') ? g.textContent : ''; });
        C.ok(`a map tap on the old ${g.name} spot previews and points to it`, (await pushed(p)) === '' && fl.includes(g.name), fl);
        await noPopsOk(C, p, 'the ghost deck\'s flash');
        await t.tap(x, y); await sleep(150);
        C.ok('a second tap on that cell walks', /^@/.test(await pushed(p)), await pushed(p));
      }
    }
    C.ok('no console errors', !p.errors.length, p.errors);
    await t.shot(`${SHOTS}/habits-${DPR}-${w}x${h}-${on ? 'on' : 'off'}.png`);
    results[tag] = C.list;
    failed += C.failed;
    await ctx.close();
  }
}
// the session marked not caught, the guard's log and the flash cleared
async function uncatch(p) {
  await p.evaluate(() => {
    const o = globalThis.__bt.overlay, P = globalThis.__bt.P, g = P.get('ghostDeck');
    if (g && g.session) P.set('ghostDeck', { ...g, session: { ...g.session, caught: false } });
    o.guardLog = [];
    o.ghostEl.classList.remove('on');
  });
}
async function noPopsOk(C, p, what) {
  const q = await popups(p);
  C.ok(`nothing pops over a key: ${what}`, !q.bad.length, q.bad.length ? q.bad : q.shown.join(' '));
}
await b.close();
writeJson(`habits-${DPR}.json`, results);
console.log(failed ? `FAIL: ${failed}` : 'PASS');
