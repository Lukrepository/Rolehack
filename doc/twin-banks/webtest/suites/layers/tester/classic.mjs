// Classic unchanged: the working tree against HEAD (served on 8782), layout
// set to classic, at the four windows: every element of #keys and #case (its
// tag, classes, rect and text), no guard elements, and classic's own
// behaviours -- a hold of REST shows its chip row, the pad centre's hold its
// radial, a map tap beside a key travels at once, PIN 2 starts empty.
//   node classic.mjs <dpr>
import fs from 'node:fs';
import { launch, HOOK, RECORDER, STATE, SIZES, SHOTS, writeJson, Checks, sleep, resume, toucher } from './common.mjs';
import { mark, pushed } from './probe.mjs';

const dpr = Number(process.argv[2] || 1);
const SITES = { work: 'http://localhost:8766', head: 'http://localhost:8782' };
function stateFor(origin) {
  const s = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  const o = s.origins.find((x) => x.origin === 'http://localhost:8766');
  return { cookies: [], origins: [{ ...o, origin, localStorage: o.localStorage.filter((l) => !/^rh\.(budgets|ghostDeck|atkSlots)$/.test(l.name)) }] };
}
async function open(b, site, W, H) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, screen: { width: W, height: H }, deviceScaleFactor: dpr, hasTouch: true, isMobile: true, serviceWorkers: 'block', storageState: stateFor(SITES[site]) });
  await ctx.route('**/web.js', async (route) => {
    const resp = await route.fetch();
    await route.fulfill({ response: resp, body: (await resp.text()) + HOOK, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
  });
  await ctx.addInitScript(RECORDER);
  await ctx.addInitScript(() => { try { localStorage.setItem('rh.layout', JSON.stringify('classic')); } catch (e) { /* none */ } });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); });
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  await p.goto(`${SITES[site]}/index.html`);
  await p.waitForFunction(() => globalThis.__tt && !document.getElementById('boot'), null, { timeout: 60000 });
  await resume(p);
  await sleep(500);
  return { ctx, p };
}
const dom = (p) => p.evaluate(() => {
  const out = [];
  for (const root of ['keys', 'case', 'glass']) {
    const r0 = document.getElementById(root);
    if (!r0) continue;
    const walk = (e, depth) => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      if (cs.display !== 'none') out.push(`${root}|${e.tagName}.${String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className)}|${[r.x, r.y, r.width, r.height].map((v) => v.toFixed(2)).join(',')}|${e.children.length ? '' : (e.textContent || '').trim().slice(0, 24)}`);
      if (depth < 6) for (const c of e.children) walk(c, depth + 1);
    };
    walk(r0, 0);
  }
  return { ui: document.documentElement.dataset.ui, viewport: document.querySelector('meta[name=viewport]').content, items: out };
});

const b = await launch();
const all = [];
for (const [W, H] of SIZES) {
  const C = new Checks(`classic ${dpr} ${W}x${H}`);
  const h = await open(b, 'head', W, H), w = await open(b, 'work', W, H);
  const dh = await dom(h.p), dw = await dom(w.p);
  C.ok('both classic', dh.ui === 'classic' && dw.ui === 'classic', [dh.ui, dw.ui]);
  C.ok('viewport meta the same', dh.viewport === dw.viewport, [dh.viewport, dw.viewport]);
  const sh = new Set(dh.items), sw = new Set(dw.items);
  const onlyH = dh.items.filter((x) => !sw.has(x)), onlyW = dw.items.filter((x) => !sh.has(x));
  // the message and status bands' text follows the game, not the layout
  const noise = (x) => /^glass\|(DIV|SPAN)\.(|slot.*|bar.*|msg.*|line.*|badge.*)\|/.test(x) && false;
  C.ok(`DOM of #keys/#case/#glass identical (${dw.items.length} elements)`, onlyH.length === 0 && onlyW.length === 0, { onlyHead: onlyH.slice(0, 8), onlyWork: onlyW.slice(0, 8), nH: onlyH.length, nW: onlyW.length });
  await h.p.screenshot({ path: `${SHOTS}/classic-${dpr}-${W}x${H}-head.png` });
  await w.p.screenshot({ path: `${SHOTS}/classic-${dpr}-${W}x${H}-work.png` });
  const p = w.p, t = await toucher(w.ctx, p);
  C.ok('no guard elements in classic', await p.evaluate(() => document.querySelectorAll('#keys .halo, #keys .seam, #keys .kcap').length === 0));
  await p.evaluate(() => { globalThis.__swallowAll = true; });
  // REST's hold: its chip row
  const rest = await p.evaluate(() => { const r = globalThis.__tt.overlay.restFace.el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await t.tap(rest.x, rest.y, { hold: 500 }); await sleep(150);
  const chips = await p.evaluate(() => { const o = globalThis.__tt.overlay; return { open: o.chipsOpen, row: o.restChips && o.restChips.row.style.display, layer: o.padLayer || null }; });
  C.ok('REST hold: classic chip row', chips.open && chips.row === 'flex' && !chips.layer, chips);
  await p.evaluate(() => globalThis.__tt.overlay.closeAll());
  // pad centre's hold: the radial
  const pc = await p.evaluate(() => { const r = globalThis.__tt.overlay.padCentre.el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await t.tap(pc.x, pc.y, { hold: 600 }); await sleep(150);
  const rad = await p.evaluate(() => { const o = globalThis.__tt.overlay; return { open: o.ctxRadialOpen, n: o.ctxRadialEl.children.length, layer: o.padLayer || null }; });
  C.ok('pad centre hold: classic radial (5 nodes)', rad.open && rad.n === 5 && !rad.layer, rad);
  await p.evaluate(() => globalThis.__tt.overlay.closeAll());
  await sleep(300);
  // a map tap a few px beside the map's edge nearest a key travels at once (no ring)
  const pt = await p.evaluate(() => {
    const v = globalThis.__tt.view, r = document.getElementById('map').getBoundingClientRect();
    for (let cy = 20; cy >= 0; cy--) for (let cx = 0; cx < 80; cx++) {
      const x = r.left + v.left + (cx + 0.5) * v.T, y = r.top + v.top + (cy + 0.5) * v.T;
      const e = document.elementFromPoint(x, y);
      if (e && e.id === 'map') return { x, y, cx, cy };
    }
    return null;
  });
  if (pt) {
    await p.evaluate(() => globalThis.__tt.resetClocks());
    await mark(p);
    await t.tap(pt.x, pt.y); await sleep(100);
    C.ok('classic map tap travels at once', (await pushed(p)) === `@${pt.cx},${pt.cy}`, { sent: await pushed(p), pt });
  }
  const pin = await p.evaluate(() => { const o = globalThis.__tt.overlay; return o.atkSlotKeys; });
  C.ok('classic PIN slots start empty', Array.isArray(pin) && pin.every((x) => !x), pin);
  C.ok('console clean (work)', w.p.errors.length === 0, w.p.errors.slice(0, 5));
  C.ok('console clean (head)', h.p.errors.length === 0, h.p.errors.slice(0, 5));
  all.push(...C.list);
  await h.ctx.close(); await w.ctx.close();
}
await b.close();
writeJson(`classic-${dpr}.json`, { checks: all });
const f = all.filter((c) => !c.pass);
console.log(`classic ${dpr}: ${all.length - f.length}/${all.length} pass`);
