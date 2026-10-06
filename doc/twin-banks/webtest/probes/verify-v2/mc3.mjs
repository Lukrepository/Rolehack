// What a 24 dp minimum bank gap (right columns narrowed, >= 44 dp) would do at 360x640 and 390x844.
import fs from 'fs';
const SP = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad';
const { hitModel } = await import(`${SP}/design/v2/checks/lib.mjs`);
const spec = JSON.parse(fs.readFileSync(`${SP}/design/v2/spec.json`)).screens;
const SIG = 2.3 / 0.15875;
const rnd = Math.random;
const gauss = () => { let u = 0; while (u === 0) u = rnd(); const v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const N = 1000000;
function narrow(S, gapWanted) {
  const T = JSON.parse(JSON.stringify(S));
  const L = T.controls.filter((c) => c.thumb === 'L'), R = T.controls.filter((c) => c.thumb === 'R');
  const lx1 = Math.max(...L.map((c) => c.x + c.w)), rx0 = Math.min(...R.map((c) => c.x)), rx1 = Math.max(...R.map((c) => c.x + c.w));
  const g = (rx1 - rx0 - 3 * R[0].w) / 2, need = gapWanted - (rx0 - lx1);
  const w = Math.max(44, R[0].w - need / 3);
  const cols = [...new Set(R.map((c) => c.x))].sort((a, b) => b - a); // outer first
  for (const c of R) { const i = cols.indexOf(c.x); c.w = w; c.x = rx1 - w - i * (w + g); }
  return { T, w, gap: Math.min(...R.map((c) => c.x)) - lx1 };
}
for (const scr of ['360x640', '390x844']) {
  const { T, w, gap } = narrow(spec[scr], 24); const hit = hitModel(T);
  console.log(`== ${scr} with right columns ${w.toFixed(1)} dp, bank gap ${gap.toFixed(1)} dp`);
  for (const k of ['pad_u', 'pad_l', 'pad_n', 'pin2', 'combat', 'inventory']) {
    const c = T.controls.find((q) => q.id === k), cx = c.x + c.w / 2, cy = c.y + c.h / 2; const t = {};
    for (let i = 0; i < N; i++) { const r = hit(cx + gauss() * SIG, cy + gauss() * SIG); t[r] = (t[r] || 0) + 1; }
    const cross = Object.entries(t).filter(([q]) => q !== k && T.controls.find((z) => z.id === q && z.thumb !== c.thumb)).map(([q, n]) => `${q} ${(100 * n / N).toFixed(2)}%`);
    console.log(`  aim ${k.padEnd(10)} other bank: ${cross.join(', ') || '0'}`);
  }
}
