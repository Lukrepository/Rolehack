import { layout } from '/home/user/Rolehack/win/web/layout.js';
const est = (W, H, sw, sh) => { const short = Math.min(sw, sh), long = Math.max(sw, sh); return { w: W, h: Math.max(1, short - Math.max(0, long - H)), l: long }; };
for (const [W, H, sw, sh] of [[412, 600, 412, 915], [412, 700, 412, 915], [443, 640, 443, 939], [390, 600, 390, 844], [443, 460, 443, 939], [600, 960, 800, 1280], [443, 859, 443, 939]]) {
  const b = est(W, H, sw, sh);
  const r1 = layout(W, H, 'touch', { budget: b, header: 'stacked' });
  const r0 = layout(W, H, 'touch', { header: 'stacked' });
  const rL = layout(W, H, 'touch', { budget: { w: W, h: Math.min(sw, sh) - 80, l: Math.max(sw, sh) }, header: 'stacked' });
  const s = (r) => `${r.usable ? 'usable' : 'UNUSABLE'} ${r.spec.fit.level} pad ${r.spec.fit.pad} cell ${r.info && r.info.T && r.info.T.toFixed(1)} map ${r.spec.mapArea.w.toFixed(0)}x${r.spec.mapArea.h.toFixed(0)} upper ${r.spec.controls.find(c=>c.id==='msgs').h} ${r.spec.fit.reasons.slice(0,1).join('').slice(0,90)}`;
  console.log(`${W}x${H} screen ${sw}x${sh}: est budget ${JSON.stringify(b)}\n   with est: ${s(r1)}\n   no budget: ${s(r0)}\n   real-ish landscape (short-80): ${s(rL)}`);
}
