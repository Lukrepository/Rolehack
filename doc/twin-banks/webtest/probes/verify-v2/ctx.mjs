// Aimed at COMBAT, fires CONTEXT (on stairs: Descend at once, or the sticky HERE layer): today (keycaps), v2 (hit model).
import fs from 'fs';
const SP = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad';
const { hitModel } = await import(`${SP}/design/v2/checks/lib.mjs`);
const base = JSON.parse(fs.readFileSync(`${SP}/design/harness/baseline.json`)).screens;
const v2 = JSON.parse(fs.readFileSync(`${SP}/design/v2/spec.json`)).screens;
const SIG = 2.3 / 0.15875, N = 1000000;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function rate(S, hit, from, to) {
  const r = rng(777), g = () => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const c = S.controls.find((k) => k.id === from), cx = c.x + c.w / 2, cy = c.y + c.h / 2; let n = 0;
  for (let i = 0; i < N; i++) if (hit(cx + g() * SIG, cy + g() * SIG) === to) n++;
  return (100 * n / N).toFixed(2) + '%';
}
for (const scr of ['896x443', '443x939', '412x915', '390x844', '360x640']) {
  const B = base[scr], L = B.controls.filter((c) => c.id !== 'longrest');
  const hb = (x, y) => (L.find((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) || { id: 'none' }).id;
  const hv = hitModel(v2[scr]);
  console.log(`${scr}: COMBAT→CONTEXT today ${rate(B, hb, 'combat', 'context')} v2 ${rate(v2[scr], hv, 'combat', 'context')} | FLICK→PIN2 today ${rate(B, hb, 'flick', 'pin2')} v2 ${rate(v2[scr], hv, 'flick', 'pin2')}`);
}
