// In-bank neighbour misfires on the right action pad at 360-412 portrait: today (keycap only),
// the final (hit model), v2 (hit model).  Same scatter as the player verifier (sigma 2.3 mm).
import fs from 'fs';
const SP = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad';
const { hitModel } = await import(`${SP}/design/v2/checks/lib.mjs`);
const base = JSON.parse(fs.readFileSync(`${SP}/design/harness/baseline.json`)).screens;
const fin = JSON.parse(fs.readFileSync(`${SP}/design/final/spec.json`)).screens;
const v2 = JSON.parse(fs.readFileSync(`${SP}/design/v2/spec.json`)).screens;
const SIG = 2.3 / 0.15875, N = 400000;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ACT = ['combat', 'context', 'eat', 'pin2', 'flick', 'look', 'inventory', 'search', 'apply'];
function run(S, hit, id) {
  const r = rng(12345), g = () => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const c = S.controls.find((k) => k.id === id), cx = c.x + c.w / 2, cy = c.y + c.h / 2; const t = {};
  for (let i = 0; i < N; i++) { const h = hit(cx + g() * SIG, cy + g() * SIG); t[h] = (t[h] || 0) + 1; }
  const other = Object.entries(t).filter(([k]) => k !== id && ACT.includes(k)).reduce((a, [, n]) => a + n, 0);
  return { other: (100 * other / N).toFixed(2), top: Object.entries(t).filter(([k]) => k !== id && ACT.includes(k)).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, n]) => `${k} ${(100 * n / N).toFixed(2)}`).join(', ') };
}
for (const scr of ['360x640', '390x844', '412x915', '443x939']) {
  const B = base[scr], L = B.controls.filter((c) => c.id !== 'longrest');
  const hb = (x, y) => (L.find((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) || { id: 'none' }).id;
  const hf = hitModel(fin[scr]), hv = hitModel(v2[scr]);
  for (const id of ['combat', 'context', 'flick']) {
    const a = run(B, hb, id), b = run(fin[scr], hf, id), c = run(v2[scr], hv, id);
    console.log(`${scr} aim ${id.padEnd(8)} another action-pad key: today ${a.other}% (${a.top}) | final ${b.other}% | v2 ${c.other}% (${c.top})`);
  }
}
