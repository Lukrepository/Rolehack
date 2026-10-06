import { layout } from '/home/user/Rolehack/win/web/layout.js';
import { voidOf } from './void-lib.mjs';
for (const cap of [24, 32, 40, 48]) for (const w of ['1920x1080', '2560x1440', '3440x1440', '2560x1080', '3840x2160', '5120x1440']) {
  const [W, H] = w.split('x').map(Number);
  const r = layout(W, H, 'touch', { tabletCellMax: cap });
  const q = voidOf(r.spec);
  console.log(`cap ${cap} ${w} glass ${r.info.G.kind} T ${r.info.T.toFixed(2)}: void ${(q.void * 100).toFixed(1)}% map ${(q.map * 100).toFixed(1)}% panels ${(q.panels * 100).toFixed(1)}% ${r.spec.chrome.map((c) => c.name.split(' (')[0].slice(7) + '@' + [c.x, c.y, c.w, c.h].map(Math.round).join(',')).join(' ')}`);
}
