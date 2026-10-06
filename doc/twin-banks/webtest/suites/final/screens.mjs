// Every screen of the design's spec.json (design/v2/spec.json, the 15 scored
// screens), each in a new browser profile with a new game started on it:
//   node screens.mjs <dpr> [tag ...]
// A phone or tablet pair is played twice: begun in landscape and turned to
// portrait, and begun in portrait and turned to landscape, so each screen is
// seen fresh (the budget guessed) and after the device has shown both ways
// (the budget seen, as spec.json lays the pairs out).  The mouse screens get
// the touch tablet tier: desktop mode is deferred (Lucas, 2026-10-03).
// At every capture:
//  - a screenshot (shots/screen-<W>x<H>-<how>@<dpr>.png);
//  - the page's spec against layout() run here in node with the page's own
//    settings (exact), and against spec.json (0.5 dp, the node tests' tolerance);
//  - every keycap's DOM rect against the spec (max difference in CSS px);
//  - overlaps: keycap on keycap, keycap on the map canvas, a band or a panel;
//    anything off screen; a band, panel or the map inside a key's 12 dp halo;
//    a band on a panel; layout.js collisions();
//  - a tap at each keycap's centre reaches that key (elementFromPoint);
//  - the console: no error.
import fs from 'node:fs';
import { layout, collisions } from '/home/user/Rolehack/win/web/layout.js';
import { withClasses } from '/home/user/Rolehack/win/web/viewer.js';
import { launch, newCtx, openPage, newGame, touch, sleep, Checks, SHOTS, DIR, ov, gap, maxDiff, r1 } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const PICK = process.argv.slice(3);
const SPEC = JSON.parse(fs.readFileSync('/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/design/v2/spec.json', 'utf8')).screens;

// L, P: the windows; sL, sP: the device's screen in each orientation (Lucas's
// phone letterboxes 896 of its 939 for the cutout: its screen stays 939 long)
const PAIRS = [
  { tag: 'lucas', L: [896, 443], P: [443, 939], sL: [939, 443], sP: [443, 939] },
  { tag: 'small', L: [640, 360], P: [360, 640] },
  { tag: 'p412', L: [915, 412], P: [412, 915] },
  { tag: 'p390', L: [844, 390], P: [390, 844] },
  { tag: 'tab', L: [1024, 768], P: [768, 1024] },
];
const SINGLES = [
  { tag: 't1180', W: [1180, 820], touch: true, mobile: true },
  { tag: 'laptop', W: [1366, 768], touch: true, mobile: false },
  { tag: 'm1280', W: [1280, 800], touch: false, mobile: false },
  { tag: 'm1920', W: [1920, 1080], touch: false, mobile: false },
  { tag: 'm2560', W: [2560, 1440], touch: false, mobile: false },
];
const want = (tag) => !PICK.length || PICK.includes(tag);

const readPage = (p) => p.evaluate(() => {
  const R = globalThis.__ts, o = R.overlay, $ = (id) => document.getElementById(id);
  const rr = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const vis = (e) => { if (!e || !e.isConnected) return false; const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const keys = {};
  for (const e of document.querySelectorAll('#keys [data-tw]')) {
    const id = e.dataset.tw;
    if (id === 'rest') { const r = o.twinCapRect('rest'); keys[id] = { x: r.x, y: r.y, w: r.width, h: r.height, vis: true }; continue; }
    const cap = e.querySelector(':scope > .kcap');
    keys[id] = { ...rr(cap || e), cell: rr(e), vis: vis(e) };
  }
  const hits = {};
  for (const [id, k] of Object.entries(keys)) {
    if (id === 'longrest') continue;
    const t = document.elementFromPoint(k.x + k.w / 2, k.y + k.h / 2);
    const owner = t && t.closest('[data-tw]');
    hits[id] = owner ? owner.dataset.tw : (t ? `${t.tagName}#${t.id}.${t.className}` : null);
  }
  const panels = [...document.querySelectorAll('.rhpanel')].filter(vis).map((e) => ({ kind: e.dataset.kind, ...rr(e) }));
  const visRect = (e) => (e && vis(e) ? rr(e) : null);
  return {
    W: window.innerWidth, H: window.innerHeight, dpr: devicePixelRatio,
    ui: document.documentElement.dataset.ui, tier: document.documentElement.dataset.tier || null,
    spec: o.twin ? JSON.parse(JSON.stringify(o.twin.spec)) : null, settings: o.twin ? JSON.parse(JSON.stringify(o.twin.settings)) : null,
    used: o.twin ? o.twin.budget : null, classes: o.twinClasses ? { ...o.twinClasses } : null, fallback: o.twinFallback || null,
    T: o.twin ? o.twin.info.T : null, fill: o.twin ? { cols: o.twin.info.fill.cols, rows: o.twin.info.fill.rows, whole: !!o.twin.info.fill.whole } : null,
    keys, hits, panels, msgband: visRect($('msgband')), statband: visRect($('statband')), canvas: visRect($('map')),
    glass: rr($('glass')), msgText: $('msgband').innerText, statText: $('statband').innerText,
    scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight,
    budgets: R.P.get('budgets'),
  };
});

const all = [];
const summary = [];
const b = await launch();

async function capture(p, tc, { W, H, how, tag, screenKind }) {
  const name = `${W}x${H}`;
  const C = new Checks(`${name}-${how}@${DPR}`);
  await sleep(700);
  const shot = `${SHOTS}/screen-${name}-${how}@${DPR}.png`;
  if (tc) await tc.shot(shot); else await p.screenshot({ path: shot });
  const s = await readPage(p);
  const row = { screen: name, how, dpr: DPR, shot, ui: s.ui, tier: s.tier, budget: s.used, T: s.T, fill: s.fill };
  C.ok('twin banks drawn', s.ui === 'twin', s.ui === 'twin' ? '' : s.fallback);
  if (s.ui !== 'twin') { all.push(...C.list); summary.push({ ...row, fails: C.failed.length }); return; }
  C.ok('window as asked', Math.abs(s.W - W) < 1 && Math.abs(s.H - H) < 1, [s.W, s.H]);
  const tierWant = W < 600 || H < 480 ? 'phone' : 'tablet';
  C.ok(`tier ${tierWant}`, s.tier === tierWant, s.tier);
  C.ok('laid out as for touch (no dock)', s.spec.pointer === 'touch' && !s.spec.controls.some((c) => /dock|legend/.test(c.id)));
  C.ok('no page scroll', s.scrollW <= W + 0.5 && s.scrollH <= H + 0.5, [s.scrollW, s.scrollH]);

  // the page's spec is layout()'s, run here with the page's settings
  const mine = layout(W, H, 'touch', withClasses(s.settings, s.classes)).spec;
  const d1 = [];
  for (const c of mine.controls) { const q = s.spec.controls.find((x) => x.id === c.id); if (!q || maxDiff(c, q) > 1e-6) d1.push(c.id); }
  for (const k of ['mapArea', 'glass']) if (maxDiff(mine[k], s.spec[k]) > 1e-6) d1.push(k);
  mine.bands.forEach((bd, i) => { if (!s.spec.bands[i] || maxDiff(bd, s.spec.bands[i]) > 1e-6) d1.push(bd.name); });
  mine.chrome.forEach((bd, i) => { if (!s.spec.chrome[i] || maxDiff(bd, s.spec.chrome[i]) > 1e-6) d1.push(bd.name); });
  C.ok("the page's spec is layout()'s with its settings", !d1.length && mine.controls.length === s.spec.controls.length, d1.slice(0, 6));

  // against the design's spec.json
  const G = SPEC[name];
  if (G && G.pointer === 'touch') {
    const ctl = [], other = [];
    for (const c of G.controls) { const q = s.spec.controls.find((x) => x.id === c.id); const d = q ? maxDiff(c, q) : Infinity; if (d > 0.5) ctl.push({ id: c.id, d: +d.toFixed(2), want: r1(c), got: r1(q) }); }
    if (maxDiff(G.mapArea, s.spec.mapArea) > 0.5) other.push({ mapArea: [r1(G.mapArea), r1(s.spec.mapArea)] });
    if (maxDiff(G.glass, s.spec.glass) > 0.5) other.push({ glass: [r1(G.glass), r1(s.spec.glass)] });
    G.bands.forEach((bd, i) => { const q = s.spec.bands[i]; if (!q || maxDiff(bd, q) > 0.5) other.push({ band: bd.name.split(' (')[0], want: r1(bd), got: r1(q) }); });
    const gp = G.chrome.filter((c) => /^panel/.test(c.name)), sp = s.spec.chrome.filter((c) => /^panel/.test(c.name));
    if (gp.length !== sp.length || gp.some((c, i) => maxDiff(c, sp[i]) > 0.5)) other.push({ panels: [gp.map((c) => r1(c)), sp.map((c) => r1(c))] });
    C.ok('every control at spec.json (0.5 dp)', !ctl.length, ctl.slice(0, 6));
    row.specJson = other.length ? other : 'same';
    if (screenKind === 'seen') C.ok('map, glass, bands and panels at spec.json (the budget seen both ways)', !other.length, other.slice(0, 4));
    else if (other.length) console.log(`info ${name}-${how}@${DPR} differs from spec.json outside the keys (budget ${JSON.stringify(s.used)}): ${JSON.stringify(other).slice(0, 500)}`);
  } else if (G) {
    row.specJson = 'spec.json has the desk for a mouse (deferred); compared with layout(touch)';
  }

  // every keycap's DOM rect against the spec
  let worst = 0; const bad = [];
  for (const c of s.spec.controls) {
    if (c.behind) continue;
    const k = s.keys[c.id];
    if (!k) { bad.push({ id: c.id, missing: true }); continue; }
    const d = maxDiff(c, k); worst = Math.max(worst, d);
    if (d > 0.5 / DPR + 0.02 || !k.vis) bad.push({ id: c.id, d: +d.toFixed(3), want: r1(c), got: r1(k), vis: k.vis });
  }
  const extra = Object.keys(s.keys).filter((id) => !s.spec.controls.some((c) => c.id === id));
  row.keyMaxDiff = +worst.toFixed(4);
  C.ok(`every keycap at its spec rect (worst ${worst.toFixed(4)} px)`, !bad.length && !extra.length, { bad: bad.slice(0, 6), extra });

  // overlaps and clearances, from the DOM
  const live = s.spec.controls.filter((c) => !c.behind).map((c) => ({ id: c.id, ...s.keys[c.id] })).filter((k) => k.w);
  const pairs = [];
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) if (ov(live[i], live[j], 0.05)) pairs.push(`${live[i].id}/${live[j].id}`);
  C.ok('no keycap on another', !pairs.length, pairs.slice(0, 6));
  const off = live.filter((k) => k.x < -0.05 || k.y < -0.05 || k.x + k.w > W + 0.05 || k.y + k.h > H + 0.05).map((k) => k.id);
  C.ok('every keycap on screen', !off.length, off);
  const others = [['map canvas', s.canvas], ['message band', s.msgband], ['status band', s.statband], ...s.panels.map((q) => [`panel ${q.kind}`, q])].filter(([, r]) => r);
  const onKeys = [], near = [];
  let minGap = Infinity;
  for (const [n, r] of others) for (const k of live) {
    if (ov(k, r, 0.05)) onKeys.push(`${n} on ${k.id}`);
    const g = gap(k, r); minGap = Math.min(minGap, g);
    if (g < 12 - 0.5 / DPR - 0.05) near.push(`${n} ${g.toFixed(2)} from ${k.id}`);
  }
  row.minKeyClearance = +minGap.toFixed(2);
  C.ok('no map, band or panel on a keycap', !onKeys.length, onKeys.slice(0, 6));
  C.ok(`no map, band or panel inside a key's 12 dp halo (closest ${minGap.toFixed(2)})`, !near.length, near.slice(0, 6));
  const bp = [];
  for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) {
    if (others[i][0] === 'map canvas' && /^panel/.test(others[j][0])) { if (ov(others[i][1], others[j][1], 0.5)) bp.push(`${others[i][0]}/${others[j][0]}`); continue; }
    if (others[i][0] !== 'map canvas' && ov(others[i][1], others[j][1], 0.5)) bp.push(`${others[i][0]}/${others[j][0]}`);
  }
  C.ok('no band on a panel, no panel on the map', !bp.length, bp);
  const offo = others.filter(([, r]) => r.x < -0.5 || r.y < -0.5 || r.x + r.w > W + 0.5 || r.y + r.h > H + 0.5).map(([n]) => n);
  C.ok('the map, bands and panels on screen', !offo.length, offo);
  const coll = collisions(s.spec);
  C.ok('layout.js collisions() finds nothing', !coll.length, coll.slice(0, 4));
  const hitBad = Object.entries(s.hits).filter(([id, h]) => h !== id);
  C.ok('a tap at each keycap centre reaches that key', !hitBad.length, hitBad.slice(0, 6));
  C.ok('the game is on: status and messages shown', /Dlvl|HP/.test(s.statText) && s.msgText.trim().length > 0, s.statText.slice(0, 80));
  C.ok('no console error', !p.errors.length, p.errors.slice(0, 4));
  all.push(...C.list);
  summary.push({ ...row, keys: live.length, fails: C.failed.length, failed: C.failed.map((c) => c.name) });
}

for (const pr of PAIRS) {
  if (!want(pr.tag)) continue;
  for (const first of ['L', 'P']) {
    const second = first === 'L' ? 'P' : 'L';
    const [W, H] = pr[first], scr = pr[`s${first}`] || pr[first];
    const ctx = await newCtx(b, { w: W, h: H, dpr: DPR, touch: true, mobile: true, screen: scr });
    const p = await openPage(ctx);
    const tc = await touch(ctx, p);
    try {
      await newGame(p);
      await capture(p, tc, { W, H, how: `${first === 'L' ? 'landscape' : 'portrait'}-new`, tag: pr.tag, screenKind: first === 'L' ? 'seen' : 'fresh' });
      const [W2, H2] = pr[second], scr2 = pr[`s${second}`] || pr[second];
      await tc.rotate(W2, H2, DPR, scr2);
      await sleep(500);
      await capture(p, tc, { W: W2, H: H2, how: `${second === 'L' ? 'landscape' : 'portrait'}-turned`, tag: pr.tag, screenKind: 'seen' });
    } catch (e) {
      console.log(`FAIL ${pr.tag} ${first}: ${e.message}`);
      all.push({ tag: pr.tag, name: `run ${first}`, pass: false, detail: e.message });
    }
    await ctx.close();
  }
}
for (const sg of SINGLES) {
  if (!want(sg.tag)) continue;
  const [W, H] = sg.W;
  const ctx = await newCtx(b, { w: W, h: H, dpr: DPR, touch: sg.touch, mobile: sg.mobile });
  const p = await openPage(ctx);
  try {
    await newGame(p);
    await capture(p, null, { W, H, how: sg.touch ? 'touch-new' : 'mouse-new', tag: sg.tag, screenKind: 'seen' });
  } catch (e) {
    console.log(`FAIL ${sg.tag}: ${e.message}`);
    all.push({ tag: sg.tag, name: 'run', pass: false, detail: e.message });
  }
  await ctx.close();
}
await b.close();
fs.writeFileSync(`${DIR}/screens-${DPR}.json`, JSON.stringify({ summary, checks: all }, null, 1));
const f = all.filter((c) => !c.pass);
console.log(`screens dpr ${DPR}: ${summary.length} captures, ${all.length - f.length} pass, ${f.length} fail`);
