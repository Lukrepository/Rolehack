// Twin banks on the page, the rest of the stage: the options file each layout
// gets (paranoid_confirmation only for twin) and what it does (T asks with
// one candidate); no re-layout while a text field has the focus or a finger is
// down, and the one waiting after; a window with no room for twin banks shows
// classic and twin comes back; the desk dock with a mouse; the status lines
// and a larger Message size; the ghost deck's sessions retiring it.
//   node extra.mjs -> extra.json, shots/extra-*.png
import { launch, ctxOptions, openPage, resumeGame, touchKit, centreOf, OUT, STATE, sleep, writeJson } from './common.mjs';
import { measure } from './measure.mjs';

const b = await launch();
const results = [];
const check = (name, ok, note = '') => { results.push({ name, ok: !!ok, note }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${note ? ` -- ${note}` : ''}`); };
const allErrors = [];
async function page(W, H, input, prefs = {}, extra = {}) {
  const ctx = await b.newContext({ ...ctxOptions(W, H, input, extra), storageState: STATE });
  const p = await openPage(ctx, prefs);
  await resumeGame(p);
  return { ctx, p };
}
const rc = (p) => p.evaluate(() => new TextDecoder().decode(globalThis.__rh.M.FS.readFile('/home/web_user/.nethackrc')));

// 1. the options file, and T asking.  A new game each: a restored game keeps
// the flags it was saved with (restore.c), paranoid_confirmation among them,
// so the line reaches the games started with it.  A Samurai wears one thing,
// splint mail: T takes it off at once, unless it asks.
async function newGame(W, H, prefs) {
  const ctx = await b.newContext(ctxOptions(W, H, 'touch'));
  const p = await openPage(ctx, prefs);
  await resumeGame(p);
  return { ctx, p };
}
for (const layout of ['twin', 'classic']) {
  const { ctx, p } = await newGame(896, 443, { layout, userRc: 'OPTIONS=role:Samurai,race:human,gender:male,align:lawful' });
  const text = await rc(p);
  const has = /^OPTIONS=paranoid_confirmation:\+Remove$/m.test(text);
  check(`options file (${layout}): paranoid_confirmation:+Remove ${layout === 'twin' ? 'appended' : 'absent'}`, has === (layout === 'twin'));
  await p.keyboard.press('T'); await sleep(900);
  const seen = await p.evaluate(() => ({ msg: document.getElementById('msgband').innerText,
    menu: !document.getElementById('modal').hidden ? document.getElementById('modal-title').textContent : '' }));
  const asked = /take off/i.test(seen.menu) || /What do you want to take off/.test(seen.msg);
  check(`T with one candidate, a new game (${layout}): ${layout === 'twin' ? 'asks which' : 'does not ask'}`, asked === (layout === 'twin'),
    `${seen.menu ? `menu "${seen.menu}"` : ''} ${seen.msg.replace(/\n/g, ' ').slice(0, 90)}`);
  await p.keyboard.press('Escape'); await sleep(300);
  allErrors.push(...p.errors);
  await ctx.close();
}

// 2. no re-layout while a text field has the focus, nor under a finger
{
  const { ctx, p } = await page(896, 443, 'touch');
  const W = () => p.evaluate(() => globalThis.__rh.overlay.twin.W);
  // an empty macro key's tap opens its form, the name field focused
  const T0 = await touchKit(ctx, p);
  const m1 = await centreOf(p, 'm1');
  await T0.tap(m1.x, m1.y); await sleep(500);
  const focused = await p.evaluate(() => document.activeElement && document.activeElement.tagName);
  await p.setViewportSize({ width: 443, height: 939 }); await sleep(800);
  const during = await W();
  await p.keyboard.press('Escape'); await sleep(900);
  const after = await W();
  check('a text field has the focus: the turn waits, then lays out', focused === 'INPUT' && during === 896 && after === 443, `focus ${focused}; W ${during} while typing, ${after} after`);
  const T = await touchKit(ctx, p);
  const c = await centreOf(p, 'pad_centre');
  await T.down(c.x, c.y);
  await p.setViewportSize({ width: 896, height: 443 }); await sleep(800);
  const under = await W();
  await T.up(); await sleep(900);
  const lifted = await W();
  check('a finger is down: the turn waits for the lift', under === 443 && lifted === 896, `W ${under} under the finger, ${lifted} after`);
  allErrors.push(...p.errors);
  await ctx.close();
}

// 3. a near-square split screen shows classic, and twin comes back with the room
{
  const { ctx, p } = await page(896, 443, 'touch');
  await p.setViewportSize({ width: 443, height: 460 }); await sleep(800);
  let s = await p.evaluate(() => ({ ui: document.documentElement.dataset.ui, fb: globalThis.__rh.overlay.twinFallback, twin: !!globalThis.__rh.overlay.twin, layout: localStorage.getItem('rh.layout') }));
  await p.screenshot({ path: `${OUT}/shots/extra-443x460-classic.png` });
  check('443x460 (split screen): classic, the setting kept', s.ui === 'classic' && !s.twin && s.fb && s.layout === null, `${s.fb}`);
  await p.setViewportSize({ width: 896, height: 443 }); await sleep(800);
  const m = await measure(p);
  check('back to 896x443: twin banks again, as layout() places them', m.twin && !m.bad.length, (m.bad || []).slice(0, 3).join(' | '));
  allErrors.push(...p.errors);
  await ctx.close();
}

// 4. a mouse and no touch: the desk dock (40 dp keys under the level)
for (const [W, H] of [[1366, 768], [1920, 1080]]) {
  const { ctx, p } = await page(W, H, 'mouse');
  const m = await measure(p);
  await p.screenshot({ path: `${OUT}/shots/extra-${W}x${H}-desk.png` });
  check(`${W}x${H} mouse: the desk dock, as layout() places it`, m.twin && m.pointer === 'mouse' && !m.bad.length, `${m.source ? m.source.slice(0, 90) : ''} ${(m.bad || []).slice(0, 3).join(' | ')}`);
  allErrors.push(...p.errors);
  await ctx.close();
}

// 5. the status lines and the message size are inputs to the layout
for (const prefs of [{ statusLines: 'compact' }, { statusLines: 'hidden' }, { msgSize: 1.4 }, { msgFont: 'screen', msgSize: 1.2 }, { padCell: 46 }, { case: false }]) {
  const { ctx, p } = await page(896, 443, 'touch', prefs);
  const m1 = await measure(p);
  await p.setViewportSize({ width: 443, height: 939 }); await sleep(800);
  const m2 = await measure(p);
  const tag = Object.entries(prefs).map(([k, v]) => `${k}=${v}`).join(',');
  await p.screenshot({ path: `${OUT}/shots/extra-${tag}.png` });
  check(`${tag}: both orientations as layout() places them`, m1.twin && m2.twin && !m1.bad.length && !m2.bad.length,
    `${[...(m1.bad || []), ...(m2.bad || [])].slice(0, 3).join(' | ')} rows ${await p.evaluate(() => globalThis.__rh.geom.msgRows)}`);
  allErrors.push(...p.errors);
  await ctx.close();
}

// 6. the ghost deck's sessions: three that count with no catch retire it; a catch starts the run again
{
  const { ctx, p } = await page(896, 443, 'touch');
  const r = await p.evaluate(() => {
    const O = globalThis.__rh.overlay, out = [];
    let g = { on: true, clean: 0, session: null };
    const play = (turns, caught) => { g.session = { t0: 0, turns, caught }; g = O.nextGhostSession(g); out.push(`${turns}${caught ? 'c' : ''}:${g.clean}${g.on ? '' : ' retired'}`); };
    play(150, false); play(40, false); play(200, true); play(120, false); play(120, false); play(120, false);
    return { out, on: g.on };
  });
  check('ghost deck: a short session counts for nothing, a catch restarts the run, three clean sessions retire it', !r.on && r.out.join(' ') === '150:1 40:1 200c:0 120:1 120:2 120:3 retired', r.out.join(' '));
  allErrors.push(...p.errors);
  await ctx.close();
}
check('no console errors', !allErrors.length, allErrors.join(' | '));
writeJson('extra.json', results);
const bad = results.filter((x) => !x.ok);
console.log(bad.length ? `${bad.length} FAILED` : `all ${results.length} checks passed`);
await b.close();
