// The tablet and touch-laptop tier, window by window (the stage "Tablet and
// touch-laptop tier, size classes and panels"):
//  - the tier the page drew (data-tier) and the pointer it laid out for: a
//    window with a mouse gets the touch tablet tier, never the desk;
//  - every keycap on screen against layout() run in the page with the page's
//    own settings (overlay.twin.settings and the tiers it drew), and every
//    hit cell against the guard's;
//  - the panels at layout()'s rects (within a device pixel), each showing what
//    it copies: the log the history, the inventory the items;
//  - no panel on a key's hit cell, keycap or halo, on the map canvas, on a
//    band or on another panel, none off screen; the map canvas inside the map
//    area and on no key;
//  - the void (no key, map, band or panel), from layout()'s rects;
//  - no console errors.
//   node tablet.mjs [dpr]  -> tablet-<dpr>.json, shots/tablet-<dpr>-WxH[-mouse].png
import { launch, newCtx, openPage, resume, sleep, SHOTS, writeJson } from './common.mjs';
import { Checks } from './kit.mjs';
import { voidOf } from './void-lib.mjs';

const DPR = Number(process.argv[2] || 1);
// [w, h, touch, expected tier, the whole level?, the panels, screen] -- the
// design's section 4: a landscape tablet shows the whole level (its cell is 12
// dp or more), a portrait one keeps the device cell and pans, and 960x600 is
// too short for the whole level above the banks; the panels are the ones
// layout() has room for (600x960's tray between the banks is 160 dp, under
// the 240 a panel takes, so it has the log under the map alone)
// The monitors (a mouse) are laid out as tablets while desktop mode is
// deferred: where 24 dp would leave strips wider than a panel beside the
// level the cell grows (2560x1440 31.5 dp, 3440x1440 42.5), and on 32:9
// (5120x1440) the log and the inventory stand beside the level.  WHERE
// names where each window's panels stand: 'tray' (between the banks),
// 'under' (in the glass under the map), 'over' (over the banks), 'beside'
// (beside the map); VOID the most void (no key, map, band or panel) each of
// the stage's windows may have -- today's classic page has 21.8% at
// 1920x1080 (the design's M8).
const LI = ['log', 'inventory'];
const WHERE = {
  '1024x768': 'tray tray', '768x1024': 'under tray', '1180x820': 'tray tray', '1366x768': 'tray tray', '1280x800': 'tray tray',
  '1920x1080': 'under tray', '2560x1440': 'under tray', '3440x1440': 'tray tray', '3440x1080': 'over over', '5120x1440': 'beside beside',
  '960x600': 'over over', '600x960': 'under',
};
const VOID = { '1024x768': 0.14, '768x1024': 0.12, '1180x820': 0.14, '1366x768': 0.16, '1280x800': 0.12, '1920x1080': 0.08,
  '2560x1440': 0.06, '3440x1440': 0.09, '3440x1080': 0.18, '5120x1440': 0.25 };
const CELL = { '2560x1440': 31.5, '3440x1440': 42.5, '3440x1080': 37.5, '5120x1440': 48, '1920x1080': 23.5 };
const WINS = [
  [1024, 768, true, 'tablet', true, LI], [768, 1024, true, 'tablet', false, LI], [1180, 820, true, 'tablet', true, LI],
  [1366, 768, true, 'tablet', true, LI],
  [1280, 800, false, 'tablet', true, LI], [1920, 1080, false, 'tablet', true, LI], [2560, 1440, false, 'tablet', true, LI],
  [3440, 1440, false, 'tablet', true, LI], [3440, 1080, false, 'tablet', true, LI], [5120, 1440, false, 'tablet', true, LI],
  [960, 600, true, 'tablet', false, LI], [600, 960, true, 'tablet', false, ['log']],
  [896, 443, true, 'phone', false, [], [443, 939]], [443, 939, true, 'phone', false, ['log'], [443, 939]],
  [640, 360, true, 'phone', false, []], [360, 640, true, 'phone', false, []],
  [412, 915, true, 'phone', false, ['log']], [390, 844, true, 'phone', false, []],
];
const ONLY = process.env.WINS ? process.env.WINS.split(',') : null;
const b = await launch();
const out = {};
let failed = 0;
for (const [w, h, touchOn, tier, whole, kinds, scr] of WINS) {
  const tag = `${w}x${h}${touchOn ? '' : ' mouse'}`;
  if (ONLY && !ONLY.includes(`${w}x${h}`)) continue;
  const C = new Checks(`${tag} @${DPR}`);
  const ctx = await newCtx(b, { w, h, dpr: DPR, touch: touchOn, screen: scr ? { width: scr[0], height: scr[1] } : null,
    prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(500);
  const r = await p.evaluate(async () => {
    const o = globalThis.__bt.overlay, $ = (id) => document.getElementById(id), dpr = window.devicePixelRatio;
    const L = await import('./layout.js');
    const T = o.twin, S = T.spec;
    // layout() again, with the page's settings and the tiers it drew
    const again = L.layout(T.W, T.H, 'touch', { ...T.settings, prevTier: T.info.tier, prevCellTier: T.info.DC.tier });
    const R = (e) => { const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; };
    const ov = (a, b2, s = 0.01) => a.x + s < b2.x + b2.w && b2.x + s < a.x + a.w && a.y + s < b2.y + b2.h && b2.y + s < a.y + a.h;
    const bad = { caps: [], cells: [], panelRect: [], overlaps: [], map: [] };
    let capErr = 0;
    for (const c of again.spec.controls.filter((q) => !q.behind)) {
      const k = o.twinCapRect(c.id);
      if (!k) { bad.caps.push(`${c.id}: no keycap`); continue; }
      const e = Math.max(Math.abs(k.x - c.x), Math.abs(k.y - c.y), Math.abs(k.width - c.w), Math.abs(k.height - c.h));
      capErr = Math.max(capErr, e);
      if (e > 0.05) bad.caps.push(`${c.id}: ${[k.x, k.y, k.width, k.height].map((v) => v.toFixed(2))} vs ${[c.x, c.y, c.w, c.h].map((v) => v.toFixed(2))}`);
    }
    const cells = [];
    for (const [id, cell] of T.guard.cells) {
      const e = o.twinEl(id);
      if (!e) continue;
      const q = R(e);
      cells.push({ id, ...q });
      const d = Math.max(Math.abs(q.x - cell.x), Math.abs(q.y - cell.y), Math.abs(q.w - cell.w), Math.abs(q.h - cell.h));
      if (d > 0.05) bad.cells.push(`${id}: ${d.toFixed(3)}`);
    }
    const caps = [...T.keys.keys()].filter((id) => id !== 'longrest').map((id) => { const k = o.twinCapRect(id); return { id, x: k.x, y: k.y, w: k.width, h: k.height }; });
    const halos = [...document.querySelectorAll('#keys > .halo')].map((e) => ({ id: 'halo', ...R(e) }));
    const vis = (e) => e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
    const panels = [...document.querySelectorAll('.rhpanel')].filter(vis).map((e) => ({ kind: e.dataset.kind, pane: e.dataset.pane !== undefined, ...R(e),
      lines: [...e.querySelectorAll('.pl, .pi, .ph, .pnote')].map((q) => q.innerText.replace(/\s+/g, ' ').trim()), title: e.querySelector('.ptitle').hidden ? '' : e.querySelector('.ptitle').innerText }));
    const want = S.chrome.filter((c) => /^panel: (message log|inventory)/.test(c.name));
    for (const c of want) {
      const kind = c.name.startsWith('panel: inventory') ? 'inventory' : 'log';
      const q = panels.find((x) => x.kind === kind);
      if (!q) { bad.panelRect.push(`${kind}: not shown`); continue; }
      const d = Math.max(Math.abs(q.x - c.x), Math.abs(q.y - c.y), Math.abs(q.x + q.w - c.x - c.w), Math.abs(q.y + q.h - c.y - c.h));
      if (d > 1 / dpr + 0.01) bad.panelRect.push(`${kind}: off by ${d.toFixed(3)}`);
    }
    if (panels.length !== want.length) bad.panelRect.push(`${panels.length} panels shown, the layout has ${want.length}`);
    const cv = R($('map')), m = S.mapArea;
    const bands = [R($('msgband'))];
    if (vis($('statband'))) bands.push(R($('statband')));
    for (const q of panels) {
      for (const k of [...cells, ...caps, ...halos]) if (ov(q, k)) bad.overlaps.push(`${q.kind} on ${k.id}`);
      if (ov(q, cv)) bad.overlaps.push(`${q.kind} on the map canvas`);
      if (ov(q, m)) bad.overlaps.push(`${q.kind} on the map area`);
      for (const bd of bands) if (ov(q, bd)) bad.overlaps.push(`${q.kind} on a band`);
      for (const q2 of panels) if (q2 !== q && ov(q, q2)) bad.overlaps.push(`${q.kind} on ${q2.kind}`);
      if (q.x < -0.01 || q.y < -0.01 || q.x + q.w > S.W + 0.01 || q.y + q.h > S.H + 0.01) bad.overlaps.push(`${q.kind} off screen`);
    }
    for (const k of [...cells, ...caps]) if (ov(cv, k)) bad.map.push(`the map canvas on ${k.id}`);
    const dp = 1 / dpr + 0.01;
    if (cv.x < m.x - dp || cv.y < m.y - dp || cv.x + cv.w > m.x + m.w + dp || cv.y + cv.h > m.y + m.h + dp) bad.map.push(`the canvas ${[cv.x, cv.y, cv.w, cv.h].map((v) => v.toFixed(2))} outside the map area ${[m.x, m.y, m.w, m.h].map((v) => v.toFixed(2))}`);
    // where each panel stands, in the order log, inventory
    const live = S.controls.filter((c) => !c.behind), banksTop = Math.min(...live.map((c) => c.y));
    const bankL = { x0: Math.min(...live.filter((c) => c.thumb === 'L').map((c) => c.x)), x1: Math.max(...live.filter((c) => c.thumb === 'L').map((c) => c.x + c.w)) };
    const bankR = { x0: Math.min(...live.filter((c) => c.thumb === 'R').map((c) => c.x)), x1: Math.max(...live.filter((c) => c.thumb === 'R').map((c) => c.x + c.w)) };
    const overBank = (q) => [bankL, bankR].some((k) => q.x < k.x1 && k.x0 < q.x + q.w);
    const where = ['log', 'inventory'].map((k) => panels.find((q) => q.kind === k)).filter(Boolean).map((q) => (
      q.y >= banksTop - 1 ? 'tray'                                   // between the banks
        : q.y >= m.y + m.h - 1 ? 'under'                             // in the glass under the map
          : overBank(q) ? 'over'                                     // above a bank, in its column
            : (q.x + q.w <= m.x || q.x >= m.x + m.w) ? 'beside' : '?')).join(' ');
    const ib = document.querySelector('.rhpanel[data-kind="inventory"] .pcols');
    let invFit = null;
    if (ib) {
      const body = ib.parentNode, br = body.getBoundingClientRect();
      const its = [...ib.querySelectorAll('.pi')].map((e) => e.getBoundingClientRect());
      const xs = new Set(its.map((q) => Math.round(q.x)));
      invFit = { cols: xs.size, items: its.length, allShown: body.scrollHeight <= body.clientHeight + 1 && its.every((q) => q.right <= br.right + 1 && q.bottom <= br.bottom + 1) };
    }
    return {
      where, invFit,
      ui: document.documentElement.dataset.ui, dataTier: document.documentElement.dataset.tier || null, tier: T.info.tier, cellTier: T.info.DC.tier,
      pointer: S.pointer, againTier: again.info.tier, sameSpec: JSON.stringify(again.spec.controls) === JSON.stringify(S.controls) && JSON.stringify(again.spec.chrome) === JSON.stringify(S.chrome),
      T: T.info.T, drawn: globalThis.__bt.view.T, whole: T.info.fill.whole, glass: T.info.G.kind, capErr, bad, panels, spec: S,
      history: globalThis.__bt.history.length, band: $('msgband').innerText,
    };
  });
  // a full pack (40 items under 8 headings, 48 lines): a wide panel shows it
  // all in columns, a narrow one in one column that scrolls
  let full = null;
  if (kinds.includes('inventory')) {
    full = await p.evaluate(async () => {
      const B = globalThis.__bt, real = B.invMenu ? B.invMenu.items : [];
      const items = [];
      const name = ['a +1 long sword (weapon in hand)', 'an uncursed potion of extra healing', 'a blessed scroll of enchant armor', 'a wand of digging (0:5)'];
      for (let h = 0; h < 8; h++) {
        items.push({ selectable: false, ch: 0, tile: -1, attr: 7, clr: -1, text: ['Weapons', 'Armor', 'Rings', 'Wands', 'Comestibles', 'Scrolls', 'Potions', 'Tools'][h] });
        for (let i = 0; i < 5; i++) items.push({ selectable: true, ch: 97 + ((h * 5 + i) % 26), tile: (real.find((q) => q.tile >= 0) || { tile: -1 }).tile, attr: 0, clr: -1, text: `${name[i % 4]} ${h}-${i}` });
      }
      B.fakeInventory(items);
      await new Promise((r) => setTimeout(r, 100));
      const e = document.querySelector('.rhpanel[data-kind="inventory"]'), body = e.querySelector('.pbody'), br = body.getBoundingClientRect();
      const its = [...e.querySelectorAll('.pi')].map((q) => q.getBoundingClientRect());
      const cols = new Set(its.map((q) => Math.round(q.x))).size;
      const shown = its.filter((q) => q.right <= br.right + 1 && q.bottom <= br.bottom + 1 && q.x >= br.x - 1 && q.y >= br.y - 1).length;
      // a heading at a column's foot with its first item in the next
      const heads = [...e.querySelectorAll('.ph')].map((q) => q.getBoundingClientRect());
      const orphan = heads.filter((hd) => !its.some((q) => Math.abs(q.x - hd.x) < 2 && q.y > hd.y && q.y - hd.bottom < 4)).length;
      const wide = e.dataset.wide !== undefined;
      const scrolls = body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1;
      B.fakeInventory(real);
      return { wide, cols, items: its.length, shown, orphan, scrolls, w: br.width, h: br.height };
    });
  }
  const errs = p.errors.slice();
  C.ok('twin banks drawn', r.ui === 'twin', r.ui);
  C.ok(`the ${tier} tier (data-tier ${r.dataTier})`, r.tier === tier && r.dataTier === tier, { tier: r.tier, cellTier: r.cellTier });
  C.ok('laid out as for touch, never the desk', r.pointer === 'touch' && r.tier !== 'desk', r.pointer);
  C.ok('layout() again gives the same spec', r.sameSpec && r.againTier === r.tier);
  C.ok(`every keycap at layout()'s rect (max error ${r.capErr.toFixed(4)} px)`, !r.bad.caps.length, r.bad.caps.slice(0, 4));
  C.ok('every hit cell at the guard\'s rect', !r.bad.cells.length, r.bad.cells.slice(0, 4));
  C.ok(`${whole ? 'the whole level' : 'the device cell, panning'} (${r.whole ? 'whole' : 'pans'}) at a cell of ${(+r.T).toFixed(2)} dp, drawn ${r.drawn.toFixed(3)} px`, r.whole === whole && (!whole || r.T >= 12));
  C.ok('the panels at layout()\'s rects', !r.bad.panelRect.length, r.bad.panelRect);
  C.ok('no panel on a key, its halo, the map, a band or another panel, none off screen', !r.bad.overlaps.length, r.bad.overlaps.slice(0, 6));
  C.ok('the map canvas inside the map area and on no key', !r.bad.map.length, r.bad.map);
  const log = r.panels.find((q) => q.kind === 'log'), inv = r.panels.find((q) => q.kind === 'inventory');
  if (log) C.ok(`the log shows the history (${log.lines.length} lines)`, log.lines.length > 0, log.lines.slice(-2));
  if (inv) C.ok(`the inventory shows the items (${inv.lines.filter((l) => /^[a-zA-Z] /.test(l)).length})`, inv.lines.some((l) => /^a .*spear/.test(l)), inv.lines.slice(0, 4));
  C.ok(`the panels: ${kinds.join(', ') || 'none'}`, JSON.stringify(r.panels.map((q) => q.kind).sort()) === JSON.stringify(kinds.slice().sort()), r.panels.map((q) => q.kind));
  const v = voidOf(r.spec);
  const key = `${w}x${h}`;
  C.ok(`void ${(v.void * 100).toFixed(1)}%${VOID[key] ? ` (at most ${VOID[key] * 100}%)` : ''}, map ${(v.map * 100).toFixed(1)}%, panels ${(v.panels * 100).toFixed(1)}%`, !VOID[key] || v.void <= VOID[key]);
  if (CELL[key]) C.ok(`the level's cell ${CELL[key]} dp`, Math.abs(r.T - CELL[key]) < 1e-6, r.T);
  if (WHERE[key]) C.ok(`the panels where they belong: ${WHERE[key]}`, r.where === WHERE[key], r.where);
  // the inventory shows the whole pack in columns where the panel is wide (two
  // of 26em fit); where it is narrow, one column that scrolls
  if (full) {
    C.ok(full.wide ? `a full pack (${full.items} items) in ${full.cols} columns, ${full.shown} showing${full.shown < full.items ? ', the rest a sideways scroll away' : ''}, no heading apart from its first item`
      : `a full pack in one column that scrolls (the panel is ${Math.round(full.w)} wide)`,
    full.wide ? full.cols >= 2 && (full.shown === full.items || full.scrolls) && !full.orphan : full.cols === 1 && full.scrolls === (full.shown < full.items), full);
  }
  C.ok('no console errors', !errs.length, errs);
  await p.screenshot({ path: `${SHOTS}/tablet-${DPR}-${w}x${h}${touchOn ? '' : '-mouse'}.png` });
  out[tag] = { tier: r.tier, cellTier: r.cellTier, pointer: r.pointer, T: r.T, whole: r.whole, glass: r.glass, capErr: r.capErr, void: v,
    panels: r.panels.map((q) => ({ kind: q.kind, pane: q.pane, rect: [q.x, q.y, q.w, q.h], title: q.title, lines: q.lines.slice(-6) })), checks: C.list };
  failed += C.failed;
  await ctx.close();
}
writeJson(`tablet-${DPR}.json`, out);
console.log(failed ? `FAILURES: ${failed}` : 'ALL PASS');
await b.close();
