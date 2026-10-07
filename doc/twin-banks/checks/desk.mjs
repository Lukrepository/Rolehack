// The desk (layout.js section 10: the layout for a mouse and a keyboard; desktop mode, Lucas,
// 2026-10-06 and 2026-10-07), checked the way the page lays it out: windows of 800-3840 by
// 400-2160 dp (a line every 120 dp) dragged 4 dp at a time, and 1 dp at a time for 28 dp
// from wherever the rule's own arrangement changes, so its band is crossed a pixel at a
// time; wider then narrower, and taller then shorter, each laid out with the arrangement the
// last one drew (info.desk, given back as settings.prevDesk), at device pixel ratios 1, 1.25,
// 1.5, 2 and 2.4375, with tiles and with Android's text cells.  Wherever the dragged
// arrangement changes, the drag also turns back for 23 dp (1, 2, 4, 8 ... 23 dp back, each
// laid out with the last), as a hand that overshoots does.
//
//   node doc/twin-banks/checks/desk.mjs [-v]
//
// An issue is:
// - no spec; a result with no info.desk or no info.T (the page keeps the one and draws the
//   other); an unusable result where the window's own layout (no prevDesk) is usable;
// - a usable result that is not drawable (lib.mjs drawable) or has collisions (layout.js
//   collisions); a pop-up over a key; a band or panel within 12 dp of a key;
// - a map (spec.mapArea) wider than the level at the cell; a cell (info.T) that is not whole
//   device pixels, as the page draws it (web.js drawnCell);
// - the band, three ways: a part of the arrangement that changes and changes back within
//   24 dp of travel in the same direction (the cell: that turns the other way), a flip; a
//   part that changes back when the drag turns back within 24 dp of where it changed (no
//   band, or one narrower than 24 dp); and on the way up along one side, a part still what
//   it was where the rule's own pick had left it at the windows 24 dp behind, straight back
//   and diagonally (for the panels and the legend, those at the cell the drag showed): a
//   band wider than 24 dp.
// Exit code 1 on any issue.  RH_LAYOUT=<path> runs another build of the rule.  The rule as it
// was before desktop mode (c694b4c07) has issues here (no info.desk; 1264 dp maps round a 960
// dp level; 18 device px cells at dpr 1.25), and so do one without the band (it changes back
// a pixel after turning) and the band as first built (695907447: the panels kept 104 dp past
// their step at 640 tall, and a cell that skipped a step changed again 4 dp after turning).
import { layout, drawable, collisions, overlaps } from './lib.mjs';

const verbose = process.argv.includes('-v');
const DPRS = [1, 1.25, 1.5, 2, 2.4375];
const ASPECTS = [1, 0.5625];
const W0 = 800, W1 = 3840, H0 = 400, H1 = 2160, LINE = 120, STEP = 4, FINE = 28, BAND = 24;
const BACK = [1, 2, 4, 8, 12, 16, 20, 23];   // how far back the drag turns, laid out in turn
const span = (a, b, s) => { const o = []; for (let v = a; s > 0 ? v <= b : v >= b; v += s) o.push(v); return o; };
const PARTS = ['Td', 'sideBySide', 'beside', 'log', 'inv', 'legend'];
const deskOf = (r) => (r && r.info && r.info.desk) || null;
const keyOf = (r) => (deskOf(r) ? PARTS.map((p) => r.info.desk[p]).join('|') : 'none');
const gapOf = (a, b) => Math.hypot(Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)), Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)));

// every rule one dragged layout must keep
function issuesOf(r, plain, st) {
  const is = [];
  if (!r.spec) return [`no spec (${r.reason})`];
  if (plain.usable && !r.usable) is.push('unusable, where the window\'s own layout is usable');
  if (!r.usable) return is;
  const S = r.spec, T = r.info && r.info.T;
  if (!deskOf(r)) is.push('no info.desk (the arrangement the page keeps)');
  if (typeof T !== 'number' || !(T > 0)) is.push('no info.T (the cell)');
  else {
    if (Math.abs(Math.floor(T * st.dpr + 1e-6) / st.dpr - T) > 1e-9) is.push(`the cell ${T} dp is not whole device pixels at dpr ${st.dpr}`);
    if (S.mapArea.w > 80 * st.cellAspect * T + 0.02) is.push(`a ${S.mapArea.w} dp map round a ${r2(80 * st.cellAspect * T)} dp level`);
  }
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
const r2 = (v) => Math.round(v * 100) / 100;

// one direction of a drag: from a to b along one side, the other side fixed
function walk(along, a, b, other, st, prev, out) {
  const dir = b > a ? 1 : -1;
  const at = (v) => (along === 'W' ? [v, other] : [other, v]);
  const name = along === 'W' ? `${other} tall, ${dir > 0 ? 'wider' : 'narrower'}` : `${other} wide, ${dir > 0 ? 'taller' : 'shorter'}`;
  const plainAt = new Map();
  const plainOf = (v) => { if (!plainAt.has(v)) plainAt.set(v, layout(...at(v), 'mouse', st)); return plainAt.get(v); };
  const last = {};               // per part: where and how it last changed in this direction
  const left = {};               // per part and value: where the rule's own pick last left it
  for (const p of PARTS) left[p] = new Map();
  let v = a, fine = 0, prevR = null, prevPlain = null, prevV = null;
  for (;;) {
    const [W, H] = at(v);
    const r = layout(W, H, 'mouse', { ...st, prevDesk: prev.desk });
    const plain = plainOf(v);
    out.n++;
    if (keyOf(r) !== keyOf(plain)) out.kept++;
    for (const i of issuesOf(r, plain, st)) out.issues.push(`${out.tag} ${W}x${H}: ${i}`);
    // the walk goes a pixel at a time across each of the rule's own steps, so this is where
    if (deskOf(prevPlain) && deskOf(plain)) {
      for (const p of PARTS) if (prevPlain.info.desk[p] !== plain.info.desk[p]) left[p].set(prevPlain.info.desk[p], v);
    }
    prevPlain = plain;
    if (prevR && deskOf(r) && deskOf(prevR)) {
      for (const p of PARTS) {
        const x = prevR.info.desk[p], y = r.info.desk[p];
        if (x === y) continue;
        const l = last[p];
        if (l && Math.abs(v - l.v) < BAND && (p === 'Td' ? Math.sign(y - x) !== Math.sign(l.to - l.from) : y === l.from)) {
          out.issues.push(`${out.tag} ${name}: ${p} ${l.from} -> ${l.to} at ${l.v}, then -> ${y} at ${v} (a flip)`);
        }
        last[p] = { v, from: x, to: y };
        // late: on the way up, still x at the last window, where the rule's own pick had
        // left it BAND dp behind, straight back and diagonally (the band's windows behind it)
        const o = left[p].get(x), ownNow = plain.info && plain.info.desk && plain.info.desk[p];
        const lag = o === undefined || ownNow === x ? 0 : Math.abs(v - o);
        if (dir > 0 && lag && Math.abs(prevV - o) >= BAND) {
          // the panels and the legend: only the windows behind at the cell the drag showed
          // (the band asks them with it held; a window 24 dp taller has a bigger cell)
          const cellOnly = p !== 'Td' && p !== 'sideBySide', Td = prevR.info.desk.Td;
          const behind = [-BAND, 0, BAND].map((d) => layout(...(along === 'W' ? [prevV - BAND, other + d] : [other + d, prevV - BAND]), 'mouse', st))
            .filter((q) => deskOf(q) && (!cellOnly || q.info.desk.Td === Td));
          const gone = behind.length > 0 && behind.every((q) => { const z = q.info.desk[p]; return z !== x && (p !== 'Td' || z > x); });
          if (gone) out.issues.push(`${out.tag} ${name}: ${p} ${x} -> ${y} at ${v}, still ${x} at ${prevV}, where the rule's own had left it ${BAND} dp behind (at ${o}; a band wider than ${BAND} dp)`);
        }
        out.lags.push(`${dir > 0 ? 'up' : 'down'} ${lag}`);
        // turn back: the part must not go back to what it was
        turnBack(at, v, dir, st, r.info.desk, p, x, y, name, out);
      }
    }
    if (r.usable && deskOf(r)) prev.desk = r.info.desk;     // what the page drew (an unusable desk is not drawn)
    prevR = r; prevV = v;
    if (v === b) break;
    // 1 dp at a time for FINE dp from wherever the rule's own arrangement changes
    const next = dir > 0 ? Math.min(b, v + STEP) : Math.max(b, v - STEP);
    if (!fine && keyOf(plainOf(next)) !== keyOf(plain)) fine = FINE;
    if (fine) { fine--; v += dir; } else v = next;
  }
}

// the drag turned back at v, after part p changed from x to y there
function turnBack(at, v, dir, st, desk, p, x, y, name, out) {
  let prevDesk = desk;
  for (const k of BACK) {
    const [W, H] = at(v - dir * k);
    if (W < 1 || H < 1) break;
    const r = layout(W, H, 'mouse', { ...st, prevDesk });
    out.n++; out.back++;
    if (!r.usable || !deskOf(r)) break;
    const z = r.info.desk[p];
    if (p === 'Td' ? Math.sign(z - y) === Math.sign(x - y) && z !== y : z === x) {
      out.issues.push(`${out.tag} ${name}: ${p} ${x} -> ${y} at ${v}, and back to ${z} ${k} dp back (no band)`);
      break;
    }
    prevDesk = r.info.desk;
  }
}

const t0 = Date.now();
const out = { n: 0, kept: 0, back: 0, lags: [], issues: [], tag: '' };
for (const a of ASPECTS) for (const dpr of DPRS) {
  const st = { cellAspect: a, dpr };
  out.tag = `${a === 1 ? 'tiles' : 'text cells'} dpr ${dpr}`;
  const before = out.n;
  for (const W of span(W0, W1, LINE)) { const prev = { desk: null }; walk('H', H0, H1, W, st, prev, out); walk('H', H1, H0, W, st, prev, out); }
  for (const H of span(H0, H1, LINE)) { const prev = { desk: null }; walk('W', W0, W1, H, st, prev, out); walk('W', W1, W0, H, st, prev, out); }
  if (verbose) console.log(`  ${out.tag}: ${out.n - before} layouts, ${out.issues.length} issues so far (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
const lagged = out.lags.filter((l) => !l.endsWith(' 0')).length;
console.log(`desk: ${out.n} dragged layouts in ${((Date.now() - t0) / 1000).toFixed(0)} s (${ASPECTS.length * DPRS.length} variants, ${out.back} of them turned back): the band kept another arrangement at ${out.kept}; ${out.lags.length} changes, ${lagged} after the rule's own left the old part; ${out.issues.length} issues`);
if (verbose) { const h = {}; for (const l of out.lags) h[l] = (h[l] || 0) + 1; console.log('  lags (dp after the rule\'s own: changes):', JSON.stringify(h)); }
for (const i of out.issues.slice(0, verbose ? 1e9 : 40)) console.log('  ' + i);
if (out.issues.length > 40 && !verbose) console.log(`  ... ${out.issues.length - 40} more (-v)`);
process.exit(out.issues.length ? 1 : 0);
