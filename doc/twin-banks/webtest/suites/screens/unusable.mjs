import { expected } from './lib.mjs';
const rows = [];
for (const H of [440, 460, 480, 500, 520, 560, 600, 640, 680, 720, 760, 800, 900]) {
  let line = `${H}: `;
  for (let W = 440; W <= 1000; W += 20) { const r = expected(W, H, { screen: { w: 2560, h: 1440 } }); line += r.usable ? (r.info.tier === 'tablet' ? 'T' : 'p') : '.'; }
  rows.push(line);
}
console.log('W 440..1000 step 20 (T tablet, p phone, . unusable -> classic)'); console.log(rows.join('\n'));
