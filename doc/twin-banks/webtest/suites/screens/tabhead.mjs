import * as WK from '/home/user/Rolehack/win/web/layout.js';
import * as HD from './head-layout.mjs';
const t = WK.textMetrics({ msgFont: 'atkinson', msgSize: 1, textScale: 1, xHeight: 9.5 });
const base = { padKey: 58, insets: { l: 0, r: 0, t: 0, b: 0 }, msgRowH: t.msgRowH, statusH: 48, mapCell: 'columns' };
for (const [W, H, b] of [[1024, 768, { w: 768, h: 768, l: 1024 }], [768, 1024, { w: 768, h: 768, l: 1024 }], [1180, 820, { w: 820, h: 820, l: 1180 }], [1366, 768, { w: 768, h: 768, l: 1366 }], [960, 600, null], [600, 960, null], [1920, 1080, null], [2560, 1440, null]]) {
  const a = HD.layout(W, H, 'touch', { ...base, budget: b }), z = WK.layout(W, H, 'touch', { ...base, budget: b });
  const same = JSON.stringify(a.spec.controls) === JSON.stringify(z.spec.controls) && JSON.stringify(a.spec.bands) === JSON.stringify(z.spec.bands) && JSON.stringify(a.spec.mapArea) === JSON.stringify(z.spec.mapArea) && JSON.stringify(a.spec.chrome) === JSON.stringify(z.spec.chrome);
  console.log(`${W}x${H} touch: ${same ? 'identical to HEAD' : 'DIFFERS'} T ${a.info.T} -> ${z.info.T}`);
}
