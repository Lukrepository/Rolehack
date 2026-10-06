// sweep layout(): panels against bands, the map, each other, keys + 12 dp halo, the screen
import { layout } from '/home/user/Rolehack/win/web/layout.js';
const ov = (a, b, e = 0.01) => a.x + e < b.x + b.w && b.x + e < a.x + a.w && a.y + e < b.y + b.h && b.y + e < a.y + a.h;
const grow = (r, d) => ({ x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d });
const sizes = [];
for (let W = 360; W <= 3840; W += 40) for (let H = 360; H <= 2160; H += 40) sizes.push([W, H]);
const settingsList = [];
for (const mapCell of ['columns', 'rows']) for (const padKey of [46, 52, 58]) for (const statusH of [undefined, 0]) for (const msgRowH of [undefined, 30])
  settingsList.push({ mapCell, padKey, statusH, msgRowH });
const bad = {};
let n = 0, withPanels = 0;
for (const [W, H] of sizes) for (const s0 of settingsList) {
  for (const prevTier of [null]) {
    const st = { insets: { l: 0, r: 0, t: 0, b: 0 }, ...s0, prevTier };
    if (st.statusH === undefined) delete st.statusH; if (st.msgRowH === undefined) delete st.msgRowH;
    const r = layout(W, H, 'touch', st);
    n++;
    if (!r.usable) continue;
    const S = r.spec, P = S.chrome.filter((c) => /^panel/.test(c.name));
    if (!P.length) continue;
    withPanels++;
    const live = S.controls.filter((c) => !c.behind);
    const add = (k, ex) => { (bad[k] = bad[k] || []).length < 6 && bad[k].push(ex); bad[k + '#'] = (bad[k + '#'] || 0) + 1; };
    for (const p of P) {
      const tag = `${W}x${H} ${JSON.stringify(s0)} ${p.name.slice(7, 18)} ${[p.x, p.y, p.w, p.h].map((v) => Math.round(v))}`;
      if (ov(p, S.mapArea)) add('panel on map', tag);
      for (const b of S.bands) if (ov(p, b)) add('panel on band', tag + ' / ' + b.name.slice(0, 20) + ' ' + [b.x, b.y, b.w, b.h].map(Math.round));
      for (const c of live) if (ov(p, grow(c, 12 - 0.02))) { add('panel within 12 dp of a key', tag + ' / ' + c.id); break; }
      for (const q of P) if (q !== p && ov(p, q)) add('panel on panel', tag);
      if (p.x < -0.01 || p.y < -0.01 || p.x + p.w > W + 0.01 || p.y + p.h > H + 0.01) add('panel off screen', tag);
      if (p.w < 100 || p.h < 40) add('tiny panel', tag);
    }
  }
}
console.log('layouts', n, 'with panels', withPanels);
console.log(JSON.stringify(bad, null, 1));
