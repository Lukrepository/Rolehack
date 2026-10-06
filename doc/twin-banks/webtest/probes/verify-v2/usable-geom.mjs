// every usable result, checked by the verifier's own geometry (common.mjs geom), over a dense grid and the variants
import { V2, geom } from '../design/v2/verify2/common.mjs';
const step = +process.argv[2] || 8;
const VAR = [{}, { hand: 'left' }, { combatThumb: 'L' }, { cellAspect: 0.5625 }, { mapCell: 'rows' }];
let n = 0, usable = 0, bad = 0, unusable = 0, degradedUsable = 0; const ex = new Map();
for (let W = 280; W <= 2400; W += step) for (let H = 280; H <= 2400; H += step) for (const v of VAR) for (const k of [46, 52, 58]) {
  n++;
  const r = V2.layout(W, H, 'touch', { ...v, padKey: k });
  if (r.usable === false) { unusable++; continue; }
  usable++; if (r.degraded) degradedUsable++;
  const g = geom(r.spec);
  if (g.length) { bad++; const key = g[0].replace(/[\d.]+dp/, 'Ndp').replace(/ \w+$/, ''); if (!ex.has(key)) ex.set(key, `${W}x${H} ${JSON.stringify(v)} ${k}: ${g.slice(0, 3).join('; ')} (${r.spec.fit.level})`); }
}
console.log(`${n} layouts (step ${step}): ${usable} usable (${degradedUsable} degraded), ${unusable} unusable; usable with a geometry problem: ${bad}`);
for (const [k, e] of ex) console.log('  ', k, '|', e);
