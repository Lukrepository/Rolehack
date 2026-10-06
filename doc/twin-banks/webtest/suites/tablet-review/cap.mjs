import { layout } from '/home/user/Rolehack/win/web/layout.js';
const base = { padKey: 58, insets: { l: 0, r: 0, t: 0, b: 0 }, mapCell: 'columns' };
for (const H of [1440, 1200, 1080]) {
  let prev = null;
  for (let W = 1800; W <= 3000; W += 2) {
    const r = layout(W, H, 'touch', { ...base, prevTier: 'tablet', prevCellTier: 'tablet' });
    const T = r.info.T, G = r.info.G.kind;
    const panels = r.spec.chrome.map(c => c.name.slice(7, 12) + '@' + Math.round(c.x) + ',' + Math.round(c.y) + ' ' + Math.round(c.w) + 'x' + Math.round(c.h)).join(' | ');
    if (!prev || prev.T !== T || prev.G !== G) console.log(`${W}x${H}: T=${T} glass=${G} map=${Math.round(r.spec.mapArea.w)}x${Math.round(r.spec.mapArea.h)} ${panels}`);
    prev = { T, G };
  }
}
