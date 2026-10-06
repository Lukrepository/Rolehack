// Today's pop-up targets (context radial nodes, candidate fan, count chips), replayed on the
// final layout with the design's own hit model.
import fs from 'fs';
const SP = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad';
const { hitModel } = await import(`${SP}/design/final/checks/lib.mjs`);
const base = JSON.parse(fs.readFileSync(`${SP}/design/harness/baseline.json`)).screens;
const fin = JSON.parse(fs.readFileSync(`${SP}/design/final/spec.json`)).screens;
const ghost = base['896x443'].controls.filter((k) => ['combat', 'pin2', 'flick', 'look', 'context'].includes(k.id))
  .map((c) => ({ x0: c.x - 8, y0: c.y - 8, x1: c.x + c.w + 8, y1: c.y + c.h + 8 }));
const inGhost = (x, y) => ghost.some((g) => x >= g.x0 && x <= g.x1 && y >= g.y0 && y <= g.y1);
for (const scr of ['896x443', '443x939']) {
  const hit = hitModel(fin[scr]); console.log('==', scr);
  for (const p of base[scr].popups) {
    if (p.owner === 'flick' || p.owner === 'look') continue;
    const pts = [];
    if (/chips/.test(p.label)) { // 5 chips across the row: x1 x5 x10 x20 xn
      const n = 5, cw = p.w / n; for (let i = 0; i < n; i++) pts.push([['x1', 'x5', 'x10', 'x20', 'xn'][i], p.x + cw * (i + 0.5), p.y + p.h / 2]);
    } else pts.push(['', p.x + p.w / 2, p.y + p.h / 2]);
    for (const [tag, x, y] of pts) {
      let r = hit(x, y); if (scr === '896x443' && (r === 'map' || r === 'ring') && inGhost(x, y)) r += ' (ghost deck)';
      console.log(`  ${p.label.split(':')[0].padEnd(14)} ${tag.padEnd(4)} (${x.toFixed(0)},${y.toFixed(0)}) -> ${r}`);
    }
  }
}
