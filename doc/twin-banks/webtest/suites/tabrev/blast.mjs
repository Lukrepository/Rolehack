import { layout } from '/home/user/Rolehack/win/web/layout.js';
const H = await import('./head-layout.mjs');
let n = 0, diff = 0; const ex = {}; const keysDiff = [];
for (let W = 320; W <= 4000; W += 24) for (let Hh = 320; Hh <= 4000; Hh += 24) {
  n++;
  const a = layout(W, Hh, 'touch', {}), b = H.layout(W, Hh, 'touch', {});
  if (!!a.usable !== !!b.usable) { diff++; (ex.usable = ex.usable || []).push(`${W}x${Hh}`); continue; }
  if (!a.usable) continue;
  const ka = JSON.stringify(a.spec.controls), kb = JSON.stringify(b.spec.controls);
  if (ka !== kb) keysDiff.push(`${W}x${Hh}`);
  const ma = a.spec.mapArea, mb = b.spec.mapArea;
  const k = Math.abs(a.info.T - b.info.T) > 1e-9 ? (W >= Hh ? 'cell-landscape' : 'cell-portrait') : Math.abs(ma.w - mb.w) + Math.abs(ma.h - mb.h) + Math.abs(ma.x - mb.x) + Math.abs(ma.y - mb.y) > 0.01 ? 'map' : null;
  if (k) { diff++; (ex[k] = ex[k] || []).push(`${W}x${Hh}:${b.info.T}->${a.info.T}`); }
}
console.log('windows', n, 'changed', diff, 'key changes', keysDiff.length, keysDiff.slice(0, 5));
for (const [k, v] of Object.entries(ex)) console.log(k, v.length, v.slice(0, 12).join(' '));
// portrait windows that lost the whole level or columns
