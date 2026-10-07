// The desk (layout.js section 10: the layout for a mouse and a keyboard; desktop mode, Lucas,
// 2026-10-06 and 2026-10-07), checked the way the page lays it out: windows of 800-3840 by
// 400-2160 dp (a line every 120 dp) dragged 4 dp at a time, and 1 dp at a time for 28 dp
// from wherever the rule's own arrangement changes, so its band is crossed a pixel at a
// time; wider then narrower, and taller then shorter, each laid out with the arrangement the
// last one drew (info.desk, given back as settings.prevDesk), at device pixel ratios 1, 1.25,
// 1.5, 2 and 2.4375, with tiles and with Android's text cells.
//
//   node doc/twin-banks/checks/desk.mjs [-v]
//
// An issue is: no spec; an unusable result where the window's own layout (no prevDesk) is
// usable; a usable result that is not drawable (lib.mjs drawable) or has collisions
// (layout.js collisions); a pop-up over a key; a band or panel within 12 dp of a key; a map
// wider than the level; a cell that is not whole device pixels, as the page draws it
// (web.js drawnCell); and any part of the arrangement that changes and changes back within
// 24 dp of travel in the same direction (the cell: that turns the other way), a flip.  Exit
// code 1 on any issue.  RH_LAYOUT=<path> runs another build of the rule.
import { layout, drawable, collisions, overlaps } from './lib.mjs';

const verbose = process.argv.includes('-v');
const DPRS = [1, 1.25, 1.5, 2, 2.4375];
const ASPECTS = [1, 0.5625];
const W0 = 800, W1 = 3840, H0 = 400, H1 = 2160, LINE = 120, STEP = 4, FINE = 28, BAND = 24;
const span = (a, b, s) => { const o = []; for (let v = a; s > 0 ? v <= b : v >= b; v += s) o.push(v); return o; };
const PARTS = ['Td', 'sideBySide', 'beside', 'log', 'inv', 'legend'];
const keyOf = (r) => (r && r.info && r.info.desk ? PARTS.map((p) => r.info.desk[p]).join('|') : 'none');
const gapOf = (a, b) => Math.hypot(Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)), Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)));

// every rule one dragged layout must keep
function issuesOf(r, plain, st) {
  const is = [];
  if (!r.spec) return [`no spec (${r.reason})`];
  if (plain.usable && !r.usable) is.push('unusable, where the window\'s own layout is usable');
  const d = r.info && r.info.desk;
  if (d) {
    const T = r.info.T;
    if (Math.abs(Math.floor(T * st.dpr + 1e-6) / st.dpr - T) > 1e-9) is.push(`the cell ${T} dp is not whole device pixels at dpr ${st.dpr}`);
    if (r.info.fill.map.w > 80 * st.cellAspect * T + 1e-6) is.push(`a ${r.info.fill.map.w.toFixed(1)} dp map round a ${(80 * st.cellAspect * T).toFixed(1)} dp level`);
  }
  if (!r.usable) return is;
  const S = r.spec;
  const dr = drawable(S, r.info && r.info.fill);
  if (dr.length) is.push(`not drawable: ${dr.slice(0, 3).join(', ')}`);
  const co = collisions(S);
  if (co.length) is.push(`collisions: ${co.slice(0, 3).join(', ')}`);
  const live = S.controls.filter((c) => !c.behind);
  for (const p of S.popups) { const c = live.find((k) => overlaps(p, k)); if (c) { is.push(`pop-up over ${c.id}: ${p.label.slice(0, 24)}`); break; } }
  for (const b of [...S.bands, ...S.chrome]) {
    const c = live.find((k) => gapOf(b, k) < 12 - 0.02);
    if (c) is.push(`${b.name.split(' (')[0]} ${gapOf(b, c).toFixed(1)} dp from ${c.id}`);
  }
  return is;
}

// one direction of a drag: from a to b along one side, the other side fixed
function walk(along, a, b, other, st, prev, out) {
  const dir = b > a ? 1 : -1;
  const at = (v) => (along === 'W' ? [v, other] : [other, v]);
  const plainAt = new Map();
  const plainOf = (v) => { if (!plainAt.has(v)) plainAt.set(v, layout(...at(v), 'mouse', st)); return plainAt.get(v); };
  const last = {};               // per part: where and how it last changed in this direction
  let v = a, fine = 0, prevR = null;
  for (;;) {
    const [W, H] = at(v);
    const r = layout(W, H, 'mouse', { ...st, prevDesk: prev.desk });
    const plain = plainOf(v);
    out.n++;
    if (keyOf(r) !== keyOf(plain)) out.kept++;
    for (const i of issuesOf(r, plain, st)) out.issues.push(`${out.tag} ${W}x${H}: ${i}`);
    if (prevR && r.info && r.info.desk && prevR.info && prevR.info.desk) {
      for (const p of PARTS) {
        const x = prevR.info.desk[p], y = r.info.desk[p];
        if (x === y) continue;
        const l = last[p];
        if (l && Math.abs(v - l.v) < BAND && (p === 'Td' ? Math.sign(y - x) !== Math.sign(l.to - l.from) : y === l.from)) {
          out.issues.push(`${out.tag} ${along === 'W' ? `${other} tall, ${dir > 0 ? 'wider' : 'narrower'}` : `${other} wide, ${dir > 0 ? 'taller' : 'shorter'}`}: ${p} ${l.from} -> ${l.to} at ${l.v}, then -> ${y} at ${v} (a flip)`);
        }
        last[p] = { v, from: x, to: y };
      }
    }
    if (r.usable && r.info.desk) prev.desk = r.info.desk;     // what the page drew (an unusable desk is not drawn)
    prevR = r;
    if (v === b) break;
    // 1 dp at a time for FINE dp from wherever the rule's own arrangement changes
    const next = dir > 0 ? Math.min(b, v + STEP) : Math.max(b, v - STEP);
    if (!fine && keyOf(plainOf(next)) !== keyOf(plain)) fine = FINE;
    if (fine) { fine--; v += dir; } else v = next;
  }
}

const t0 = Date.now();
const out = { n: 0, kept: 0, issues: [], tag: '' };
for (const a of ASPECTS) for (const dpr of DPRS) {
  const st = { cellAspect: a, dpr };
  out.tag = `${a === 1 ? 'tiles' : 'text cells'} dpr ${dpr}`;
  const before = out.n;
  for (const W of span(W0, W1, LINE)) { const prev = { desk: null }; walk('H', H0, H1, W, st, prev, out); walk('H', H1, H0, W, st, prev, out); }
  for (const H of span(H0, H1, LINE)) { const prev = { desk: null }; walk('W', W0, W1, H, st, prev, out); walk('W', W1, W0, H, st, prev, out); }
  if (verbose) console.log(`  ${out.tag}: ${out.n - before} layouts, ${out.issues.length} issues so far (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
console.log(`desk: ${out.n} dragged layouts in ${((Date.now() - t0) / 1000).toFixed(0)} s (${ASPECTS.length * DPRS.length} variants): the band kept another arrangement at ${out.kept}; ${out.issues.length} issues`);
for (const i of out.issues.slice(0, verbose ? 1e9 : 40)) console.log('  ' + i);
if (out.issues.length > 40 && !verbose) console.log(`  ... ${out.issues.length - 40} more (-v)`);
process.exit(out.issues.length ? 1 : 0);
