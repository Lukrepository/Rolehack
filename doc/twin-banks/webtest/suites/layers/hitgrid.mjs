// The near-miss guard's hit areas against the design's hit model.
// For a point in every pixel (off its centre, so no point sits on a box
// edge the layout puts at a half pixel) round each bank (the bank, its halo and 40 dp beyond)
// and every 3rd elsewhere, what the page does with a tap there is compared
// with checks/lib.mjs hitModel() run on the very spec the page laid out.
// The page's answer is read from its own elements' boxes, as CSS stacks them:
// the seams over the keys' boxes (their hit cells) over the halos, then the
// map canvas; on a halo, the halo's own decision (overlay.guardAt).  Boxes,
// not elementFromPoint: Chrome hit-tests a fractional point as if it were on
// the next whole px, so a pixel centre would be judged a pixel off (real taps,
// taps.mjs, check the handlers).  The canvas is the spec's map area snapped
// to device pixels, so the map's edge may differ by under a device pixel.
//   node hitgrid.mjs [dpr]   -> hitgrid-<dpr>.json
import { launch, newCtx, openPage, resume, writeJson, sleep } from './common.mjs';
process.env.RH_LAYOUT = '/home/user/Rolehack/win/web/layout.js';
const { hitModel } = await import('/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/design/v2/checks/lib.mjs');
const dpr = Number(process.argv[2] || 1);
const WINS = [[896, 443], [443, 939], [360, 640], [390, 844]];
const b = await launch();
const out = {};
let bad = 0;
for (const [w, h] of WINS) {
  const ctx = await newCtx(b, { w, h, dpr });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(400);
  const spec = await p.evaluate(() => JSON.parse(JSON.stringify(globalThis.__bt.overlay.twin.spec)));
  const live = spec.controls.filter((c) => !c.behind);
  const boxes = ['L', 'R'].map((th) => {
    const ks = live.filter((c) => c.thumb === th);
    return { x0: Math.min(...ks.map((c) => c.x)) - 40, x1: Math.max(...ks.map((c) => c.x + c.w)) + 40, y0: Math.min(...ks.map((c) => c.y)) - 40, y1: h };
  });
  const near = (x, y) => boxes.some((q) => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1);
  const pts = [];
  for (let y = 0.41; y < h; y += 1) for (let x = 0.37; x < w; x += 1) {
    if (near(x, y) || (Math.floor(x) % 3 === 0 && Math.floor(y) % 3 === 0)) pts.push([x, y]);
  }
  const got = await p.evaluate((pts) => {
    const o = globalThis.__bt.overlay, keys = document.getElementById('keys');
    const R = (e) => { const r = e.getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }; };
    const seams = [...keys.querySelectorAll(':scope > .seam')].map(R);
    const halos = [...keys.querySelectorAll(':scope > .halo')].map(R);
    // every key's box: the bank keys (data-tw), REST's slot standing for its faces
    const cells = [...keys.querySelectorAll('[data-tw]')].filter((e) => e.dataset.tw !== 'longrest').map((e) => ({ id: e.dataset.tw, ...R(e) }));
    const cv = R(document.getElementById('map'));
    const inR = (q, x, y) => x >= q.x0 && x < q.x1 && y >= q.y0 && y < q.y1;
    const mapOrRing = (x, y) => (inR(cv, x, y) ? (o.keyDistance(x, y) <= 32 ? 'ring' : 'map') : 'none');
    return pts.map(([x, y]) => {
      if (seams.some((q) => inR(q, x, y))) return 'swallowed';
      const c = cells.find((q) => inR(q, x, y));
      if (c) return c.id;
      if (halos.some((q) => inR(q, x, y))) {
        const g = o.guardAt(x, y);
        if (g.snap) return g.id;
        if (g.d <= 12) return 'swallowed';
      }
      return mapOrRing(x, y);
    });
  }, pts);
  const model = hitModel(spec);
  const diff = new Map(), samples = [];
  let n = 0;
  pts.forEach(([x, y], i) => {
    const m = model(x, y), g = got[i];
    if (m === g) return;
    n++;
    const k = `${m}->${g}`;
    diff.set(k, (diff.get(k) || 0) + 1);
    if (samples.length < 20) samples.push([x, y, k]);
  });
  const edge = [...diff.entries()].filter(([k]) => /^(map|ring|none)->(map|ring|none)$/.test(k)).reduce((s, [, v]) => s + v, 0);
  const guardDiffs = n - edge;
  bad += guardDiffs;
  out[`${w}x${h}`] = { points: pts.length, differ: n, mapEdge: edge, guardDiffs, kinds: Object.fromEntries(diff), samples, errors: p.errors };
  console.log(`${w}x${h} @${dpr}: ${pts.length} points, ${guardDiffs} differ in the guard, ${edge} at the map's edge`, JSON.stringify(Object.fromEntries(diff)), p.errors.length ? p.errors : '');
  if (p.errors.length) bad++;
  await ctx.close();
}
await b.close();
writeJson(`hitgrid-${dpr}.json`, out);
console.log(bad ? `FAIL: ${bad} guard differences or errors` : 'PASS');
