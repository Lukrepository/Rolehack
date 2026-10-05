// shared helpers for the checks
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
// The rule is the web page's own, win/web/layout.js.  RH_LAYOUT=<path> runs the checks
// against another build of it.
const mod = await import(process.env.RH_LAYOUT ? path.resolve(process.env.RH_LAYOUT) : path.join(HERE, '../../../win/web/layout.js'));
export const { deviceCell, bankMetrics, textMetrics } = mod;
// layout() never throws; an older rule might, and the checks report that as an issue
export function layout(W, H, pointer, settings) {
  try { return mod.layout(W, H, pointer, settings); } catch (e) { return { spec: null, info: null, degraded: true, reason: `THROWS: ${e.message}` }; }
}
export const { evaluate } = await import(path.join(HERE, '../harness/eval.mjs'));
export const MM = 0.15875;
// score any landscape/portrait pair with the harness's own parity model (keys renamed so the harness pairs them)
export function pairScore(A, B) {
  const r = evaluate({ name: 'pair', screens: { '896x443': A, '443x939': B }, retired: {} });
  const s = r.pairs[0].summary, lp = s.trainedTaps.landscapeToPortrait, pl = s.trainedTaps.portraitToLandscape;
  return {
    sw: s.thumbSwitches.length, mv: s.movesOver10mm.length, be: s.bearingOver20.length, or: s.orderChanges.length,
    same: lp.same.length, n: s.controls, sameMargin: lp.sameWithMargin?.length, back: pl.same.length, backMargin: pl.sameWithMargin?.length,
  };
}
export const centre = (S, id) => { const c = S.controls.find((k) => k.id === id); return { in: (c.thumb === 'L' ? c.x + c.w / 2 : S.W - c.x - c.w / 2), up: S.H - c.y - c.h / 2 }; };
// the same thumb-frame move for every control between two screens of one orientation
export function moves(A, B) {
  let max = 0, who = '', pad = 0, over10 = 0;
  for (const c of A.controls) {
    if (c.behind) continue;
    const a = centre(A, c.id), b = centre(B, c.id);
    const d = Math.hypot(a.in - b.in, a.up - b.up) * MM;
    if (d > max) { max = d; who = c.id; }
    if (c.id.startsWith('pad_')) pad = Math.max(pad, d);
    if (d > 10) over10++;
  }
  return { max: +max.toFixed(1), who, pad: +pad.toFixed(1), over10 };
}

// The hit model of DESIGN.md section 6, for a spec screen made by layout():
//  1. on a keycap: that key;
//  2. inside a bank's hit region (the bank's box, run out to the screen edges on its outer
//     side and bottom): the nearest keycap, except that rows 0-2 own the gap up to row 3,
//     and that on the action pad the seam between two keycaps (the drawn gap, at least
//     8 dp) swallows;
//  3. within 8 dp of a keycap (the halo): snap to the nearest; 8-12 dp: swallowed;
//     in the gap between the banks the snap is min(8, gap/2 - 2) (8 whenever the gap is the
//     rule's 24 dp or more) and the middle is swallowed;
//  4. on the map: 'map' (the confirm ring's 20 dp next to a halo: 'ring', a preview only);
//  5. else 'none'.
// Bands are not in the model: none comes within 12 dp of a key (the halo wins there).
export const SEAMS = 8;
export function hitModel(S, { seams = SEAMS } = {}) {
  const live = S.controls.filter((c) => !c.behind);
  const banks = {};
  for (const th of ['L', 'R']) {
    const ks = live.filter((c) => c.thumb === th);
    const x0 = Math.min(...ks.map((c) => c.x)), x1 = Math.max(...ks.map((c) => c.x + c.w));
    const y0 = Math.min(...ks.map((c) => c.y)), y1 = Math.max(...ks.map((c) => c.y + c.h));
    const outerLeft = x0 < S.W - x1;
    // rows 0-2 (the pads) own the gap up to row 3's face
    const padRows = ks.filter((c) => c.h >= Math.max(...ks.map((k) => k.h)) - 0.01 && c.y + c.h > y1 - 3 * (c.h + 12));
    const topPad = Math.min(...padRows.map((c) => c.y));
    const r3 = ks.filter((c) => c.y + c.h <= topPad + 0.01);
    const r3Bottom = r3.length ? Math.max(...r3.map((c) => c.y + c.h)) : topPad;
    // the action pad: rows 0-2 of the bank that does not hold the movement pad
    const action = !ks.some((c) => c.kind === 'pad');
    const cols = [...new Set(padRows.map((c) => c.x.toFixed(2)))].map(Number).sort((a, b) => a - b);
    const rows = [...new Set(padRows.map((c) => c.y.toFixed(2)))].map(Number).sort((a, b) => a - b);
    banks[th] = { ks, x0, x1, y0, y1, hx0: outerLeft ? 0 : x0, hx1: outerLeft ? x1 : S.W, hy1: S.H, padRows, topPad, r3Bottom, action, cols, rows, cw: padRows[0].w, ch: padRows[0].h };
  }
  // Seams on the action pad (DESIGN.md section 6, item 1): the seam between two of its
  // keycaps swallows (a tick) instead of tiling to the nearer key -- the drawn gap, widened
  // to at least `seams` dp (8, the halo's snap) where the gap is narrower, so on 360-412 dp
  // phones a near miss of COMBAT or FLICK is swallowed, not CONTEXT or PIN 2 (the verifiers,
  // 2026-10-02).  seams = 'tile' tiles them (the earlier v2 model), 'gap' kills only the
  // drawn gap.
  const inSeam = (B, x, y) => {
    if (seams === 'tile' || !B.action || y < B.topPad || y > B.y1) return false;
    const w = typeof seams === 'number' ? seams : 0;
    const { cols, rows, cw, ch } = B;
    for (let i = 0; i + 1 < cols.length; i++) {
      const a = cols[i] + cw, b = cols[i + 1], m = (a + b) / 2, half = Math.max((b - a) / 2, w / 2);
      if (x > m - half && x < m + half) return true;
    }
    for (let i = 0; i + 1 < rows.length; i++) {
      const a = rows[i] + ch, b = rows[i + 1], m = (a + b) / 2, half = Math.max((b - a) / 2, w / 2);
      if (y > m - half && y < m + half && x >= cols[0] && x <= cols[cols.length - 1] + cw) return true;
    }
    return false;
  };
  const dist = (c, x, y) => Math.hypot(Math.max(c.x - x, 0, x - (c.x + c.w)), Math.max(c.y - y, 0, y - (c.y + c.h)));
  const nearest = (ks, x, y) => ks.reduce((b, c) => { const d = dist(c, x, y); return !b || d < b.d ? { c, d } : b; }, null);
  const between = S.H > S.W ? Math.max(0, Math.min(banks.L.x0, banks.R.x0) === banks.L.x0 ? banks.R.x0 - banks.L.x1 : banks.L.x0 - banks.R.x1) : null;
  return (x, y) => {
    for (const B of Object.values(banks)) if (x >= B.x0 && x <= B.x1 && inSeam(B, x, y)) return 'swallowed';
    const on = live.find((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
    if (on) return on.id;
    for (const B of Object.values(banks)) {
      if (x >= B.hx0 && x <= B.hx1 && y >= B.y0 && y <= B.hy1) {
        if (y > B.r3Bottom && y < B.topPad) return nearest(B.padRows, x, B.topPad).c.id;
        return nearest(B.ks, x, y).c.id;
      }
    }
    const n = nearest(live, x, y);
    let snap = 8;
    if (between != null) {
      const midL = Math.min(banks.L.x1, banks.R.x1), midR = Math.max(banks.L.x0, banks.R.x0);
      if (x > midL && x < midR && y >= Math.min(banks.L.y0, banks.R.y0)) snap = Math.min(8, between / 2 - 2);
    }
    if (n.d <= snap) return n.c.id;
    if (n.d <= 12) return 'swallowed';
    const m = S.mapArea;
    if (x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h) return n.d <= 32 ? 'ring' : 'map';
    return 'none';
  };
}

// Hit-model parity between a landscape and a portrait screen: every point of each bank and
// its 12 dp halo, in that thumb's frame (in from its side edge, up from the bottom), sampled
// on a 1 dp grid; a key must resolve to the same key in both, and a point that fires nothing
// in one (swallowed, ring, map, none) must fire nothing in the other.  Returns the differing
// area in dp² and the commonest differences.
export function hitParity(L, P, step = 1) {
  const hL = hitModel(L), hP = hitModel(P);
  const quiet = (r) => (r === 'swallowed' || r === 'ring' || r === 'map' || r === 'none' ? '·' : r);
  let n = 0, nd = 0;
  const diff = new Map();
  for (const th of ['L', 'R']) {
    const ks = L.controls.filter((c) => !c.behind && c.thumb === th);
    const fr = (c, S) => ({ i1: th === 'L' ? c.x + c.w : S.W - c.x, u1: S.H - c.y });
    const i1 = Math.max(...ks.map((c) => fr(c, L).i1)), u1 = Math.max(...ks.map((c) => fr(c, L).u1));
    for (let i = step / 2; i < i1 + 12; i += step) for (let u = step / 2; u < u1 + 12; u += step) {
      const xL = th === 'L' ? i : L.W - i, yL = L.H - u, xP = th === 'L' ? i : P.W - i, yP = P.H - u;
      if (xL < 0 || xL > L.W || yL < 0 || xP < 0 || xP > P.W || yP < 0) continue;
      const a = quiet(hL(xL, yL)), b = quiet(hP(xP, yP));
      n++;
      if (a !== b) { nd++; const k = `${a}→${b}`; diff.set(k, (diff.get(k) || 0) + 1); }
    }
  }
  const top = [...diff.entries()].sort((p, q) => q[1] - p[1]).slice(0, 4).map(([k, v]) => `${k} ${(v * step * step).toFixed(0)}`);
  return { area: nd * step * step, of: n * step * step, top };
}

const gapOf = (a, b) => Math.hypot(Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)), Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)));
export const overlaps = (a, b, e = 0.01) => a.x + e < b.x + b.w && b.x + e < a.x + a.w && a.y + e < b.y + b.h && b.y + e < a.y + a.h;
export const inside = (a, b, e = 0.01) => a.x >= b.x - e && a.y >= b.y - e && a.x + a.w <= b.x + b.w + e && a.y + a.h <= b.y + b.h + e;

// Every rule a single screen must keep, beyond the harness's own checks.  m: the harness's
// metrics for the screen.  Returns a list of issues (empty when clean).
export function screenIssues(S, m, { pad = null } = {}) {
  const is = [];
  const live = S.controls.filter((c) => !c.behind);
  const touch = S.pointer === 'touch';
  const fit = S.fit || {};
  const scr = { x: 0, y: 0, w: S.W, h: S.H };
  if (touch && pad != null) {
    const minPad = Math.min(...live.filter((c) => c.kind === 'pad').map((c) => Math.min(c.w, c.h)));
    if (minPad < 46 - 1e-6 && !fit.degraded) is.push(`pad ${minPad} under 46 without "degraded"`);
    if (minPad < pad - 1e-6 && fit.level === 'full') is.push(`pad ${minPad} under the setting ${pad} at level "full"`);
  }
  if (m.targets.padsBelowMin.length + m.targets.othersBelowMin.length && !fit.degraded) is.push(`small ${JSON.stringify(m.targets.othersBelowMin.map((x) => `${x.id} ${x.dp}`))}`);
  if (m.overlaps.controls.length) is.push(`key overlaps ${m.overlaps.controls.length}`);
  if (m.overlaps.mapArea.length) is.push(`key on map ${m.overlaps.mapArea}`);
  if (m.overlaps.offScreen.length) is.push(`key off screen ${m.overlaps.offScreen}`);
  if (m.popupsCoveringControls) is.push('pop-up over a key');
  if (m.popupsOffScreen) is.push('pop-up off screen');
  for (const p of S.popups) if (!inside(p, S.mapArea)) is.push(`pop-up outside the map: ${p.label.slice(0, 24)}`);
  if (m.reach && m.reach.beyond75.length) is.push(`beyond 75 mm ${m.reach.beyond75}`);
  if (!inside(S.mapArea, scr)) is.push('map off screen');
  // bands and panels: never over a key, and (touch) never within the 12 dp halo of one
  for (const b of [...S.bands, ...S.chrome]) {
    const nm = (b.name || '').split(' (')[0];
    if (!inside(b, scr)) is.push(`${nm} off screen`);
    if (overlaps(b, S.mapArea)) is.push(`${nm} on the map`);
    for (const c of live) {
      if (overlaps(b, c)) { is.push(`${nm} OVER ${c.id}`); break; }
      if (touch && gapOf(b, c) < 12 - 0.02) { is.push(`${nm} ${gapOf(b, c).toFixed(1)} dp from ${c.id}`); break; }
    }
  }
  if (touch && !fit.degraded) {
    if (!S.popups.some((p) => p.owner === 'world')) is.push('no drawer');
    let best = 1e9, who = '';
    for (const c of live) { const d = gapOf(c, S.mapArea); if (d < best) { best = d; who = c.id; } }
    if (best < 12 - 0.02) is.push(`guard: ${who} ${best.toFixed(1)} dp from the map`);
  }
  return is;
}

// What the page needs before it may draw a spec (DESIGN.md section 12), checked here
// independently of layout.js's own collisions(): every number finite, every key on screen,
// no key on another key or on the map, no band or panel over a key, a map of at least 8x8
// cells (fill: layout()'s info.fill, for the cells shown).  A result that fails must come
// back unusable (the page then shows classic).
export function drawable(S, fill = null) {
  const is = [];
  const live = S.controls.filter((c) => !c.behind);
  const walk = (o, at) => { if (typeof o === 'number' && !Number.isFinite(o)) is.push(`not finite at ${at}`); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, `${at}.${k}`); };
  walk(S, 'spec');
  const m = S.mapArea;
  if (!(m.w > 0 && m.h > 0)) is.push('no map');
  if (fill && (fill.cols < 8 - 1e-6 || fill.rows < 8 - 1e-6)) is.push(`map ${fill.cols.toFixed(1)}x${fill.rows.toFixed(1)} cells`);
  for (const c of live) {
    if (c.x < -0.01 || c.y < -0.01 || c.x + c.w > S.W + 0.01 || c.y + c.h > S.H + 0.01) is.push(`${c.id} off screen`);
    if (m.w > 0 && m.h > 0 && overlaps(c, m)) is.push(`${c.id} on the map`);
  }
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) if (overlaps(live[i], live[j])) is.push(`${live[i].id} on ${live[j].id}`);
  for (const b of [...S.bands, ...S.chrome]) for (const c of live) if (overlaps(b, c)) { is.push(`${(b.name || '').split(' (')[0]} over ${c.id}`); break; }
  return is;
}
