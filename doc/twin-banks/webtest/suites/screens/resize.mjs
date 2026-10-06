// Resizing across the size classes' boundaries, 600 dp wide and 480 dp tall,
// with their 24 dp bands: one tier change each way at the right size, no
// flicker (every animation frame is logged), nothing lost (Fight armed, a
// drawer open, the panels' content, the game), the layout at every step equal
// to layout() given the tiers drawn before; and with a finger held down, no
// re-layout until it lifts.  Then the phone sizes after a tablet's: unchanged.
//   node resize.mjs <dpr>
import { launch, newCtx, openPage, resume, settle, sleep, Checks, SHOTS, writeJson, r1 } from './common.mjs';
import { expected, readPage, near, maxDiff } from './lib.mjs';

const dpr = Number(process.argv[2] || 1);
const b = await launch();
const all = [];
const SCREEN = { width: 2560, height: 1440 };   // a monitor: the windows never fill it, so no budget applies

// every frame: what is drawn, logged when it changes
const FRAMES = () => {
  globalThis.__frames = [];
  let last = '';
  const tick = () => {
    try {
      const d = document.documentElement.dataset, keys = document.querySelectorAll('#keys [data-tw]').length;
      const pb = document.querySelector('#keys [data-tw="pad_b"] > .kcap');
      const r = pb ? pb.getBoundingClientRect() : null;
      const pan = [...document.querySelectorAll('.rhpanel')].map((e) => `${e.dataset.kind}:${e.style.display === 'none' || !e.isConnected ? 0 : 1}:${e.querySelector('.pbody').children.length > 0 ? 'f' : 'e'}`).join(',');
      const T = globalThis.__ts && globalThis.__ts.view ? globalThis.__ts.view.T : null;
      const rec = `${innerWidth}x${innerHeight} ${d.ui} ${d.tier} k${keys} ${r ? `${Math.round(r.x)},${Math.round(r.bottom)}` : '-'} ${pan} T${T}`;
      if (rec !== last) { globalThis.__frames.push({ t: performance.now(), rec, W: innerWidth, H: innerHeight, ui: d.ui, tier: d.tier, keys, pan, T }); last = rec; }
    } catch (e) { /* not yet */ }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

// The window resized with the screen kept a monitor's (Playwright's
// setViewportSize would make the screen the window's size too, and every
// window would then fill its screen, as a device turned does, and teach the budget).
async function open(w, h, touch) {
  const ctx = await newCtx(b, { w, h, dpr, touch, screen: SCREEN });
  await ctx.addInitScript(FRAMES);
  const p = await openPage(ctx);
  const cdp = await ctx.newCDPSession(p);
  p.resizeTo = (W, H) => cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: dpr, mobile: touch,
    screenWidth: SCREEN.width, screenHeight: SCREEN.height });
  // a screenshot through the same session: page.screenshot() would put back
  // the context's own viewport for a moment, a resize of its own
  p.shot = async (path) => { const r = await cdp.send('Page.captureScreenshot', { format: 'png' }); (await import('node:fs')).writeFileSync(path, Buffer.from(r.data, 'base64')); };
  await p.resizeTo(w, h);
  await resume(p);
  await sleep(500);
  return { ctx, p, cdp };
}
const state = (p) => p.evaluate(() => {
  const R = globalThis.__ts, o = R.overlay;
  return { armed: o.armed ? o.armed.key || o.armed.word : null, drawer: o.drawerOpen, hist: R.history.length, tier: document.documentElement.dataset.tier,
    ui: document.documentElement.dataset.ui, hp: (document.getElementById('statband').innerText.match(/HP:\S+/) || [''])[0],
    T: (document.getElementById('statband').innerText.match(/T:\d+/) || [''])[0], inv: R.invMenu ? R.invMenu.items.length : -1 };
});
// the page against layout() given the tiers it drew before
async function matches(p, prev) {
  const s = await readPage(p);
  const E = expected(s.W, s.H, { screen: { w: SCREEN.width, h: SCREEN.height }, prev });
  if (!E.usable) return { ok: s.ui === 'classic', s, E, why: 'unusable' };
  let worst = 0;
  const bad = [];
  for (const c of E.spec.controls) {
    if (c.behind) continue;
    const k = s.keys[c.id];
    if (!k) { bad.push(`${c.id} missing`); continue; }
    const d = maxDiff(c, k); worst = Math.max(worst, d);
    if (d > 0.1) bad.push(`${c.id} ${r1(c)} vs ${r1(k)}`);
  }
  const shown = s.panels.filter((q) => q.vis).map((q) => q.kind).sort().join(',');
  const want = E.spec.chrome.map((c) => (/^panel: inventory/.test(c.name) ? 'inventory' : /^panel: message log/.test(c.name) ? 'log' : null)).filter(Boolean).sort().join(',');
  if (shown !== want) bad.push(`panels ${shown} vs ${want}`);
  if (s.tier !== E.info.tier) bad.push(`tier ${s.tier} vs ${E.info.tier}`);
  return { ok: !bad.length && s.ui === 'twin', s, E, bad, worst, next: { tier: E.info.tier, cellTier: E.info.DC?.tier } };
}

// A drag of the window's edge: a step of 2 px every other frame or so.
async function drag(p, C, label, pts, prev0) {
  await p.evaluate(() => { globalThis.__frames = []; });
  let prev = prev0, firstChange = null, tier0 = (await state(p)).tier;
  const mism = [];
  for (const [w, h] of pts) {
    await p.resizeTo(w, h);
    await sleep(40);
  }
  await sleep(400);
  // the frames: tier changes, classic frames, empty frames
  const frames = await p.evaluate(() => globalThis.__frames);
  const changes = [];
  for (let i = 1; i < frames.length; i++) if (frames[i].tier !== frames[i - 1].tier || frames[i].ui !== frames[i - 1].ui) changes.push(`${frames[i].W}x${frames[i].H} ${frames[i - 1].ui}/${frames[i - 1].tier} -> ${frames[i].ui}/${frames[i].tier}`);
  const classic = frames.filter((f) => f.ui !== 'twin');
  const empty = frames.filter((f) => f.keys < 30);
  // the drawn cell along a one-way drag: it may step, but never turn back
  const Ts = frames.map((f) => f.T).filter((t) => t != null);
  let dir = 0, reversals = [];
  for (let i = 1; i < Ts.length; i++) { const d = Math.sign(Ts[i] - Ts[i - 1]); if (d && dir && d !== dir) reversals.push(`${frames[i].W}x${frames[i].H}: ${Ts[i - 1]} -> ${Ts[i]}`); if (d) dir = d; }
  // a panel blank (shown with no content) in any frame
  const blank = frames.filter((f) => /:1:e/.test(f.pan));
  return { frames, changes, classic, empty, reversals, blank, Ts: [...new Set(Ts)] };
}

// ---- 1. a mouse drags the window across 600 dp wide and back, at 900 tall
for (const input of ['mouse', 'touch']) {
  const tag = `${input}@${dpr}`;
  const C = new Checks(`resize-${tag}`);
  const { ctx, p } = await open(700, 900, input === 'touch');
  let st0 = await state(p);
  C.ok('starts as a tablet', st0.tier === 'tablet', st0);
  // Fight armed (a click or tap on COMBAT) and kept across every re-layout
  const s0 = await readPage(p);
  const cb = s0.keys.combat;
  if (input === 'touch') await p.touchscreen.tap(cb.x + cb.w / 2, cb.y + cb.h / 2); else await p.mouse.click(cb.x + cb.w / 2, cb.y + cb.h / 2);
  await sleep(400);
  st0 = await state(p);
  C.ok('Fight armed', !!st0.armed, st0.armed);
  const histBefore = st0.hist;
  // width: 700 -> 540, then 540 -> 700, 2 px a step
  const down = [], up = [];
  for (let w = 698; w >= 540; w -= 2) down.push([w, 900]);
  for (let w = 542; w <= 700; w += 2) up.push([w, 900]);
  const d1 = await drag(p, C, 'narrower', down);
  C.ok('narrower: one tier change, at 574 (under 576)', d1.changes.length === 1 && /^57[45]x900 twin\/tablet -> twin\/phone/.test(d1.changes[0]), d1.changes);
  C.ok('narrower: the drawn cell never turns back; no panel shown blank', !d1.reversals.length && !d1.blank.length, { reversals: d1.reversals.slice(0, 4), blank: d1.blank.slice(0, 3).map((f) => f.rec), cells: d1.Ts });
  C.ok('narrower: no classic frame, no frame without its keys', !d1.classic.length && !d1.empty.length, { classic: d1.classic.slice(0, 3), empty: d1.empty.slice(0, 3) });
  let m = await matches(p, { tier: 'phone', cellTier: null });
  C.ok('at 540x900: the layout is layout()\'s (phone)', m.ok, m.bad);
  let st = await state(p);
  C.ok('narrower: Fight still armed, nothing lost', st.armed === st0.armed && st.hist >= histBefore && st.T === st0.T && st.hp === st0.hp, { st0, st });
  await p.shot(`${SHOTS}/resize-${tag}-540x900.png`);
  const d2 = await drag(p, C, 'wider', up);
  C.ok('wider: one tier change, at 624 (not before)', d2.changes.length === 1 && /^62[45]x900 twin\/phone -> twin\/tablet/.test(d2.changes[0]), d2.changes);
  C.ok('wider: the drawn cell never turns back; no panel shown blank', !d2.reversals.length && !d2.blank.length, { reversals: d2.reversals.slice(0, 4), blank: d2.blank.slice(0, 3).map((f) => f.rec), cells: d2.Ts });
  C.ok('wider: no classic frame, no frame without its keys', !d2.classic.length && !d2.empty.length, { classic: d2.classic.slice(0, 3), empty: d2.empty.slice(0, 3) });
  m = await matches(p, { tier: 'tablet', cellTier: 'tablet' });
  C.ok('back at 700x900: the layout is layout()\'s (tablet)', m.ok, m.bad);
  st = await state(p);
  C.ok('wider: Fight still armed, nothing lost', st.armed === st0.armed && st.hist >= histBefore && st.T === st0.T, { st0, st });
  const back = await readPage(p);
  const inv = back.panels.find((q) => q.kind === 'inventory' && q.vis), log = back.panels.find((q) => q.kind === 'log' && q.vis);
  C.ok('the panels show their content again', inv && inv.lines.length >= 6 && log && log.lines.length === back.history.length,
    { inv: inv && inv.lines.length, log: log && log.lines.length, hist: back.history.length });
  // jitter within the band: 590..610 (tablet stays), then from phone 590..610 (phone stays)
  const jit = [];
  for (let i = 0; i < 6; i++) { jit.push([610, 900], [590, 900], [580, 900], [600, 900]); }
  const d3 = await drag(p, C, 'jitter', [[620, 900], ...jit, [620, 900]]);
  C.ok('jitter 580..620 from a tablet: no tier change', !d3.changes.length, d3.changes);
  await p.resizeTo(560, 900); await sleep(400);
  const d4 = await drag(p, C, 'jitter2', [...jit]);
  C.ok('jitter 580..610 from a phone: no tier change', !d4.changes.length, d4.changes);
  // height: 1000x600 -> 1000x420 and back
  await p.resizeTo(1000, 600); await sleep(500);
  const hdown = [], hup = [];
  for (let h = 598; h >= 420; h -= 2) hdown.push([1000, h]);
  for (let h = 422; h <= 600; h += 2) hup.push([1000, h]);
  const d5 = await drag(p, C, 'shorter', hdown);
  C.ok('shorter: one tier change, under 456', d5.changes.length === 1 && /^1000x45[45] twin\/tablet -> twin\/phone/.test(d5.changes[0]), d5.changes);
  C.ok('shorter: the drawn cell never turns back; no panel shown blank', !d5.reversals.length && !d5.blank.length, { reversals: d5.reversals.slice(0, 4), blank: d5.blank.slice(0, 3).map((f) => f.rec), cells: d5.Ts });
  C.ok('shorter: no classic frame, no frame without its keys', !d5.classic.length && !d5.empty.length, { classic: d5.classic.slice(0, 3) });
  m = await matches(p, { tier: 'phone', cellTier: 'phone' });
  C.ok('at 1000x420: the layout is layout()\'s', m.ok, m.bad);
  await p.shot(`${SHOTS}/resize-${tag}-1000x420.png`);
  const d6 = await drag(p, C, 'taller', hup);
  C.ok('taller: one tier change, at 504', d6.changes.length === 1 && /^1000x50[45] twin\/phone -> twin\/tablet/.test(d6.changes[0]), d6.changes);
  C.ok('taller: the drawn cell never turns back; no panel shown blank', !d6.reversals.length && !d6.blank.length, { reversals: d6.reversals.slice(0, 4), blank: d6.blank.slice(0, 3).map((f) => f.rec), cells: d6.Ts });
  C.ok('taller: no classic frame, no frame without its keys', !d6.classic.length && !d6.empty.length, { classic: d6.classic.slice(0, 3) });
  m = await matches(p, { tier: 'tablet', cellTier: 'tablet' });
  C.ok('back at 1000x600: the layout is layout()\'s', m.ok, m.bad);
  st = await state(p);
  C.ok('after all: Fight still armed, nothing lost', st.armed === st0.armed && st.T === st0.T && st.hist >= histBefore, { st0, st });
  // disarm (a second COMBAT tap) and open the MENU drawer, then cross a boundary
  const sk = await readPage(p);
  const tapK = async (k) => { if (input === 'touch') await p.touchscreen.tap(k.x + k.w / 2, k.y + k.h / 2); else await p.mouse.click(k.x + k.w / 2, k.y + k.h / 2); await sleep(400); };
  await tapK(sk.keys.combat);
  await settle(p);
  await tapK(sk.keys.world);
  st = await state(p);
  C.ok('WORLD drawer open', !!st.drawer, st);
  await drag(p, C, 'drawer', [[1000, 560], [1000, 500], [1000, 450], [1000, 440]]);
  st = await state(p);
  const dr = await p.evaluate(() => { const o = globalThis.__ts.overlay; const e = o.drawerEl && o.drawerEl.querySelector('.panel'); const r = e && e.getBoundingClientRect(); const m = o.twin.spec.mapArea;
    return { open: o.drawerOpen, r: r && { x: r.x, y: r.y, w: r.width, h: r.height }, map: m }; });
  C.ok('the drawer stays open across the change to phone, inside the map area', st.tier === 'phone' && !!dr.open && dr.r && dr.r.x >= dr.map.x - 1 && dr.r.y >= dr.map.y - 1 && dr.r.x + dr.r.w <= dr.map.x + dr.map.w + 1 && dr.r.y + dr.r.h <= dr.map.y + dr.map.h + 1, dr);
  await p.shot(`${SHOTS}/resize-${tag}-drawer-1000x440.png`);
  await p.keyboard.press('Escape'); await sleep(300); await settle(p);
  C.ok('no console errors', !p.errors.length, p.errors.slice(0, 5));
  all.push(...C.list);
  await ctx.close();
}

// ---- 2. a finger held on the glass: no re-layout under it
{
  const C = new Checks(`held@${dpr}`);
  const { ctx, p, cdp } = await open(700, 900, true);
  const tch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const metrics = (w, h) => cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: true, screenWidth: SCREEN.width, screenHeight: SCREEN.height });
  const s0 = await readPage(p);
  const m0 = s0.spec.mapArea;
  const x = m0.x + m0.w / 2, y = m0.y + m0.h / 2;
  await tch('touchStart', [{ x, y }]);
  for (let i = 1; i <= 5; i++) { await tch('touchMove', [{ x: x + i * 8, y }]); await sleep(16); }
  await metrics(560, 900);
  await sleep(700);
  const held = await readPage(p);
  C.ok('finger down: still the tablet layout, keys where they were', held.tier === 'tablet' && JSON.stringify(held.spec.controls) === JSON.stringify(s0.spec.controls), { tier: held.tier, W: held.W });
  await tch('touchEnd', []);
  await sleep(700);
  const after = await readPage(p);
  C.ok('lifted: the phone layout', after.tier === 'phone' && after.W === 560, { tier: after.tier, W: after.W });
  const m = await matches(p, { tier: 'phone', cellTier: null });
  C.ok('lifted: layout()\'s', m.ok, m.bad);
  // and back, a finger held through it
  await tch('touchStart', [{ x: 100, y: 300 }]);
  for (let i = 1; i <= 5; i++) { await tch('touchMove', [{ x: 100 + i * 8, y: 300 }]); await sleep(16); }
  await metrics(700, 900);
  await sleep(700);
  const held2 = await readPage(p);
  C.ok('finger down: still the phone layout', held2.tier === 'phone', held2.tier);
  await tch('touchEnd', []);
  await sleep(700);
  const after2 = await readPage(p);
  C.ok('lifted: the tablet layout again', after2.tier === 'tablet' && after2.W === 700, { tier: after2.tier, W: after2.W });
  C.ok('no console errors', !p.errors.length, p.errors.slice(0, 5));
  all.push(...C.list);
  await ctx.close();
}

// ---- 3. a window that grows from a phone's to a monitor's and back: the
// phone layout it ends at is the phone layout it started with
{
  const C = new Checks(`roundtrip@${dpr}`);
  const { ctx, p } = await open(896, 443, false);
  const a = await readPage(p);
  for (const [w, h] of [[1200, 700], [1920, 1080], [2560, 1400], [1366, 768], [896, 443]]) { await p.resizeTo(w, h); await sleep(500); }
  const z = await readPage(p);
  const diff = Object.keys(a.keys).filter((id) => !near(a.keys[id], z.keys[id], 0.05));
  C.ok('896x443 after a monitor\'s sizes: every key where it was', a.tier === 'phone' && z.tier === 'phone' && !diff.length, diff);
  C.ok('896x443 after: the same map area and bands', near(a.spec.mapArea, z.spec.mapArea, 1e-6) && a.spec.bands.every((bd, i) => near(bd, z.spec.bands[i], 1e-6)));
  C.ok('no console errors', !p.errors.length, p.errors.slice(0, 5));
  all.push(...C.list);
  await ctx.close();
}

writeJson(`resize-${dpr}.json`, all);
console.log(`\nresize dpr ${dpr}: ${all.filter((c) => c.pass).length} pass, ${all.filter((c) => !c.pass).length} fail`);
for (const f of all.filter((c) => !c.pass)) console.log(`  FAIL ${f.tag} ${f.name}`);
await b.close();
