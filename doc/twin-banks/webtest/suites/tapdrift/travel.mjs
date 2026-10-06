// A real tap (delivered, not swallowed) on the drawn centre of a floor cell
// two to the left of the hero, at dpr 2.4375 in portrait: the hero must end
// on that cell.
import fs from 'node:fs';
import { launch, ctxOptions, hookRoutes, URL, OUT, STATE, sleep, resumeGame } from './common.mjs';
const b = await launch();
const ctx = await b.newContext({ ...ctxOptions(443, 939, 'touch', { deviceScaleFactor: 2.4375 }), storageState: STATE });
await hookRoutes(ctx);
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await p.goto(URL);
await p.waitForFunction(() => globalThis.__rh && !document.getElementById('boot'), null, { timeout: 60000 });
await resumeGame(p);
await sleep(500);
const s = await p.evaluate(() => {
  const f = globalThis.__frame, cv = document.getElementById('map'), r = cv.getBoundingClientRect();
  return { border: f.strokes.find((x) => x.style === '#272730'), cw: cv.width, rw: r.width, rx: r.x, ry: r.y, hero: { ...globalThis.__rh.cursor } };
});
const L = s.border.x + 3, Tp = s.border.y + 3, Td = (s.border.w - 6) / 80, sx = s.cw / s.rw;
const results = [];
for (const [dx, dy] of [[-2, 0], [2, 1]]) {
  const h = await p.evaluate(() => ({ ...globalThis.__rh.cursor }));
  const target = { x: h.x + dx, y: h.y + dy };
  const f = await p.evaluate(() => { const f = globalThis.__frame; return f.strokes.find((x) => x.style === '#272730'); });
  const L2 = f.x + 3, T2 = f.y + 3;
  const x = s.rx + (L2 + (target.x + 0.5) * Td) / sx, y = s.ry + (T2 + (target.y + 0.5) * Td) / sx;
  await p.touchscreen.tap(x, y);
  await sleep(1500);
  const after = await p.evaluate(() => ({ cursor: { ...globalThis.__rh.cursor }, clicks: globalThis.__clicks || [] }));
  results.push({ from: h, target, after: after.cursor, clicked: after.clicks.at(-1), ok: after.cursor.x === target.x && after.cursor.y === target.y });
}
await p.screenshot({ path: `${OUT}/shots/travel-443x939@2.4375.png` });
const out = { results, errors };
fs.writeFileSync(`${OUT}/travel.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
await b.close();
