// What a window should look like, computed here from layout.js alone (the
// rule as code), with the budget worked out by this file's own reading of the
// design's section 12 rather than viewer.js's; and the page's state read
// from the DOM.
import { layout, textMetrics } from '/home/user/Rolehack/win/web/layout.js';
import { ov } from './common.mjs';

// The budget a fresh device (no stored entry) gets for a window that fills its
// screen: portrait -> {w: W, h: short - (long - H), l: long} when the bars are
// at most 150; landscape -> {w: short, h: H, l: W}.  It is a guess, so the
// layout without it wins when the guess costs a key size, degrades, or is unusable.
export function expected(W, H, { screen = null, prefs = {}, prev = null } = {}) {
  const sw = screen ? screen.w : W, sh = screen ? screen.h : H;
  const short = Math.min(sw, sh), long = Math.max(sw, sh);
  const t = textMetrics({ msgFont: prefs.msgFont === 'screen' ? 'screen' : 'atkinson', msgSize: prefs.msgSize || 1, textScale: 1, xHeight: 9.5 });
  const base = { padKey: prefs.padCell || 58, insets: { l: 0, r: 0, t: 0, b: 0 }, msgRowH: t.msgRowH, statusH: 48,
    mapCell: prefs.mapCell === 'rows' ? 'rows' : 'columns', prevTier: prev?.tier ?? null, prevCellTier: prev?.cellTier ?? null };
  let budget = null;
  if (H > W) { if (W >= short - 8 && long - H <= 150) budget = { w: W, h: Math.max(1, short - (long - H)), l: long }; }
  else if (W >= 0.85 * long) budget = { w: short, h: H, l: W };
  const alone = layout(W, H, 'touch', { ...base, budget: null, sideInsets: null });
  if (!budget) return alone;
  const g = layout(W, H, 'touch', { ...base, budget, sideInsets: null });
  const worse = alone.usable && (!g.usable || g.spec.fit.pad < alone.spec.fit.pad - 1e-6 || (g.spec.fit.degraded && !alone.spec.fit.degraded));
  return worse ? alone : g;
}

export const panelKind = (name) => (/^panel: inventory/.test(name) ? 'inventory' : /^panel: message log/.test(name) ? 'log' : null);

// Void: the share of the window covered by none of the given rects (a 1 CSS px raster).
export function voidShare(W, H, rects) {
  const w = Math.ceil(W), h = Math.ceil(H), m = new Uint8Array(w * h);
  for (const r of rects) {
    const x0 = Math.max(0, Math.round(r.x)), y0 = Math.max(0, Math.round(r.y));
    const x1 = Math.min(w, Math.round(r.x + r.w)), y1 = Math.min(h, Math.round(r.y + r.h));
    for (let y = y0; y < y1; y++) m.fill(1, y * w + x0, y * w + Math.max(x0, x1));
  }
  let z = 0;
  for (let i = 0; i < m.length; i++) if (!m[i]) z++;
  return z / m.length;
}

// the harness's void (design/harness/eval.mjs): not under the map area, a band,
// chrome, or a control grown by a 12 dp gutter
export function harnessVoid(spec) {
  const g = 12, rects = [spec.mapArea, ...spec.bands, ...spec.chrome];
  for (const c of spec.controls) if (!c.behind) rects.push({ x: c.x - g, y: c.y - g, w: c.w + 2 * g, h: c.h + 2 * g });
  return voidShare(spec.W, spec.H, rects);
}

export const gap = (a, b) => {
  const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), dy = Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h));
  return Math.hypot(dx, dy);
};
export const near = (a, b, tol) => ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) <= tol);
export const maxDiff = (a, b) => Math.max(...['x', 'y', 'w', 'h'].map((k) => Math.abs(a[k] - b[k])));

// Read the page: every key's drawn keycap, the bands, the canvas, the panels,
// the tier, and hit-tests at the centre of each.
export const readPage = (p) => p.evaluate(() => {
  const R = globalThis.__ts, o = R.overlay, $ = (id) => document.getElementById(id);
  const rr = (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const vis = (e) => { if (!e || !e.isConnected) return false; const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const keys = {};
  for (const e of document.querySelectorAll('#keys [data-tw]')) {
    const id = e.dataset.tw;
    let cap = e.querySelector(':scope > .kcap');
    if (id === 'rest') { const r = o.twinCapRect('rest'); keys[id] = { x: r.x, y: r.y, w: r.width, h: r.height, vis: true }; continue; }
    keys[id] = { ...rr(cap || e), vis: vis(e) };
  }
  // hit-test: what a tap at each keycap's centre reaches
  const hits = {};
  for (const [id, k] of Object.entries(keys)) {
    if (id === 'longrest') continue;
    const t = document.elementFromPoint(k.x + k.w / 2, k.y + k.h / 2);
    const owner = t && t.closest('[data-tw]');
    hits[id] = owner ? owner.dataset.tw : (t ? `${t.tagName}#${t.id}.${t.className}` : null);
  }
  const panels = [...document.querySelectorAll('.rhpanel')].map((e) => {
    const r = rr(e), body = e.querySelector('.pbody'), t = document.elementFromPoint(r.x + r.w / 2, r.y + r.h / 2);
    return { kind: e.dataset.kind, ...r, vis: vis(e), inGlass: !!e.closest('#glass'), pane: e.dataset.pane !== undefined,
      wide: e.dataset.wide !== undefined,
      title: e.querySelector('.ptitle') && !e.querySelector('.ptitle').hidden ? e.querySelector('.ptitle').textContent : null,
      lines: [...body.querySelectorAll('.pl, .pi, .ph, .pnote')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()),
      scrollH: body.scrollHeight, clientH: body.clientHeight, scrollW: body.scrollWidth, clientW: body.clientWidth,
      scrollTop: body.scrollTop, scrollLeft: body.scrollLeft, font: getComputedStyle(e).fontSize,
      hit: t ? (t.closest('.rhpanel') === e ? 'self' : `${t.tagName}#${t.id}.${t.className}`) : null };
  });
  const cv = $('map');
  const bandHit = (e) => { const r = rr(e); const t = document.elementFromPoint(r.x + r.w / 2, r.y + r.h / 2); return t && e.contains(t) ? 'self' : t ? `${t.tagName}#${t.id}` : null; };
  return {
    W: window.innerWidth, H: window.innerHeight, dpr: devicePixelRatio,
    ui: document.documentElement.dataset.ui, tier: document.documentElement.dataset.tier || null,
    spec: o.twin ? JSON.parse(JSON.stringify(o.twin.spec)) : null, settings: o.twin ? JSON.parse(JSON.stringify(o.twin.settings)) : null,
    info: o.twin ? { tier: o.twin.info.tier, T: o.twin.info.T, DC: o.twin.info.DC, budget: o.twin.budget } : null,
    keys, hits, panels,
    msgband: { ...rr($('msgband')), hit: bandHit($('msgband')) }, statband: { ...rr($('statband')), hit: bandHit($('statband')) },
    canvas: rr(cv), glass: rr($('glass')), T: R.tileSize(), view: { T: R.view.T, left: R.view.left, top: R.view.top },
    perm: R.permInvent, inv: R.invMenu ? R.invMenu.items.map((i) => ({ sel: !!i.selectable, ch: i.ch, text: i.text })) : null,
    history: R.history.slice(), msgText: $('msgband').innerText, scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight,
  };
});

export { ov };
