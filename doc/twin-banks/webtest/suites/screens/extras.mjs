// Beyond the stage's list, the panels' edges:
//  A. a 48-line pack (8 classes x 5 items) at each tablet-tier window: all of
//     it reachable (scroll), nothing cut sideways, no item split between
//     columns, each heading with its first item, the panel never larger than its rect;
//  B. a tap on the inventory panel's first item opens the inventory and
//     nothing in it (no click through to the window that opens);
//  C. the mouse wheel over a panel scrolls it and never zooms the map;
//  D. a panel's scroll survives a re-layout with no tier change;
//  E. at --More--, a tap on a panel is Space;
//  F. 5120x1440 (32:9): the log and the inventory beside the map.
//   node extras.mjs <dpr>
import { launch, newCtx, openPage, resume, settle, sleep, Checks, SHOTS, writeJson, ov, r1 } from './common.mjs';
import { readPage, expected, gap } from './lib.mjs';

const dpr = Number(process.argv[2] || 1);
const b = await launch();
const all = [];
const SCREEN = { width: 5120, height: 2160 };

async function open(w, h, touch, screen = null) {
  const ctx = await newCtx(b, { w, h, dpr, touch, screen: screen || { width: w, height: h } });
  const p = await openPage(ctx);
  const cdp = await ctx.newCDPSession(p);
  p.resizeTo = (W, H) => cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: dpr, mobile: touch,
    screenWidth: (screen || { width: w }).width, screenHeight: (screen || { height: h }).height });
  await resume(p);
  await sleep(500);
  return { ctx, p };
}
const tapAt = async (p, touch, x, y) => { if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); };

// a 48-line pack from the real one's items
const bigPack = (p) => p.evaluate(() => {
  const R = globalThis.__ts, real = R.invMenu.items, item = real.find((i) => i.selectable), head = real.find((i) => !i.selectable);
  const classes = ['Weapons', 'Armor', 'Rings', 'Amulets', 'Potions', 'Scrolls', 'Spellbooks', 'Tools'];
  const items = [];
  let ch = 97;
  for (const c of classes) {
    items.push({ ...head, text: c });
    for (let i = 0; i < 5; i++) {
      items.push({ ...item, ch: ch, text: `${c.toLowerCase()} item ${i + 1}: an uncursed +0 pair of hard shoes (being worn)` });
      ch = ch === 122 ? 65 : ch + 1;
    }
  }
  R.fakeInventory(items);
  return items.filter((i) => i.selectable).length;
});
const packGeom = (p) => p.evaluate(() => {
  const e = document.querySelector('.rhpanel[data-kind="inventory"]'), body = e.querySelector('.pbody');
  const rr = (x) => { const r = x.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const els = [...body.querySelectorAll('.pi, .ph')];
  const split = els.filter((x) => x.getClientRects().length > 1).map((x) => x.textContent.slice(0, 30));
  // a heading and the item after it: same column, the item right under it
  const orphan = [];
  els.forEach((x, i) => { if (x.classList.contains('ph') && els[i + 1]) { const a = x.getBoundingClientRect(), c = els[i + 1].getBoundingClientRect(); if (Math.abs(a.x - c.x) > 2 || c.y < a.y) orphan.push(x.textContent); } });
  const cutX = !('wide' in e.dataset) && body.scrollWidth > body.clientWidth + 1;
  return { panel: rr(e), body: rr(body), wide: 'wide' in e.dataset, sh: body.scrollHeight, ch: body.clientHeight, sw: body.scrollWidth, cw: body.clientWidth,
    split, orphan, cutX, n: els.filter((x) => x.classList.contains('pi')).length, cols: new Set(els.map((x) => Math.round(x.getBoundingClientRect().x))).size };
});
// scroll the pack to its end and see whether its last item is inside the panel's box
const lastVisible = (p) => p.evaluate(() => {
  const e = document.querySelector('.rhpanel[data-kind="inventory"]'), body = e.querySelector('.pbody');
  body.scrollTop = body.scrollHeight; body.scrollLeft = body.scrollWidth;
  const its = body.querySelectorAll('.pi'), last = its[its.length - 1].getBoundingClientRect(), b = body.getBoundingClientRect();
  const ok = last.x >= b.x - 1 && last.right <= b.right + 1 && last.y >= b.y - 1 && last.bottom <= b.bottom + 1;
  body.scrollTop = 0; body.scrollLeft = 0;
  return { ok, last: [last.x, last.y, last.width, last.height], body: [b.x, b.y, b.width, b.height] };
});

// ---- A, B, C, D at the tablet-tier windows
for (const [w, h, input] of [[1024, 768, 'touch'], [768, 1024, 'touch'], [1366, 768, 'touch'], [1920, 1080, 'mouse'], [2560, 1440, 'mouse'], [3440, 1440, 'mouse']]) {
  const touch = input === 'touch', tag = `${w}x${h}${touch ? '' : '-mouse'}@${dpr}`;
  const C = new Checks(`extras-${tag}`);
  const { ctx, p } = await open(w, h, touch);
  const s0 = await readPage(p);
  const invRect0 = s0.panels.find((q) => q.kind === 'inventory');
  // B first, on the real pack: a tap on its first item
  const first = await p.evaluate(() => { const r = document.querySelector('.rhpanel[data-kind="inventory"] .pi').getBoundingClientRect(); return { x: r.x + 40, y: r.y + r.height / 2 }; });
  await p.evaluate(() => { globalThis.__ev = []; });
  await tapAt(p, touch, first.x, first.y);
  await sleep(800);
  const opened = await p.evaluate(() => ({ modal: globalThis.__ts.modalOpen, title: document.getElementById('modal-title').textContent,
    body: document.getElementById('modal-body').innerText.replace(/\s+/g, ' ').slice(0, 160), ev: (globalThis.__ev || []).map((e) => e.key ?? e) }));
  C.ok('B. a tap on the first item opens the inventory, and only that', opened.modal && /Weapons/.test(opened.body) && opened.ev.length === 1 && opened.ev[0] === 105, opened);
  await p.keyboard.press('Escape'); await sleep(300);
  // did anything get picked or start after the close?
  const after = await p.evaluate(() => ({ modal: globalThis.__ts.modalOpen, ev: (globalThis.__ev || []).map((e) => e.key ?? e), msg: document.getElementById('msgband').innerText }));
  C.ok('B. nothing more after the inventory closes', !after.modal && after.ev.length <= 2, after);
  await settle(p);
  // A. the big pack
  const n = await bigPack(p);
  await sleep(300);
  const g = await packGeom(p);
  C.ok(`A. 40 items drawn (${g.wide ? `${g.cols} columns` : 'one column'})`, g.n === n, { n: g.n, want: n });
  C.ok('A. the panel keeps its rect', Math.abs(g.panel.w - invRect0.w) < 0.01 && Math.abs(g.panel.h - invRect0.h) < 0.01, { before: r1(invRect0), after: r1(g.panel) });
  C.ok('A. no item split between columns, each heading with its first item', !g.split.length && !g.orphan.length, { split: g.split, orphan: g.orphan });
  C.ok('A. nothing cut off sideways', !g.cutX, { sw: g.sw, cw: g.cw });
  const lv = await lastVisible(p);
  C.ok('A. the last item can be scrolled into the panel', lv.ok, lv);
  await p.screenshot({ path: `${SHOTS}/extras-pack-${tag}.png` });
  // C. the wheel over the panels scrolls them and leaves the map's zoom alone (mouse windows)
  if (!touch) {
    const z0 = await p.evaluate(() => ({ z: globalThis.__ts.P.get('zoomFactor'), T: globalThis.__ts.view.T }));
    for (const kind of ['inventory', 'log']) {
      const q = (await readPage(p)).panels.find((x) => x.kind === kind && x.vis);
      if (!q) continue;
      await p.mouse.move(q.x + q.w / 2, q.y + q.h / 2);
      for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, 300); await sleep(50); }
      await p.mouse.wheel(0, -100); await sleep(200);
    }
    const z1 = await p.evaluate(() => ({ z: globalThis.__ts.P.get('zoomFactor'), T: globalThis.__ts.view.T }));
    C.ok('C. the wheel over the panels never zooms the map', JSON.stringify(z0) === JSON.stringify(z1), { z0, z1 });
  }
  // D. scroll kept across a re-layout that keeps the tier (8 px wider, then back)
  const scrolled = await p.evaluate(() => { const b = document.querySelector('.rhpanel[data-kind="inventory"] .pbody'); if (b.scrollHeight > b.clientHeight) b.scrollTop = 60; else b.scrollLeft = 120; return { t: b.scrollTop, l: b.scrollLeft }; });
  await p.resizeTo(w + 8, h); await sleep(500);
  const kept = await p.evaluate(() => { const b = document.querySelector('.rhpanel[data-kind="inventory"] .pbody'); return { t: b.scrollTop, l: b.scrollLeft, tier: document.documentElement.dataset.tier }; });
  C.ok('D. the inventory keeps its scroll through a re-layout', kept.tier === 'tablet' && Math.abs(kept.t - scrolled.t) < 2 && Math.abs(kept.l - scrolled.l) < 2, { scrolled, kept });
  await p.resizeTo(w, h); await sleep(500);
  // E. --More--: a burst of messages through the page's own path, then a tap on a panel
  const sNow = await readPage(p);
  await p.evaluate(() => globalThis.__ts.msg.begin());
  let more = false;
  for (let i = 0; i < 12 && !more; i++) {
    await p.evaluate((i) => globalThis.__ts.msg.put(`Message number ${i + 1} of a burst long enough to fill the band of a tablet and ask for more.`), i);
    await p.evaluate(() => globalThis.__ts.msg.settle());
    more = await p.evaluate(() => globalThis.__ts.moreShown);
  }
  C.ok('E. --More-- shown', more);
  if (more) {
    const q = sNow.panels.find((x) => x.kind === 'inventory' && x.vis);
    await p.evaluate(() => { globalThis.__ev = []; });
    await tapAt(p, touch, q.x + q.w / 2, q.y + 20);
    await sleep(300);
    const r = await p.evaluate(() => ({ more: globalThis.__ts.moreShown, modal: globalThis.__ts.modalOpen, ev: (globalThis.__ev || []).map((e) => e.key) }));
    C.ok('E. a tap on the inventory panel at --More-- is Space (not i)', !r.modal && !r.ev.includes(105), r);
    await p.screenshot({ path: `${SHOTS}/extras-more-${tag}.png` });
  }
  for (let i = 0; i < 20; i++) { if (!(await p.evaluate(() => globalThis.__ts.moreShown))) break; await p.keyboard.press('Space'); await sleep(100); }
  await p.evaluate(() => globalThis.__ts.msg.end());
  C.ok('no console errors', !p.errors.length, p.errors.slice(0, 4));
  all.push(...C.list);
  await ctx.close();
}

// ---- F. 32:9: the panels beside the map
if (dpr === 1) {
  const C = new Checks('extras-5120x1440-mouse@1');
  const { ctx, p } = await open(5120, 1440, false);
  const s = await readPage(p);
  const m = s.spec.mapArea, log = s.panels.find((q) => q.kind === 'log' && q.vis), inv = s.panels.find((q) => q.kind === 'inventory' && q.vis);
  C.ok('F. tablet tier', s.tier === 'tablet', s.tier);
  C.ok('F. the log left of the map and the inventory right of it', log && inv && log.x + log.w <= m.x + 0.5 && inv.x >= m.x + m.w - 0.5, { map: r1(m), log: log && r1(log), inv: inv && r1(inv) });
  const caps = Object.entries(s.keys).filter(([id]) => id !== 'longrest').map(([id, k]) => ({ id, ...k }));
  const bad = [];
  for (const q of [log, inv].filter(Boolean)) for (const c of caps) if (gap(q, c) < 11.9) bad.push(`${q.kind} ${gap(q, c).toFixed(1)} from ${c.id}`);
  C.ok('F. panels 12 dp clear of every key', !bad.length, bad.slice(0, 5));
  await p.screenshot({ path: `${SHOTS}/extras-5120x1440-mouse@1.png` });
  C.ok('no console errors', !p.errors.length, p.errors.slice(0, 4));
  all.push(...C.list);
  await ctx.close();
}
writeJson(`extras-${dpr}.json`, all);
console.log(`\nextras dpr ${dpr}: ${all.filter((c) => c.pass).length} pass, ${all.filter((c) => !c.pass).length} fail`);
for (const f of all.filter((c) => !c.pass)) console.log(`  FAIL ${f.tag} ${f.name}`);
await b.close();
