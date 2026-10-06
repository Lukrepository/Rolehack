// In-page probes for the behaviour checks (layers.mjs, states.mjs).
import { sleep } from './common.mjs';

export const PAD = ['pad_y', 'pad_k', 'pad_u', 'pad_h', 'pad_centre', 'pad_l', 'pad_b', 'pad_j', 'pad_n'];

// the keycap of a control as drawn, and its centre
export const cap = (p, id) => p.evaluate((id) => {
  const o = globalThis.__tt.overlay;
  const r = o.twinCapRect(id);
  return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
}, id);

export const spec = (p) => p.evaluate(() => globalThis.__tt.overlay.twin.spec);

export const mark = (p) => p.evaluate(() => {
  globalThis.__ev = []; globalThis.__downs = [];
  const o = globalThis.__tt.overlay; o.guardLog = [];
});

// what reached the core since the mark: keys as text, clicks as @x,y
export const pushed = (p) => p.evaluate(() => (globalThis.__ev || []).map((e) => (e.click ? `@${e.click.x},${e.click.y}`
  : e.ext ? `#${e.ext}` : e.key === undefined ? '?' : e.key < 32 ? `^${String.fromCharCode(e.key + 64)}` : e.key >= 128 ? `M-${String.fromCharCode(e.key - 128)}` : String.fromCharCode(e.key))).join(''));

export const state = (p) => p.evaluate(() => {
  const R = globalThis.__tt, o = R.overlay, L = o.padLayer;
  const face = (i) => { const f = o.padFace(i); return f ? { t: f.lg.textContent, lit: f.el.classList.contains('lit'), dim: f.el.classList.contains('dimmed') } : null; };
  let counts = {};
  try { counts = JSON.parse(localStorage.getItem('rh.counts') || '{}') || {}; } catch (e) { counts = {}; }
  return {
    layer: L ? { kind: L.kind, from: typeof L.from === 'string' ? L.from : (L.fromId || null), sticky: !!L.sticky, lit: L.lit ?? null, place: L.place ?? null, act: L.act ? L.act.id : null } : null,
    fan: o.fanOpen ? (o.fanOpen.id || String(o.fanOpen)) : null, radial: o.radialOpen, drawer: o.drawerOpen || null, armed: !!o.armed,
    assign: !!o.assign, answering: !!o.answering, picking: !!o.picking,
    pad: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(face),
    pill: o.layerPill && o.layerPill.classList.contains('on') ? o.layerPill.textContent : '',
    scrim: o.scrim.classList.contains('on'), counts,
    more: R.moreShown, waiting: R.waiting, commandWait: R.commandWait, modal: R.modalOpen,
    form: !document.getElementById('formwrap').hidden, preview: R.ghostPreview ? { x: R.ghostPreview.x, y: R.ghostPreview.y, ring: !!R.ghostPreview.ring } : null,
    log: (o.guardLog || []).map((g) => `${g.what}${g.id ? `:${g.id}` : ''}`),
    downs: (globalThis.__downs || []).map((d) => d.id),
    rest: o.restFace.lg.textContent, restRevealed: !!(o.restWell && o.restWell.revealed),
  };
});

export const reset = (p) => p.evaluate(() => {
  const R = globalThis.__tt, o = R.overlay;
  o.closeAll(); o.disarm(); o.cancelAssignment();
  if (o.restWell && o.restWell.revealed) o.scrollWell(false);
  if (R.kbdOn()) R.showKeyboard(false);
  if (R.modalOpen) R.closeModal();
  if (!document.getElementById('formwrap').hidden) document.getElementById('formwrap').hidden = true;
  R.clearPreview();
  R.resetClocks();
  globalThis.__ev = []; globalThis.__downs = []; o.guardLog = [];
});

// Every pop-up shown, with its rect; none may lie on a keycap, and each must
// lie inside the map area (the design's sections 8 and 14).  The layer's
// frame round the pad is the pad's own outline, not a pop-up.
export const popups = (p) => p.evaluate(() => {
  const o = globalThis.__tt.overlay, out = [];
  const vis = (e) => {
    if (!e || !e.isConnected) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.01 && r.width > 0 && r.height > 0;
  };
  const add = (name, e) => { if (vis(e)) { const r = e.getBoundingClientRect(); out.push({ name, x: r.x, y: r.y, w: r.width, h: r.height }); } };
  add('pill', o.layerPill);
  add('flash', o.flashEl);
  add('ghost', o.ghostEl);
  if (o.scrim.classList.contains('on')) add('scrimhint', o.scrimHint);
  if (o.radialOpen) for (const [i, n] of (o.flickNodes || []).entries()) add(`legend${i}`, n.capEl || n.el);
  if (o.drawerOpen && o.drawerEl) add('drawer', o.drawerEl.querySelector('.panel') || o.drawerEl);
  for (const c of document.getElementById('chips').children) add('chip', c);
  for (const r of document.querySelectorAll('#keys .chiprow')) add('chiprow', r);
  for (const r of document.querySelectorAll('#keys > .pop')) for (const c of r.children) if (!c.dataset.tw) add('pop', c);
  if (o.ctxRadialOpen) add('ctxradial', o.ctxRadialEl);
  if (o.candOpen) add('cand', o.candEl);
  const fb = o.layerFrame && o.layerFrame.firstChild;
  if (fb) add('framechip', fb);
  const caps = [...o.twin.keys.keys()].filter((id) => id !== 'longrest').map((id) => { const r = o.twinCapRect(id); return { id, x: r.x, y: r.y, w: r.width, h: r.height }; });
  const m = o.twin.spec.mapArea;
  const ov = (a, b) => a.x + 0.5 < b.x + b.w && b.x + 0.5 < a.x + a.w && a.y + 0.5 < b.y + b.h && b.y + 0.5 < a.y + a.h;
  const bad = [];
  for (const q of out) {
    for (const c of caps) if (ov(q, c)) bad.push(`${q.name} over ${c.id}`);
    if (q.name !== 'scrimhint' && (q.x < m.x - 1 || q.y < m.y - 1 || q.x + q.w > m.x + m.w + 1 || q.y + q.h > m.y + m.h + 1)) bad.push(`${q.name} outside the map ${[q.x, q.y, q.w, q.h].map(Math.round)}`);
  }
  return { shown: out.map((q) => q.name), bad, rects: out };
});

// a map cell's centre on screen, (cx, cy) in level cells
export const cellAt = (p, cx, cy) => p.evaluate(([cx, cy]) => {
  const v = globalThis.__tt.view, r = document.getElementById('map').getBoundingClientRect();
  return { x: r.left + v.left + (cx + 0.5) * v.T, y: r.top + v.top + (cy + 0.5) * v.T, T: v.T };
}, [cx, cy]);
// the level cell at a screen point
export const cellOf = (p, x, y) => p.evaluate(([x, y]) => {
  const v = globalThis.__tt.view, r = document.getElementById('map').getBoundingClientRect();
  return { cx: Math.floor((x - r.left - v.left) / v.T), cy: Math.floor((y - r.top - v.top) / v.T) };
}, [x, y]);

export const waitFor = async (p, fn, arg, ms = 3000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await p.evaluate(fn, arg)) return true; await sleep(50); }
  return false;
};
