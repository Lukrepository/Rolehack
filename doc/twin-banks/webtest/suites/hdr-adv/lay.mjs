import { layout, textMetrics } from '/home/user/Rolehack/win/web/layout.js';
const t = textMetrics({ msgFont: 'atkinson', msgSize: 1, textScale: 1, xHeight: 9.5 });
const wins = [[896,443],[443,939],[1024,768],[768,1024],[1366,768],[640,360],[360,640]];
for (const cell of ['columns','rows']) for (const [W,H] of wins) {
  const r = layout(W, H, 'touch', { msgRowH: t.msgRowH, statusH: 48, mapCell: cell, budget: (W===896||W===443)? {w:443,h:443,l:896}: undefined });
  const S = r.spec;
  console.log(cell, W, H, r.usable, 'T', r.info.T, 'over', r.info.G.over, 'kind', r.info.G.kind, 'rows', r.info.fill.rows_msg, JSON.stringify(S.bands.map(b=>[b.id, +b.x.toFixed(1), +b.y.toFixed(1), +b.w.toFixed(1), +b.h.toFixed(1)])), 'map', JSON.stringify(S.mapArea), 'panels', JSON.stringify((S.panels||[]).map(p=>[p.id, Math.round(p.x),Math.round(p.y),Math.round(p.w),Math.round(p.h)])));
}
