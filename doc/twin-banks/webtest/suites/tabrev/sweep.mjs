import { layout } from '/home/user/Rolehack/win/web/layout.js';
const rows = [];
function voidOf(r, W, H) {
  // grid sample: points not in key, map, band, panel
  const S = r.spec, rects = [...S.controls.filter(c => c.id !== 'longrest'), S.mapArea, ...S.bands, ...S.chrome.filter(c => /^panel/.test(c.name))];
  let v = 0, n = 0;
  for (let y = 2; y < H; y += 8) for (let x = 2; x < W; x += 8) { n++; if (!rects.some(q => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h)) v++; }
  return v / n;
}
for (const [W, H] of [[1600,900],[1680,1050],[1920,1080],[1920,1200],[2048,1152],[2160,1440],[2256,1504],[2304,1440],[2400,1000],[2400,1350],[2420,1360],[2440,1370],[2460,1380],[2500,1400],[2560,1080],[2560,1440],[2560,1600],[2880,1800],[3000,2000],[3440,1440],[3840,1600],[3840,2160],[5120,1440],[5120,2160],[5120,2880]]) {
  const r = layout(W, H, 'touch', {});
  const S = r.spec;
  const panels = S.chrome.filter(c => /^panel/.test(c.name)).map(c => (c.name.includes('inventory') ? 'inv' : 'log') + '@' + [c.x, c.y, c.w, c.h].map(Math.round).join(','));
  rows.push(`${W}x${H} tier ${r.info.tier} T ${r.info.T} whole ${r.info.fill?.whole} glass ${r.info.G?.kind} map ${[S.mapArea.x,S.mapArea.y,S.mapArea.w,S.mapArea.h].map(Math.round).join(',')} void ${(voidOf(r, W, H)*100).toFixed(1)}% usable ${r.usable} ${panels.join(' ')}`);
}
console.log(rows.join('\n'));
