// Portrait and landscape windows: columns of the level shown, now and before the stage (8e3ebda)
import { layout as W } from './work-layout.mjs';
import { layout as B } from './base-layout.mjs';
const cols = (r) => { if (!r.usable) return null; const m = r.spec.mapArea; return Math.min(80, m.w / (r.info.T * 1)); };
const rows = (r) => { if (!r.usable) return null; const m = r.spec.mapArea; return Math.min(21, m.h / r.info.T); };
let worse = [], n = 0;
for (let w = 600; w <= 2400; w += 20) for (let h = Math.max(w + 20, 900); h <= 4000; h += 40) {
  const a = W(w, h, 'touch', {}), b = B(w, h, 'touch', {});
  n++;
  if (!a.usable || !b.usable) { if (a.usable !== b.usable) worse.push(`${w}x${h} usable ${b.usable} -> ${a.usable}`); continue; }
  const ca = cols(a) * rows(a), cb = cols(b) * rows(b);
  if (ca < cb - 1) worse.push(`${w}x${h}: T ${b.info.T} -> ${a.info.T}, cells ${cb.toFixed(0)} -> ${ca.toFixed(0)} (cols ${cols(b).toFixed(1)} -> ${cols(a).toFixed(1)}, rows ${rows(b).toFixed(1)} -> ${rows(a).toFixed(1)})`);
}
console.log(`portrait windows ${n}; fewer level cells shown than before the stage: ${worse.length}`);
console.log(worse.slice(0, 40).join('\n'));
