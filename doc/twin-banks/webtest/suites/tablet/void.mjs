// The void, map and panel shares of layout() at each window, as the page lays
// it out (touch; no budget).  node void.mjs [WxH ...]
import { layout } from '/home/user/Rolehack/win/web/layout.js';
import { voidOf } from './void-lib.mjs';
const wins = process.argv.slice(2).length ? process.argv.slice(2) : ['1024x768', '768x1024', '1180x820', '1366x768', '1280x800', '1920x1080', '2560x1440', '3440x1440', '960x600', '896x443', '443x939'];
for (const w of wins) {
  const [W, H] = w.split('x').map(Number);
  const r = layout(W, H, 'touch', {});
  const q = voidOf(r.spec);
  console.log(`${w} tier ${r.info.tier} glass ${r.info.G.kind} T ${r.info.T.toFixed(2)} whole ${r.info.fill.whole}: void ${(q.void * 100).toFixed(1)}%  map ${(q.map * 100).toFixed(1)}%  panels ${(q.panels * 100).toFixed(1)}%`);
}
