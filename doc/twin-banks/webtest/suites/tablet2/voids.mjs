// The void of the touch (page) layout at big windows: node voids.mjs [layout.js path]
import { voidOf } from '../tablet/void-lib.mjs';
const path = process.argv[2] || '/home/user/Rolehack/win/web/layout.js';
const { layout } = await import(path);
const WINS = ['1024x768','768x1024','1180x820','1366x768','1280x800','1920x1080','2560x1440','3440x1440','2560x1080','3440x1080','3840x1080','3840x1600','5120x1440','5120x2160','2752x1152','1440x2560','2000x2000','1600x900','1920x1200','960x600','600x960'];
const BASE = { padKey: 58, insets: { l: 0, r: 0, t: 0, b: 0 } };
for (const w of WINS) {
  const [W, H] = w.split('x').map(Number);
  const r = layout(W, H, 'touch', BASE);
  const v = voidOf(r.spec);
  const pan = r.spec.chrome.map((c) => `${c.name.startsWith('panel: inv') ? 'inv' : 'log'}[${[c.x, c.y, c.w, c.h].map(Math.round).join(',')}]`).join(' ');
  console.log(`${w.padEnd(10)} ${r.usable ? '' : 'UNUSABLE '}${r.info.tier} ${r.info.G.kind}${r.info.G.over ? '+over' : ''} T ${r.info.T} whole ${r.info.fill.whole} map ${[r.spec.mapArea.x, r.spec.mapArea.y, r.spec.mapArea.w, r.spec.mapArea.h].map(Math.round).join(',')} rows ${r.info.fill.rows_msg} void ${(v.void * 100).toFixed(1)}% ${pan}`);
}
