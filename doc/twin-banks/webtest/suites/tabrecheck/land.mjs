import { layout as W } from './work-layout.mjs';
import { layout as B } from './base-layout.mjs';
const cells = (r) => { const m = r.spec.mapArea; return Math.min(80, m.w / r.info.T) * Math.min(21, m.h / r.info.T); };
let worse = [], n = 0, jumps = [];
for (let h = 480; h <= 2200; h += 20) { let prev = null; for (let w = Math.max(h, 900); w <= 5200; w += 2) {
  const a = W(w, h, 'touch', {}), b = B(w, h, 'touch', {}); n++;
  if (!a.usable || !b.usable) { if (a.usable !== b.usable) worse.push(`${w}x${h} usable ${b.usable} -> ${a.usable}`); prev = null; continue; }
  if (cells(a) < cells(b) - 1) worse.push(`${w}x${h}: T ${b.info.T} -> ${a.info.T}, cells ${cells(b).toFixed(0)} -> ${cells(a).toFixed(0)}`);
  if (prev && Math.abs(a.info.T - prev.T) > 1 && w - prev.w <= 2 && !(Math.abs(b.info.T - prev.bT) > 1)) jumps.push(`${prev.w}->${w}x${h}: T ${prev.T} -> ${a.info.T} (before the stage ${prev.bT} -> ${b.info.T})`);
  prev = { w, T: a.info.T, bT: b.info.T };
} }
console.log(`landscape windows ${n}; fewer cells than before: ${worse.length}; new jumps >1 dp across 2 px of width: ${jumps.length}`);
console.log(worse.slice(0, 20).join('\n')); console.log(jumps.slice(0, 20).join('\n'));
