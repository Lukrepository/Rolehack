// A prompt's chips stay off the hero and the cells round it (node chipsplace.mjs DPR):
// the hero put at every row, at the level's left, middle and right, a prompt's
// three chips and Esc shown, in twin's windows (the header in the glass and over
// the banks).  Fails when a chip covers the hero's 3x3 cells though the other
// edge of the map would not, or a chip leaves the map area.
import * as C from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const WINDOWS = [
  [896, 443, {}], [443, 939, {}], [640, 360, {}], [360, 640, {}], [896, 443, { mapCell: 'rows' }],
  [915, 412, { mapCell: 'rows' }], [1024, 768, {}], [768, 1024, {}],
];
const b = await C.launch();
let n = 0, bad = 0, moved = 0;
const out = [];
for (const [w, h, prefs] of WINDOWS) {
  const ctx = await C.newCtx(b, { origin: process.env.ORIGIN || C.WORK, w, h, dpr: DPR, screen: h > w ? { width: w, height: h } : { width: h, height: w }, prefs });
  const p = await C.openPage(ctx);
  await C.resume(p);
  const t = await C.touch(ctx, p);
  const probs = [];
  for (const x of [2, 40, 77]) for (let y = 0; y < 21; y++) {
    const r = await p.evaluate(([x, y]) => {
      globalThis.__fx.hero(x, y);
      globalThis.__bt.chips(['y', 'n', 'q']);
      const B = globalThis.__bt, v = B.view, T = v.T, cv = document.getElementById('map').getBoundingClientRect();
      const hero = { l: cv.left + v.left + (x - 1) * T, t: cv.top + v.top + (y - 1) * T, r: cv.left + v.left + (x + 2) * T, b: cv.top + v.top + (y + 2) * T };
      const chips = [...document.querySelectorAll('#chips button')].map((e) => e.getBoundingClientRect());
      const hit = (q) => q.right > hero.l && q.left < hero.r && q.bottom > hero.t && q.top < hero.b;
      const gl = document.getElementById('glass').getBoundingClientRect();
      // the map area on the screen: the canvas is it, to a device pixel
      const m = { x: cv.left, y: cv.top, w: cv.width, h: cv.height };
      const inMap = chips.every((q) => q.left >= m.x - 1 && q.right <= m.x + m.w + 1 && q.top >= m.y - 1 && q.bottom <= m.y + m.h + 1);
      const top = Math.min(...chips.map((q) => q.top)), bottom = Math.max(...chips.map((q) => q.bottom));
      // would the chips, moved to the other edge, have cleared the hero?
      const H = bottom - top, other = top < m.y + m.h / 2 ? { t: m.y + m.h - 6 - H, b: m.y + m.h - 6 } : { t: m.y + 6, b: m.y + 6 + H };
      const otherHit = chips.some((q) => q.right > hero.l && q.left < hero.r && other.b > hero.t && other.t < hero.b);
      globalThis.__bt.chips([]);
      return { covered: chips.some(hit), otherHit, inMap, atTop: top < m.y + m.h / 2, gl: gl.top };
    }, [x, y]);
    n++;
    if (!r.atTop) moved++;
    if (r.covered && !r.otherHit) probs.push(`hero ${x},${y}: covered, the other edge was clear`);
    if (!r.inMap) probs.push(`hero ${x},${y}: a chip outside the map area`);
  }
  if (p.errors.length) probs.push(`console: ${p.errors.join(' | ')}`);
  await p.evaluate(() => globalThis.__fx.hero(40, 2));
  await p.evaluate(() => globalThis.__bt.chips(['y', 'n', 'q']));
  await C.sleep(300);
  await t.shot(`${C.SHOTS}/chips-${DPR}-${w}x${h}${prefs.mapCell ? '-rows' : ''}-hero-40-2.png`);
  if (probs.length) bad++;
  out.push(`${probs.length ? 'FAIL' : 'ok  '} ${w}x${h} ${JSON.stringify(prefs)}${probs.length ? ': ' + probs.slice(0, 5).join('; ') : ''}`);
  await ctx.close();
}
await b.close();
console.log(out.join('\n'));
console.log(`chipsplace @${DPR}: ${n} placements over ${WINDOWS.length} windows, ${moved} at the bottom, ${bad} windows failed`);
