// Helpers shared by this stage's checks (layers.mjs, guard.mjs, habits.mjs).
import { sleep } from './common.mjs';

// a key's keycap, as drawn (its .cap inside the hit cell), on screen
export const capOf = (p, id) => p.evaluate((id) => {
  const r = globalThis.__bt.overlay.twinCapRect(id);
  return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
}, id);

export const PAD = ['pad_y', 'pad_k', 'pad_u', 'pad_h', 'pad_centre', 'pad_l', 'pad_b', 'pad_j', 'pad_n'];

// the overlay's state the checks read
export const state = (p) => p.evaluate(() => {
  const o = globalThis.__bt.overlay, L = o.padLayer;
  const face = (i) => { const f = o.padFace(i); return { t: f.lg.textContent, lit: f.el.classList.contains('lit'), dim: f.el.classList.contains('dimmed') }; };
  let counts = {};
  try { counts = JSON.parse(localStorage.getItem('rh.counts') || '{}') || {}; } catch (e) { counts = {}; }
  return {
    layer: L ? { kind: L.kind, from: typeof L.from === 'string' ? L.from : L.fromId || null, sticky: !!L.sticky, lit: L.lit ?? null, place: L.place ?? null, act: L.act ? L.act.id : null } : null,
    fan: o.fanOpen, radial: o.radialOpen, drawer: o.drawerOpen, armed: o.armed ? o.armed.key : null, answering: !!o.answering,
    pad: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(face),
    pill: o.layerPill && o.layerPill.classList.contains('on') ? o.layerPill.textContent : '',
    scrim: o.scrim.classList.contains('on'), counts,
    rest: o.restFace.lg.textContent, search: o.ctxStrip[2].lg.textContent, context: o.ctxStrip[1].lg.textContent,
    contextSub: o.ctxStrip[1].fr.textContent,
    more: globalThis.__bt.moreShown, waiting: globalThis.__bt.waiting, commandWait: globalThis.__bt.commandWait,
    modal: globalThis.__bt.modalOpen, form: !document.getElementById('formwrap').hidden,
    log: (o.guardLog || []).slice(-5).map((g) => `${g.what}${g.id ? `:${g.id}` : ''}`),
  };
});

// the keys pushed to the core since the mark, as text (a click as @x,y)
export const mark = (p) => p.evaluate(() => { globalThis.__ev = []; globalThis.__clicks = []; });
export const pushed = (p) => p.evaluate(() => (globalThis.__ev || []).map((e) => (e.click ? `@${e.click.x},${e.click.y}`
  : e.ext ? `#${e.ext}` : e.key < 32 ? `^${String.fromCharCode(e.key + 64)}` : e.key >= 128 ? `M-${String.fromCharCode(e.key - 128)}` : String.fromCharCode(e.key))).join(''));

// Every pop-up the page shows, with its rect: none may lie on a keycap, and
// each must lie inside the map area (the design's section 8 and 14).
export const popups = (p) => p.evaluate(() => {
  const o = globalThis.__bt.overlay, out = [];
  const vis = (e) => { if (!e) return false; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.01 && r.width > 0 && r.height > 0; };
  const add = (name, e) => { if (vis(e)) { const r = e.getBoundingClientRect(); out.push({ name, x: r.x, y: r.y, w: r.width, h: r.height }); } };
  add('pill', o.layerPill);
  add('flash', o.flashEl);
  add('ghost', o.ghostEl);
  add('banner', o.banner && o.banner.el);
  add('scrimhint', o.scrim.classList.contains('on') && o.scrimHint.textContent ? o.scrimHint : null);
  for (const [i, n] of (o.flickNodes || []).entries()) if (o.radialOpen) add(`legend${i}`, n.capEl || n.el);
  if (o.drawerOpen) add('drawer', o.drawerEl.querySelector('.panel'));
  const chips = document.getElementById('chips');
  for (const c of chips.children) add('chip', c);
  for (const r of document.querySelectorAll('#keys .chiprow')) add('chiprow', r);
  if (o.ctxRadialOpen) add('radial', o.ctxRadialEl);
  if (o.candOpen) add('cand', o.candEl);
  const caps = [...o.twin.keys.keys()].filter((id) => id !== 'longrest').map((id) => { const r = o.twinCapRect(id); return { id, x: r.x, y: r.y, w: r.width, h: r.height }; });
  const m = o.twin.spec.mapArea;
  const ov = (a, b) => a.x + 0.5 < b.x + b.w && b.x + 0.5 < a.x + a.w && a.y + 0.5 < b.y + b.h && b.y + 0.5 < a.y + a.h;
  const bad = [];
  for (const q of out) {
    for (const c of caps) if (ov(q, c)) bad.push(`${q.name} over ${c.id}`);
    if (q.x < m.x - 1 || q.y < m.y - 1 || q.x + q.w > m.x + m.w + 1 || q.y + q.h > m.y + m.h + 1) bad.push(`${q.name} outside the map ${[q.x, q.y, q.w, q.h].map(Math.round)}`);
  }
  return { shown: out.map((q) => q.name), bad };
});

// a slide from one point to another in steps, the finger down throughout
export async function slide(t, from, to, steps = 10) {
  await t.down([[from.x, from.y]]);
  return {
    async go() {
      for (let i = 1; i <= steps; i++) { await t.move([[from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps]]); await sleep(16); }
    },
  };
}

export class Checks {
  constructor(tag) { this.tag = tag; this.list = []; }
  ok(name, pass, detail = '') {
    this.list.push({ name, pass: !!pass, detail });
    console.log(`${pass ? 'ok  ' : 'FAIL'} ${this.tag} ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
    return pass;
  }
  get failed() { return this.list.filter((c) => !c.pass).length; }
}
