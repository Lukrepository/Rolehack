import { layout, textMetrics } from '/home/user/Rolehack/win/web/layout.js';
const t = textMetrics({ msgFont: 'atkinson', msgSize: 1, textScale: 1, xHeight: 9.5 });
for (const [W, H, budget] of [[896, 443, { w: 443, h: 443, l: 896 }], [443, 939, { w: 443, h: 443, l: 896 }]]) {
  for (const header of ['stacked', 'auto']) {
    const r = layout(W, H, 'touch', { padKey: 58, budget, msgRowH: t.msgRowH, statusH: 48, header });
    const S = r.spec;
    console.log(W, H, header, r.usable, S.fit.level, 'cell', r.info.T, 'glass', JSON.stringify(S.glass), 'map', JSON.stringify(S.mapArea));
    console.log(' bands', JSON.stringify(S.bands.map(b => [b.name, b.x, b.y, b.w, b.h])));
    console.log(' chrome', JSON.stringify(S.chrome.map(b => [b.name, b.x, b.y, b.w, b.h])));
    console.log(' popups', JSON.stringify(S.popups.map(b => [b.owner, b.name, Math.round(b.x), Math.round(b.y), Math.round(b.w), Math.round(b.h)])));
    console.log(' decor', JSON.stringify(S.decor.map(b => [b.name, b.x, b.y, b.w, b.h])));
    console.log(' controls', S.controls.length, S.controls.filter(c => c.behind).map(c => c.id), Object.keys(S.controls[0]));
    console.log(' info keys', Object.keys(r.info), 'fill', JSON.stringify(r.info.fill));
  }
}
