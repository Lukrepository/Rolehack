// The tap drift (audit 4.5): each map tap lands on the cell drawn under the
// finger.  Real touches (CDP) at points spread over each cell -- near its
// edges too -- and the click the page pushes (recorded, kept from the core so
// the hero stays put) is compared with the cell the last frame drew under the
// point where the pointer event really landed (a capture-phase listener
// records clientX/Y).  The drawn grid comes from the frame's border stroke,
// the canvas's painted origin from its box rounded to device pixels.  Points
// within a quarter of a device pixel of a cell's edge are not judged.
// Windows: all eleven; zoom factors 1 and 1.37 (a cell that is no whole
// number of px), at rest and after a drag; Lucas's landscape with the rows
// cell too.  The ghost deck is off, so every tap is a click.
//   node taps.mjs <dpr>   -> taps-<dpr>.json
import { launch, newCtx, openPage, resume, touch, sleep, ALL, writeJson, frameGrid } from './common.mjs';

const DPR = Number(process.argv[2] || 2.4375);
const b = await launch();
const out = [];
let fails = 0, judged = 0;
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

const RECORD = () => {
  globalThis.__ups = [];
  addEventListener('pointerup', (e) => { if (e.target && e.target.id === 'map') globalThis.__ups.push({ x: e.clientX, y: e.clientY }); }, true);
};

const SETUPS = [];
for (const [w, h] of ALL) for (const zoom of [1, 1.37]) SETUPS.push({ w, h, zoom, cell: 'columns' });
SETUPS.push({ w: 896, h: 443, zoom: 1, cell: 'rows' }, { w: 896, h: 443, zoom: 2.2, cell: 'rows' });

for (const s of SETUPS) {
  const name = `taps-${DPR}-${s.cell}-z${s.zoom}-${s.w}x${s.h}`;
  const ctx = await newCtx(b, { w: s.w, h: s.h, dpr: DPR, prefs: { mapCell: s.cell, zoomFactor: s.zoom, ghostDeck: { on: false, clean: 0, session: null } } });
  await ctx.addInitScript(RECORD);
  const p = await openPage(ctx);
  const T = await touch(ctx, p);
  await T.rotate(s.w, s.h, DPR);
  await resume(p);
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const bad = [];
  let n = 0, skipped = 0, none = 0, ring = 0;
  for (const phase of ['rest', 'dragged']) {
    if (phase === 'dragged') {
      const g = await frameGrid(p);
      const cx = g.canvas.x + g.canvas.w / 2, cy = g.canvas.y + g.canvas.h / 2;
      await T.down([[cx, cy]]);
      for (let i = 1; i <= 6; i++) { await T.move([[cx + 7.3 * i, cy + 4.1 * i]]); await sleep(16); }
      await T.up();
      await sleep(150);
    }
    const g = await frameGrid(p);
    const ox = Math.round(g.canvas.x * DPR), oy = Math.round(g.canvas.y * DPR);
    // cells wholly on the canvas
    const x0 = Math.max(0, Math.ceil(-g.L / g.Td)), x1 = Math.min(79, Math.floor((g.cw - g.L) / g.Td) - 1);
    const y0 = Math.max(0, Math.ceil(-g.Tp / g.Td)), y1 = Math.min(20, Math.floor((g.ch - g.Tp) / g.Td) - 1);
    for (let k = 0; k < 45; k++) {
      const cx = x0 + Math.floor(rnd() * (x1 - x0 + 1)), cy = y0 + Math.floor(rnd() * (y1 - y0 + 1));
      const fx = [0.04, 0.5, 0.96, rnd()][k % 4], fy = [0.5, 0.04, 0.96, rnd()][(k >> 2) % 4];
      const X = (ox + g.L + (cx + fx) * g.Td) / DPR, Y = (oy + g.Tp + (cy + fy) * g.Td) / DPR;
      await p.evaluate(() => { globalThis.__ev = []; globalThis.__ups = []; });
      await T.tap(X, Y);
      await sleep(40);
      const { ev, ups } = await p.evaluate(() => ({ ev: globalThis.__ev.splice(0), ups: globalThis.__ups.splice(0) }));
      const click = ev.find((e) => e.click);
      const up = ups[0];
      if (!up) { bad.push(`${phase}: tap at ${X.toFixed(3)},${Y.toFixed(3)} gave no pointerup on the map`); continue; }
      // the cell drawn under the point the event landed on, in device px
      const dx = up.x * DPR - ox - g.L, dy = up.y * DPR - oy - g.Tp;
      const ex = Math.floor(dx / g.Td), ey = Math.floor(dy / g.Td);
      const edge = Math.min(dx - ex * g.Td, (ex + 1) * g.Td - dx, dy - ey * g.Td, (ey + 1) * g.Td - dy);
      if (edge < 0.25) { skipped++; continue; }
      // Twin banks' confirm ring, the 20 dp of map next to a halo (32 dp from
      // a keycap), previews a tap's cell instead of walking (the layers
      // stage, the design's section 6): not a drift, not judged here
      const inRing = await p.evaluate(([x, y]) => { const o = globalThis.__T.overlay, d = o.keyDistance ? o.keyDistance(x, y) : null; return d !== null && d <= 32; }, [up.x, up.y]);
      if (inRing) { ring++; continue; }
      n++;
      if (!click) { none++; bad.push(`${phase}: tap at ${up.x.toFixed(3)},${up.y.toFixed(3)} on cell ${ex},${ey} pushed no click (${JSON.stringify(ev)})`); continue; }
      if (click.click.x !== ex || click.click.y !== ey) bad.push(`${phase}: tap at ${up.x.toFixed(3)},${up.y.toFixed(3)} (cell fraction ${(dx / g.Td - ex).toFixed(3)},${(dy / g.Td - ey).toFixed(3)}) drawn cell ${ex},${ey}, click ${click.click.x},${click.click.y}`);
    }
  }
  const errs = p.errors.splice(0);
  bad.push(...errs.map((x) => `console: ${x}`));
  fails += bad.length; judged += n;
  out.push({ name, ...s, dpr: DPR, judged: n, skipped, ring, none, bad });
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${name} judged=${n} skipped=${skipped} ring=${ring}${bad.length ? `\n     ${bad.slice(0, 6).join('\n     ')}${bad.length > 6 ? `\n     ... ${bad.length - 6} more` : ''}` : ''}`);
  await ctx.close();
}
writeJson(`taps-${DPR}.json`, out);
console.log(`${fails} failures in ${judged} judged taps over ${out.length} setups`);
await b.close();
