// Neighbouring windows (2 px apart) whose map cell differs by more than 15%:
// the working tree's layout.js against HEAD's, tablet-tier windows, touch, no budget.
import * as WK from '/home/user/Rolehack/win/web/layout.js';
import * as HD from './head-layout.mjs';
const t = WK.textMetrics({ msgFont: 'atkinson', msgSize: 1, textScale: 1, xHeight: 9.5 });
const base = { padKey: 58, insets: { l: 0, r: 0, t: 0, b: 0 }, msgRowH: t.msgRowH, statusH: 48, mapCell: 'columns' };
function scan(L, name) {
  const out = [];
  const lines = [];
  for (const H of [700, 768, 800, 900, 1000, 1080, 1200, 1440]) lines.push(Array.from({ length: (3840 - 640) / 2 + 1 }, (_, i) => [640 + 2 * i, H]));
  for (const W of [1000, 1280, 1366, 1920, 2560, 3440]) lines.push(Array.from({ length: (1600 - 500) / 2 + 1 }, (_, i) => [W, 500 + 2 * i]));
  for (const line of lines) {
    let prev = null, last = null;
    for (const [W, H] of line) {
      const r = L.layout(W, H, 'touch', { ...base, prevTier: prev?.tier ?? null, prevCellTier: prev?.cellTier ?? null });
      if (!r.usable) { last = null; continue; }
      prev = { tier: r.info.tier, cellTier: r.info.DC?.tier };
      const cur = { W, H, T: r.info.T, whole: r.info.fill.whole, tier: r.info.tier, kind: r.info.G.kind };
      if (last && last.tier === 'tablet' && cur.tier === 'tablet' && Math.abs(cur.T - last.T) / Math.min(cur.T, last.T) > 0.15)
        out.push(`${last.W}x${last.H} T${last.T.toFixed(2)}${last.whole ? ' whole' : ''} ${last.kind} -> ${W}x${H} T${cur.T.toFixed(2)}${cur.whole ? ' whole' : ''} ${cur.kind}`);
      last = cur;
    }
  }
  console.log(`${name}: ${out.length} jumps over 15% between windows 2 px apart`);
  for (const o of out) console.log('  ' + o);
  return out;
}
const a = scan(HD, 'HEAD'), b = scan(WK, 'working tree');
console.log('new in the working tree:', b.filter((x) => !a.includes(x)).length);
