// Monte Carlo of aimed taps under the final design's own hit model (checks/lib.mjs hitModel),
// with the design's tap scatter (sigma 2.3 mm per axis = 14.49 dp).
import fs from 'fs';
const SP = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad';
const { hitModel } = await import(`${SP}/design/final/checks/lib.mjs`);
const spec = JSON.parse(fs.readFileSync(`${SP}/design/final/spec.json`)).screens;
const SIG = 2.3 / 0.15875;
const rnd = Math.random;
const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const N = 1000000;
function aim(key, S, hit) {
  const c = S.controls.find((k) => k.id === key); const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
  const tally = {};
  for (let i = 0; i < N; i++) { const r = hit(cx + gauss() * SIG, cy + gauss() * SIG); tally[r] = (tally[r] || 0) + 1; }
  return Object.entries(tally).filter(([k]) => k !== key).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${(100 * n / N).toFixed(2)}%`).join(', ');
}
for (const scr of ['443x939', '896x443', '412x915', '390x844', '360x640']) {
  const S = spec[scr], hit = hitModel(S);
  console.log(`== ${scr}`);
  for (const k of ['pad_u', 'pad_l', 'pad_n', 'pin2', 'flick', 'look', 'combat', 'context', 'pad_centre'])
    console.log(`  aim ${k.padEnd(10)} -> ${aim(k, S, hit)}`);
}
