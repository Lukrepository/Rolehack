// Two minutes of play on Lucas's phone, with real touches (CDP) on the twin
// banks, the device turned between 896x443 and 443x939 in the middle of a
// fight:  node play.mjs [dpr] [seconds=120]
// A new debug-mode game (a Valkyrie; debug mode only so that ^G can bring the
// fight on cue, and so that "Die?" can be answered no): the keyboard is used
// for the game's creation and for ^G alone, every other input is a touch.
//  - walking on the pad, SEARCH, the pad centre, INVENTORY and its ESC, the
//    MENU drawer closed by a map tap, a travel tap deep in the map, a tap in
//    the confirm ring (a preview, no travel), a SEARCH count held to stick;
//  - the fight: jackals and a hill orc made next to the hero; COMBAT armed
//    then a pad direction (F and the direction), or the pad alone; Fight
//    armed when the device turns, kept across the turn, then aimed; a map tap
//    with Fight armed disarms; turned back in the middle of the fight;
//  - after: EAT, SACRIFICE held 400 ms (Pray asks; No on the pad), LOOK,
//    walking and turning until the time is up.
// Checks: no console error; twin banks throughout; every bank key the same
// distance from its own bottom corner in both orientations; armed Fight kept
// across a turn; the fight's kills; the turn counter moving; no map click
// sent but the travel's.  Screenshots: shots/play-*@<dpr>.png.  JSON: play-<dpr>.json.
import fs from 'node:fs';
import { launch, newCtx, openPage, newGame, touch, sleep, Checks, SHOTS, DIR } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const SECONDS = Number(process.argv[3] || 120);
const L = [896, 443], P = [443, 939], sL = [939, 443], sP = [443, 939];
const C = new Checks(`play@${DPR}`);
const log = [];
const note = (s) => { const t = ((Date.now() - T0) / 1000).toFixed(1); log.push(`${t}s ${s}`); console.log(`  ${t}s ${s}`); };
let T0 = Date.now();

const b = await launch();
const ctx = await newCtx(b, { w: L[0], h: L[1], dpr: DPR, touch: true, mobile: true, screen: sL, wiz: true,
});
const p = await openPage(ctx);
const k = await touch(ctx, p);
let orient = 'L';

const E = (fn, a) => p.evaluate(fn, a);
const state = () => E(() => {
  const R = globalThis.__ts, o = R.overlay, $ = (id) => document.getElementById(id);
  const st = $('statband').innerText;
  const T = /T:(\d+)/.exec(st), HP = /HP:(\d+)\((\d+)\)/.exec(st);
  return { cw: R.commandWait, waiting: R.waiting, more: R.moreShown, modal: R.modalOpen, form: !$('formwrap').hidden,
    line: !!($('line') && $('line').offsetParent), answering: !!o.answering, armed: o.armed ? o.armed.key : null,
    drawer: o.drawerOpen || null, layer: o.padLayer ? o.padLayer.kind : null, ui: document.documentElement.dataset.ui,
    cur: R.cursor, T: T ? +T[1] : null, hp: HP ? +HP[1] : null, hpmax: HP ? +HP[2] : null,
    msg: $('msgband').innerText.replace(/\s+/g, ' ').trim(), title: $('modal-title').textContent };
});
const cap = (id) => E((id) => { const r = globalThis.__ts.overlay.twinCapRect(id); return r ? { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 } : null; }, id);
async function tapKey(id, hold = 0) {
  const r = await cap(id);
  if (!r) throw new Error(`no key ${id}`);
  await k.tap(r.cx, r.cy, hold);
  return r;
}
const evs = () => E(() => globalThis.__ev || []);
const clearEvs = () => E(() => { globalThis.__ev = []; });
const keyStr = (list) => list.map((e) => (e.key !== undefined ? (typeof e.key === 'number' ? (e.key >= 32 && e.key < 127 ? String.fromCharCode(e.key) : `<${e.key}>`) : String(e.key)) : e.click ? `click(${e.click.x},${e.click.y})` : JSON.stringify(e))).join('');
let allEvents = [];
const takeEvs = async () => { const e = await evs(); await clearEvs(); allEvents.push(...e); return e; };

// past --More--, questions and windows nobody asked for, until a command wait
async function settle(ms = 6000) {
  const t0 = Date.now();
  let quiet = 0;
  while (Date.now() - t0 < ms) {
    await sleep(110);
    const s = await state();
    if (s.more) { const m = await E(() => document.getElementById('msgband').getBoundingClientRect().toJSON()); await k.tap(m.x + m.width / 2, m.y + m.height / 2); quiet = 0; continue; }
    if (s.answering && /Die\?/.test(s.msg)) { note('"Die?" -- answered no (debug mode)'); await tapKey('pad_n'); quiet = 0; continue; }
    if (s.answering && /Really attack/.test(s.msg)) { await tapKey('pad_n'); quiet = 0; continue; }
    // any other question the walk runs into ("Really step onto that trap door?"): No on the pad, else Esc at its centre
    if (s.answering) {
      const no = await E(() => /\bNo\b/.test(document.querySelector('[data-tw="pad_n"]').innerText));
      note(`"${s.msg.slice(-60)}" -- answered ${no ? 'No' : 'Esc'} on the pad`);
      await tapKey(no ? 'pad_n' : 'pad_centre'); quiet = 0; continue;
    }
    if (s.cw && !s.modal && !s.form && !s.line) { if (++quiet >= 3) return true; } else quiet = 0;
  }
  return false;
}
async function escape() { await p.keyboard.press('Escape'); await settle(); }

const DIRS = { '-1,-1': 'pad_y', '0,-1': 'pad_k', '1,-1': 'pad_u', '-1,0': 'pad_h', '1,0': 'pad_l', '-1,1': 'pad_b', '0,1': 'pad_j', '1,1': 'pad_n' };
const LETTER = { pad_y: 'y', pad_k: 'k', pad_u: 'u', pad_h: 'h', pad_l: 'l', pad_b: 'b', pad_j: 'j', pad_n: 'n' };
// hostile monsters on the map: a letter (or ':' or '&') that is not the hero and not a pet
const monsters = () => E(() => {
  const R = globalThis.__ts, g = R.grid, c = R.cursor, out = [];
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) {
    const q = g[y][x], ch = String.fromCharCode(q.ch);
    if (x === c.x && y === c.y) continue;
    if (/[A-Za-z:&']/.test(ch) && !(q.flags & 0x10)) out.push({ x, y, ch, dx: x - c.x, dy: y - c.y });
  }
  return out;
});
const kills = () => E(() => globalThis.__ts.history.filter((t) => /You kill|You destroy|is killed|You slay/.test(t)).length);

// every bank key's distance from its own bottom corner (in, up), and its size
const corners = () => E(() => {
  const o = globalThis.__ts.overlay, S = o.twin.spec, out = {};
  for (const c of S.controls) {
    if (c.behind) continue;
    const inn = c.thumb === 'L' ? c.x : S.W - (c.x + c.w);
    out[c.id] = [+inn.toFixed(2), +(S.H - (c.y + c.h)).toFixed(2), +c.w.toFixed(2), +c.h.toFixed(2)];
  }
  return out;
});

async function turn(to) {
  const [w, h] = to === 'L' ? L : P, scr = to === 'L' ? sL : sP;
  await k.rotate(w, h, DPR, scr);
  orient = to;
  await sleep(400);
  const s = await state();
  note(`turned to ${w}x${h}: ui ${s.ui}, armed ${s.armed}, layer ${s.layer}`);
  return s;
}
const shot = async (name) => { const f = `${SHOTS}/play-${name}@${DPR}.png`; await k.shot(f); return f; };
const shots = [];

// ---------------------------------------------------------------- the game
T0 = Date.now();
await newGame(p, 'Lucas', 'v');
await settle();
let s0 = await state();
note(`new game: ${s0.msg.slice(0, 80)} | T ${s0.T} HP ${s0.hp}`);
C.ok('debug mode game (for ^G and "Die?")', await E(() => globalThis.__wizfs === 1 && globalThis.__ts.overlay.wizard));
C.ok('twin banks at 896x443', s0.ui === 'twin');
const cornersL = await corners();
shots.push(await shot('00-start'));
const T_START = s0.T;
T0 = Date.now();   // the two minutes start with the game in hand
await clearEvs();

// --- walking, SEARCH, the pad centre
let moved = 0;
for (const id of ['pad_l', 'pad_l', 'pad_j', 'pad_n', 'pad_h', 'pad_h', 'pad_k', 'pad_y', 'pad_u', 'pad_b', 'pad_l', 'pad_j']) {
  const a = (await state()).cur;
  await tapKey(id);
  await settle();
  const c = (await state()).cur;
  if (c.x !== a.x || c.y !== a.y) moved++;
}
let e = keyStr(await takeEvs());
note(`walked: 12 pad taps sent "${e}", the hero moved ${moved} times`);
C.ok('the pad walks: each tap sent its letter', e.replace(/[^yuhjklbn]/g, '') === 'lljnhhkyublj', e);
await tapKey('search'); await settle();
await tapKey('pad_centre'); await settle();
e = keyStr(await takeEvs());
C.ok('SEARCH then the pad centre', /^ss$|^s[.,s]$/.test(e), e);

// --- INVENTORY, closed with its ESC
await tapKey('inventory');
await settle(2000);
let s = await state();
const invOpen = s.modal;
shots.push(await shot('01-inventory'));
const escBtn = await E(() => { const b = [...document.querySelectorAll('#modal button, #modal .cap, #modal [data-key]')].find((x) => /^\s*(ESC|Esc|esc|Close|✕)\s*$/i.test(x.innerText) && x.offsetParent);
  if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
if (escBtn) await k.tap(escBtn.x, escBtn.y); else await p.keyboard.press('Escape');
await settle();
s = await state();
C.ok('INVENTORY opens its window and its ESC closes it', invOpen && !s.modal, { invOpen, after: s.modal, escBtn: !!escBtn });
await takeEvs();

// --- WORLD's drawer, closed by a tap on the map; MENU's Settings, closed by DONE
await tapKey('world');
await sleep(300);
const drawerOpen = (await state()).drawer;
const drawerBox = await E(() => { const d = document.querySelector('#drawer .panel'); const r = d && d.getBoundingClientRect(); const m = globalThis.__ts.overlay.twin.spec.mapArea;
  return r ? { inMap: r.x >= m.x - 0.5 && r.y >= m.y - 0.5 && r.right <= m.x + m.w + 0.5 && r.bottom <= m.y + m.h + 0.5, w: r.width, h: r.height } : null; });
shots.push(await shot('02-world-drawer'));
const map = await E(() => globalThis.__ts.overlay.twin.spec.mapArea);
const dp = await E(() => document.querySelector('#drawer .panel').getBoundingClientRect().toJSON());
await k.tap((map.x + dp.left) / 2, map.y + map.h / 2);
await sleep(300);
s = await state();
e = await takeEvs();
C.ok('WORLD opens its drawer inside the map; a map tap closes it and sends nothing', drawerOpen === 'world' && drawerBox && drawerBox.inMap && !s.drawer && !e.length,
  { drawerOpen, drawerBox, after: s.drawer, sent: keyStr(e) });
await sleep(250);
await tapKey('menu');
await sleep(400);
const settingsOpen = (await state()).form;
shots.push(await shot('02b-menu-settings'));
const done = await E(() => { const b = [...document.querySelectorAll('#formwrap button')].find((x) => /DONE/i.test(x.innerText) && x.offsetParent);
  if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
if (done) await k.tap(done.x, done.y); else await p.keyboard.press('Escape');
await settle();
s = await state();
e = await takeEvs();
C.ok('MENU opens Settings; DONE closes it', settingsOpen && !!done && !s.form && !e.length, { settingsOpen, done: !!done, after: s.form, sent: keyStr(e) });
await sleep(250);

// --- a travel tap deep in the map, then a tap in the confirm ring
const target = await E(() => {
  const R = globalThis.__ts, o = R.overlay, v = R.view, g = R.grid, c = R.cursor, cv = document.getElementById('map').getBoundingClientRect();
  let best = null;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 80; x++) {
    if (g[y][x].ch !== 46) continue;   // '.' floor
    const px = cv.left + v.left + (x + 0.5) * v.T, py = cv.top + v.top + (y + 0.5) * v.T;
    if (px < cv.left + 4 || px > cv.right - 4 || py < cv.top + 4 || py > cv.bottom - 4) continue;
    const d = o.keyDistance(px, py);
    const far = Math.abs(x - c.x) + Math.abs(y - c.y);
    if ((d === null || d > 40) && far >= 3 && (!best || far > best.far)) best = { x, y, px, py, far };
  }
  return best;
});
if (target) {
  const a = (await state()).cur;
  await k.tap(target.px, target.py);
  await settle(8000);
  const c = (await state()).cur;
  e = await takeEvs();
  const clicks = e.filter((x) => x.click);
  note(`travel tap at (${target.x},${target.y}): hero ${a.x},${a.y} -> ${c.x},${c.y}; sent ${keyStr(e)}`);
  C.ok('a tap deep in the map travels', clicks.length === 1 && clicks[0].click.x === target.x && clicks[0].click.y === target.y && (c.x !== a.x || c.y !== a.y), { target, from: a, to: c });
} else note('no floor cell far enough for a travel tap');
shots.push(await shot('03-after-travel'));
await sleep(300);
// the ring: the 20 dp of map past the left bank's halo
const ringPt = await E(() => {
  const o = globalThis.__ts.overlay, m = o.twin.spec.mapArea, cv = document.getElementById('map').getBoundingClientRect();
  for (let x = m.x; x < m.x + 60; x += 1) {
    const y = m.y + m.h * 0.75, d = o.keyDistance(x, y);
    if (d !== null && d > 13 && d < 30 && x > cv.left + 1) return { x, y, d };
  }
  return null;
});
if (ringPt) {
  const a = (await state()).cur;
  await k.tap(ringPt.x, ringPt.y);
  await sleep(250);
  const pv = await E(() => globalThis.__ts.ghostPreview && { x: globalThis.__ts.ghostPreview.x, y: globalThis.__ts.ghostPreview.y, ring: !!globalThis.__ts.ghostPreview.ring });
  const c = (await state()).cur;
  e = await takeEvs();
  C.ok('a map tap in the confirm ring previews and does not travel', !e.some((x) => x.click) && c.x === a.x && c.y === a.y && pv && pv.ring, { ringPt, pv, sent: keyStr(e) });
  await sleep(2300);   // the preview lapses
}

// --- a SEARCH count, held to stick, ×5 picked (it sets SEARCH's count), then SEARCH
await clearEvs();
await tapKey('search', 700);
await sleep(150);
const layer = (await state()).layer;
shots.push(await shot('04-count-layer'));
await tapKey('pad_k');
await sleep(250);
const afterPick = await state();
const label = await E(() => document.querySelector('[data-tw="search"]').innerText.replace(/\s+/g, ' '));
await tapKey('search');
await settle(8000);
e = keyStr(await takeEvs());
C.ok('SEARCH held 700 ms keeps its count layer; ↑ sets ×5; SEARCH then searches 5 times', layer === 'count' && !afterPick.layer && /×5/.test(label) && /5s$/.test(e.replace(/ /g, '')),   // the spaces: --More--s passed by a tap on the band
  { layer, after: afterPick.layer, label, sent: e });

// ---------------------------------------------------------------- the fight
async function genesis(name) {
  await E(() => globalThis.__ts.key(7));
  for (let i = 0; i < 20; i++) { await sleep(150); if ((await state()).line) break; }
  if (!(await state()).line) { note('^G asked nothing'); await escape(); return false; }
  await p.fill('#line', name); await p.press('#line', 'Enter');
  await settle();
  return true;
}
for (const m of ['jackal', 'jackal', 'jackal', 'hill orc']) await genesis(m);
await takeEvs();
let mons = await monsters();
note(`made: ${mons.map((m) => `${m.ch}@${m.dx},${m.dy}`).join(' ')}`);
C.ok('the monsters are there', mons.length >= 2, mons.length);
shots.push(await shot('05-fight-start'));
const kills0 = await kills();

let rounds = 0, armedTurns = 0, viaCombat = 0;
async function fightRound(useCombat) {
  mons = await monsters();
  const adj = mons.filter((m) => Math.abs(m.dx) <= 1 && Math.abs(m.dy) <= 1);
  if (!adj.length) {
    // the nearest comes to us: wait a turn on the pad centre, or step toward it
    const near = mons.sort((a, b) => Math.max(Math.abs(a.dx), Math.abs(a.dy)) - Math.max(Math.abs(b.dx), Math.abs(b.dy)))[0];
    if (near && Math.max(Math.abs(near.dx), Math.abs(near.dy)) <= 6) await tapKey(DIRS[`${Math.sign(near.dx)},${Math.sign(near.dy)}`] || 'pad_centre');
    else await tapKey('pad_centre');
    await settle();
    return false;
  }
  const t = adj[0], id = DIRS[`${t.dx},${t.dy}`];
  if (useCombat) {
    await tapKey('combat');
    await sleep(120);
    viaCombat++;
  }
  await tapKey(id);
  await settle();
  rounds++;
  return true;
}
// landscape: a few rounds, alternating COMBAT then direction, and the pad alone
for (let i = 0; i < 6 && (await monsters()).length; i++) await fightRound(i % 2 === 0);
let st = await state();
note(`landscape fight: ${rounds} rounds, kills ${(await kills()) - kills0}, HP ${st.hp}/${st.hpmax}, monsters left ${(await monsters()).length}`);
// mid-fight: Fight armed, then the device turns
if (!(await monsters()).length) { await genesis('jackal'); await genesis('jackal'); }
// a monster next to the hero when the device turns: wait a turn or two for one
for (let i = 0; i < 4 && !(await monsters()).some((m) => Math.abs(m.dx) <= 1 && Math.abs(m.dy) <= 1); i++) { await tapKey('pad_centre'); await settle(); }
await clearEvs();
await tapKey('combat');
await sleep(150);
st = await state();
C.ok('COMBAT arms Fight (sends nothing yet)', st.armed === 'F' && !(await evs()).length, st.armed);
shots.push(await shot('06-armed-landscape'));
st = await turn('P');
shots.push(await shot('07-armed-portrait'));
C.ok('armed Fight kept across the turn to portrait', st.armed === 'F' && st.ui === 'twin', st);
const cornersP = await corners();
const moves = Object.keys(cornersL).filter((id) => !cornersP[id] || cornersL[id].some((v, i) => Math.abs(v - cornersP[id][i]) > 0.01));
C.ok('every key the same distance from its own corner in both orientations', !moves.length, moves.map((id) => [id, cornersL[id], cornersP[id]]).slice(0, 6));
// aim the armed Fight at a monster, or, with none adjacent, a map tap disarms
mons = await monsters();
let adj = mons.filter((m) => Math.abs(m.dx) <= 1 && Math.abs(m.dy) <= 1);
await clearEvs();
if (adj.length) {
  await tapKey(DIRS[`${adj[0].dx},${adj[0].dy}`]);
  await settle();
  e = keyStr(await takeEvs());
  C.ok('after the turn the pad aims the armed Fight (F and the direction)', /^F[yuhjklbn]$/.test(e), e);
  armedTurns++;
  // and a map tap with Fight armed disarms it, sends nothing
  await tapKey('combat'); await sleep(150);
}
{
  const m = await E(() => globalThis.__ts.overlay.twin.spec.mapArea);
  const a = (await state()).cur;
  await k.tap(m.x + m.w / 2, m.y + m.h / 2);
  await sleep(250);
  const s2 = await state();
  e = await takeEvs();
  C.ok('a map tap with Fight armed disarms it and does not travel', !s2.armed && !e.length && s2.cur.x === a.x && s2.cur.y === a.y, { armed: s2.armed, sent: keyStr(e) });
}
await sleep(250);
for (let i = 0; i < 5 && (await monsters()).length; i++) await fightRound(i % 2 === 1);
shots.push(await shot('08-fight-portrait'));
st = await state();
note(`portrait fight: ${rounds} rounds in all, kills ${(await kills()) - kills0}, HP ${st.hp}/${st.hpmax}, monsters left ${(await monsters()).length}`);
// turned back in the middle of the fight (more monsters if it is over)
if (!(await monsters()).length) { await genesis('jackal'); await genesis('hill orc'); }
st = await turn('L');
const cornersL2 = await corners();
const moves2 = Object.keys(cornersL).filter((id) => cornersL[id].some((v, i) => Math.abs(v - cornersL2[id][i]) > 0.01));
C.ok('back in landscape, every key where it was', !moves2.length && st.ui === 'twin', moves2);
for (let i = 0; i < 12 && (await monsters()).length; i++) await fightRound(i % 3 === 0);
shots.push(await shot('09-fight-end'));
st = await state();
const killed = (await kills()) - kills0;
note(`fight over: ${rounds} attack rounds (${viaCombat} through COMBAT), ${killed} killed, HP ${st.hp}/${st.hpmax}, left ${(await monsters()).length}`);
C.ok('the fight killed monsters', killed >= 2, killed);

// ---------------------------------------------------------------- after
await clearEvs();
await tapKey('eat'); await settle(1500);
s = await state();
note(`EAT: "${s.msg.slice(0, 60)}" modal ${s.modal}`);
await escape();
await tapKey('sacrifice', 420);
await sleep(400);
s = await state();
const prayAsked = /pray/i.test(s.msg);
shots.push(await shot('10-pray-asked'));
if (s.answering) await tapKey('pad_n'); else await escape();
await settle();
C.ok('SACRIFICE held 420 ms asks to pray; No on the pad', prayAsked, s.msg.slice(0, 80));
await tapKey('look'); await settle(2000);
s = await state();
if (s.modal) await escape();
await takeEvs();

// walk and turn until the time is up
const order = ['pad_l', 'pad_j', 'pad_h', 'pad_k', 'pad_n', 'pad_y', 'pad_u', 'pad_b'];
let i = 0, turns = 3;
while ((Date.now() - T0) / 1000 < SECONDS) {
  await tapKey(order[i++ % order.length]);
  await settle(3000);
  if (i % 14 === 0) { await turn(orient === 'L' ? 'P' : 'L'); turns++; }
  if ((await monsters()).some((m) => Math.abs(m.dx) <= 1 && Math.abs(m.dy) <= 1)) await fightRound(true);
}
if (orient !== 'L') { await turn('L'); turns++; }
shots.push(await shot('11-end'));
const sEnd = await state();
const elapsed = (Date.now() - T0) / 1000;
note(`time up: ${elapsed.toFixed(0)} s, ${turns} turns of the device, T ${T_START} -> ${sEnd.T}, HP ${sEnd.hp}/${sEnd.hpmax}`);
allEvents.push(...(await evs()));
const clicks = allEvents.filter((x) => x.click);
C.ok(`played ${elapsed.toFixed(0)} s, at least ${SECONDS}`, elapsed >= SECONDS);
C.ok('the game moved on (turn counter)', sEnd.T > T_START + 20, [T_START, sEnd.T]);
C.ok('twin banks to the end', sEnd.ui === 'twin');
C.ok('no map click but the travel tap', clicks.length <= 1, clicks.map((x) => x.click));
const glog = await E(() => (globalThis.rolehackGuardLog ? globalThis.rolehackGuardLog() : []).map((g) => g.what || g.kind || JSON.stringify(g)));
const byKind = {};
for (const g of glog) byKind[g] = (byKind[g] || 0) + 1;
note(`guard log: ${JSON.stringify(byKind)}`);
C.ok('no console error', !p.errors.length, p.errors.slice(0, 5));
await b.close();
const out = { dpr: DPR, seconds: elapsed, turns, T: [T_START, sEnd.T], killed, rounds, viaCombat, guard: byKind, errors: p.errors, shots, log, checks: C.list };
fs.writeFileSync(`${DIR}/play-${DPR}.json`, JSON.stringify(out, null, 1));
console.log(`play dpr ${DPR}: ${C.list.length - C.failed.length}/${C.list.length} pass${C.failed.length ? `; FAILED: ${C.failed.map((c) => c.name).join('; ')}` : ''}`);
