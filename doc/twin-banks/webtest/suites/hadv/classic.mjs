import { launch, newCtx, openPage, resume, sleep, SHOTS } from './common.mjs';
import fs from 'node:fs';
const b = await launch();
for (const DPR of [1, 2.4375]) for (const [w, h] of [[896, 443], [443, 939], [1024, 768]]) {
  const shots = [];
  for (const origin of ['http://localhost:8766', 'http://localhost:8779']) {
    const ctx = await newCtx(b, { w, h, dpr: DPR, origin, prefs: { layout: 'classic' } });
    const p = await openPage(ctx);
    await resume(p);
    await sleep(500);
    // a --More-- page and the status, as the game draws them
    const buf = await p.screenshot();
    shots.push({ buf, errors: p.errors, rects: await p.evaluate(() => ['msgband', 'statband', 'chips', 'map', 'bands', 'glass'].map((id) => { const q = document.getElementById(id).getBoundingClientRect(); return [id, q.x, q.y, q.width, q.height].join(','); }).join(' ')) });
    await ctx.close();
  }
  fs.writeFileSync(`${SHOTS}/classic-${w}x${h}-${DPR}-work.png`, shots[0].buf);
  fs.writeFileSync(`${SHOTS}/classic-${w}x${h}-${DPR}-head.png`, shots[1].buf);
  console.log(DPR, `${w}x${h}`, 'same png:', Buffer.compare(shots[0].buf, shots[1].buf) === 0, 'same rects:', shots[0].rects === shots[1].rects, shots[0].errors, shots[1].errors);
}
await b.close();
