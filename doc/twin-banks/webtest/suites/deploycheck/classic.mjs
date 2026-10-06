// Classic, at the end of the branch: node classic.mjs [dpr]
// A new game with the setting "Layout: classic" on Lucas's phone, played with
// real touches on classic's own keys, the device turned both ways; then the
// setting switched to twin banks and back at run time through MENU ->
// Settings, with touches.  Checks: classic drawn (no twin key, the case
// scaled as it always was, no viewport-fit, no permanent inventory, no
// paranoid_confirmation line in the game's options), its pad walks, its
// map tap travels at once (no guard in classic), the switch both ways keeps
// the game going, and the console stays clean.
// The pixel comparisons of classic against the commits before the branch are
// the earlier stages' suites (header/classic, layers/classic, tablet/classic,
// banks/classic, twin/classic compare), run by all.sh.
import fs from 'node:fs';
import { launch, newCtx, openPage, newGame, touch, sleep, Checks, SHOTS, DIR } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const C = new Checks(`classic@${DPR}`);
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, dpr: DPR, touch: true, mobile: true, screen: [939, 443], prefs: { layout: 'classic' } });
const p = await openPage(ctx);
const k = await touch(ctx, p);
const E = (fn, a) => p.evaluate(fn, a);
const shots = [];
const shot = async (n) => { const f = `${SHOTS}/classic-${n}@${DPR}.png`; await k.shot(f); shots.push(f); };
const state = () => E(() => {
  const R = globalThis.__ts, $ = (id) => document.getElementById(id);
  return { ui: document.documentElement.dataset.ui, cw: R.commandWait, more: R.moreShown, modal: R.modalOpen, form: !$('formwrap').hidden,
    cur: R.cursor, twinKeys: document.querySelectorAll('[data-tw]').length, keysTransform: $('keys').style.transform,
    meta: document.querySelector('meta[name="viewport"]').content, perm: R.permInvent };
});
async function settle(ms = 5000) {
  const t0 = Date.now(); let q = 0;
  while (Date.now() - t0 < ms) {
    await sleep(110);
    const s = await state();
    if (s.more) { await p.keyboard.press('Space'); q = 0; continue; }
    if (s.cw && !s.modal && !s.form) { if (++q >= 3) return true; } else q = 0;
  }
  return false;
}
const evs = async () => { const e = await E(() => globalThis.__ev || []); await E(() => { globalThis.__ev = []; }); return e; };
const keyStr = (list) => list.map((e) => (e.key !== undefined ? (typeof e.key === 'number' ? (e.key >= 32 && e.key < 127 ? String.fromCharCode(e.key) : `<${e.key}>`) : String(e.key)) : e.click ? `click(${e.click.x},${e.click.y})` : '?')).join('');
// classic's pad keys, by the letter on each (overlay.padCells)
const pad = () => E(() => Object.fromEntries(globalThis.__ts.overlay.padCells.map((q) => {
  const r = q.el.getBoundingClientRect(); return [q.el.innerText.replace(/\s+/g, '').slice(-1), { x: r.x + r.width / 2, y: r.y + r.height / 2 }];
})));
async function walk(tag) {
  const P = await pad();
  let sent = '', moved = 0;
  for (const l of ['l', 'j', 'h', 'k', 'n', 'y']) {
    if (!P[l]) continue;
    const a = (await state()).cur;
    await k.tap(P[l].x, P[l].y);
    await settle();
    const c = (await state()).cur;
    if (c.x !== a.x || c.y !== a.y) moved++;
    sent += keyStr(await evs());
  }
  C.ok(`${tag}: classic's pad sends its letters and walks`, sent.replace(/[^yuhjklbn]/g, '') === 'ljhkny' && moved >= 2, { sent, moved, keys: Object.keys(P).join('') });
}

await newGame(p, 'Classic');
await settle();
let s = await state();
C.ok('classic drawn: no twin key, the case scaled as before, no viewport-fit', s.ui === 'classic' && s.twinKeys === 0 && /scale\(/.test(s.keysTransform) && !/viewport-fit/.test(s.meta), s);
C.ok('no permanent inventory in classic (NETHACKOPTIONS !perm_invent)', s.perm === false, s.perm);
const rc = await E(() => { try { return globalThis.__ts.M.FS.readFile('/home/web_user/.nethackrc', { encoding: 'utf8' }); } catch (e) { return String(e); } });
C.ok("the game's options have no paranoid_confirmation line in classic", !/^OPTIONS=paranoid_confirmation/m.test(rc), rc.length);
await shot('landscape');
await evs();
await walk('896x443');
// a map tap travels at once in classic (the guard is twin's)
const tgt = await E(() => {
  const R = globalThis.__ts, v = R.view, g = R.grid, c = R.cursor, cv = document.getElementById('map').getBoundingClientRect();
  let best = null;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 80; x++) {
    if (g[y][x].ch !== 46) continue;
    const px = cv.left + v.left + (x + 0.5) * v.T, py = cv.top + v.top + (y + 0.5) * v.T;
    if (px < cv.left + 10 || px > cv.right - 10 || py < cv.top + 10 || py > cv.bottom - 10) continue;
    const top = document.elementFromPoint(px, py);
    if (top !== document.getElementById('map')) continue;
    const far = Math.abs(x - c.x) + Math.abs(y - c.y);
    if (far >= 2 && (!best || far > best.far)) best = { x, y, px, py, far };
  }
  return best;
});
if (tgt) {
  const a = (await state()).cur;
  await k.tap(tgt.px, tgt.py);
  await settle(8000);
  const c = (await state()).cur, e = await evs();
  C.ok('a map tap travels', e.some((x) => x.click && x.click.x === tgt.x && x.click.y === tgt.y) && (c.x !== a.x || c.y !== a.y), { tgt, a, c, sent: keyStr(e) });
}
// turned to portrait and back
await k.rotate(443, 939, DPR, [443, 939]);
await settle();
s = await state();
C.ok('turned to 443x939: still classic', s.ui === 'classic' && s.twinKeys === 0, s.ui);
await shot('portrait');
await walk('443x939');
await k.rotate(896, 443, DPR, [939, 443]);
await settle();

// the switch to twin banks at run time, through MENU -> Settings, by touch
async function switchTo(value) {
  // classic's MENU and twin's both open Settings
  const menu = await E(() => {
    const e = [...document.querySelectorAll('#keys *')].find((x) => x.children.length <= 3 && /^\s*MENU\s*$/.test(x.innerText) && x.offsetParent);
    if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!menu) return 'no MENU key';
  await k.tap(menu.x, menu.y);
  await sleep(500);
  const pick = await E((v) => {
    const lab = [...document.querySelectorAll('#formwrap label')].find((l) => /^Layout:/.test(l.textContent));
    if (!lab) return null;
    const btn = [...lab.querySelectorAll('.seg > *')].find((x) => x.innerText.replace(/\s+/g, ' ').trim().toLowerCase() === v);
    if (!btn) return null;
    btn.scrollIntoView({ block: 'center' });
    const r = btn.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, value === 'twin' ? 'twin banks' : 'classic');
  if (!pick) return 'no Layout row';
  await sleep(200);
  await k.tap(pick.x, pick.y);
  await sleep(200);
  const done = await E(() => { const b = [...document.querySelectorAll('#formwrap button')].find((x) => /DONE/i.test(x.innerText) && x.offsetParent);
    if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (!done) return 'no DONE';
  await k.tap(done.x, done.y);
  await sleep(900);
  await settle();
  return 'ok';
}
let r = await switchTo('twin');
s = await state();
C.ok('MENU -> Settings -> Layout: twin banks, at run time', r === 'ok' && s.ui === 'twin' && s.twinKeys > 30 && /viewport-fit=cover/.test(s.meta), { r, ui: s.ui, twinKeys: s.twinKeys, meta: s.meta });
await shot('switched-twin');
{
  const c0 = (await state()).cur;
  const pl = await E(() => { const q = globalThis.__ts.overlay.twinCapRect('pad_l'); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; });
  const ph = await E(() => { const q = globalThis.__ts.overlay.twinCapRect('pad_h'); return { x: q.x + q.width / 2, y: q.y + q.height / 2 }; });
  await k.tap(pl.x, pl.y); await settle(); await k.tap(ph.x, ph.y); await settle();
  const e = keyStr(await evs());
  C.ok('twin banks after the switch: the pad walks', e.replace(/[^yuhjklbn]/g, '') === 'lh', e);
}
r = await switchTo('classic');
s = await state();
C.ok('and back to classic', r === 'ok' && s.ui === 'classic' && s.twinKeys === 0 && !/viewport-fit/.test(s.meta), { r, ui: s.ui, meta: s.meta });
await shot('switched-back');
await walk('896x443 after the switch back');
C.ok('no console error', !p.errors.length, p.errors.slice(0, 5));
await b.close();
fs.writeFileSync(`${DIR}/classic-${DPR}.json`, JSON.stringify({ checks: C.list, shots }, null, 1));
console.log(`classic dpr ${DPR}: ${C.list.length - C.failed.length}/${C.list.length} pass${C.failed.length ? `; FAILED: ${C.failed.map((c) => c.name).join('; ')}` : ''}`);
