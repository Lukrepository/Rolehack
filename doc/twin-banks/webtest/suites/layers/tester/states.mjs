// The near-miss guard in the states that matter: at --More--, during farlook
// (getpos), with Fight armed, the confirm ring and its second tap, the 120 ms
// and 200 ms rules, a slide from a key, a pan from the map; and that nothing
// pops over a key in any of them.
//   node states.mjs <dpr> [WxH]
import { launch, newCtx, openPage, resume, toucher, SIZES, SHOTS, writeJson, Checks, sleep, SP } from './common.mjs';
import { cap, spec, mark, pushed, state, reset, popups, waitFor } from './probe.mjs';
const { hitModel } = await import(`${SP}/design/v2/checks/lib.mjs`);

const dpr = Number(process.argv[2] || 1);
const only = process.argv[3] || null;
const MACROS = [{ name: 'M1', keys: 'Q' }, { name: 'M2', keys: 'Q' }, { name: 'M3', keys: 'Q' }, { name: 'Tap', keys: 'Q' }, { name: 'Kick', keys: '^D' }, { name: 'UR', keys: 'Q' }];

const has = (log, w) => log.some((l) => l === w || l.startsWith(`${w}:`));
const b = await launch();
const all = [];
const pops = [];
const notes = [];
for (const [W, H] of SIZES) {
  if (only && only !== `${W}x${H}`) continue;
  const tag = `${dpr}-${W}x${H}`;
  const C = new Checks(`states ${tag}`);
  const ctx = await newCtx(b, { w: W, h: H, dpr, prefs: { ghostDeck: { on: false, clean: 3, session: null }, macros: MACROS } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const t = await toucher(ctx, p);
  const S = await spec(p);
  const hm = hitModel(S);
  const K = {};
  for (const c of S.controls) if (!c.behind) K[c.id] = await cap(p, c.id);
  const ctr = (id) => [K[id].cx, K[id].cy];
  const lv = await p.evaluate(() => { const v = globalThis.__tt.view, r = document.getElementById('map').getBoundingClientRect(); return { left: r.left + v.left, top: r.top + v.top, T: v.T }; });
  const cellOf = (x, y) => ({ cx: Math.floor((x - lv.left) / lv.T), cy: Math.floor((y - lv.top) / lv.T) });
  const inLevel = (x, y) => { const { cx, cy } = cellOf(x, y); return cx >= 0 && cx < 80 && cy >= 0 && cy < 21; };
  const hero = await p.evaluate(() => globalThis.__tt.cursor);
  // a ring point in the level (the cell's centre, so a second tap lands on the same cell)
  const m = S.mapArea;
  let ring = null, deep = null;
  for (let y = m.y + 1; y < m.y + m.h; y += 1) for (let x = m.x + 1; x < m.x + m.w; x += 1) {
    if (!inLevel(x, y)) continue;
    const { cx, cy } = cellOf(x, y);
    const mx = lv.left + (cx + 0.5) * lv.T, my = lv.top + (cy + 0.5) * lv.T;
    if (Math.abs(mx - x) > 0.5 || Math.abs(my - y) > 0.5) continue;
    if (cx === hero.x && cy === hero.y) continue;
    const r = hm(x, y);
    const ok = hm(x - 2, y) === r && hm(x + 2, y) === r && hm(x, y - 2) === r && hm(x, y + 2) === r;
    if (!ok) continue;
    if (r === 'ring' && (!ring || Math.abs(y - K.pad_l.cy) < Math.abs(ring.y - K.pad_l.cy))) ring = { x, y, cx, cy };
    const dc = Math.abs(x - (m.x + m.w / 2)) + Math.abs(y - (m.y + m.h / 2));
    if (r === 'map' && (!deep || dc < deep.d)) deep = { x, y, cx, cy, d: dc };
  }
  notes.push({ tag, ring, deep, hero });
  C.ok('a deep map point exists', !!deep, deep);
  // a halo point that the model swallows (8-12 dp off a keycap), not over the map
  const swallowAt = (() => {
    for (const id of ['pad_l', 'pad_u', 'pad_n', 'pin1', 'menu', 'sacrifice', 'pad_y', 'rest']) {
      const k = K[id];
      for (const [x, y] of [[k.x + k.w + 10, k.cy], [k.cx, k.y - 10], [k.x - 10, k.cy]]) if (hm(x, y) === 'swallowed') return { x, y, id };
    }
    return null;
  })();
  const snapAt = (() => {
    for (const id of ['pad_l', 'pad_u', 'menu', 'rest']) {
      const k = K[id];
      for (const [x, y] of [[k.x + k.w + 5, k.cy], [k.cx, k.y - 5]]) if (hm(x, y) === id) return { x, y, id };
    }
    return null;
  })();
  const seamAt = (() => {
    const a = K.combat, c = K.context;
    const x = a.x < c.x ? (a.x + a.w + c.x) / 2 : (c.x + c.w + a.x) / 2;
    return hm(x, a.cy) === 'swallowed' ? { x, y: a.cy } : null;
  })();
  notes.push({ tag, swallowAt, snapAt, seamAt });
  C.ok('halo swallow point found', !!swallowAt, swallowAt);
  C.ok('seam point found', !!seamAt, seamAt);
  const popCheck = async (what) => {
    const q = await popups(p);
    pops.push({ tag, what, ...q });
    C.ok(`nothing pops over a key: ${what}`, q.bad.length === 0, q.bad.length ? q.bad : q.shown.join(','));
  };
  const shot = (name) => p.screenshot({ path: `${SHOTS}/states-${tag}-${name}.png` });

  // ---------------- the ring (core held back) ----------------
  await p.evaluate(() => { globalThis.__swallowAll = true; });
  if (ring) {
    await reset(p); await mark(p);
    await t.tap(ring.x, ring.y); await sleep(80);
    let s = await state(p);
    C.ok('ring tap: a preview, no travel', s.preview && s.preview.x === ring.cx && s.preview.y === ring.cy && !(await pushed(p)).includes('@') && has(s.log, 'ring'), { preview: s.preview, sent: await pushed(p), log: s.log });
    await popCheck('ring preview');
    await shot('ring');
    await t.tap(ring.x, ring.y); await sleep(80);
    s = await state(p);
    C.ok('ring: second tap on the cell travels', (await pushed(p)) === `@${ring.cx},${ring.cy}` && !s.preview, { sent: await pushed(p), preview: s.preview });
    await reset(p); await mark(p);
    await t.tap(ring.x, ring.y); await sleep(2300);
    s = await state(p);
    C.ok('ring: the preview lapses after 2 s', !s.preview, s.preview);
    await t.tap(ring.x, ring.y); await sleep(80);
    C.ok('ring: after the lapse a tap previews again, no travel', !(await pushed(p)).includes('@'), await pushed(p));
    if (deep) {
      await reset(p); await mark(p);
      await t.tap(ring.x, ring.y); await sleep(80);
      await t.tap(deep.x, deep.y); await sleep(80);
      s = await state(p);
      C.ok('ring then a deep tap: the deep tap travels, preview cleared', (await pushed(p)) === `@${deep.cx},${deep.cy}` && !s.preview, { sent: await pushed(p), preview: s.preview });
    }
    await reset(p); await mark(p);
    await t.tap(ring.x, ring.y); await sleep(80);
    await t.tap(...ctr('pad_k')); await sleep(80);
    s = await state(p);
    // (the core must see the key: push() clears the preview; LOOK's ':' costs no turn)
    await reset(p); await p.evaluate(() => { globalThis.__swallowAll = false; }); await mark(p);
    await t.tap(ring.x, ring.y); await sleep(80);
    await t.tap(...ctr('look')); await sleep(150);
    s = await state(p);
    C.ok('ring then a key: preview cleared, the key goes', !s.preview && (await pushed(p)) === ':', { preview: s.preview, sent: await pushed(p) });
    await resume(p);
    await p.evaluate(() => { globalThis.__swallowAll = true; });
    // 120 ms after a key lifts
    await reset(p); await mark(p);
    await t.tap(...ctr('pad_l'), { after: 0 });
    await t.tap(ring.x, ring.y, { after: 0 });
    await sleep(60);
    s = await state(p);
    C.ok('a ring tap within 120 ms of a key: swallowed (bounce)', has(s.log, 'bounce') && !s.preview && (await pushed(p)) === 'l', { log: s.log, preview: s.preview, sent: await pushed(p) });
    await sleep(200);
  } else {
    notes.push({ tag, note: 'no ring in the level at this window' });
  }
  if (deep) {
    await reset(p); await mark(p);
    await t.tap(...ctr('pad_l'), { after: 0 });
    await t.tap(deep.x, deep.y, { after: 0 });
    await sleep(60);
    C.ok('a deep map tap within 120 ms of a key still travels', (await pushed(p)) === `l@${deep.cx},${deep.cy}`, await pushed(p));
    // plain deep tap travels
    await reset(p); await mark(p);
    await t.tap(deep.x, deep.y); await sleep(60);
    C.ok('a deep map tap travels at once', (await pushed(p)) === `@${deep.cx},${deep.cy}`, await pushed(p));
    // 200 ms after a drawer closes
    await reset(p); await mark(p);
    await t.tap(...ctr('game')); await sleep(250);
    let s = await state(p);
    C.ok('GAME opens its drawer', s.drawer === 'game', s.drawer);
    await t.tap(...ctr('game'), { after: 0 });
    await sleep(20);
    await t.tap(deep.x, deep.y, { after: 0 });
    await sleep(60);
    s = await state(p);
    C.ok('a map tap within 200 ms of a drawer closing: swallowed', !s.drawer && !(await pushed(p)).includes('@') && has(s.log, 'closing'), { drawer: s.drawer, sent: await pushed(p), log: s.log });
    await sleep(300);
    await mark(p);
    await t.tap(deep.x, deep.y); await sleep(60);
    C.ok('after 200 ms the map tap travels', (await pushed(p)) === `@${deep.cx},${deep.cy}`, await pushed(p));
    // Fight armed: a map tap disarms and is consumed
    for (const [what, pt] of [['deep', deep], ['ring', ring]]) {
      if (!pt) continue;
      await reset(p); await mark(p);
      await t.tap(...ctr('combat')); await sleep(80);
      s = await state(p);
      C.ok(`COMBAT tap arms Fight (${what})`, s.armed, s.armed);
      await t.tap(pt.x, pt.y); await sleep(80);
      s = await state(p);
      C.ok(`Fight armed + ${what} map tap: disarmed, consumed`, !s.armed && !(await pushed(p)).includes('@') && has(s.log, 'disarm') && !s.preview, { armed: s.armed, sent: await pushed(p), log: s.log, preview: s.preview });
    }
    // armed, then the pad gives the direction: F and the direction together
    await reset(p); await mark(p);
    await t.tap(...ctr('combat')); await sleep(80);
    await t.tap(...ctr('pad_l')); await sleep(80);
    C.ok('Fight armed then →: Fl sent', (await pushed(p)) === 'Fl', await pushed(p));
    // a slide from a key that ends deep in the map never travels
    await reset(p); await mark(p);
    await t.slide(ctr('pad_l'), [deep.x, deep.y], { steps: 12 });
    await sleep(80);
    C.ok('a slide from a key onto the map: no travel', !(await pushed(p)).includes('@'), await pushed(p));
    // a pan that starts on the map pans, whatever it ends over
    await reset(p); await mark(p);
    const v0 = await p.evaluate(() => ({ x: globalThis.__tt.view.panX, y: globalThis.__tt.view.panY }));
    await t.slide([deep.x, deep.y], ctr('pad_l'), { steps: 12 });
    await sleep(80);
    const v1 = await p.evaluate(() => ({ x: globalThis.__tt.view.panX, y: globalThis.__tt.view.panY }));
    s = await state(p);
    C.ok('a pan from the map onto a key: no key, no travel', (await pushed(p)) === '' && s.downs.length === 0, { sent: await pushed(p), downs: s.downs, v0, v1 });
    await p.evaluate(() => { globalThis.__tt.view.panX = 0; globalThis.__tt.view.panY = 0; globalThis.__tt.renderMap(); });
  }
  // halo and seam with nothing open: swallowed (the sweep covers every point; one each here)
  if (swallowAt) {
    await reset(p); await mark(p);
    await t.tap(swallowAt.x, swallowAt.y); await sleep(60);
    const s = await state(p);
    C.ok('halo 10 dp off a key: swallowed, nothing sent', has(s.log, 'halo') && (await pushed(p)) === '' && s.downs.length === 0, { log: s.log, sent: await pushed(p), downs: s.downs });
    await popCheck('halo flash');
  }
  if (seamAt) {
    await reset(p); await mark(p);
    await t.tap(seamAt.x, seamAt.y); await sleep(60);
    const s = await state(p);
    C.ok('seam COMBAT|CONTEXT: swallowed, nothing armed', has(s.log, 'seam') && !s.armed && (await pushed(p)) === '' && !s.layer, { log: s.log, armed: s.armed, sent: await pushed(p) });
  }

  // ---------------- --More-- (the page's own more(), the core set aside) ----------------
  const moreUp = async () => {
    await p.evaluate(() => globalThis.__tt.more.begin());
    for (let i = 0; i < 40; i++) {
      if (await p.evaluate(() => globalThis.__tt.moreShown)) return true;
      await p.evaluate((i) => globalThis.__tt.more.put(`Test message ${i}: the quick brown fox jumps over the lazy dog near the fountain.`), i);
      await sleep(20);
    }
    return p.evaluate(() => globalThis.__tt.moreShown);
  };
  const moreEnd = async () => {
    for (let i = 0; i < 40 && await p.evaluate(() => globalThis.__tt.moreShown); i++) { await p.keyboard.press('Space'); await sleep(30); }
    await p.evaluate(() => globalThis.__tt.more.end());
    await sleep(50);
  };
  await p.evaluate(() => { globalThis.__swallowAll = false; });
  await reset(p);
  const morePts = [['deep map', deep], ['ring', ring], ['halo 8-12 dp', swallowAt], ['seam', seamAt], ['halo snap', snapAt]].filter(([, q]) => q);
  for (const [what, pt] of morePts) {
    const up = await moreUp();
    C.ok(`--More-- up (${what})`, up, up);
    if (!up) { await moreEnd(); continue; }
    if (what === 'deep map') { await popCheck('--More--'); await shot('more'); }
    await mark(p);
    await t.tap(pt.x, pt.y); await sleep(100);
    const s = await state(p);
    const sent = await pushed(p);
    const res = { sent, log: s.log, downs: s.downs, more: s.more, preview: s.preview };
    if (what === 'deep map' || what === 'ring') C.ok(`--More-- + ${what} tap: Space, no preview, no travel`, sent.startsWith(' ') && !sent.includes('@') && !s.preview && !has(s.log, 'ring'), res);
    else if (what === 'halo 8-12 dp') C.ok(`--More-- + ${what}: not swallowed`, !has(s.log, 'halo'), res);
    else if (what === 'seam') C.ok(`--More-- + ${what}: not swallowed`, !has(s.log, 'seam'), res);
    else C.ok(`--More-- + ${what}: snaps to ${pt.id}`, s.downs.includes(pt.id), res);
    notes.push({ tag, more: what, ...res });
    await moreEnd();
    await reset(p);
  }

  // ---------------- farlook: getpos takes the map tap as the spot ----------------
  const farlook = async (what, pt) => {
    await reset(p);
    await p.keyboard.press(';');
    let picking = false;
    for (let i = 0; i < 40 && !picking; i++) {
      await sleep(100);
      const q = await p.evaluate(() => ({ picking: globalThis.__tt.overlay.picking, modal: globalThis.__tt.modalOpen, more: globalThis.__tt.moreShown }));
      picking = q.picking;
      if (!picking && (q.modal || q.more)) await p.keyboard.press('Enter');   // the first getpos's tip
    }
    C.ok(`farlook (${what}): getpos up`, picking, picking);
    if (!picking) return;
    if (what === 'ring') { await popCheck('farlook'); await shot('farlook'); }
    await mark(p);
    await t.tap(pt.x, pt.y); await sleep(300);
    const s = await state(p);
    const sent = await pushed(p);
    const res = { sent, log: s.log, downs: s.downs, picking: s.picking, preview: s.preview };
    notes.push({ tag, farlook: what, ...res });
    if (what === 'halo 8-12 dp') C.ok(`farlook + ${what}: not swallowed`, !has(s.log, 'halo'), res);
    else C.ok(`farlook + ${what}: the tap picks the spot (a click), no preview`, sent.includes(`@${pt.cx},${pt.cy}`) && !s.preview && !has(s.log, 'ring'), res);
    // leave getpos and whatever it said
    if (await p.evaluate(() => globalThis.__tt.overlay.picking)) await p.keyboard.press('Escape');
    await resume(p);
  };
  // ---------------- a direction prompt: the map gives no direction, the halo still guards ----------------
  if (deep) {
    await reset(p);
    const hero0 = await p.evaluate(() => ({ ...globalThis.__tt.cursor }));
    await p.keyboard.press('Control+d');
    const asked = await waitFor(p, () => /direction/i.test(document.getElementById('msgband').innerText) || (globalThis.__tt.overlay.expectsDirection === true), null, 3000);
    C.ok('kick asks a direction', asked, await p.evaluate(() => document.getElementById('msgband').innerText.slice(0, 80)));
    if (asked) {
      await mark(p);
      await t.tap(deep.x, deep.y); await sleep(200);
      let s = await state(p);
      const still = await p.evaluate(() => /direction/i.test(document.getElementById('msgband').innerText));
      C.ok('direction prompt + map tap: nothing answered, no preview, no travel', still && !s.preview && !has(s.log, 'ring'), { still, sent: await pushed(p), log: s.log });
      if (swallowAt) {
        await mark(p);
        await t.tap(swallowAt.x, swallowAt.y); await sleep(100);
        s = await state(p);
        C.ok('direction prompt + halo 8-12 dp: swallowed', has(s.log, 'halo') && (await pushed(p)) === '', { log: s.log, sent: await pushed(p) });
      }
      await p.keyboard.press('Escape');
      await resume(p);
      const hero1 = await p.evaluate(() => ({ ...globalThis.__tt.cursor }));
      C.ok('direction prompt: the hero did not move', hero0.x === hero1.x && hero0.y === hero1.y, { hero0, hero1 });
    }
  }
  if (ring) await farlook('ring', ring);
  if (deep) await farlook('deep map', deep);
  if (swallowAt) await farlook('halo 8-12 dp', swallowAt);

  C.ok('console clean', p.errors.length === 0, p.errors.slice(0, 5));
  all.push(...C.list);
  await ctx.close();
}
await b.close();
writeJson(`states-${dpr}${only ? '-' + only : ''}.json`, { checks: all, popups: pops, notes });
for (const n of notes) console.log('note', JSON.stringify(n));
const f = all.filter((c) => !c.pass);
console.log(`states ${dpr}: ${all.length - f.length}/${all.length} pass`);
