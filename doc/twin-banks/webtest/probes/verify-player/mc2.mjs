// Current build, keycap-only hits (a tap between keys hits the case: nothing), same scatter.
import fs from 'fs';
const SP = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad';
const base = JSON.parse(fs.readFileSync(`${SP}/design/harness/baseline.json`)).screens;
const SIG = 2.3 / 0.15875;
const rnd = Math.random;
const gauss = () => { let u = 0; while (u === 0) u = rnd(); const v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const N = 1000000;
for (const scr of ['443x939', '390x844', '360x640']) {
  const S = base[scr]; console.log('==', scr);
  const L = S.controls.filter((c) => c.id !== 'longrest');
  const hit = (x, y) => (L.find((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) || { id: 'none' }).id;
  for (const k of ['pad_u', 'pad_l', 'pad_n', 'pin2', 'combat', 'inventory']) {
    const c = S.controls.find((q) => q.id === k), cx = c.x + c.w / 2, cy = c.y + c.h / 2; const t = {};
    for (let i = 0; i < N; i++) { const r = hit(cx + gauss() * SIG, cy + gauss() * SIG); t[r] = (t[r] || 0) + 1; }
    console.log(`  aim ${k.padEnd(10)} -> ` + Object.entries(t).filter(([q]) => q !== k).sort((a, b) => b[1] - a[1]).map(([q, n]) => `${q} ${(100 * n / N).toFixed(2)}%`).join(', '));
  }
}
