// in-bank misfires on the action pad: today (keycaps), v2 tiled, v2 with dead drawn gaps, v2 with 6 dp seams
import fs from 'fs';
const SP = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad';
const { hitModel, layout } = await import(`${SP}/design/v2/checks/lib.mjs`);
const { screenSettings } = await import(`${SP}/design/v2/layout-cli.mjs`);
const base = JSON.parse(fs.readFileSync(`${SP}/design/harness/baseline.json`)).screens;
const SIG = 2.3 / 0.15875, N = +process.argv[2] || 200000;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ACT = ['combat', 'context', 'eat', 'pin2', 'flick', 'look', 'inventory', 'search', 'apply'];
function run(S, hit, id) {
  const r = rng(12345), g = () => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const c = S.controls.find((k) => k.id === id), cx = c.x + c.w / 2, cy = c.y + c.h / 2; const t = {};
  for (let i = 0; i < N; i++) { const h = hit(cx + g() * SIG, cy + g() * SIG); t[h] = (t[h] || 0) + 1; }
  const p = (k) => (100 * (t[k] || 0) / N).toFixed(2);
  const other = Object.entries(t).filter(([k]) => k !== id && ACT.includes(k)).reduce((a, [, n]) => a + n, 0);
  return { other: (100 * other / N).toFixed(2), t, p, own: p(id), sw: p('swallowed') };
}
for (const scr of ['896x443', '443x939', '412x915', '390x844', '360x640']) {
  const [W, H] = scr.split('x').map(Number);
  const S = layout(W, H, 'touch', screenSettings(W, H)).spec;
  const B = base[scr], L = B.controls.filter((c) => c.id !== 'longrest');
  const hb = (x, y) => (L.find((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) || { id: 'none' }).id;
  const models = [['today', B, hb], ['tile', S, hitModel(S, { seams: 'tile' })], ['gap', S, hitModel(S, { seams: 'gap' })], ['6dp', S, hitModel(S, { seams: 6 })], ['8dp', S, hitModel(S, { seams: 8 })], ['10dp', S, hitModel(S, { seams: 10 })]];
  for (const [from, to] of [['combat', 'context'], ['flick', 'pin2'], ['context', null]]) {
    const out = models.map(([nm, SS, h]) => { const r = run(SS, h, from); return `${nm} ${to ? r.p(to) : r.other}% (own ${r.own}, swallowed ${r.sw})`; });
    console.log(`${scr} ${from}→${to || 'any other action key'}: ${out.join(' | ')}`);
  }
}
