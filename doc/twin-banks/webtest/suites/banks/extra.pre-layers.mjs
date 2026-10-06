// Edge cases around the stage: the settings that feed layout(), the window
// with no room (classic fallback), rebuilds held while a finger is down or a
// field has focus, what a turn keeps (a layer, Long rest, counts), the twin
// rc line reaching the game (T asks), the MORE lamp's place, the mouse dock,
// and what a pinch in twin writes.
//   node extra.mjs -> extra.json, shots/extra-*.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, writeJson, evs, clearEvs, ctlRect } from './common.mjs';

const b = await launch();
const results = [];
async function fresh(w, h, prefs = {}, opts = {}) {
  const ctx = await newCtx(b, { w, h, screen: opts.screen || (h > w ? { width: w, height: h } : { width: h, height: w }), touch: opts.touch !== false, prefs: { budgets: {}, ...prefs } });
  const p = await openPage(ctx);
  await resume(p);
  const k = await touch(ctx, p);
  await clearEvs(p);
  return { ctx, p, k };
}
async function test(name, env, fn) {
  let ok = false, detail = '';
  try { const r = await fn(); ok = r.ok; detail = r.detail; } catch (e) { detail = `threw: ${e.stack.split('\n').slice(0, 2).join(' ')}`; }
  const shot = `${SHOTS}/extra-${name}.png`;
  try { await env.k.shot(shot); } catch (e) { /* gone */ }
  results.push({ name, ok, detail, shot, errors: [...env.p.errors] });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}${env.p.errors.length ? ` CONSOLE ERRORS: ${env.p.errors.join(' | ')}` : ''}`);
}
async function settle(p, ms = 3000) {
  const t0 = Date.now(); let ok = 0;
  while (Date.now() - t0 < ms) {
    const s = await p.evaluate(() => ({ w: globalThis.__bt.waiting, q: globalThis.__bt.queue }));
    if (s.w && !s.q) { if (++ok >= 3) return; } else ok = 0;
    await sleep(80);
  }
}
const msg = (p) => p.evaluate(() => document.getElementById('msgband').innerText.replace(/\s+/g, ' ').trim());

// every key's DOM rect against layout() with settings derived here
async function compare(p, W, H, pointer, budget, extra) {
  return p.evaluate(async ({ W, H, pointer, budget, extra }) => {
    const L = await import('./layout.js');
    const t = L.textMetrics({ msgFont: extra.msgFont || 'atkinson', msgSize: extra.msgSize || 1, textScale: 1, xHeight: 9.5 });
    const statusH = { hidden: 0, compact: 48 - 13.5 }[extra.statusLines] ?? 48;
    const r = L.layout(W, H, pointer, { padKey: extra.padCell || 58, budget, sideInsets: budget && budget.l ? { l: 0, r: 0 } : null, insets: { l: 0, r: 0, t: 0, b: 0 }, msgRowH: t.msgRowH, statusH, mapCell: extra.mapCell === 'rows' ? 'rows' : 'columns' });   // the page's inputs since the header stage (2026-10-02): the header where the rule puts it
    const O = globalThis.__bt.overlay, bad = [];
    if (!O.twin) return { bad: [`not twin (${O.twinFallback})`] };
    let worst = 0;
    const keys = [];
    for (const c of r.spec.controls) {
      if (c.behind) continue;
      const e = document.querySelector(`[data-tw="${c.id}"]`);
      if (!e) { bad.push(`${c.id} missing`); continue; }
      const d = e.getBoundingClientRect();
      const dev = Math.max(Math.abs(d.x - c.x), Math.abs(d.y - c.y), Math.abs(d.width - c.w), Math.abs(d.height - c.h));
      worst = Math.max(worst, dev);
      if (dev > 0.5) bad.push(`${c.id} DOM ${d.x.toFixed(1)},${d.y.toFixed(1)} ${d.width.toFixed(1)}x${d.height.toFixed(1)} vs ${c.x.toFixed(1)},${c.y.toFixed(1)} ${c.w.toFixed(1)}x${c.h.toFixed(1)}`);
      keys.push(d);
    }
    const over = (a, q) => a.x + 0.01 < q.x + q.width && q.x + 0.01 < a.x + a.width && a.y + 0.01 < q.y + q.height && q.y + 0.01 < a.y + a.height;
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) if (over(keys[i], keys[j])) bad.push(`keys ${i} and ${j} overlap`);
    const cv = document.getElementById('map').getBoundingClientRect(), A = r.spec.mapArea;
    // (out by under a device pixel where only that holds the level: web.js layoutTwinGlass, the header stage)
    const dp = 1 / devicePixelRatio + 0.02;
    if (cv.x < A.x - dp || cv.y < A.y - dp || cv.right > A.x + A.w + dp || cv.bottom > A.y + A.h + dp) bad.push('canvas outside the map area');
    for (const k of keys) if (over(k, cv)) bad.push('canvas under a key');
    for (const id of ['msgband', 'statband']) {
      const e = document.getElementById(id); if (getComputedStyle(e).display === 'none') continue;
      const q = e.getBoundingClientRect(); for (const k of keys) if (over(k, q)) { bad.push(`${id} over a key`); break; }
    }
    return { bad, worst, fit: r.spec.fit.level, pad: r.spec.fit.pad, usable: r.usable, pageSettings: { padKey: O.twin.settings.padKey, msgRowH: O.twin.settings.msgRowH, statusH: O.twin.settings.statusH } };
  }, { W, H, pointer, budget, extra });
}

// ---- A. the settings that are inputs to the rule, both orientations
for (const extra of [{ padCell: 46 }, { padCell: 52 }, { msgSize: 1.4 }, { msgFont: 'screen', msgSize: 1.2 }, { statusLines: 'compact' }, { statusLines: 'hidden' }, { case: false }]) {
  const name = Object.entries(extra).map(([k, v]) => `${k}=${v}`).join(',');
  const env = await fresh(896, 443, extra);
  await test(`settings-${name}`, env, async () => {
    const a = await compare(env.p, 896, 443, 'touch', { w: 443, h: 443, l: 896 }, extra);
    await env.k.rotate(443, 939, 1, [443, 939]);
    const c = await compare(env.p, 443, 939, 'touch', { w: 443, h: 443, l: 896 }, extra);
    return { ok: !a.bad.length && !c.bad.length, detail: `landscape ${a.fit} pad ${a.pad} worst ${a.worst?.toFixed(3)} ${a.bad.slice(0, 3).join('; ')} | portrait ${c.fit} worst ${c.worst?.toFixed(3)} ${c.bad.slice(0, 3).join('; ')} | page ${JSON.stringify(a.pageSettings)}` };
  });
  await env.ctx.close();
}

// ---- B. no room for twin banks: classic for the window, the setting kept
{
  const env = await fresh(443, 460, {}, { screen: { width: 443, height: 939 } });
  await test('split-443x460-falls-back', env, async () => {
    const s0 = await env.p.evaluate(() => ({ ui: document.documentElement.dataset.ui, pref: localStorage.getItem('rh.layout'), twin: !!globalThis.__bt.overlay.twin, why: globalThis.__bt.overlay.twinFallback,
      keys: [...document.querySelectorAll('#keys .k')].filter((e) => e.offsetParent).length }));
    await env.k.shot(`${SHOTS}/extra-443x460-classic.png`);
    await env.k.rotate(443, 939, 1, [443, 939]);
    const s1 = await env.p.evaluate(() => ({ ui: document.documentElement.dataset.ui, twin: !!globalThis.__bt.overlay.twin }));
    const c = await compare(env.p, 443, 939, 'touch', { w: 443, h: 363 + 80, l: 939 }, {});
    return { ok: s0.ui === 'classic' && !s0.twin && s0.pref !== '"classic"' && s0.keys > 30 && s1.ui === 'twin' && s1.twin, detail: `443x460: ${JSON.stringify(s0)}; grown to 443x939: ${JSON.stringify(s1)} (rects ${c.bad.length ? c.bad.slice(0, 2).join('; ') : 'match'})` };
  });
  await env.ctx.close();
}

// ---- B2. a first visit in a portrait window shorter than the screen (split
// screen, a touch laptop's narrow window): the page estimates the landscape
// height as short side - (long side - window height); the pad must stay 58
for (const [w, h, sw, sh, why] of [[412, 600, 412, 915, 'phone-split-2of3'], [443, 640, 443, 939, 'lucas-split-2of3'], [500, 700, 1366, 768, 'touch-laptop-narrow']]) {
  const env = await fresh(w, h, {}, { screen: { width: sw, height: sh } });
  await test(`first-visit-${why}-${w}x${h}`, env, async () => {
    const s = await env.p.evaluate(() => { const o = globalThis.__bt.overlay, t = o.twin;
      const pad = document.querySelector('[data-tw="pad_b"]'), r = pad && pad.getBoundingClientRect();
      return { ui: document.documentElement.dataset.ui, budget: t && t.settings.budget, fit: t && t.spec.fit.level, pad: t && t.spec.fit.pad, padDom: r ? `${r.width.toFixed(1)}x${r.height.toFixed(1)}` : null,
        reason: t && t.spec.fit.reasons[0], stored: JSON.parse(localStorage.getItem('rh.budgets') || '{}') }; });
    const ok = s.ui === 'twin' ? s.pad >= 46 && s.fit !== 'degraded' : s.ui === 'classic';
    return { ok, detail: `screen ${sw}x${sh}, window ${w}x${h}: ${s.ui}, budget ${JSON.stringify(s.budget)}, ${s.fit}, pad ${s.pad && s.pad.toFixed(2)} dp (DOM ${s.padDom}); "${s.reason || ''}"` };
  });
  await env.ctx.close();
}

// ---- C. a turn while a finger is down waits for the lift
{
  const env = await fresh(896, 443);
  await test('turn-waits-for-finger', env, async () => {
    const r = await ctlRect(env.p, 'pad_l');
    await env.k.down(r.cx, r.cy);
    await sleep(100);
    await env.k.rotate(443, 939, 1, [443, 939]);
    await sleep(500);
    const held = await env.p.evaluate(() => ({ W: globalThis.__bt.overlay.twin.W, r: document.querySelector('[data-tw="pad_l"]').getBoundingClientRect().toJSON() }));
    await env.k.up();
    await sleep(700);
    const after = await env.p.evaluate(() => ({ W: globalThis.__bt.overlay.twin.W, H: globalThis.__bt.overlay.twin.H }));
    const e = (await evs(env.p)).map((q) => (q.key !== undefined ? String.fromCharCode(q.key) : 'click')).join('');
    return { ok: held.W === 896 && Math.abs(held.r.x - r.x) < 0.5 && after.W === 443 && after.H === 939, detail: `finger down through the turn: still laid out ${held.W} wide, → at ${held.r.x.toFixed(0)},${held.r.y.toFixed(0)}; lifted: ${after.W}x${after.H}; sent "${e}"` };
  });
  await env.ctx.close();
}

// ---- D. a turn keeps a layer open, Long rest swiped in, a count row, an assignment
{
  const env = await fresh(896, 443);
  const { p, k } = env;
  await test('turn-keeps-combat-layer', env, async () => {
    const r = await ctlRect(p, 'combat');
    await k.tap(r.cx, r.cy, 520);
    await sleep(100);
    await k.rotate(443, 939, 1, [443, 939]);
    const s = await p.evaluate(() => { const o = globalThis.__bt.overlay, pill = document.querySelector('#keys > .layerpill');
      const pr = pill.getBoundingClientRect(), A = o.twin.spec.mapArea;
      return { W: o.twin.W, fan: o.fanOpen, pill: pill.classList.contains('on'), pillIn: pr.x >= A.x - 0.5 && pr.y >= A.y - 0.5 && pr.right <= A.x + A.w + 0.5 && pr.bottom <= A.y + A.h + 0.5,
        h: document.querySelector('[data-tw="pad_h"]').innerText.replace(/\s+/g, ' '), scrim: document.getElementById('scrim').classList.contains('on') }; });
    await clearEvs(p);
    const h = await ctlRect(p, 'pad_h');
    await k.tap(h.cx, h.cy);
    await settle(p);
    const m = await msg(p);
    await p.keyboard.press('Escape'); await settle(p);
    await k.rotate(896, 443, 1, [939, 443]);
    return { ok: s.W === 443 && s.fan === 'fight' && s.pill && s.pillIn && /kick/i.test(s.h) && /direction/i.test(m), detail: `${JSON.stringify(s)}; Kick from the turned layer: "${m.slice(0, 30)}"` };
  });
  await test('turn-keeps-longrest-revealed', env, async () => {
    const r = await ctlRect(p, 'rest');
    await k.swipe(r.cx, r.cy + 15, 0, -45, 10);
    await sleep(300);
    const before = await p.evaluate(() => globalThis.__bt.overlay.restWell.revealed);
    await k.rotate(443, 939, 1, [443, 939]);
    const s = await p.evaluate(() => { const o = globalThis.__bt.overlay, lf = o.longFace.el.getBoundingClientRect(), sl = o.restWell.slot.getBoundingClientRect();
      return { W: o.twin.W, revealed: o.restWell.revealed, inSlot: Math.abs(lf.x - sl.x) < 0.5 && Math.abs(lf.y - sl.y) < 0.5 }; });
    await k.rotate(896, 443, 1, [939, 443]);
    return { ok: before && s.W === 443 && s.revealed && s.inSlot, detail: `revealed before ${before}; after the turn ${JSON.stringify(s)}` };
  });
  await test('turn-keeps-count-row', env, async () => {
    const r = await ctlRect(p, 'search');
    await k.tap(r.cx, r.cy, 450);
    await sleep(150);
    const before = await p.evaluate(() => globalThis.__bt.overlay.chipsOpen);
    await k.rotate(443, 939, 1, [443, 939]);
    const s = await p.evaluate(() => { const o = globalThis.__bt.overlay, A = o.twin.spec.mapArea;
      const rows = [...document.querySelectorAll('#keys .chiprow')].filter((e) => getComputedStyle(e).display !== 'none' && e.offsetParent);
      const rr = rows.map((e) => e.getBoundingClientRect()).map((q) => ({ x: q.x, y: q.y, w: q.width, h: q.height, in: q.x >= A.x - 0.5 && q.y >= A.y - 0.5 && q.right <= A.x + A.w + 0.5 && q.bottom <= A.y + A.h + 0.5 }));
      return { W: o.twin.W, chips: o.chipsOpen, rows: rr }; });
    await k.tap(5, 5); await sleep(150);
    await k.rotate(896, 443, 1, [939, 443]);
    return { ok: !!before && s.chips === before && s.rows.length === 1 && s.rows[0].in, detail: `SEARCH counts open "${before}"; after the turn ${JSON.stringify(s)}` };
  });
  await test('turn-keeps-pin-assignment', env, async () => {
    const r = await ctlRect(p, 'pin1');
    await k.tap(r.cx, r.cy);
    await sleep(250);
    const before = await p.evaluate(() => ({ d: globalThis.__bt.overlay.drawerOpen, a: !!globalThis.__bt.overlay.assigning }));
    await k.rotate(443, 939, 1, [443, 939]);
    const s = await p.evaluate(() => ({ W: globalThis.__bt.overlay.twin.W, d: globalThis.__bt.overlay.drawerOpen, a: !!globalThis.__bt.overlay.assigning, fill: globalThis.__bt.overlay.fill && globalThis.__bt.overlay.fill.n }));
    // pick its first item; PIN 1 should take it
    const it = await p.evaluate(() => { const e = globalThis.__bt.overlay.drawerGrid.querySelector('.k'); const q = e.getBoundingClientRect(); return { x: q.x + q.width / 2, y: q.y + q.height / 2, t: e.innerText.replace(/\s+/g, ' ') }; });
    await k.tap(it.x, it.y);
    await sleep(300);
    const label = (await ctlRect(p, 'pin1')).text;
    await k.rotate(896, 443, 1, [939, 443]);
    return { ok: before.a && s.W === 443 && s.d === before.d && s.a && label !== '+ TAP TO FILL' && !/tap to fill/i.test(label), detail: `before ${JSON.stringify(before)}; turned ${JSON.stringify(s)}; picked "${it.t}" -> PIN 1 shows "${label}"` };
  });
  await env.ctx.close();
}

// ---- E. a field with the focus holds the layout too
{
  const env = await fresh(896, 443);
  const { p, k } = env;
  await test('turn-waits-for-text-field', env, async () => {
    const r = await ctlRect(p, 'flick');
    await k.swipe(r.cx, r.cy, 46, -38, 8);    // the empty up-right macro: its editor, with fields
    await sleep(400);
    const focused = await p.evaluate(() => { const i = document.querySelector('#formwrap input, #formwrap textarea'); if (!i) return false; i.focus(); return document.activeElement === i; });
    await k.rotate(443, 939, 1, [443, 939]);
    await sleep(600);
    const held = await p.evaluate(() => globalThis.__bt.overlay.twin.W);
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    await sleep(800);
    const after = await p.evaluate(() => globalThis.__bt.overlay.twin.W);
    await p.keyboard.press('Escape'); await sleep(200);
    return { ok: focused && held === 896 && after === 443, detail: `field focused ${focused}; through the turn laid out ${held} wide; after blur ${after}` };
  });
  // ---- F. the MORE lamp at the band's right end; G. T asks (paranoid_confirmation:+Remove, twin)
  await test('more-lamp-place', env, async () => {
    const s = await p.evaluate(() => { const m = document.getElementById('morelamp'), b = document.getElementById('msgband').getBoundingClientRect(), r = m && m.getBoundingClientRect();
      return r ? { lamp: r.toJSON(), band: b.toJSON(), shown: getComputedStyle(m).display !== 'none' } : null; });
    const ok = s && s.shown && s.lamp.right <= s.band.right + 0.5 && s.lamp.right >= s.band.right - 12 && s.lamp.y >= s.band.y - 0.5 && s.lamp.bottom <= s.band.bottom + 0.5;
    return { ok, detail: s ? `lamp ${s.lamp.x.toFixed(0)},${s.lamp.y.toFixed(0)} ${s.lamp.width}x${s.lamp.height} in band ${s.band.x.toFixed(0)}..${s.band.right.toFixed(0)}` : 'no #morelamp' };
  });
  await test('takeoff-asks-in-twin', env, async () => {
    const rc = await p.evaluate(() => globalThis.__bt.M.FS.readFile('/home/web_user/.nethackrc', { encoding: 'utf8' }));
    await clearEvs(p);
    const r = await ctlRect(p, 'eq_takeoff');
    await k.tap(r.cx, r.cy);
    await sleep(1200);
    const m = await p.evaluate(() => (globalThis.__bt.modalOpen ? `[window] ${document.getElementById('modal-title').textContent} ${document.getElementById('modal-body').innerText.replace(/\s+/g, ' ').slice(0, 60)}` : document.getElementById('msgband').innerText.replace(/\s+/g, ' ')));
    await p.keyboard.press('Escape'); await settle(p);
    const line = /^OPTIONS=paranoid_confirmation:\+Remove$/m.test(rc);
    return { ok: line && /what do you want to take off/i.test(m), detail: `rc line ${line ? 'present' : 'MISSING'}; T with one item worn: "${m.slice(0, 90)}"` };
  });
  // ---- H. a pinch in twin: does it write classic's zoom?
  await test('pinch-leaves-classic-zoom', env, async () => {
    const z0 = await p.evaluate(() => localStorage.getItem('rh.zoom'));
    const A = await p.evaluate(() => globalThis.__bt.overlay.twin.spec.mapArea);
    const cx = A.x + A.w / 2, cy = A.y + A.h / 2;
    const t = (type, pts) => k.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
    await t('touchStart', [{ x: cx - 30, y: cy, id: 1 }, { x: cx + 30, y: cy, id: 2 }]);
    for (let i = 1; i <= 10; i++) { await t('touchMove', [{ x: cx - 30 - i * 8, y: cy, id: 1 }, { x: cx + 30 + i * 8, y: cy, id: 2 }]); await sleep(20); }
    await t('touchEnd', []);
    await sleep(400);
    const z1 = await p.evaluate(() => localStorage.getItem('rh.zoom'));
    const T = await p.evaluate(() => ({ T: globalThis.__bt.view.T, cell: globalThis.__bt.overlay.twin.info.T }));
    return { ok: z1 === z0, detail: `classic's zoom pref ${z0} -> ${z1}; drawn cell ${T.T} (layout cell ${T.cell.toFixed(2)})` };
  });
  await env.ctx.close();
}

// ---- J. CONTEXT with several actions: its candidates open inside the map
for (const [w, h] of [[896, 443], [443, 939]]) {
  const env = await fresh(w, h);
  const { p, k } = env;
  await test(`context-candidates-${w}x${h}`, env, async () => {
    // on the up stairs with a closed door beside (stairs 0x04 | door 0x08), as
    // web.js's setHere reports it: Ascend and Open both apply
    await p.evaluate(() => globalThis.__bt.overlay.setHere(0x04 | 0x08, ''));
    await sleep(100);
    const n = await p.evaluate(() => globalThis.__bt.overlay.candidates.length);
    const r = await ctlRect(p, 'context');
    await k.tap(r.cx, r.cy);
    await sleep(250);
    const st = await p.evaluate(() => {
      const o = globalThis.__bt.overlay, A = o.twin.spec.mapArea;
      const keys = [...document.querySelectorAll('[data-tw]')].map((e) => ({ id: e.dataset.tw, r: e.getBoundingClientRect() })).filter((q) => q.r.width > 0 && !o.candEl.contains(document.querySelector(`[data-tw="${q.id}"]`)));
      const over = (a, b) => a.x + 0.5 < b.right && b.x + 0.5 < a.right && a.y + 0.5 < b.bottom && b.y + 0.5 < a.bottom;
      const cands = [...o.candEl.querySelectorAll('.k')].filter((e) => e.offsetParent).map((e) => ({ t: e.innerText.replace(/\s+/g, ' '), r: e.getBoundingClientRect() }));
      const bad = [];
      for (const c of cands) {
        if (c.r.x < A.x - 0.5 || c.r.y < A.y - 0.5 || c.r.right > A.x + A.w + 0.5 || c.r.bottom > A.y + A.h + 0.5) bad.push(`${c.t} outside the map`);
        for (const q of keys) if (over(c.r, q.r)) bad.push(`${c.t} over ${q.id}`);
      }
      return { open: o.candOpen, cands: cands.map((c) => c.t), bad };
    });
    await k.shot(`${SHOTS}/extra-context-candidates-${w}x${h}.png`);
    // run Open from the row
    const pick = await p.evaluate(() => { const e = [...globalThis.__bt.overlay.candEl.querySelectorAll('.k')].find((q) => /open/i.test(q.innerText)); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await clearEvs(p);
    if (pick) await k.tap(pick.x, pick.y);
    await settle(p);
    const e = (await evs(p)).map((q) => (q.key !== undefined ? String.fromCharCode(q.key) : 'click')).join('');
    await p.keyboard.press('Escape'); await settle(p);
    return { ok: n > 1 && st.open && st.cands.length > 1 && !st.bad.length && e === 'o', detail: `${n} candidates: ${st.cands.join(' / ')}; ${st.bad.length ? st.bad.join('; ') : 'inside the map, over no key'}; Open sent "${e}"` };
  });
  await env.ctx.close();
}

// ---- I. no touch at all: the mouse dock
for (const [w, h] of [[1366, 768], [1920, 1080]]) {
  const env = await fresh(w, h, {}, { touch: false, screen: { width: w, height: h } });
  await test(`mouse-dock-${w}x${h}`, env, async () => {
    const c = await compare(env.p, w, h, 'mouse', { w: h, h, l: w }, {});
    const c2 = c.bad.length ? await compare(env.p, w, h, 'mouse', null, {}) : null;
    return { ok: !c.bad.length || (c2 && !c2.bad.length), detail: `${c.fit} pad ${c.pad} worst ${c.worst?.toFixed(3)} ${c.bad.slice(0, 3).join('; ')}${c2 ? ` | without a budget: ${c2.bad.length ? c2.bad.slice(0, 3).join('; ') : 'match'}` : ''}` };
  });
  await env.ctx.close();
}

writeJson('extra.json', results);
const fails = results.filter((r) => !r.ok).length;
console.log(`${results.length - fails} of ${results.length} pass${fails ? `; FAILED: ${results.filter((r) => !r.ok).map((r) => r.name).join(', ')}` : ''}`);
await b.close();
