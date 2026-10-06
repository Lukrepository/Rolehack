import { expected } from './lib.mjs';
for (const [W, H] of [[1000, 600], [1000, 598], [1000, 504], [1366, 700], [1366, 692], [1366, 656], [1366, 654]]) {
  const r = expected(W, H, { screen: { w: 2560, h: 1440 }, prev: { tier: 'tablet', cellTier: 'tablet' } });
  const m = r.spec.mapArea;
  console.log(`${W}x${H}`, 'tier', r.info.tier, 'T', r.info.T.toFixed(2), 'G', r.info.G.kind, r.info.G.over ? 'over' : '', 'cols', r.info.fill.cols.toFixed(1), 'rows', r.info.fill.rows.toFixed(1),
    'map', [m.x, m.y, m.w, m.h].map((v) => Math.round(v)), 'DC', JSON.stringify(r.info.DC), 'panels', r.spec.chrome.map((c) => c.name.slice(7, 14) + [c.x, c.y, c.w, c.h].map(Math.round)).join(' '), 'budget', r.spec.source && JSON.stringify(r.spec.source).slice(0, 80));
}
