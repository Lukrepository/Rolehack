// The new cap: monitor voids, portrait columns, and cell jumps along widths and heights (2 dp steps).
import { voidOf } from '../tablet/void-lib.mjs';
const { layout } = await import('/home/user/Rolehack/win/web/layout.js');
const HEAD = (await import('../head-layout.mjs').catch(() => null));
for (const w of ['1920x1080','2440x1080','2560x1440','2560x1080','3440x1440','3440x1080','3840x1080','5120x1440','5120x2160','1440x2560','2160x3840','1080x1920','2560x2559','2559x2560','2000x2001','2001x2000']) {
  const [W, H] = w.split('x').map(Number);
  const r = layout(W, H, 'touch', {});
  console.log(w.padEnd(10), 'T', r.info.T, 'DC', r.info.DC.T, r.info.G.kind, 'cols', r.info.fill.cols.toFixed(1), 'void', (voidOf(r.spec).void * 100).toFixed(1) + '%', r.usable ? '' : 'UNUSABLE');
}
let worst = { d: 0 };
for (const H of [600, 700, 768, 900, 1080, 1200, 1440, 1600, 2160, 2560, 3000]) {
  let prev = null;
  for (let W = 1000; W <= 5200; W += 2) {
    const T = layout(W, H, 'touch', {}).info.T;
    if (prev) { const d = Math.abs(T - prev.T) / prev.T; if (d > worst.d && !(H < 700)) worst = { d, at: `${prev.W}->${W}x${H} ${prev.T}->${T}` }; if (d > 0.06) console.log('JUMP W', `${prev.W}->${W}x${H}`, prev.T, '->', T); }
    prev = { W, T };
  }
}
for (const W of [1440, 2000, 2160, 2400, 2560, 3440]) {
  let prev = null;
  for (let H = 900; H <= 4000; H += 2) {
    const T = layout(W, H, 'touch', {}).info.T;
    if (prev && Math.abs(T - prev.T) / prev.T > 0.06) console.log('JUMP H', `${W}x${prev.H}->${H}`, prev.T, '->', T);
    prev = { H, T };
  }
}
console.log('worst W step (H>=700)', worst);
