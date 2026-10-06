// The tablet tier at the stage's eight windows (four touch, four with a
// mouse, which must get the touch tablet tier, not a desk layout).
//   node screens.mjs <dpr> [WxH[-mouse] ...]
// For each: the tier; every keycap's DOM rect against layout() (computed here,
// in node); the page's own spec against it; bands, canvas and panels against
// it; overlaps, distances and hit-tests; the void; the panels' content; a tap
// (or click) on each panel; a screenshot; the console.
import { launch, newCtx, openPage, resume, settle, sleep, Checks, SHOTS, writeJson, ov, r1 } from './common.mjs';
import { expected, panelKind, voidShare, harnessVoid, gap, near, maxDiff, readPage } from './lib.mjs';

const dpr = Number(process.argv[2] || 1);
const ALL = [
  { w: 1024, h: 768, input: 'touch' }, { w: 768, h: 1024, input: 'touch' }, { w: 1180, h: 820, input: 'touch' }, { w: 1366, h: 768, input: 'touch' },
  { w: 1280, h: 800, input: 'mouse' }, { w: 1920, h: 1080, input: 'mouse' }, { w: 2560, h: 1440, input: 'mouse' }, { w: 3440, h: 1440, input: 'mouse' },
];
const pick = process.argv.slice(3);
const WINS = pick.length ? ALL.filter((x) => pick.includes(`${x.w}x${x.h}${x.input === 'mouse' ? '-mouse' : ''}`)) : ALL;
const DESIGN_VOID = { '1024x768': 6.2, '768x1024': 4.0, '1180x820': 6.9, '1366x768': 10.3 };   // DESIGN.md section 2, per screen
const b = await launch();
const results = [];
const all = new Checks(`dpr${dpr}`);
for (const win of WINS) {
  const tag = `${win.w}x${win.h}${win.input === 'mouse' ? '-mouse' : ''}@${dpr}`;
  const C = new Checks(tag);
  const touch = win.input === 'touch';
  const ctx = await newCtx(b, { w: win.w, h: win.h, dpr, touch });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(600);
  const s = await readPage(p);
  const prefs = await p.evaluate(() => ({ msgFont: globalThis.__ts.P.get('msgFont'), msgSize: globalThis.__ts.P.get('msgSize'), padCell: globalThis.__ts.P.get('padCell'), mapCell: globalThis.__ts.P.get('mapCell') }));
  const E = expected(win.w, win.h, { prefs });
  const tol = 0.1, dev = 1 / dpr + 0.02;

  // --- the tier: the touch tablet tier for every window, a mouse's included
  C.ok('twin banks drawn', s.ui === 'twin', s.ui);
  C.ok('tier is tablet (data-tier)', s.tier === 'tablet', s.tier);
  C.ok('layout() says tablet', E.info.tier === 'tablet', E.info.tier);
  C.ok('laid out as for touch, not the desk', s.spec && s.spec.pointer === 'touch' && !s.spec.controls.some((c) => /dock|legend/.test(c.id)), s.spec && s.spec.pointer);
  C.ok('pad keys 58 dp', s.spec.controls.filter((c) => c.id.startsWith('pad_')).every((c) => Math.abs(c.w - 58) < 1e-6 && Math.abs(c.h - 58) < 1e-6));
  const padb = s.spec.controls.find((c) => c.id === 'pad_b'), apply = s.spec.controls.find((c) => c.id === 'apply');
  C.ok('banks in the bottom corners, 18 dp in', padb.x === 18 && Math.abs(padb.y + padb.h - (win.h - 18)) < 1e-6 && Math.abs(apply.x + apply.w - (win.w - 18)) < 1e-6,
    { padb: r1(padb), apply: r1(apply) });
  C.ok('no page scroll', s.scrollW <= win.w && s.scrollH <= win.h, { sw: s.scrollW, sh: s.scrollH });

  // --- the page's spec is layout()'s
  const specDiffs = [];
  for (const c of E.spec.controls) {
    const q = s.spec.controls.find((x) => x.id === c.id);
    if (!q || !near(c, q, 1e-6)) specDiffs.push({ id: c.id, want: r1(c), got: r1(q) });
  }
  if (s.spec.controls.length !== E.spec.controls.length) specDiffs.push({ count: [s.spec.controls.length, E.spec.controls.length] });
  for (const k of ['mapArea', 'glass']) if (!near(E.spec[k], s.spec[k], 1e-6)) specDiffs.push({ k, want: r1(E.spec[k]), got: r1(s.spec[k]) });
  E.spec.bands.forEach((bd, i) => { if (!near(bd, s.spec.bands[i], 1e-6)) specDiffs.push({ band: i, want: r1(bd), got: r1(s.spec.bands[i]) }); });
  const Ep = E.spec.chrome.filter((c) => panelKind(c.name)), Sp = s.spec.chrome.filter((c) => panelKind(c.name));
  if (Ep.length !== Sp.length || Ep.some((c, i) => !near(c, Sp[i], 1e-6))) specDiffs.push({ panels: [Ep.map(r1), Sp.map(r1)] });
  C.ok("the page's spec is layout()'s (controls, map, glass, bands, panels)", !specDiffs.length, specDiffs.slice(0, 6));
  C.ok('cell as layout() gives', Math.abs(s.info.T - E.info.T) < 1e-6, { page: s.info.T, rule: E.info.T });

  // --- every key's DOM rect against layout()
  const keyDiffs = [];
  let keyMax = 0;
  for (const c of E.spec.controls) {
    if (c.behind) continue;
    const k = s.keys[c.id];
    if (!k) { keyDiffs.push({ id: c.id, missing: true }); continue; }
    const d = maxDiff(c, k);
    keyMax = Math.max(keyMax, d);
    if (d > tol || !k.vis) keyDiffs.push({ id: c.id, want: r1(c), got: r1(k), vis: k.vis });
  }
  const extra = Object.keys(s.keys).filter((id) => !E.spec.controls.some((c) => c.id === id));
  C.ok(`every keycap at layout()'s rect (max ${keyMax.toFixed(3)} px)`, !keyDiffs.length && !extra.length, { keyDiffs: keyDiffs.slice(0, 8), extra });
  const hitBad = Object.entries(s.hits).filter(([id, h]) => h !== id);
  C.ok('a tap at each keycap centre reaches that key', !hitBad.length, hitBad.slice(0, 8));

  // --- bands and the map
  const [mb, sb] = E.spec.bands;
  C.ok('message band at layout()', near(mb, s.msgband, dev), { want: r1(mb), got: r1(s.msgband) });
  C.ok('status band at layout()', near(sb, s.statband, dev), { want: r1(sb), got: r1(s.statband) });
  C.ok('bands reachable (not covered)', s.msgband.hit === 'self' && s.statband.hit === 'self', [s.msgband.hit, s.statband.hit]);
  const M = E.spec.mapArea, cv = s.canvas;
  C.ok('canvas inside the map area (1 device px)', cv.x >= M.x - dev && cv.y >= M.y - dev && cv.x + cv.w <= M.x + M.w + dev && cv.y + cv.h <= M.y + M.h + dev,
    { map: r1(M), canvas: r1(cv) });
  const Tcss = Math.floor(E.info.T * dpr + 1e-6) / dpr;
  C.ok('drawn cell = floor(T x dpr)/dpr', Math.abs(s.view.T - Tcss) < 1e-6, { drawn: s.view.T, want: Tcss, T: E.info.T, tileSize: s.T });
  if (E.info.fill && E.info.fill.whole) {
    const V = s.view, e = 1e-3;
    C.ok('the whole level shows (80x21 cells inside the canvas)', V.left >= -e && V.top >= -e && V.left + 80 * V.T <= cv.w + e && V.top + 21 * V.T <= cv.h + e,
      { canvas: r1(cv), level: [V.left, V.top, 80 * V.T, 21 * V.T] });
    // the level drawn fills the map area to within one cell on its binding axis
    C.ok('the level fills its map area to within a cell', Math.min(cv.w - 80 * V.T, cv.h - 21 * V.T) <= V.T + e, { spareW: cv.w - 80 * V.T, spareH: cv.h - 21 * V.T });
  }

  // --- panels: where layout() puts them, shown, filled
  const shown = s.panels.filter((q) => q.vis);
  for (const c of Ep) {
    const kind = panelKind(c.name), q = shown.find((x) => x.kind === kind);
    if (!C.ok(`${kind} panel shown`, !!q, s.panels.map((x) => [x.kind, x.vis]))) continue;
    // each edge on a device pixel within one of layout()'s, moved inward
    const edges = [q.x - c.x, q.y - c.y, (c.x + c.w) - (q.x + q.w), (c.y + c.h) - (q.y + q.h)];
    C.ok(`${kind} panel at layout()'s rect (each edge within 1 device px, inward)`, edges.every((e) => e >= -1e-3 && e <= dev),
      { want: r1(c), got: r1(q) });
    C.ok(`${kind} panel reachable at its centre`, q.hit === 'self', q.hit);
  }
  C.ok('no panel shown that layout() did not place', shown.every((q) => Ep.some((c) => panelKind(c.name) === q.kind)), shown.map((q) => q.kind));
  const inv = shown.find((q) => q.kind === 'inventory'), log = shown.find((q) => q.kind === 'log');
  if (inv) {
    const want = (s.inv || []).filter((i) => i.sel).map((i) => `${String.fromCharCode(i.ch)}${i.text}`.replace(/\s+/g, ''));
    const got = inv.lines;
    const missing = want.filter((w) => !got.some((g) => g.replace(/\s+/g, '') === w));
    C.ok('inventory panel lists every item of the pack', s.perm && want.length > 0 && !missing.length, { want: want.length, missing, sample: got.slice(0, 4) });
    const clippedX = !inv.wide && inv.scrollW > inv.clientW + 1;
    C.ok('inventory panel: no text cut off sideways', !clippedX, { scrollW: inv.scrollW, clientW: inv.clientW });
    C.ok('inventory panel titled', inv.title === 'Inventory' || inv.h < 120, inv.title);
  }
  if (log) {
    const hist = s.history;
    const got = log.lines;
    const tail = hist.slice(-Math.min(hist.length, got.length));
    C.ok('message log panel shows the history, newest last', got.length > 0 && got.length <= hist.length && JSON.stringify(got.slice(-tail.length)) === JSON.stringify(tail.map((t) => t.replace(/\s+/g, ' ').trim())),
      { got: got.slice(-3), hist: hist.slice(-3) });
    C.ok('message log at its end', log.scrollTop + log.clientH >= log.scrollH - 4, { top: log.scrollTop, ch: log.clientH, sh: log.scrollH });
  }

  // --- overlaps and clearances (DOM rects)
  const caps = Object.entries(s.keys).filter(([id]) => id !== 'longrest').map(([id, k]) => ({ id, ...k }));
  const bad = [];
  for (let i = 0; i < caps.length; i++) for (let j = i + 1; j < caps.length; j++) if (ov(caps[i], caps[j], 0.01)) bad.push(`key ${caps[i].id} on ${caps[j].id}`);
  const bands = [{ id: 'msgband', ...s.msgband }, { id: 'statband', ...s.statband }];
  const things = [...shown.map((q) => ({ id: `panel ${q.kind}`, ...q })), ...bands, { id: 'canvas', ...cv }];
  for (const t of things) {
    for (const c of caps) { const g = gap(t, c); if (g < 12 - dev) bad.push(`${t.id} ${g.toFixed(2)} px from key ${c.id}`); }
    if (t.x < -0.01 || t.y < -0.01 || t.x + t.w > win.w + 0.01 || t.y + t.h > win.h + 0.01) bad.push(`${t.id} off screen ${r1(t)}`);
  }
  for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) if (ov(things[i], things[j], 0.01)) bad.push(`${things[i].id} on ${things[j].id}`);
  for (const c of caps) if (c.x < -0.01 || c.y < -0.01 || c.x + c.w > win.w + 0.01 || c.y + c.h > win.h + 0.01) bad.push(`key ${c.id} off screen`);
  C.ok('no overlaps; every band, panel and the map 12 dp clear of every key; all on screen', !bad.length, bad.slice(0, 10));

  // --- void
  const drawnVoid = voidShare(win.w, win.h, [...caps, ...bands, ...shown, cv]);
  const hv = harnessVoid(E.spec), hvPage = harnessVoid(s.spec);
  const key = `${win.w}x${win.h}`;
  C.ok(`void (harness: map area, bands, panels, keys + 12 dp) ${(hv * 100).toFixed(1)}%` + (DESIGN_VOID[key] ? ` vs DESIGN ${DESIGN_VOID[key]}%` : ''),
    !DESIGN_VOID[key] || Math.abs(hv * 100 - DESIGN_VOID[key]) <= 1.0, { drawnVoid: (drawnVoid * 100).toFixed(1), page: (hvPage * 100).toFixed(1) });
  C.ok('void under 21.8% (the classic page at 1920x1080, the design\'s reference)', hv * 100 < 21.8 && drawnVoid * 100 < 21.8, { harness: (hv * 100).toFixed(1), drawn: (drawnVoid * 100).toFixed(1) });

  await p.screenshot({ path: `${SHOTS}/screens-${tag}.png` });

  // --- a tap (touch) or a click (mouse) on each panel opens what it copies
  const hitAt = async (x, y) => { if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); };
  for (const [kind, title] of [['log', /message history|history/i], ['inventory', /inventory|weapons/i]]) {
    const q = shown.find((x) => x.kind === kind);
    if (!q) continue;
    await p.evaluate(() => { globalThis.__ev = []; });
    await hitAt(q.x + q.w / 2, q.y + q.h / 2);
    await sleep(700);
    const after = await p.evaluate(() => ({ modal: globalThis.__ts.modalOpen, title: document.getElementById('modal-title').textContent,
      body: document.getElementById('modal-body').innerText.slice(0, 120), ev: (globalThis.__ev || []).map((e) => e.key) }));
    const sentKey = kind === 'log' ? 16 : 105;
    C.ok(`${touch ? 'tap' : 'click'} on the ${kind} panel opens it`, after.modal && after.ev.includes(sentKey), after);
    if (kind === 'inventory' && after.modal) {
      // the inventory window and the panel agree
      const body = await p.evaluate(() => document.getElementById('modal-body').innerText);
      const items = (s.inv || []).filter((i) => i.sel).map((i) => i.text);
      const miss = items.filter((t) => !body.replace(/\s+/g, ' ').includes(t.replace(/\s+/g, ' ')));
      C.ok("the panel's items are the inventory window's", !miss.length, miss);
      await p.screenshot({ path: `${SHOTS}/screens-${tag}-inventory-open.png` });
    }
    await p.keyboard.press('Escape');
    await sleep(300);
    await settle(p);
  }
  if (!touch) {
    // a mouse's click on a key works as a tap does: SEARCH sends 's'
    const k = s.keys.search;
    await p.evaluate(() => { globalThis.__ev = []; });
    await p.mouse.click(k.x + k.w / 2, k.y + k.h / 2);
    await sleep(500);
    const ev = await p.evaluate(() => (globalThis.__ev || []).map((e) => e.key));
    C.ok('a mouse click on SEARCH sends s', ev.includes(115), ev);
    await settle(p);
  }
  const s2 = await readPage(p);
  C.ok('layout unchanged after the taps', s2.tier === 'tablet' && JSON.stringify(s2.spec.controls) === JSON.stringify(s.spec.controls));
  C.ok('no console errors', !p.errors.length, p.errors.slice(0, 5));
  results.push({ tag, tier: s.tier, T: s.info.T, cellTier: s.info.DC?.tier, whole: !!E.info.fill?.whole, cols: E.info.fill?.cols, rows: E.info.fill?.rows, keyMax, harnessVoid: hv, drawnVoid,
    panels: shown.map((q) => ({ kind: q.kind, rect: r1(q), inGlass: q.inGlass, wide: q.wide, lines: q.lines.length })), checks: C.list });
  all.list.push(...C.list);
  await ctx.close();
}
writeJson(`screens-${dpr}.json`, results);
console.log(`\nscreens dpr ${dpr}: ${all.list.filter((c) => c.pass).length} pass, ${all.failed.length} fail`);
for (const f of all.failed) console.log(`  FAIL ${f.tag} ${f.name}`);
await b.close();
