export async function basics({ p, out }) {
  const r = await p.evaluate(() => {
    const o = globalThis.__bt.overlay, k = document.getElementById('keys').getBoundingClientRect();
    const app = document.getElementById('app').getBoundingClientRect();
    const here = o.constructor && null;
    return {
      ui: document.documentElement.dataset.ui, keys: [k.x, k.y, k.width, k.height], app: [app.x, app.y, app.width, app.height],
      halos: document.querySelectorAll('#keys > .halo').length, seams: document.querySelectorAll('#keys > .seam').length,
      s: o.s, atk: o.atkSlotKeys, ghostOn: o.ghostOn(),
    };
  });
  out(JSON.stringify(r));
}

export async function heregroup({ p, out }) {
  const r = await p.evaluate(async () => {
    const C = await import('./commands.js');
    const g = C.groupById('here');
    return g.items.map((it) => (it ? (it.head || it.word || it.label || JSON.stringify(it)) + ' ' + (it.key || '') : 'UNDEFINED'));
  });
  out(JSON.stringify(r));
}

const brief = (s) => JSON.stringify({ layer: s.layer, pill: s.pill, scrim: s.scrim, pad: s.pad.map((f) => f.t + (f.lit ? '*' : '') + (f.dim ? '~' : '')).join('|'), ctx: s.context, sub: s.contextSub });
const haloZ = (p) => p.evaluate(() => [...document.querySelectorAll('#keys > .halo, #keys > .seam')].map((e) => e.style.zIndex || '-').join(','));

export async function rebuildStates({ p, t, cap, state, sleep, out, w, h, DPR }) {
  // 1. a sticky count from REST, then a turn of the device
  let rest = await cap('rest');
  await t.down([[rest.x, rest.y]]); await sleep(750); await t.up(); await sleep(150);
  out('count before', brief(await state(p)), await haloZ(p));
  await t.rotate(h, w, DPR, [Math.min(w, h), Math.max(w, h)]);
  await sleep(300);
  let s = await state(p);
  out('count after turn', brief(s), await haloZ(p));
  await sleep(4300);
  out('count 4.3 s later', brief(await state(p)));
  await t.rotate(w, h, DPR, [Math.min(w, h), Math.max(w, h)]);
  await sleep(300);
  // 2. HERE from CONTEXT (stairs up + a closed door beside)
  await p.evaluate(() => globalThis.__bt.overlay.setHere(0x04 | 0x08, ''));
  const ctx = await cap('context');
  await t.tap(ctx.x, ctx.y); await sleep(200);
  out('HERE ctx before', brief(await state(p)));
  // light the stairs' first tap
  const up = await cap('pad_k');
  await t.tap(up.x, up.y); await sleep(150);
  out('HERE ctx, up lit', brief(await state(p)));
  await t.rotate(h, w, DPR, [Math.min(w, h), Math.max(w, h)]);
  await sleep(300);
  out('HERE ctx after turn', brief(await state(p)), await haloZ(p));
  await sleep(4300);
  out('HERE ctx 4.3 s later', brief(await state(p)));
  await t.rotate(w, h, DPR, [Math.min(w, h), Math.max(w, h)]);
  await sleep(300);
  // 3. stairs as CONTEXT's one action
  await p.evaluate(() => globalThis.__bt.overlay.setHere(0x04, ''));
  const ctx2 = await cap('context');
  await t.tap(ctx2.x, ctx2.y); await sleep(150);
  out('stairs before', brief(await state(p)));
  await t.rotate(h, w, DPR, [Math.min(w, h), Math.max(w, h)]);
  await sleep(300);
  out('stairs after turn', brief(await state(p)));
  await sleep(2300);
  out('stairs 2.3 s later', brief(await state(p)));
  await t.rotate(w, h, DPR, [Math.min(w, h), Math.max(w, h)]);
  await sleep(300);
  out('end', brief(await state(p)), JSON.stringify(await p.evaluate(() => ({ pushed: (globalThis.__ev || []).length }))));
}

// what a finger-sized touch (radius r) at a point presses: the key pressed,
// the guard's log, and what lies under its centre
export async function fingerProbe(p, t, x, y, r) {
  await p.evaluate(() => { const o = globalThis.__bt.overlay; o.guardLog = []; });
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, radiusX: r, radiusY: r }] });
  await new Promise((res) => setTimeout(res, 30));
  const q = await p.evaluate(([x, y]) => {
    const o = globalThis.__bt.overlay;
    const k = document.querySelector('#keys .k.pressed');
    const tw = k && k.closest('[data-tw]');
    const n = document.elementFromPoint(x, y);
    return { key: k ? (tw ? tw.dataset.tw : 'other') : null, log: (o.guardLog || []).map((g) => g.what).join(','),
      under: n ? (n.id || n.className || n.tagName) : null };
  }, [x, y]);
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await new Promise((res) => setTimeout(res, 20));
  return q;
}

export async function beyondHalo({ p, t, cap, out }) {
  for (const id of ['rest', 'world', 'm2', 'eq_wear', 'menu', 'combat', 'pin2', 'pad_u', 'pad_l', 'inventory']) {
    const c = (await cap(id)).r;
    const row = [];
    for (const d of [6, 10, 14, 18, 22, 26]) {
      // up from the keycap's top edge, and inward (toward the screen's middle)
      const W = await p.evaluate(() => innerWidth);
      const inward = c.cx < W / 2 ? { x: c.x + c.w + d, y: c.cy } : { x: c.x - d, y: c.cy };
      const up = { x: c.cx, y: c.y - d };
      const a = await fingerProbe(p, t, up.x, up.y, 15), b = await fingerProbe(p, t, inward.x, inward.y, 15);
      row.push(`${d}: up ${a.key || a.log || '-'} [${a.under}] in ${b.key || b.log || '-'} [${b.under}]`);
    }
    out(id, '\n   ' + row.join('\n   '));
  }
}

async function winListeners(p) {
  const cdp = await p.context().newCDPSession(p);
  const { result } = await cdp.send('Runtime.evaluate', { expression: 'window' });
  const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
  await cdp.detach();
  const by = {};
  for (const l of listeners) by[l.type] = (by[l.type] || 0) + 1;
  return by;
}

export async function leaks({ p, t, cap, state, sleep, out, w, h, DPR }) {
  out('window listeners at start', JSON.stringify(await winListeners(p)));
  for (let i = 0; i < 3; i++) {
    const world = await cap('world');
    await t.tap(world.x, world.y); await sleep(300);
    const item = await p.evaluate(() => { const k = document.querySelector('#drawer .grid .k'); const r = k.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: k.textContent }; });
    await t.down([[item.x, item.y]]); await sleep(600); await t.up(); await sleep(200);
    const s = await p.evaluate(() => ({ assign: globalThis.__bt.overlay.assign && globalThis.__bt.overlay.assign.word, drawer: globalThis.__bt.overlay.drawerOpen }));
    out('held a drawer item', item.t, JSON.stringify(s));
    await p.keyboard.press('Escape'); await sleep(200);
  }
  out('window listeners after 3 pins', JSON.stringify(await winListeners(p)));
  for (let i = 0; i < 4; i++) { await t.rotate(i % 2 ? w : h, i % 2 ? h : w, DPR, [Math.min(w, h), Math.max(w, h)]); await sleep(300); }
  out('window listeners after 4 turns', JSON.stringify(await winListeners(p)));
}

export async function radii({ p, t, cap, out }) {
  const r = (await cap('rest')).r, m = (await cap('menu')).r, W = await p.evaluate(() => innerWidth);
  for (const rad of [8, 10, 12, 14, 16]) {
    const row = [];
    for (const d of [10, 12, 13, 14, 15, 16, 18, 20]) {
      const a = await fingerProbe(p, t, r.cx, r.y - d, rad);
      const inward = m.cx < W / 2 ? m.x + m.w + d : m.x - d;
      const b = await fingerProbe(p, t, inward, m.cy, rad);
      row.push(`${d}:${a.key || a.log || '-'}/${b.key || b.log || '-'}`);
    }
    out(`radius ${rad}: REST up / MENU in: ${row.join('  ')}`);
  }
}

// the soft keyboard over the banks: every cap tapped with a thumb-sized touch
// sends its own key, and no bank key or guard takes it
export async function softKbd({ p, t, cap, mark, pushed, sleep, out }) {
  const keys = await cap('keys');
  await t.tap(keys.x, keys.y); await sleep(300);
  const on = await p.evaluate(() => document.getElementById('kbd').classList.contains('on'));
  out('soft keyboard on', on);
  const caps = await p.evaluate(() => [...document.querySelectorAll('#kbd .cap')].map((c) => { const r = c.getBoundingClientRect(); return { t: c.textContent.trim(), x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; }));
  out('caps', caps.length, JSON.stringify(caps.slice(0, 3)));
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const bad = [];
  for (const c of caps.filter((c) => /^[a-z]$/.test(c.t)).slice(0, 26)) {
    await mark(p);
    await p.evaluate(() => { globalThis.__bt.overlay.guardLog = []; });
    // a thumb near the cap's lower edge, where the bank lies under the keyboard
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y + c.h / 2 - 3, radiusX: 15, radiusY: 15 }] });
    await sleep(40);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(150);
    const got = await pushed(p), log = await p.evaluate(() => (globalThis.__bt.overlay.guardLog || []).map((g) => g.what).join(','));
    if (got[0] !== c.t || log) bad.push(`${c.t}: pushed ${JSON.stringify(got)} guard ${log}`);
    // whatever the key did, put it away
    await p.keyboard.press('Escape'); await sleep(120);
    for (let i = 0; i < 4; i++) { const m = await p.evaluate(() => globalThis.__bt.moreShown || !document.getElementById('modal').hidden); if (!m) break; await p.keyboard.press('Escape'); await sleep(150); }
  }
  out('caps that misfired', JSON.stringify(bad));
}

export async function switchLayout({ p, t, cap, state, mark, pushed, sleep, out }) {
  const rest = await cap('rest');
  await t.down([[rest.x, rest.y]]); await sleep(750); await t.up(); await sleep(150);
  out('sticky count', JSON.stringify((await state(p)).layer));
  await p.evaluate(() => globalThis.__bt.P.set('layout', 'classic'));
  await sleep(500);
  const c = await p.evaluate(() => {
    const o = globalThis.__bt.overlay;
    return { ui: document.documentElement.dataset.ui, padLayer: o.padLayer, scrim: o.scrim.classList.contains('on'),
      halos: document.querySelectorAll('#keys > .halo, #keys > .seam, #keys .kcap').length, chiprows: document.querySelectorAll('#keys .chiprow').length,
      atk: o.atkSlotKeys, idle: o.idleTimer };
  });
  out('classic', JSON.stringify(c));
  // hold classic's REST: its chip row
  await sleep(4500);
  out('after 4.5 s', JSON.stringify(await p.evaluate(() => ({ chips: globalThis.__bt.overlay.chipsOpen }))));
  await p.evaluate(() => globalThis.__bt.P.set('layout', 'twin'));
  await sleep(500);
  out('twin again', JSON.stringify(await p.evaluate(() => ({ ui: document.documentElement.dataset.ui, atk: globalThis.__bt.overlay.atkSlotKeys, halos: document.querySelectorAll('#keys > .halo').length }))));
}

export async function pinLeak({ p, t, cap, sleep, out }) {
  const pin1 = await cap('pin1');
  await t.tap(pin1.x, pin1.y); await sleep(400);
  const s1 = await p.evaluate(() => { const o = globalThis.__bt.overlay; return { drawer: o.drawerOpen, assigning: o.assigning }; });
  out('PIN 1 tapped', JSON.stringify(s1));
  const item = await p.evaluate(() => { const ks = [...document.querySelectorAll('#drawer .grid .k')]; const k = ks.find((k) => /throw/i.test(k.textContent)) || ks[0]; const r = k.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: k.textContent }; });
  await t.tap(item.x, item.y); await sleep(400);
  out('picked', item.t, JSON.stringify(await p.evaluate(() => ({ atk: globalThis.__bt.overlay.atkSlotKeys, saved: localStorage.getItem('rh.atkSlots') }))));
  await p.evaluate(() => globalThis.__bt.P.set('layout', 'classic'));
  await sleep(500);
  out('classic pins', JSON.stringify(await p.evaluate(() => globalThis.__bt.overlay.atkSlotKeys)));
}

// a ring point 18-26 dp from a key, on a level cell
async function ringPoint(p) {
  return p.evaluate(() => {
    const o = globalThis.__bt.overlay, m = o.twin.spec.mapArea, v = globalThis.__bt.view, r = document.getElementById('map').getBoundingClientRect();
    for (let y = m.y + 4; y < m.y + m.h - 4; y += 2) for (let x = m.x + 4; x < m.x + m.w - 4; x += 2) {
      const d = o.keyDistance(x, y);
      if (d === null || d < 18 || d > 24) continue;
      if (document.elementFromPoint(x, y) !== document.getElementById('map')) continue;
      const cx = Math.floor((x - r.left - v.left) / v.T), cy = Math.floor((y - r.top - v.top) / v.T);
      if (cx >= 0 && cx < 80 && cy >= 0 && cy < 21) return { x, y, d };
    }
    return null;
  });
}

export async function bounce({ p, t, cap, mark, pushed, sleep, out }) {
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const ring = await ringPoint(p);
  out('ring point', JSON.stringify(ring));
  const B = await p.evaluate(() => globalThis.__bt.overlay.twin.guard.banks.L);
  // a halo point beside the left bank: a "key" touch that acts nothing
  const hp = { x: B.outerLeft ? B.x1 + 10 : B.x0 - 10, y: (B.y0 + B.y1) / 2 };
  for (const [gap, hold] of [[20, 30], [60, 30], [60, 90], [90, 60]]) {
    await mark(p);
    await p.evaluate(() => { globalThis.__bt.overlay.guardLog = []; });
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: hp.x, y: hp.y }] });
    await sleep(30);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(gap);
    const since0 = await p.evaluate(() => performance.now() - globalThis.__bt.overlay.keyUpAt);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ring.x, y: ring.y }] });
    await sleep(hold);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(150);
    const r = await p.evaluate(() => ({ log: (globalThis.__bt.overlay.guardLog || []).map((g) => g.what).join(','), gp: !!globalThis.__bt.ghostPreview }));
    out(`ring touch down ~${Math.round(since0)} ms after the key lifted, held ${hold} ms: guard ${r.log}, preview ${r.gp}, pushed ${JSON.stringify(await pushed(p))}`);
    await sleep(2300);
  }
}

export async function afterClose({ p, t, cap, mark, pushed, sleep, out }) {
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const m = await p.evaluate(() => { const a = globalThis.__bt.overlay.twin.spec.mapArea; return { x: a.x + a.w / 2, y: a.y + Math.min(a.h / 2, 60) }; });
  for (const [gap, hold] of [[40, 40], [120, 40], [120, 100], [150, 80]]) {
    const world = await cap('world');
    await t.tap(world.x, world.y); await sleep(300);
    // the drawer's own backdrop, at the screen's top corner, closes it on the lift
    await mark(p);
    await p.evaluate(() => { globalThis.__bt.overlay.guardLog = []; });
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 3, y: 3 }] });
    await sleep(40);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(gap);
    const since = await p.evaluate(() => performance.now() - globalThis.__bt.closedAt);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: m.x, y: m.y }] });
    await sleep(hold);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(150);
    const r = await p.evaluate(() => ({ log: (globalThis.__bt.overlay.guardLog || []).map((g) => g.what).join(','), drawer: globalThis.__bt.overlay.drawerOpen }));
    out(`map touch down ~${Math.round(since)} ms after the drawer closed, held ${hold} ms: drawer ${r.drawer}, guard ${r.log}, pushed ${JSON.stringify(await pushed(p))}`);
    await sleep(300);
  }
}

// --More-- up; a thumb taps the status band 14 dp beside a key of the upper rows
export async function moreBand({ p, t, cap, mark, pushed, sleep, out }) {
  const LONG = Array.from({ length: 14 }, (_, i) => `Clause ${i} of a long message that fills the band.`).join(' ');
  await p.evaluate(() => globalThis.__bt.msg.begin());
  await p.evaluate((x) => globalThis.__bt.msg.put(x), LONG);
  out('settle', await p.evaluate(() => globalThis.__bt.msg.settle()), 'more', await p.evaluate(() => globalThis.__bt.moreShown));
  const W = await p.evaluate(() => innerWidth);
  for (const id of ['sacrifice', 'menu', 'eq_wear', 'm2']) {
    const c = (await cap(id)).r;
    const x = c.cx < W / 2 ? c.x + c.w + 14 : c.x - 14, y = c.cy;
    const under = await p.evaluate(([x, y]) => { const n = document.elementFromPoint(x, y); return n.id || n.className; }, [x, y]);
    await mark(p);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, radiusX: 15, radiusY: 15 }] });
    await sleep(50);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(250);
    const s = await p.evaluate(() => ({ more: globalThis.__bt.moreShown, drawer: globalThis.__bt.overlay.drawerOpen }));
    out(`${id}: touch 14 dp beside it on [${under}] at --More--: pushed ${JSON.stringify(await pushed(p))}, still --More-- ${s.more}, drawer ${s.drawer}`);
    if (s.drawer) { await p.keyboard.press('Escape'); await sleep(150); }
    if (!s.more) await p.evaluate((x) => globalThis.__bt.msg.put(x), LONG);
    await sleep(150);
  }
}

// a double tap on a drawer item: the first runs it and closes the drawer, the
// second lands on the map where the item was
export async function doubleTap({ p, t, cap, mark, pushed, sleep, out, resume }) {
  for (const [gap, hold] of [[110, 60], [130, 90], [150, 70]]) {
    await resume(p);
    await p.evaluate(() => { globalThis.__swallowClicks = true; });
    const world = await cap('world');
    await t.tap(world.x, world.y); await sleep(300);
    const item = await p.evaluate(() => { const k = [...document.querySelectorAll('#drawer .grid .k')].find((k) => /rest one/i.test(k.textContent)); const r = k.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: k.textContent }; });
    const onMap = await p.evaluate(([x, y]) => { const d = document.getElementById('drawer'); d.style.visibility = 'hidden'; const n = document.elementFromPoint(x, y); d.style.visibility = ''; return n && n.id; }, [item.x, item.y]);
    await mark(p);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: item.x, y: item.y }] });
    await sleep(60);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(gap);
    const since = await p.evaluate(() => performance.now() - globalThis.__bt.closedAt);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: item.x + 2, y: item.y + 1 }] });
    await sleep(hold);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(200);
    out(`${item.t} (over ${onMap}): second touch down ~${Math.round(since)} ms after the close, held ${hold}: pushed ${JSON.stringify(await pushed(p))}`);
    await p.evaluate(() => { globalThis.__swallowClicks = false; });
  }
}

export async function restAbove({ p, t, cap, mark, pushed, sleep, out }) {
  const r = (await cap('rest')).r;
  for (const d of [10, 14]) {
    await mark(p);
    await p.evaluate(() => { globalThis.__bt.overlay.guardLog = []; });
    const x = r.cx, y = r.y - d;
    const under = await p.evaluate(([x, y]) => { const n = document.elementFromPoint(x, y); return n.id || n.className; }, [x, y]);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, radiusX: 15, radiusY: 15 }] });
    await sleep(50);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(400);
    out(`thumb ${d} dp above REST's keycap (on ${under}): pushed ${JSON.stringify(await pushed(p))}, guard ${JSON.stringify(await p.evaluate(() => (globalThis.__bt.overlay.guardLog || []).map((g) => g.what)))}`);
  }
}
