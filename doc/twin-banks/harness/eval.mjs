#!/usr/bin/env node
// eval.mjs: score a Rolehack touch-layout proposal the way the 29 Sep 2026 audit scored the
// current build (audit/parity.mjs, audit/AUDIT.md sections 1.4, 3, 4, 5).  No dependencies.
//
//   node eval.mjs <spec.json> [--baseline baseline.json]
//
// Writes next to the spec: <spec>.report.json, <spec>.report.md, <spec>.<W>x<H>.svg per screen.
// The spec format and every metric are described in SPEC.md.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---- the audit's model (audit/parity.json "model"), unchanged -------------------------
export const MM = 25.4 / 160;                                   // mm per dp = 0.15875
export const T = {
  moveMm: 10, bearingDeg: 20, orderTolMm: 5, moverTieMm: 1,
  baseMm: 15, comfortMm: 60, stretchMm: 75, thumbSwitchBase: 6, missPenalty: 1,
};
export const TIER = { A: 1, B: 0.4, C: 0.15 };
// ---- the per-screen checks this harness adds ------------------------------------------
export const CHECK = {
  tapMarginDp: 3,          // robust trained tap: the spot must sit this far inside the key
  tapScatterMm: 1,         // expected hits under isotropic Gaussian tap scatter of this sigma
  padMinDp: 46,            // movement keys (kind "pad") below this are flagged on touch screens
  targetMinDp: 44,         // any other touch target below this is flagged on touch screens
  gutterDp: 12,            // void: each control is allowed this much clear space round it
  textCell: { w: 12, h: 19 }, tileDp: 16, cols: 80, rows: 21,
};
export const CANONICAL = [
  'pad_y', 'pad_k', 'pad_u', 'pad_h', 'pad_centre', 'pad_l', 'pad_b', 'pad_j', 'pad_n',
  'rest', 'longrest', 'msgs', 'sacrifice', 'm1', 'drop', 'pin1',
  'combat', 'pin2', 'flick', 'look', 'context', 'menu', 'world', 'game', 'keys',
  'inventory', 'eq_wear', 'eq_puton', 'eq_wield', 'eq_takeoff', 'eq_remove', 'eq_swap',
  'm2', 'm3', 'eat', 'search', 'apply',
];
export const PAIRS = [['896x443', '443x939'], ['640x360', '360x640'], ['915x412', '412x915'], ['844x390', '390x844'], ['1024x768', '768x1024']];
const LUCAS = PAIRS[0];
const KINDS = ['pad', 'key', 'hub', 'flick', 'strip', 'chrome-key'];
const NONKEY = ['no key', 'glass', 'off screen'];

// the audit's tiers for the canonical ids (parity.mjs tierOf); other ids use their own "tier", default B
const TIER_A = ['context', 'search', 'inventory', 'combat', 'flick', 'apply', 'eat', 'look', 'rest'];
const TIER_C = ['menu', 'world', 'game', 'keys', 'sacrifice', 'longrest'];
const canonTier = (id) => (id.startsWith('pad_') || TIER_A.includes(id) ? 'A' : TIER_C.includes(id) ? 'C' : 'B');

const NAME = {
  rest: 'REST', longrest: 'Long rest', msgs: 'MSGS', sacrifice: 'SACRIFICE', m1: 'M1', drop: 'DROP', pin1: 'pin 1',
  pad_y: 'pad ↖ y', pad_k: 'pad ↑ k', pad_u: 'pad ↗ u', pad_h: 'pad ← h', pad_centre: 'pad centre', pad_l: 'pad → l',
  pad_b: 'pad ↙ b', pad_j: 'pad ↓ j', pad_n: 'pad ↘ n', combat: 'COMBAT', pin2: 'pin 2', flick: 'FLICK', look: 'LOOK',
  context: 'CONTEXT', keys: 'KEYS', game: 'GAME', world: 'WORLD', menu: 'MENU', inventory: 'INVENTORY',
  eq_wear: 'Wear', eq_puton: 'Put on', eq_wield: 'Wield', eq_takeoff: 'Take off', eq_remove: 'Remove', eq_swap: 'Swap',
  m2: 'M2', m3: 'M3', search: 'SEARCH', eat: 'EAT', apply: 'APPLY',
};

// ---- small helpers -------------------------------------------------------------------
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
const r3 = (v) => (v == null ? null : Math.round(v * 1000) / 1000);
const f1 = (v) => (v == null || Number.isNaN(v) ? '–' : (Math.round(v * 10) / 10).toFixed(1));
const f2 = (v) => (v == null || Number.isNaN(v) ? '–' : (Math.round(v * 100) / 100).toFixed(2));
const f0 = (v) => (v == null ? '–' : String(Math.round(v)));
const sgn = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±');
const d1 = (v) => (v == null ? '–' : `${sgn(r1(v))}${Math.abs(r1(v)).toFixed(1)}`);
const d0 = (v) => (v == null ? '–' : `${sgn(Math.round(v))}${Math.abs(Math.round(v))}`);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isRect = (o) => o && isNum(o.x) && isNum(o.y) && isNum(o.w) && isNum(o.h);
const rect = (o) => ({ x: o.x, y: o.y, w: o.w, h: o.h });
const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const marginIn = (r, x, y) => Math.min(x - r.x, r.x + r.w - x, y - r.y, r.y + r.h - y);
const overlapArea = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const overlaps = (a, b, eps = 0.01) => a.x + eps < b.x + b.w && b.x + eps < a.x + a.w && a.y + eps < b.y + b.h && b.y + eps < a.y + a.h;
const zone = (mm) => (mm < T.baseMm ? 'base' : mm < T.comfortMm ? 'comfort' : mm <= T.stretchMm ? 'stretch' : 'beyond');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// normal CDF (Abramowitz & Stegun 7.1.26, |error| < 1.5e-7)
function Phi(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + e) : 0.5 * (1 - e);
}
const pInside = (r, x, y, s) => (Phi((r.x + r.w - x) / s) - Phi((r.x - x) / s)) * (Phi((r.y + r.h - y) / s) - Phi((r.y - y) / s));

// ---- validation and normalisation ------------------------------------------------------
export function validate(spec) {
  const errors = [], warnings = [];
  if (!spec || typeof spec !== 'object') return { errors: ['spec is not a JSON object'], warnings };
  if (!spec.name) warnings.push('no "name"');
  const retired = spec.retired || {};
  for (const [id, why] of Object.entries(retired)) {
    if (!CANONICAL.includes(id)) warnings.push(`retired "${id}" is not a canonical id (only canonical controls need retiring)`);
    if (!why || typeof why !== 'string') errors.push(`retired "${id}" needs a string saying where its function went`);
  }
  const screens = spec.screens || {};
  if (!Object.keys(screens).length) errors.push('no "screens"');
  for (const [key, s] of Object.entries(screens)) {
    const at = `screen ${key}`;
    const m = /^(\d+)x(\d+)$/.exec(key);
    if (!m) errors.push(`${at}: key must be "<W>x<H>"`);
    if (!isNum(s.W) || !isNum(s.H)) { errors.push(`${at}: W and H must be numbers`); continue; }
    if (m && (+m[1] !== s.W || +m[2] !== s.H)) errors.push(`${at}: W/H (${s.W}x${s.H}) do not match the key`);
    if (!['touch', 'mouse'].includes(s.pointer)) errors.push(`${at}: pointer must be "touch" or "mouse"`);
    if (!isRect(s.mapArea)) errors.push(`${at}: mapArea {x,y,w,h} is required`);
    if (s.glass != null && !isRect(s.glass)) errors.push(`${at}: glass must be {x,y,w,h}`);
    if (s.glass == null) warnings.push(`${at}: no glass (blind taps that miss every key report "no key")`);
    for (const f of ['bands', 'popups', 'chrome', 'decor']) {
      if (s[f] == null) continue;
      if (!Array.isArray(s[f])) { errors.push(`${at}: ${f} must be an array`); continue; }
      s[f].forEach((b, i) => { if (!isRect(b)) errors.push(`${at}: ${f}[${i}] needs numeric x,y,w,h`); });
    }
    const controls = Array.isArray(s.controls) ? s.controls : (errors.push(`${at}: controls must be an array`), []);
    const seen = new Set();
    for (const c of controls) {
      const cat = `${at}: control "${c.id}"`;
      if (!c.id || typeof c.id !== 'string') { errors.push(`${at}: a control has no id`); continue; }
      if (seen.has(c.id)) errors.push(`${cat} appears twice`);
      seen.add(c.id);
      if (!isRect(c) || c.w <= 0 || c.h <= 0) errors.push(`${cat}: needs numeric x, y and positive w, h`);
      if (c.thumb != null && !['L', 'R'].includes(c.thumb)) errors.push(`${cat}: thumb must be "L", "R" or null`);
      if (c.kind != null && !KINDS.includes(c.kind)) warnings.push(`${cat}: unknown kind "${c.kind}" (treated as a non-pad target)`);
      if (c.kind == null) warnings.push(`${cat}: no kind (treated as "key")`);
      if (c.tier != null && !['A', 'B', 'C'].includes(c.tier)) errors.push(`${cat}: tier must be A, B or C`);
      if (c.tier != null && CANONICAL.includes(c.id) && c.tier !== canonTier(c.id)) warnings.push(`${cat}: canonical ids keep the audit's tier ${canonTier(c.id)}; "tier" ignored`);
      if (retired[c.id]) errors.push(`${cat} is listed in "retired" but still present`);
    }
    for (const c of controls) if (c.behind && !seen.has(c.behind)) errors.push(`${at}: control "${c.id}" is behind "${c.behind}", which is not on this screen`);
    for (const id of CANONICAL) if (!seen.has(id) && !retired[id]) errors.push(`${at}: canonical control "${id}" is missing (add it, or retire it in "retired")`);
    for (const p of s.popups || []) if (p.owner && !seen.has(p.owner)) warnings.push(`${at}: pop-up owner "${p.owner}" is not a control on this screen`);
    const outOf = (r) => r.x < -0.01 || r.y < -0.01 || r.x + r.w > s.W + 0.01 || r.y + r.h > s.H + 0.01;
    if (isRect(s.mapArea) && outOf(s.mapArea)) warnings.push(`${at}: mapArea runs off the screen`);
  }
  return { errors, warnings };
}

function normScreen(key, s, spec) {
  const W = s.W, H = s.H;
  const controls = (s.controls || []).filter((c) => c.id && isRect(c)).map((c, i) => {
    const cx = c.x + c.w / 2;
    const thumb = c.thumb === 'L' || c.thumb === 'R' ? c.thumb : cx < W / 2 ? 'L' : 'R';
    const tier = CANONICAL.includes(c.id) ? canonTier(c.id) : ['A', 'B', 'C'].includes(c.tier) ? c.tier : 'B';
    return { id: c.id, label: c.label ?? c.id, kind: c.kind || 'key', rect: rect(c), thumb, thumbFrom: c.thumb === 'L' || c.thumb === 'R' ? 'spec' : 'screen half', behind: c.behind || null, tier, i };
  });
  return {
    key, W, H, pointer: s.pointer === 'mouse' ? 'mouse' : 'touch', source: s.source || null, notes: s.notes || null,
    controls, glass: isRect(s.glass) ? rect(s.glass) : null, mapArea: rect(s.mapArea),
    bands: (s.bands || []).filter(isRect).map((b) => ({ name: b.name || 'band', ...rect(b) })),
    popups: (s.popups || []).filter(isRect).map((p) => ({ owner: p.owner || null, label: p.label || p.owner || 'pop-up', ...rect(p) })),
    chrome: (s.chrome || []).filter(isRect).map((b) => ({ name: b.name || 'chrome', ...rect(b) })),
    decor: (s.decor || []).filter(isRect).map((b) => ({ name: b.name || 'decor', ...rect(b) })),
  };
}

// ---- parity (audit/parity.mjs compare/summarise, generalised from "longrest" to "behind") ----
function place(c, W, H) {
  const cx = c.rect.x + c.rect.w / 2, cy = c.rect.y + c.rect.h / 2;
  const inDp = c.thumb === 'L' ? cx : W - cx, upDp = H - cy;
  const dist = Math.hypot(inDp, upDp);
  return {
    thumb: c.thumb, cx, cy, in_dp: inDp, up_dp: upDp, in_mm: inDp * MM, up_mm: upDp * MM, dist_mm: dist * MM,
    bearing: (Math.atan2(upDp, inDp) * 180) / Math.PI, w_mm: c.rect.w * MM, h_mm: c.rect.h * MM, zone: zone(dist * MM),
  };
}
const spotIn = (from, S) => ({ x: from.thumb === 'L' ? from.in_dp : S.W - from.in_dp, y: S.H - from.up_dp });
function tapAt(x, y, S) {
  if (x < 0 || x > S.W || y < 0 || y > S.H) return 'off screen';
  const hit = S.controls.find((c) => !c.behind && inside(c.rect, x, y));
  if (hit) return hit.id;
  if (S.glass && inside(S.glass, x, y)) return 'glass';
  return 'no key';
}
// a trained tap: control centre as (in, up) under its thumb, replayed under the same thumb on the other screen
function trainedTap(id, from, S) {
  const { x, y } = spotIn(from, S);
  const hit = tapAt(x, y, S);
  const own = S.controls.find((c) => c.id === id && !c.behind);
  const margin = own && inside(own.rect, x, y) ? marginIn(own.rect, x, y) : null;
  const sig = CHECK.tapScatterMm / MM;
  return {
    hit, x: r2(x), y: r2(y), same: hit === id, margin_dp: r2(margin),
    sameMargin: hit === id && margin != null && margin >= CHECK.tapMarginDp,
    pScatter: own ? pInside(own.rect, x, y, sig) : 0,
  };
}

function compare(A, B) {
  const a = new Map(A.controls.map((c) => [c.id, c])), b = new Map(B.controls.map((c) => [c.id, c]));
  const ids = [...new Set([...a.keys(), ...b.keys()])];
  const behindOf = (id) => a.get(id)?.behind || b.get(id)?.behind || null;
  const pl = new Map(), pp = new Map();
  for (const id of ids) {
    if (a.has(id)) pl.set(id, place(a.get(id), A.W, A.H));
    if (b.has(id)) pp.set(id, place(b.get(id), B.W, B.H));
  }
  const rankIn = (P) => {
    const rk = new Map();
    for (const th of ['L', 'R']) {
      const list = [...P.entries()].filter(([id, v]) => v.thumb === th && !behindOf(id)).sort((x, y) => x[1].dist_mm - y[1].dist_mm);
      list.forEach(([id], i) => rk.set(id, i + 1));
    }
    for (const id of P.keys()) if (behindOf(id)) rk.set(id, rk.get(behindOf(id)));
    return rk;
  };
  const rkL = rankIn(pl), rkP = rankIn(pp);
  const tolDp = T.orderTolMm / MM;
  const moveOf = new Map();
  for (const id of ids) if (pl.has(id) && pp.has(id)) moveOf.set(id, Math.hypot(pp.get(id).in_mm - pl.get(id).in_mm, pp.get(id).up_mm - pl.get(id).up_mm));

  const rows = [];
  for (const id of ids) {
    const L = pl.get(id), P = pp.get(id);
    const ctl = a.get(id) || b.get(id);
    const tier = ctl.tier;
    if (!L || !P) { rows.push({ id, name: NAME[id] || ctl.label || id, tier, behind: behindOf(id), onlyIn: L ? 'landscape' : 'portrait' }); continue; }
    const thumbChange = L.thumb !== P.thumb;
    const dIn = P.in_mm - L.in_mm, dUp = P.up_mm - L.up_mm;
    const vec = Math.hypot(dIn, dUp);                 // same thumb: the move; thumb switch: the mirrored offset
    const dBearing = P.bearing - L.bearing;
    const inversions = [];
    if (!thumbChange) {
      for (const pid of ids) {
        if (pid === id || behindOf(id) === pid || behindOf(pid) === id) continue;
        const Lo = pl.get(pid), Po = pp.get(pid);
        if (!Lo || !Po || Lo.thumb !== L.thumb || Po.thumb !== P.thumb) continue;
        const s = (d) => (Math.abs(d) < tolDp ? 0 : Math.sign(d));
        const vL = s(L.up_dp - Lo.up_dp), vP = s(P.up_dp - Po.up_dp);
        const hL = s(L.in_dp - Lo.in_dp), hP = s(P.in_dp - Po.in_dp);
        const mine = moveOf.get(id), theirs = moveOf.get(pid);
        const mover = Math.abs(mine - theirs) < T.moverTieMm ? 'both' : mine > theirs ? 'this' : 'other';
        if (vL * vP < 0) inversions.push({ with: pid, axis: 'up/down', landscape: vL > 0 ? 'above' : 'below', portrait: vP > 0 ? 'above' : 'below', mover });
        if (hL * hP < 0) inversions.push({ with: pid, axis: 'in/out', landscape: hL > 0 ? 'inward of' : 'outward of', portrait: hP > 0 ? 'inward of' : 'outward of', mover });
      }
    }
    const flags = [];
    if (thumbChange) flags.push('THUMB');
    if (!thumbChange && vec > T.moveMm) flags.push('MOVE');
    if (Math.abs(dBearing) > T.bearingDeg) flags.push('BEAR');
    const charged = inversions.filter((x) => x.mover !== 'other');
    if (charged.length) flags.push('ORDER');
    const tapLP = trainedTap(id, L, B), tapPL = trainedTap(id, P, A);
    const wrong = (t) => t !== id && !NONKEY.includes(t) && t !== behindOf(id);
    const miss = wrong(tapLP.hit) || wrong(tapPL.hit);
    if (miss) flags.push('MISS');
    const brk = (thumbChange ? T.thumbSwitchBase + 0.5 * (vec / 10) : vec / 10) + (miss ? T.missPenalty : 0);
    rows.push({
      id, name: NAME[id] || ctl.label || id, tier, weight: TIER[tier], behind: behindOf(id),
      landscape: pack(L, rkL.get(id)), portrait: pack(P, rkP.get(id)),
      thumbChange, dDist_mm: r2(P.dist_mm - L.dist_mm), dBearing_deg: r1(dBearing), dIn_mm: r2(dIn), dUp_mm: r2(dUp),
      move_mm: thumbChange ? null : r2(vec), mirrorOffset_mm: thumbChange ? r2(vec) : null, _vec: vec, _dBearing: dBearing,
      inversions, ordersBroken: charged.length, flags, break: r2(brk), weighted: r2(brk * TIER[tier]),
      trainedTap: { landscapeSpotInPortrait: tapLP, portraitSpotInLandscape: tapPL }, miss,
      zoneChange: L.zone !== P.zone ? `${L.zone}→${P.zone}` : null,
    });
  }
  return rows.filter((r) => r.onlyIn).concat(
    rows.filter((r) => !r.onlyIn).sort((x, y) => (y.weighted - x.weighted) || (y.break - x.break) || x.id.localeCompare(y.id)).map((r, i) => ({ ...r, rank: i + 1 })));
}

function pack(p, rank) {
  return {
    thumb: p.thumb, centre_dp: { x: r2(p.cx), y: r2(p.cy) }, in_mm: r2(p.in_mm), up_mm: r2(p.up_mm),
    dist_mm: r2(p.dist_mm), bearing_deg: r1(p.bearing), size_mm: { w: r1(p.w_mm), h: r1(p.h_mm) }, zone: p.zone, reachRank: rank,
  };
}

function summarisePair(rows, A, B) {
  const live = rows.filter((r) => !r.onlyIn && !r.behind);
  const same = live.filter((r) => !r.thumbChange);
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const tapStats = (k) => {
    const t = live.map((r) => [r.id, r.trainedTap[k]]);
    return {
      same: t.filter(([, x]) => x.same).map(([id]) => id),
      sameWithMargin: t.filter(([, x]) => x.sameMargin).map(([id]) => id),
      otherKey: t.filter(([id, x]) => !x.same && !NONKEY.includes(x.hit)).map(([id, x]) => `${id}→${x.hit}`),
      noKey: t.filter(([, x]) => x.hit === 'no key').map(([id]) => id),
      glass: t.filter(([, x]) => x.hit === 'glass').map(([id]) => id),
      offScreen: t.filter(([, x]) => x.hit === 'off screen').map(([id]) => id),
      scatterExpected: r1(t.reduce((s, [, x]) => s + x.pScatter, 0)),
    };
  };
  const pairsSwapped = new Set();
  for (const r of live) for (const x of r.inversions) if (!rows.find((q) => q.id === x.with)?.behind) pairsSwapped.add([r.id, x.with].sort().join('|') + '|' + x.axis);
  const detail = (r) => r && !r.onlyIn ? {
    thumbChange: r.thumbChange, move_mm: r.move_mm, mirrorOffset_mm: r.mirrorOffset_mm, dBearing_deg: r.dBearing_deg,
    landscape: `${r.landscape.thumb} ${f1(r.landscape.dist_mm)} mm @ ${f0(r.landscape.bearing_deg)}°`,
    portrait: `${r.portrait.thumb} ${f1(r.portrait.dist_mm)} mm @ ${f0(r.portrait.bearing_deg)}°`,
    tapLP: r.trainedTap.landscapeSpotInPortrait.hit, tapPL: r.trainedTap.portraitSpotInLandscape.hit, flags: r.flags,
  } : r ? { onlyIn: r.onlyIn } : null;
  return {
    landscape: A.key, portrait: B.key, controls: live.length,
    thumbSwitches: live.filter((r) => r.thumbChange).map((r) => r.id),
    movesOver10mm: same.filter((r) => r._vec > T.moveMm).map((r) => r.id),
    bearingOver20: live.filter((r) => Math.abs(r._dBearing) > T.bearingDeg).map((r) => r.id),
    orderChanges: live.filter((r) => r.flags.includes('ORDER')).map((r) => r.id),
    orderFlipsAll: pairsSwapped.size,
    trainedTaps: { landscapeToPortrait: tapStats('landscapeSpotInPortrait'), portraitToLandscape: tapStats('portraitSpotInLandscape') },
    misses: live.filter((r) => r.miss).map((r) => r.id),
    unflagged: live.filter((r) => !r.flags.length).map((r) => r.id),
    maxSameThumbMove: same.reduce((m, r) => (r._vec > m.mm ? { id: r.id, mm: r2(r._vec) } : m), { id: null, mm: 0 }),
    inventory: detail(byId.inventory), flick: detail(byId.flick),
    weightedTotal: r2(live.reduce((s, r) => s + r.weighted, 0)),
    tierAWeighted: r2(live.filter((r) => r.tier === 'A').reduce((s, r) => s + r.weighted, 0)),
    onlyInOne: rows.filter((r) => r.onlyIn).map((r) => ({ id: r.id, onlyIn: r.onlyIn })),
  };
}

// ---- area union by coordinate compression (exact for axis-aligned rects) --------------------
function coverage(rects, W, H) {
  const R = rects.map((r) => {
    const x0 = Math.max(0, r.x), y0 = Math.max(0, r.y), x1 = Math.min(W, r.x + r.w), y1 = Math.min(H, r.y + r.h);
    return { x0, y0, x1, y1 };
  }).filter((r) => r.x1 - r.x0 > 1e-9 && r.y1 - r.y0 > 1e-9);
  const uniq = (v) => [...new Set(v)].sort((p, q) => p - q);
  const xs = uniq([0, W, ...R.flatMap((r) => [r.x0, r.x1])]), ys = uniq([0, H, ...R.flatMap((r) => [r.y0, r.y1])]);
  const xi = new Map(xs.map((v, i) => [v, i])), yi = new Map(ys.map((v, i) => [v, i]));
  const nx = xs.length - 1, ny = ys.length - 1, cov = new Uint8Array(nx * ny);
  for (const r of R) for (let j = yi.get(r.y0); j < yi.get(r.y1); j++) cov.fill(1, j * nx + xi.get(r.x0), j * nx + xi.get(r.x1));
  let covered = 0;
  const holes = [], open = new Map();
  for (let j = 0; j < ny; j++) {
    const spans = [];
    for (let i = 0; i < nx; i++) {
      const c = cov[j * nx + i];
      if (c) covered += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
      else if (spans.length && spans[spans.length - 1][1] === i) spans[spans.length - 1][1] = i + 1;
      else spans.push([i, i + 1]);
    }
    const keys = new Set(spans.map(([p, q]) => `${p},${q}`));
    for (const [k, o] of open) if (!keys.has(k)) { holes.push(o); open.delete(k); }
    for (const [p, q] of spans) {
      const k = `${p},${q}`;
      if (open.has(k)) open.get(k).h = ys[j + 1] - open.get(k).y;
      else open.set(k, { x: xs[p], y: ys[j], w: xs[q] - xs[p], h: ys[j + 1] - ys[j] });
    }
  }
  holes.push(...open.values());
  return { covered, holes: holes.filter((h) => h.w > 0.05 && h.h > 0.05) };
}

// ---- per-screen metrics ------------------------------------------------------------------
function screenMetrics(S) {
  const A = S.W * S.H, pct = (v) => (100 * v) / A;
  const live = S.controls.filter((c) => !c.behind);
  const m = S.mapArea, C = CHECK;
  const k = Math.min(m.w / (C.cols * C.textCell.w), m.h / (C.rows * C.textCell.h));
  const map = {
    w_dp: r2(m.w), h_dp: r2(m.h), pct: r3(pct(m.w * m.h)),
    text12x19: { cols: r1(Math.min(C.cols, m.w / C.textCell.w)), rows: r1(Math.min(C.rows, m.h / C.textCell.h)) },
    tile16: { cols: r1(Math.min(C.cols, m.w / C.tileDp)), rows: r1(Math.min(C.rows, m.h / C.tileDp)) },
    fitTile_dp: r2(Math.min(m.w / C.cols, m.h / C.rows)),
    fitTextCell_dp: { w: r2(C.textCell.w * k), h: r2(C.textCell.h * k) },
  };
  const g = C.gutterDp;
  const cov = coverage([m, ...S.bands, ...S.chrome, ...live.map((c) => ({ x: c.rect.x - g, y: c.rect.y - g, w: c.rect.w + 2 * g, h: c.rect.h + 2 * g }))], S.W, S.H);
  const shares = {
    controls: r3(pct(coverage(live.map((c) => c.rect), S.W, S.H).covered)),
    controlsWithGutter: r3(pct(coverage(live.map((c) => ({ x: c.rect.x - g, y: c.rect.y - g, w: c.rect.w + 2 * g, h: c.rect.h + 2 * g })), S.W, S.H).covered)),
    bands: r3(pct(coverage(S.bands, S.W, S.H).covered)),
    chrome: r3(pct(coverage(S.chrome, S.W, S.H).covered)),
    glass: S.glass ? r3(pct(coverage([S.glass], S.W, S.H).covered)) : null,
  };
  const touch = S.pointer === 'touch';
  const minDim = (c) => Math.min(c.rect.w, c.rect.h);
  const pads = live.filter((c) => c.kind === 'pad'), others = live.filter((c) => c.kind !== 'pad');
  const smallest = (list) => list.reduce((best, c) => (!best || minDim(c) < best.dp ? { id: c.id, dp: r2(minDim(c)), size: `${r1(c.rect.w)}×${r1(c.rect.h)}` } : best), null);
  const small = (list, lim) => (touch ? list.filter((c) => minDim(c) < lim - 1e-9).map((c) => ({ id: c.id, dp: r2(minDim(c)), size: `${r1(c.rect.w)}×${r1(c.rect.h)}` })) : []);
  const ctlOverlaps = [];
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++)
    if (overlaps(live[i].rect, live[j].rect)) ctlOverlaps.push({ a: live[i].id, b: live[j].id, area_dp2: r1(overlapArea(live[i].rect, live[j].rect)) });
  const offScreen = (r) => r.x < -0.01 || r.y < -0.01 || r.x + r.w > S.W + 0.01 || r.y + r.h > S.H + 0.01;
  const hostOf = new Map(S.controls.filter((c) => c.behind).map((c) => [c.id, c.behind]));
  const popups = S.popups.map((p) => ({
    owner: p.owner, label: p.label, rect: rect(p),
    covers: live.filter((c) => c.id !== p.owner && c.id !== hostOf.get(p.owner) && overlaps(p, c.rect)).map((c) => c.id),
    offScreen: offScreen(p),
  }));
  const reach = touch ? live.map((c) => { const p = place(c, S.W, S.H); return { id: c.id, thumb: c.thumb, dist_mm: r1(p.dist_mm), bearing_deg: r1(p.bearing), zone: p.zone }; }) : null;
  return {
    W: S.W, H: S.H, pointer: S.pointer, source: S.source, controls: live.length,
    thumbs: { L: live.filter((c) => c.thumb === 'L').length, R: live.filter((c) => c.thumb === 'R').length, fromScreenHalf: live.filter((c) => c.thumbFrom !== 'spec').length },
    map, shares,
    void: { pct: r3(pct(A - cov.covered)), dp2: Math.round(A - cov.covered), gutter_dp: g },
    targets: {
      smallestPad: smallest(pads), smallestOther: smallest(others),
      padsBelowMin: small(pads, C.padMinDp), othersBelowMin: small(others, C.targetMinDp),
    },
    overlaps: {
      controls: ctlOverlaps,
      mapArea: live.filter((c) => overlaps(c.rect, m)).map((c) => c.id),
      offScreen: live.filter((c) => offScreen(c.rect)).map((c) => c.id),
      glassOrBands: live.filter((c) => [S.glass, ...S.bands].some((b) => b && overlaps(c.rect, b))).map((c) => c.id),
    },
    popups,
    popupsCoveringControls: popups.filter((p) => p.covers.length).length,
    popupsOffScreen: popups.filter((p) => p.offScreen).length,
    reach: reach && {
      beyond75: reach.filter((x) => x.zone === 'beyond').map((x) => `${x.id} ${f1(x.dist_mm)}`),
      stretch60to75: reach.filter((x) => x.zone === 'stretch').map((x) => `${x.id} ${f1(x.dist_mm)}`),
      under15: reach.filter((x) => x.zone === 'base').map((x) => `${x.id} ${f1(x.dist_mm)}`),
      perControl: reach,
    },
    _holes: cov.holes,
  };
}

// ---- evaluate a whole spec -----------------------------------------------------------------
export function evaluate(spec) {
  const validation = validate(spec);
  const screens = {};
  for (const [key, s] of Object.entries(spec.screens || {})) {
    if (!isNum(s.W) || !isNum(s.H) || !isRect(s.mapArea) || !Array.isArray(s.controls)) continue;
    screens[key] = normScreen(key, s, spec);
  }
  const metrics = Object.fromEntries(Object.entries(screens).map(([k, S]) => [k, screenMetrics(S)]));
  const pairs = [];
  for (const [l, p] of PAIRS) {
    if (!screens[l] || !screens[p]) continue;
    const rows = compare(screens[l], screens[p]);
    pairs.push({ landscape: l, portrait: p, summary: summarisePair(rows, screens[l], screens[p]), rows });
  }
  const result = {
    generated: new Date().toISOString(), name: spec.name || '(unnamed)', notes: spec.notes || '',
    model: {
      mmPerDp: MM, thresholds: T, tiers: TIER, checks: CHECK,
      thumb: 'bottom corner of its own side; a control with thumb null belongs to the screen half its centre is in (x < W/2: L, else R)',
      breakScore: 'same thumb: move_mm / 10; thumb switch: 6 + 0.5 * mirrorOffset_mm / 10; +1 on MISS; weighted = break * tier weight (A 1, B 0.4, C 0.15)',
    },
    validation, retired: spec.retired || {},
    pairs, screens: metrics,
  };
  result.headline = headline(result);
  return result;
}

export function headline(res) {
  const lp = res.pairs.find((p) => p.landscape === LUCAS[0] && p.portrait === LUCAS[1])?.summary;
  const s = res.screens;
  const h = {
    thumbSwitches: lp ? lp.thumbSwitches.length : null,
    movesOver10mm: lp ? lp.movesOver10mm.length : null,
    trainedTapsSame: lp ? lp.trainedTaps.landscapeToPortrait.same.length : null,
    trainedTapsOf: lp ? lp.controls : null,
    mapPctLandscape: s[LUCAS[0]]?.map.pct ?? null, mapPctPortrait: s[LUCAS[1]]?.map.pct ?? null,
    smallestPad640x360: s['640x360']?.targets.smallestPad?.dp ?? null,
    void1920x1080: s['1920x1080']?.void.pct ?? null,
    errors: res.validation.errors.length,
  };
  const na = (v, f = (x) => x, unit = '') => (v == null ? 'n/a' : f(v) + unit);
  h.text = `${res.name}: ${na(h.thumbSwitches)} thumb switches / ${na(h.movesOver10mm)} moves>10mm / ${na(h.trainedTapsSame)} of ${na(h.trainedTapsOf)} trained taps on the same key (896x443/443x939)` +
    ` | map ${na(h.mapPctLandscape, f1, '%')} / ${na(h.mapPctPortrait, f1, '%')} (896x443 / 443x939)` +
    ` | smallest pad key ${na(h.smallestPad640x360, f1, ' dp')} (640x360)` +
    ` | void ${na(h.void1920x1080, f1, '%')} (1920x1080)` + (h.errors ? ` | INVALID: ${h.errors} spec errors` : '');
  return h;
}

// ---- Markdown report -------------------------------------------------------------------------
const nm = (id) => NAME[id] || id;
const tapName = (t) => (NONKEY.includes(t) ? t : nm(t));
const list = (a, empty = 'none') => (a && a.length ? a.map((x) => (typeof x === 'string' && !x.includes(' ') && !x.includes('→') ? nm(x) : x)).join(', ') : empty);

function reportMd(res, base, specFile) {
  const o = [], P = (s = '') => o.push(s);
  P(`# Layout report: ${res.name}`);
  P();
  P(`\`${path.basename(specFile)}\`, scored ${res.generated.slice(0, 10)} with the audit's model (SPEC.md).${res.notes ? ' ' + res.notes : ''}`);
  P();
  P('**Headline**');
  P();
  P('```');
  P(res.headline.text);
  if (base) P(base.headline.text);
  P('```');
  P();
  if (res.validation.errors.length || res.validation.warnings.length) {
    P('## Spec problems');
    for (const e of res.validation.errors) P(`- **error:** ${e}`);
    for (const w of res.validation.warnings) P(`- warning: ${w}`);
    P();
  }
  if (Object.keys(res.retired).length) {
    P('## Retired controls');
    P('| control | where its function went |');
    P('|---|---|');
    for (const [id, why] of Object.entries(res.retired)) P(`| ${nm(id)} | ${why} |`);
    P();
  }
  if (base) {
    P(`## Against ${base.name}`);
    P('| measure | this proposal | baseline | change |');
    P('|---|---|---|---|');
    const rowB = (label, a, b, fmt = (v) => String(v), lowerBetter = true) => {
      const dd = Number.isInteger(a) && Number.isInteger(b) ? d0 : fmt === f2 ? (v) => `${sgn(r2(v))}${f2(Math.abs(v))}` : d1;
      const ch = a == null || b == null ? '–' : a === b ? 'same' : `${dd(a - b)}${(a < b) === lowerBetter ? ' (better)' : ' (worse)'}`;
      P(`| ${label} | ${a == null ? 'n/a' : fmt(a)} | ${b == null ? 'n/a' : fmt(b)} | ${ch} |`);
    };
    const h = res.headline, hb = base.headline;
    rowB('thumb switches (896x443/443x939)', h.thumbSwitches, hb.thumbSwitches);
    rowB('same-thumb moves > 10 mm', h.movesOver10mm, hb.movesOver10mm);
    rowB(`L-trained taps on the same key (of ${h.trainedTapsOf ?? '–'} / ${hb.trainedTapsOf ?? '–'})`, h.trainedTapsSame, hb.trainedTapsSame, String, false);
    const lp = res.pairs.find((p) => p.landscape === LUCAS[0])?.summary, lb = base.pairs.find((p) => p.landscape === LUCAS[0])?.summary;
    rowB('weighted break total (896x443/443x939)', lp?.weightedTotal, lb?.weightedTotal, f2);
    rowB('map % landscape 896x443', h.mapPctLandscape, hb.mapPctLandscape, f1, false);
    rowB('map % portrait 443x939', h.mapPctPortrait, hb.mapPctPortrait, f1, false);
    rowB('smallest pad key dp (640x360)', h.smallestPad640x360, hb.smallestPad640x360, f1, false);
    rowB('void % (1920x1080)', h.void1920x1080, hb.void1920x1080, f1);
    P();
    P('Per pair (this / baseline):');
    P();
    P('| pair | THUMB | MOVE | BEAR | ORDER | L→P same | P→L same | INVENTORY mm | FLICK mm | Σ weighted |');
    P('|---|---|---|---|---|---|---|---|---|---|');
    for (const pr of res.pairs) {
      const a = pr.summary, b = base.pairs.find((q) => q.landscape === pr.landscape)?.summary;
      const v = (fa, fb) => `${fa(a)} / ${b ? fb(b) : '–'}`;
      const mv = (x) => (x?.onlyIn ? x.onlyIn + ' only' : x == null ? '–' : f1(x.thumbChange ? x.mirrorOffset_mm : x.move_mm) + (x.thumbChange ? ' (switch)' : ''));
      P(`| ${a.landscape} / ${a.portrait} | ${v((s) => s.thumbSwitches.length, (s) => s.thumbSwitches.length)} | ${v((s) => s.movesOver10mm.length, (s) => s.movesOver10mm.length)} | ${v((s) => s.bearingOver20.length, (s) => s.bearingOver20.length)} | ${v((s) => s.orderChanges.length, (s) => s.orderChanges.length)} | ${v((s) => `${s.trainedTaps.landscapeToPortrait.same.length}/${s.controls}`, (s) => `${s.trainedTaps.landscapeToPortrait.same.length}/${s.controls}`)} | ${v((s) => `${s.trainedTaps.portraitToLandscape.same.length}/${s.controls}`, (s) => `${s.trainedTaps.portraitToLandscape.same.length}/${s.controls}`)} | ${v((s) => mv(s.inventory), (s) => mv(s.inventory))} | ${v((s) => mv(s.flick), (s) => mv(s.flick))} | ${v((s) => f2(s.weightedTotal), (s) => f2(s.weightedTotal))} |`);
    }
    P();
    P('Per screen (this / baseline):');
    P();
    P('| screen | map % | text cols × rows | void % | smallest pad dp | smallest other dp | small targets | overlaps | pop-ups over keys | beyond 75 mm |');
    P('|---|---|---|---|---|---|---|---|---|---|');
    for (const [k, a] of Object.entries(res.screens)) {
      const b = base.screens[k];
      const v = (f) => `${f(a)} / ${b ? f(b) : '–'}`;
      P(`| ${k} | ${v((s) => f1(s.map.pct))} | ${v((s) => `${f1(s.map.text12x19.cols)}×${f1(s.map.text12x19.rows)}`)} | ${v((s) => f1(s.void.pct))} | ${v((s) => f1(s.targets.smallestPad?.dp))} | ${v((s) => f1(s.targets.smallestOther?.dp))} | ${v((s) => s.targets.padsBelowMin.length + s.targets.othersBelowMin.length)} | ${v((s) => s.overlaps.controls.length + s.overlaps.mapArea.length + s.overlaps.offScreen.length)} | ${v((s) => s.popupsCoveringControls)} | ${v((s) => (s.reach ? s.reach.beyond75.length : 'n/a'))} |`);
    }
    P();
  }

  P('## Parity between orientations');
  if (!res.pairs.length) P('No orientation pair present. Pairs scored: ' + PAIRS.map((p) => p.join(' / ')).join(', ') + '.');
  else {
    P('Thumb frames, thresholds, tiers and break score are the audit\'s (SPEC.md). "L→P same" = a tap made in portrait at the spot the thumb learned in landscape still hits the same key; "≥3 dp" = it lands at least 3 dp inside that key; "scatter" = expected same-key hits with 1 mm tap scatter.');
    P();
    P('| pair | N | THUMB | MOVE >10 mm | BEAR >20° | ORDER | L→P same (≥3 dp, scatter) | P→L same (≥3 dp) | L→P other key | INVENTORY | FLICK | worst same-thumb move | Σ weighted (tier A) | beyond 75 mm L / P |');
    P('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const pr of res.pairs) {
      const s = pr.summary, lp = s.trainedTaps.landscapeToPortrait, pl = s.trainedTaps.portraitToLandscape;
      const mv = (x) => (x == null ? 'retired' : x.onlyIn ? `${x.onlyIn} only` : x.thumbChange ? `${x.landscape.split(' ')[0]}→${x.portrait.split(' ')[0]} (${f1(x.mirrorOffset_mm)} mirrored)` : `${f1(x.move_mm)} mm`);
      const rl = res.screens[pr.landscape].reach, rp = res.screens[pr.portrait].reach;
      P(`| ${s.landscape} / ${s.portrait} | ${s.controls} | ${s.thumbSwitches.length} | ${s.movesOver10mm.length} | ${s.bearingOver20.length} | ${s.orderChanges.length} | ${lp.same.length} (${lp.sameWithMargin.length}, ${f1(lp.scatterExpected)}) | ${pl.same.length} (${pl.sameWithMargin.length}) | ${lp.otherKey.length} | ${mv(s.inventory)} | ${mv(s.flick)} | ${s.maxSameThumbMove.id ? `${nm(s.maxSameThumbMove.id)} ${f1(s.maxSameThumbMove.mm)}` : '–'} | ${f2(s.weightedTotal)} (${f2(s.tierAWeighted)}) | ${rl ? rl.beyond75.length : '–'} / ${rp ? rp.beyond75.length : '–'} |`);
    }
    P();
    for (const pr of res.pairs) {
      const s = pr.summary, full = pr.landscape === LUCAS[0];
      P(`### ${s.landscape} / ${s.portrait}${full ? ' (Lucas\'s phone)' : ''}`);
      P(`- **Thumb switches (${s.thumbSwitches.length}):** ${list(s.thumbSwitches)}`);
      P(`- **Same thumb, moves > 10 mm (${s.movesOver10mm.length}):** ${s.movesOver10mm.map((id) => `${nm(id)} ${f1(pr.rows.find((r) => r.id === id).move_mm)}`).join(', ') || 'none'}`);
      P(`- **Bearing > 20° (${s.bearingOver20.length}):** ${list(s.bearingOver20)}. **Order swaps (${s.orderChanges.length}):** ${list(s.orderChanges)} (${s.orderFlipsAll} flipped pairs in all).`);
      const lp = s.trainedTaps.landscapeToPortrait, pl = s.trainedTaps.portraitToLandscape;
      P(`- **Landscape-trained taps made in portrait:** ${lp.same.length} of ${s.controls} same key (${lp.sameWithMargin.length} with a ${CHECK.tapMarginDp} dp margin; ${f1(lp.scatterExpected)} expected with ${CHECK.tapScatterMm} mm scatter); another key ${lp.otherKey.length} (${lp.otherKey.map((x) => x.split('→').map(tapName).join(' → ')).join(', ') || 'none'}); no key ${lp.noKey.length}; glass ${lp.glass.length}; off screen ${lp.offScreen.length}.`);
      P(`- **Portrait-trained taps made in landscape:** ${pl.same.length} of ${s.controls} same key (${pl.sameWithMargin.length} with a ${CHECK.tapMarginDp} dp margin; ${f1(pl.scatterExpected)} expected with scatter); another key ${pl.otherKey.length}; no key ${pl.noKey.length}; glass ${pl.glass.length}; off screen ${pl.offScreen.length}.`);
      for (const [k, x] of [['INVENTORY', s.inventory], ['FLICK', s.flick]]) {
        if (!x) P(`- **${k}:** retired or absent.`);
        else if (x.onlyIn) P(`- **${k}:** only in ${x.onlyIn}.`);
        else P(`- **${k}:** ${x.landscape} → ${x.portrait}; ${x.thumbChange ? `changes thumb, mirrored offset ${f1(x.mirrorOffset_mm)} mm` : `moves ${f1(x.move_mm)} mm`}, bearing ${d0(x.dBearing_deg)}°; trained taps hit ${tapName(x.tapLP)} (L→P) and ${tapName(x.tapPL)} (P→L); flags ${x.flags.join(' ') || 'none'}.`);
      }
      P(`- **Weighted break total:** ${f2(s.weightedTotal)} (tier A ${f2(s.tierAWeighted)}). **No flag:** ${s.unflagged.length} of ${s.controls}.`);
      if (s.onlyInOne.length) P(`- **In one orientation only (not scored, check they are retired or intended):** ${s.onlyInOne.map((x) => `${nm(x.id)} (${x.onlyIn})`).join(', ')}`);
      P();
      const rows = pr.rows.filter((r) => !r.onlyIn && (full || r.flags.length));
      if (!rows.length) { P('No control carries a flag.'); P(); continue; }
      if (!full) P('Flagged controls only (all rows are in the JSON report):');
      P('| # | control | tier | landscape: thumb, mm @ bearing | portrait: thumb, mm @ bearing | move mm (mirrored) | Δbearing | L-trained tap in P → | P-trained tap in L → | flags | break | wtd |');
      P('|---|---|---|---|---|---|---|---|---|---|---|---|');
      for (const r of rows) {
        const mv = r.thumbChange ? `(${f1(r.mirrorOffset_mm)})` : f1(r.move_mm);
        P(`| ${r.rank} | ${nm(r.id)}${r.behind ? ` (behind ${nm(r.behind)})` : ''} | ${r.tier} | ${r.landscape.thumb} ${f1(r.landscape.dist_mm)} @ ${f0(r.landscape.bearing_deg)}° | ${r.portrait.thumb} ${f1(r.portrait.dist_mm)} @ ${f0(r.portrait.bearing_deg)}° | ${mv} | ${d0(r.dBearing_deg)}° | ${tapName(r.trainedTap.landscapeSpotInPortrait.hit)} | ${tapName(r.trainedTap.portraitSpotInLandscape.hit)} | ${r.flags.join(' ') || '–'} | ${f2(r.break)} | ${f2(r.weighted)} |`);
      }
      P();
    }
  }

  P('## Screens');
  P(`Map cells: text ${CHECK.textCell.w}×${CHECK.textCell.h} dp and square tile ${CHECK.tileDp} dp, of NetHack's ${CHECK.cols}×${CHECK.rows}. Void = screen not covered by the map area, bands, chrome, or controls grown by a ${CHECK.gutterDp} dp gutter. Small targets are flagged on touch screens only (pad < ${CHECK.padMinDp} dp, others < ${CHECK.targetMinDp} dp, by the shorter side).`);
  P();
  P('| screen | input | map area dp | map % | text cols × rows | tile16 cols × rows | fit tile dp | fit text cell dp | controls % | void % | smallest pad | smallest other | flags |');
  P('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [k, s] of Object.entries(res.screens)) {
    const fl = [];
    if (s.targets.padsBelowMin.length) fl.push(`${s.targets.padsBelowMin.length} pad < ${CHECK.padMinDp}`);
    if (s.targets.othersBelowMin.length) fl.push(`${s.targets.othersBelowMin.length} target < ${CHECK.targetMinDp}`);
    if (s.overlaps.controls.length) fl.push(`${s.overlaps.controls.length} overlaps`);
    if (s.overlaps.mapArea.length) fl.push(`${s.overlaps.mapArea.length} on map`);
    if (s.overlaps.offScreen.length) fl.push(`${s.overlaps.offScreen.length} off screen`);
    if (s.popupsCoveringControls) fl.push(`${s.popupsCoveringControls} pop-ups over keys`);
    if (s.popupsOffScreen) fl.push(`${s.popupsOffScreen} pop-ups off screen`);
    if (s.reach?.beyond75.length) fl.push(`${s.reach.beyond75.length} beyond 75 mm`);
    P(`| ${k} | ${s.pointer} | ${f1(s.map.w_dp)}×${f1(s.map.h_dp)} | ${f1(s.map.pct)} | ${f1(s.map.text12x19.cols)}×${f1(s.map.text12x19.rows)} | ${f1(s.map.tile16.cols)}×${f1(s.map.tile16.rows)} | ${f2(s.map.fitTile_dp)} | ${f2(s.map.fitTextCell_dp.w)}×${f2(s.map.fitTextCell_dp.h)} | ${f1(s.shares.controls)} | ${f1(s.void.pct)} | ${s.targets.smallestPad ? `${nm(s.targets.smallestPad.id)} ${f1(s.targets.smallestPad.dp)}` : '–'} | ${s.targets.smallestOther ? `${nm(s.targets.smallestOther.id)} ${f1(s.targets.smallestOther.dp)}` : '–'} | ${fl.join('; ') || '–'} |`);
  }
  P();
  for (const [k, s] of Object.entries(res.screens)) {
    const lines = [];
    const tl = (a) => a.map((x) => `${nm(x.id)} ${x.size}`).join(', ');
    if (s.targets.padsBelowMin.length) lines.push(`pad keys under ${CHECK.padMinDp} dp: ${tl(s.targets.padsBelowMin)}`);
    if (s.targets.othersBelowMin.length) lines.push(`touch targets under ${CHECK.targetMinDp} dp: ${tl(s.targets.othersBelowMin)}`);
    if (s.overlaps.controls.length) lines.push(`controls overlapping: ${s.overlaps.controls.map((x) => `${nm(x.a)} × ${nm(x.b)} (${f0(x.area_dp2)} dp²)`).join(', ')}`);
    if (s.overlaps.mapArea.length) lines.push(`controls on the map area: ${list(s.overlaps.mapArea)}`);
    if (s.overlaps.offScreen.length) lines.push(`controls off screen: ${list(s.overlaps.offScreen)}`);
    if (s.overlaps.glassOrBands.length) lines.push(`controls on the glass or a band (information): ${list(s.overlaps.glassOrBands)}`);
    const pc = s.popups.filter((p) => p.covers.length || p.offScreen);
    if (pc.length) lines.push(`pop-ups over live controls or off screen: ${pc.map((p) => `${p.label} [${nm(p.owner)}] → ${list(p.covers, '')}${p.offScreen ? ' (off screen)' : ''}`).join('; ')}`);
    if (s.reach) {
      if (s.reach.beyond75.length) lines.push(`beyond 75 mm from their thumb's corner: ${s.reach.beyond75.map((x) => nm(x.split(' ')[0]) + ' ' + x.split(' ')[1]).join(', ')}`);
      if (s.reach.under15.length) lines.push(`inside 15 mm (under the thumb base): ${s.reach.under15.map((x) => nm(x.split(' ')[0]) + ' ' + x.split(' ')[1]).join(', ')}`);
    }
    if (!lines.length) continue;
    P(`**${k}** (${s.pointer}; thumbs L ${s.thumbs.L} / R ${s.thumbs.R}, ${s.thumbs.fromScreenHalf} by screen half)`);
    for (const l of lines) P(`- ${l}`);
    P();
  }
  P('## Files');
  P(`- JSON with every row: \`${path.basename(outBase(specFile))}.report.json\``);
  P(`- One drawing per screen: ${Object.keys(res.screens).map((k) => `\`${path.basename(outBase(specFile))}.${k}.svg\``).join(', ')}`);
  return o.join('\n') + '\n';
}

// ---- SVG per screen ------------------------------------------------------------------------------
function screenSvg(res, key, S, M) {
  const top = 64, W = S.W, H = S.H, CW = Math.max(W, 640) + 20, o = [];
  const bad = new Set([...M.targets.padsBelowMin, ...M.targets.othersBelowMin].map((x) => x.id)
    .concat(M.overlaps.controls.flatMap((x) => [x.a, x.b]), M.overlaps.mapArea, M.overlaps.offScreen));
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${H + top + 10}" viewBox="-10 ${-top} ${CW} ${H + top + 10}" font-family="Helvetica,Arial,sans-serif">`);
  o.push(`<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#f6d5d5"/><line x1="0" y1="0" x2="0" y2="8" stroke="#d98c8c" stroke-width="3"/></pattern><clipPath id="scr"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>`);
  o.push(`<rect x="-10" y="${-top}" width="${CW}" height="${H + top + 10}" fill="#ffffff"/>`);
  o.push(`<text x="0" y="${-top + 16}" font-size="14" font-weight="bold" fill="#222">${esc(res.name)} · ${key} · ${S.pointer}</text>`);
  o.push(`<text x="0" y="${-top + 33}" font-size="11" fill="#444">map ${f1(M.map.w_dp)}×${f1(M.map.h_dp)} dp (${f1(M.map.pct)}%), text cells ${f1(M.map.text12x19.cols)}×${f1(M.map.text12x19.rows)} of 80×21 · void ${f1(M.void.pct)}% (hatched) · smallest pad ${f1(M.targets.smallestPad?.dp)} dp, other ${f1(M.targets.smallestOther?.dp)} dp</text>`);
  o.push(`<text x="0" y="${-top + 49}" font-size="10" fill="#666">${S.pointer === 'touch' ? 'blue = left thumb, orange = right (darker = pad)' : 'mouse screen: no thumbs'} · red outline = flagged · dashed purple = pop-up · dashed grey = case decor${S.pointer === 'touch' ? ' · arcs 15 / 60 / 75 mm from each thumb corner' : ''}</text>`);
  o.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#fafafa" stroke="#222" stroke-width="1.5"/>`);
  for (const h of M._holes) o.push(`<rect x="${r2(h.x)}" y="${r2(h.y)}" width="${r2(h.w)}" height="${r2(h.h)}" fill="url(#hatch)" opacity="0.8"/>`);
  for (const d of S.decor) o.push(`<rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" fill="none" stroke="#b9b9b9" stroke-dasharray="3 3"><title>${esc(d.name)} (decor)</title></rect>`);
  for (const c of S.chrome) o.push(`<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="#e8dcc4" stroke="#b39b6b"><title>${esc(c.name)} (chrome)</title></rect>`);
  const m = S.mapArea;
  o.push(`<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" fill="#d8efd9" stroke="#3f8f46"/>`);
  o.push(`<text x="${m.x + m.w / 2}" y="${m.y + m.h / 2}" font-size="${Math.max(9, Math.min(16, m.w / 30))}" fill="#2e6b33" text-anchor="middle">map area ${f1(m.w)}×${f1(m.h)} dp · ${f1(M.map.pct)}%</text>`);
  for (const b of S.bands) {
    o.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#dce8f7" stroke="#6c8ebf" opacity="0.9"/>`);
    o.push(`<text x="${b.x + 4}" y="${b.y + Math.min(12, b.h - 2)}" font-size="${Math.min(10, b.h - 2)}" fill="#3d5f8f">${esc(b.name)}</text>`);
  }
  if (S.glass) o.push(`<rect x="${S.glass.x}" y="${S.glass.y}" width="${S.glass.w}" height="${S.glass.h}" fill="none" stroke="#1f3f7a" stroke-width="1.5"/>`);
  if (S.pointer === 'touch') {
    o.push('<g clip-path="url(#scr)" opacity="0.55">');
    o.push(`<line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H}" stroke="#777" stroke-dasharray="6 4" stroke-width="0.8"/>`);
    for (const mm of [T.baseMm, T.comfortMm, T.stretchMm]) {
      const rr = mm / MM, col = mm === T.baseMm ? '#e59866' : '#58a55c', dash = mm === T.stretchMm ? ' stroke-dasharray="5 4"' : '';
      o.push(`<path d="M ${rr} ${H} A ${rr} ${rr} 0 0 0 0 ${H - rr}" fill="none" stroke="${col}" stroke-width="1"${dash}/>`);
      o.push(`<path d="M ${W - rr} ${H} A ${rr} ${rr} 0 0 1 ${W} ${H - rr}" fill="none" stroke="${col}" stroke-width="1"${dash}/>`);
    }
    o.push('</g>');
  }
  for (const c of S.controls) {
    if (c.behind) continue;
    const r = c.rect, isBad = bad.has(c.id);
    const fill = S.pointer === 'mouse' ? '#e6e6e6' : c.thumb === 'L' ? (c.kind === 'pad' ? '#a9cbee' : '#cfe2f7') : (c.kind === 'pad' ? '#f5c08f' : '#fbe1c9');
    o.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="3" fill="${fill}" fill-opacity="0.85" stroke="${isBad ? '#c0392b' : '#555'}" stroke-width="${isBad ? 2.2 : 0.8}"><title>${esc(c.id)}: ${esc(c.label)} · ${r1(r.w)}×${r1(r.h)} dp · thumb ${c.thumb} (${c.thumbFrom}) · ${c.kind}</title></rect>`);
    const behind = S.controls.filter((x) => x.behind === c.id).map((x) => x.id);
    const txt = nm(c.id) + (behind.length ? ` +${behind.map(nm).join('+')}` : '');
    const fs1 = Math.max(5, Math.min(11, r.h * 0.42, (r.w - 4) / (0.66 * txt.length)));
    o.push(`<text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + fs1 * 0.35}" font-size="${r2(fs1)}" fill="#1c1c1c" text-anchor="middle">${esc(txt)}</text>`);
    if (r.h > 30 && r.w > 34) o.push(`<text x="${r.x + r.w / 2}" y="${r.y + r.h - 3}" font-size="7" fill="#555" text-anchor="middle">${r1(r.w)}×${r1(r.h)}</text>`);
  }
  for (const c of S.controls) if (!c.behind && bad.has(c.id)) o.push(`<rect x="${c.rect.x}" y="${c.rect.y}" width="${c.rect.w}" height="${c.rect.h}" rx="3" fill="none" stroke="#c0392b" stroke-width="2.2" stroke-dasharray="${M.overlaps.controls.some((x) => x.a === c.id || x.b === c.id) ? '5 3' : 'none'}"/>`);
  for (const p of S.popups) o.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="4" fill="#8e44ad" fill-opacity="0.07" stroke="#8e44ad" stroke-dasharray="4 3"><title>pop-up ${esc(p.label)} (owner ${esc(p.owner)})</title></rect>`);
  o.push('</svg>');
  return o.join('\n');
}

// ---- CLI -----------------------------------------------------------------------------------------
const outBase = (specFile) => specFile.replace(/\.json$/i, '');
const strip = (res) => JSON.parse(JSON.stringify(res, (k, v) => (k.startsWith('_') ? undefined : v)));

function main(argv) {
  const args = argv.slice(2);
  let specPath = null, basePath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--baseline') basePath = args[++i];
    else if (!args[i].startsWith('--')) specPath = args[i];
  }
  if (!specPath) { console.error('usage: node eval.mjs <spec.json> [--baseline baseline.json]'); process.exit(2); }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const res = evaluate(spec);
  let base = null;
  if (basePath) {
    base = evaluate(JSON.parse(fs.readFileSync(basePath, 'utf8')));
    res.baseline = { file: path.basename(basePath), name: base.name, headline: base.headline };
  }
  const ob = outBase(specPath);
  fs.writeFileSync(`${ob}.report.json`, JSON.stringify(strip(res), null, 1));
  fs.writeFileSync(`${ob}.report.md`, reportMd(res, base, specPath));
  const screens = Object.fromEntries(Object.entries(spec.screens || {}).filter(([k]) => res.screens[k]).map(([k, s]) => [k, normScreen(k, s, spec)]));
  for (const [k, S] of Object.entries(screens)) fs.writeFileSync(`${ob}.${k}.svg`, screenSvg(res, k, S, res.screens[k]));
  console.log(res.headline.text);
  if (base) console.log(base.headline.text + '   <- baseline');
  for (const e of res.validation.errors) console.log('ERROR ' + e);
  if (res.validation.warnings.length) console.log(`${res.validation.warnings.length} warnings (see report)`);
  console.log(`wrote ${ob}.report.json, ${ob}.report.md and ${Object.keys(screens).length} SVGs`);
  process.exitCode = res.validation.errors.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main(process.argv);
