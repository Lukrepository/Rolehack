// The tap drift fix still holds with the header laid out apart: a tap on the
// drawn centre of a map cell (and near its corners) is a click on that cell,
// at every density.  The drawn grid is read from the canvas's own draw calls
// (common.mjs CANVAS_SPY: the level's border strokeRect(L - 3, Tp - 3,
// 80 Td + 6, 21 Td + 6) gives the grid's origin and pitch in canvas pixels),
// not from web.js's tap maths.  A cell off the map is first dragged to the
// map's centre (the map pans freely, Lucas 2026-09-27).  Clicks are recorded,
// not delivered, so the hero stays put and the pan holds.  The ghost deck is
// retired, so a tap on an old deck key's spot is a click.
//   node taps.mjs   -> taps.json, shots/taps-*.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, writeJson } from './common.mjs';

const CONFIGS = [];
for (const dpr of [1, 2.4375]) {
  CONFIGS.push({ W: 896, H: 443, dpr }, { W: 443, H: 939, dpr }, { W: 640, H: 360, dpr }, { W: 1024, H: 768, dpr }, { W: 1366, H: 768, dpr });
  CONFIGS.push({ W: 896, H: 443, dpr, prefs: { zoomFactor: 1.37 } }, { W: 896, H: 443, dpr, prefs: { mapCell: 'rows' } });
}
CONFIGS.push({ W: 443, H: 939, dpr: 2.4375, prefs: { mapMode: 'text' } }, { W: 896, H: 443, dpr: 2.4375, prefs: { case: false } });
CONFIGS.push({ W: 896, H: 443, dpr: 1.625 }, { W: 443, H: 939, dpr: 1.625 });
const COLS = [0, 1, 39, 40, 78, 79], ROWS = [0, 10, 20];
const OFFS = [[0, 0], [-0.4, -0.4], [0.4, 0.4], [-0.4, 0.4], [0.4, -0.4]];
const only = process.env.ONLY;

const b = await launch();
const all = [];
let fails = 0;
for (const cf of CONFIGS) {
  const tag = `${cf.W}x${cf.H}@${cf.dpr}${cf.prefs ? `-${Object.entries(cf.prefs).map(([k, v]) => `${k}=${v}`).join(',')}` : ''}`;
  if (only && !tag.startsWith(only)) continue;
  const ctx = await newCtx(b, { w: cf.W, h: cf.H, dpr: cf.dpr, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null }, ...(cf.prefs || {}) } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(500);
  await p.evaluate(() => { globalThis.__swallowClicks = true; globalThis.__clicks = []; });
  const k = await touch(ctx, p);
  const read = () => p.evaluate(() => {
    const f = globalThis.__frame, cv = document.getElementById('map'), r = cv.getBoundingClientRect(), R = globalThis.__bt;
    return { border: f && f.strokes.find((s) => s.style === '#272730'), cw: cv.width, ch: cv.height, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      area: R.view.area, T: R.view.T, twin: !!(R.geom && R.geom.twin) };
  });
  const grid = (s) => ({ L: s.border.x + 3, Tp: s.border.y + 3, Td: (s.border.w - 6) / 80, sx: s.cw / s.rect.w, sy: s.ch / s.rect.h });
  const at = (s, g, c, r, ox = 0, oy = 0) => ({ x: s.rect.x + (g.L + (c + 0.5 + ox) * g.Td) / g.sx, y: s.rect.y + (g.Tp + (r + 0.5 + oy) * g.Td) / g.sy });
  const inside = (s, g, pt) => { const m = g.Td / g.sx, x = pt.x - s.rect.x, y = pt.y - s.rect.y; return x >= m && y >= m && x <= s.rect.w - m && y <= s.rect.h - m; };
  let s0 = await read();
  const res = { tag, ...cf, twin: s0.twin, T: s0.T, drawnTd: s0.border ? (s0.border.w - 6) / 80 : null, taps: [] };
  if (!s0.border || !s0.twin) { res.bad = [`no border drawn or not twin (${s0.twin})`]; fails++; console.log(tag, res.bad); all.push(res); await ctx.close(); continue; }
  for (const r of ROWS) for (const c of COLS) {
    let s = await read(), g = grid(s), pt = at(s, g, c, r);
    let hit = await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [pt.x, pt.y]);
    if (!inside(s, g, pt) || hit !== 'map') {
      const cx = s.rect.x + s.rect.w / 2, cy = s.rect.y + s.rect.h / 2;
      await k.drag(cx, cy, cx - pt.x, cy - pt.y, Math.max(3, Math.ceil(Math.hypot(cx - pt.x, cy - pt.y) / 40)));
      s = await read(); g = grid(s); pt = at(s, g, c, r);
      hit = await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.id, [pt.x, pt.y]);
    }
    for (const [ox, oy] of OFFS) {
      const q = at(s, g, c, r, ox, oy);
      await p.evaluate(() => { globalThis.__clicks = []; });
      await k.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y }] });
      await k.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await sleep(60);
      const got = await p.evaluate(() => (globalThis.__clicks || [])[0] || null);
      res.taps.push({ c, r, ox, oy, under: hit, got: got && { x: got.x, y: got.y }, ok: !!got && got.x === c && got.y === r });
    }
  }
  const centre = res.taps.filter((t) => t.ox === 0), near = res.taps.filter((t) => t.ox !== 0);
  const bad = res.taps.filter((t) => !t.ok).map((t) => `(${t.c},${t.r})${t.ox ? `${t.ox},${t.oy}` : ''} -> ${t.got ? `(${t.got.x},${t.got.y})` : `none, under ${t.under}`}`);
  if (p.errors.length) bad.push(`console: ${p.errors.join(' | ')}`);
  res.bad = bad;
  fails += bad.length;
  await k.shot(`${SHOTS}/taps-${tag}.png`);
  console.log(`${tag}: cell ${res.T.toFixed(3)} css (${res.drawnTd} device px); centres ${centre.filter((t) => t.ok).length}/${centre.length}, near corners ${near.filter((t) => t.ok).length}/${near.length}${bad.length ? `; BAD: ${bad.slice(0, 5).join(' | ')}` : ''}`);
  all.push(res);
  await ctx.close();
}
writeJson('taps.json', all);
console.log(fails ? `FAILURES: ${fails}` : 'ALL PASS');
await b.close();
