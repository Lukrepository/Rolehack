// The device turned while something is up, on Lucas's phone: node turns.mjs [dpr]
// Each case begins in a new game (896x443), puts the thing up with touches,
// turns to 443x939, checks it is still up and still answers, finishes it, and
// turns back.  Cases: the inventory window; Settings; a y/n question with its
// answers on the pad (Pray); getpos (farlook from LOOK) with the pad moving the
// cursor; a sticky count layer; CONTEXT's HERE; the WORLD drawer; a command in
// hand (a drawer item held to pin it).  Console errors are checked throughout.
import fs from 'node:fs';
import { launch, newCtx, openPage, newGame, touch, sleep, Checks, SHOTS, DIR } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const C = new Checks(`turns@${DPR}`);
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, dpr: DPR, touch: true, mobile: true, screen: [939, 443] });
const p = await openPage(ctx);
const k = await touch(ctx, p);
const E = (fn, a) => p.evaluate(fn, a);
const state = () => E(() => {
  const R = globalThis.__ts, o = R.overlay, $ = (id) => document.getElementById(id);
  return { ui: document.documentElement.dataset.ui, cw: R.commandWait, more: R.moreShown, modal: R.modalOpen, form: !$('formwrap').hidden,
    answering: !!o.answering, picking: !!o.picking, layer: o.padLayer ? { kind: o.padLayer.kind, sticky: !!o.padLayer.sticky } : null,
    drawer: o.drawerOpen || null, assign: !!o.assign, armed: o.armed ? o.armed.key : null, cur: R.cursor,
    msg: $('msgband').innerText.replace(/\s+/g, ' ').trim(), W: innerWidth, H: innerHeight };
});
const cap = (id) => E((id) => { const r = globalThis.__ts.overlay.twinCapRect(id); return r ? { cx: r.x + r.width / 2, cy: r.y + r.height / 2 } : null; }, id);
const tapKey = async (id, hold = 0) => { const r = await cap(id); await k.tap(r.cx, r.cy, hold); };
const evs = async () => { const e = await E(() => globalThis.__ev || []); await E(() => { globalThis.__ev = []; }); return e; };
const keyStr = (list) => list.map((e) => (e.key !== undefined ? (typeof e.key === 'number' ? (e.key >= 32 && e.key < 127 ? String.fromCharCode(e.key) : `<${e.key}>`) : String(e.key)) : e.click ? `click(${e.click.x},${e.click.y})` : '?')).join('');
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
const turn = async (to) => { if (to === 'P') await k.rotate(443, 939, DPR, [443, 939]); else await k.rotate(896, 443, DPR, [939, 443]); await sleep(300); return state(); };
const shot = async (n) => k.shot(`${SHOTS}/turns-${n}@${DPR}.png`);

await newGame(p, 'Turns');
await settle();
await evs();

// 1. the inventory window
await tapKey('inventory'); await settle(1500);
let s = await turn('P');
await shot('inventory-P');
C.ok('inventory window up across the turn', s.modal && s.ui === 'twin', s);
await p.keyboard.press('Escape'); await settle();
s = await turn('L');
C.ok('closed, back in landscape', !s.modal && s.cw, s);
await evs();

// 2. Settings
await tapKey('menu'); await sleep(400);
s = await turn('P');
await shot('settings-P');
C.ok('Settings up across the turn', s.form && s.ui === 'twin', s);
{ const d = await E(() => { const b = [...document.querySelectorAll('#formwrap button')].find((x) => /DONE/i.test(x.innerText) && x.offsetParent); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await k.tap(d.x, d.y); await settle(); }
s = await state();
C.ok('DONE in portrait closes it, nothing sent', !s.form && !(await evs()).length, s);
await turn('L');

// 3. a y/n question with its answers on the pad (Pray)
await tapKey('sacrifice', 420); await sleep(400);
s = await state();
const asked = s.answering;
s = await turn('P');
await shot('pray-question-P');
const pad = await E(() => [...document.querySelectorAll('[data-tw^="pad_"]')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
C.ok('the question\'s answers stay on the pad across the turn', asked && s.answering && /No/.test(pad.join('|')), { asked, answering: s.answering, pad });
await evs();
await tapKey('pad_n'); await settle();
s = await state();
C.ok('No answered from the turned pad', !s.answering && /n$/.test(keyStr(await evs())), s.msg);
await turn('L');

// 4. getpos: farlook (LOOK held), the cursor moved by the pad, picked by the centre
await tapKey('look', 550); await sleep(500);
// the game's first getpos shows its help in a text window: its OK, by touch
if ((await state()).modal) {
  const ok = await E(() => { const b = [...document.querySelectorAll('#modal button')].find((x) => /OK/.test(x.innerText)); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await k.tap(ok.x, ok.y); await sleep(500);
}
s = await state();
const picking = s.picking;
s = await turn('P');
await shot('farlook-P');
C.ok('getpos (farlook) kept across the turn', picking && s.picking, { picking, after: s.picking, msg: s.msg });
await evs();
await tapKey('pad_l'); await sleep(200);
await tapKey('pad_centre'); await sleep(600);
let e = keyStr(await evs());
await settle(4000);
s = await state();
if (s.modal) { await p.keyboard.press('Escape'); await settle(); }
C.ok('the pad moved the cursor and its centre picked the spot', /^l\.|^l,|^l;/.test(e) && !(await state()).picking, e);
await turn('L');
await evs();

// 5. a sticky count layer (SEARCH held 700 ms)
await tapKey('search', 700); await sleep(150);
s = await turn('P');
await shot('count-P');
C.ok('the sticky count layer is up after the turn', s.layer && s.layer.kind === 'count', s.layer);
await tapKey('pad_u'); await sleep(250);   // ×10
s = await state();
const lbl = await E(() => document.querySelector('[data-tw="search"]').innerText.replace(/\s+/g, ' '));
C.ok('×10 picked on the turned pad sets SEARCH ×10', !s.layer && /×10/.test(lbl), lbl);
await turn('L');
await evs();

// 6. the WORLD drawer
await tapKey('world'); await sleep(300);
s = await turn('P');
await shot('world-drawer-P');
const box = await E(() => { const r = document.querySelector('#drawer .panel').getBoundingClientRect(), m = globalThis.__ts.overlay.twin.spec.mapArea;
  return { inMap: r.x >= m.x - 0.5 && r.y >= m.y - 0.5 && r.right <= m.x + m.w + 0.5 && r.bottom <= m.y + m.h + 0.5, r: [r.x, r.y, r.width, r.height].map(Math.round) }; });
C.ok('the drawer stays open across the turn, inside the portrait map', s.drawer === 'world' && box.inMap, { drawer: s.drawer, box });
// its "Search" item runs from portrait
const item = await E(() => { const it = [...document.querySelectorAll('#drawer .grid > *')].find((x) => /^\s*s?\s*Search\s*$/i.test(x.innerText.replace(/\n/g, ' ')) || /\bSearch$/.test(x.innerText.trim()));
  if (!it) return null; const r = it.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: it.innerText }; });
if (item) { await k.tap(item.x, item.y); await settle(); }
e = keyStr(await evs());
s = await state();
C.ok('a drawer item tapped in portrait runs and closes the drawer', !!item && !s.drawer && /s/.test(e), { item, sent: e });
await turn('L');

// 7. a command in hand: a WORLD item held to pin it, then the turn
await tapKey('world'); await sleep(300);
const it2 = await E(() => { const it = [...document.querySelectorAll('#drawer .grid > *')].find((x) => /Jump/.test(x.innerText));
  if (!it) return null; const r = it.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
if (it2) await k.tap(it2.x, it2.y, 650);
await sleep(200);
s = await state();
const inHand = s.assign;
s = await turn('P');
await shot('in-hand-P');
C.ok('a command in hand stays in hand across the turn', inHand && s.assign, { inHand, after: s.assign });
await p.keyboard.press('Escape'); await sleep(300);
s = await turn('L');
C.ok('Esc puts it back', !s.assign && s.ui === 'twin', s.assign);

C.ok('no console error', !p.errors.length, p.errors.slice(0, 5));
await b.close();
fs.writeFileSync(`${DIR}/turns-${DPR}.json`, JSON.stringify(C.list, null, 1));
console.log(`turns dpr ${DPR}: ${C.list.length - C.failed.length}/${C.list.length} pass${C.failed.length ? `; FAILED: ${C.failed.map((c) => c.name).join('; ')}` : ''}`);
