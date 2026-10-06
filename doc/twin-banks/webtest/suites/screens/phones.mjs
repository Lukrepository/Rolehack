// The phone sizes are unchanged: each phone window on the working tree
// (8766) against git HEAD's page (8772), same game, same nethack.wasm: the
// tier, the spec (keys, bands, map area, glass), every keycap's DOM rect, the
// bands' and the canvas's DOM rects, and the pixels outside the panels this
// stage adds (a phone's log under the map in portrait).  The new panels must
// keep off the map, the bands and the keys.
//   node phones.mjs <dpr>
import { launch, newCtx, openPage, resume, sleep, Checks, SHOTS, writeJson, WORK, HEAD, ov, r1 } from './common.mjs';
import { readPage, near, maxDiff, gap } from './lib.mjs';
import fs from 'node:fs';

const dpr = Number(process.argv[2] || 1);
const PHONES = [
  [896, 443, [443, 939]], [443, 939, [443, 939]], [640, 360, [360, 640]], [360, 640, [360, 640]], [915, 412, [412, 915]], [412, 915, [412, 915]],
  [844, 390, [390, 844]], [390, 844, [390, 844]], [896, 363, [443, 939]], [443, 859, [443, 939]],
];
const b = await launch();
const all = [];
const cmpPage = await (await b.newContext()).newPage();
// pixels that differ (any channel by more than 8) outside the masks
async function pixelDiff(a, z, masks) {
  return cmpPage.evaluate(async ({ a, z, masks }) => {
    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const [A, Z] = await Promise.all([load(a), load(z)]);
    if (A.width !== Z.width || A.height !== Z.height) return { size: [A.width, A.height, Z.width, Z.height] };
    const c = document.createElement('canvas'); c.width = A.width; c.height = A.height;
    const x = c.getContext('2d');
    x.drawImage(A, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
    x.clearRect(0, 0, c.width, c.height); x.drawImage(Z, 0, 0); const dz = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0, box = null;
    for (let y = 0; y < c.height; y++) for (let X = 0; X < c.width; X++) {
      if (masks.some((m) => X >= m.x && X < m.x + m.w && y >= m.y && y < m.y + m.h)) continue;
      const i = (y * c.width + X) * 4;
      if (Math.abs(da[i] - dz[i]) > 8 || Math.abs(da[i + 1] - dz[i + 1]) > 8 || Math.abs(da[i + 2] - dz[i + 2]) > 8) {
        n++;
        box = box ? { x0: Math.min(box.x0, X), y0: Math.min(box.y0, y), x1: Math.max(box.x1, X), y1: Math.max(box.y1, y) } : { x0: X, y0: y, x1: X, y1: y };
      }
    }
    return { n, box };
  }, { a, z, masks });
}

for (const [w, h, scr] of PHONES) {
  const tag = `${w}x${h}@${dpr}`;
  const C = new Checks(tag);
  const got = {};
  for (const [name, origin] of [['work', WORK], ['head', HEAD]]) {
    const ctx = await newCtx(b, { w, h, dpr, touch: true, origin, screen: { width: scr[0], height: scr[1] } });
    const p = await openPage(ctx);
    await resume(p);
    await sleep(700);
    const s = await readPage(p);
    const png = await p.screenshot();
    fs.writeFileSync(`${SHOTS}/phones-${name}-${tag}.png`, png);
    got[name] = { s, png: `data:image/png;base64,${png.toString('base64')}`, errors: p.errors };
    await ctx.close();
  }
  const W = got.work.s, Hd = got.head.s;
  C.ok('tier is phone', W.tier === 'phone' && W.ui === 'twin', [W.ui, W.tier]);
  const sd = [];
  for (const c of Hd.spec.controls) { const q = W.spec.controls.find((x) => x.id === c.id); if (!q || maxDiff(c, q) > 0.01) sd.push(`${c.id} ${r1(c)} vs ${r1(q)}`); }
  for (const k of ['mapArea', 'glass']) if (maxDiff(Hd.spec[k], W.spec[k]) > 0.01) sd.push(`${k} ${r1(Hd.spec[k])} vs ${r1(W.spec[k])}`);
  Hd.spec.bands.forEach((bd, i) => { if (maxDiff(bd, W.spec.bands[i]) > 0.01) sd.push(`band ${i}`); });
  C.ok('spec identical to HEAD (keys, bands, map area, glass)', !sd.length && W.spec.controls.length === Hd.spec.controls.length, sd.slice(0, 6));
  C.ok('cell identical to HEAD', Math.abs(W.info.T - Hd.info.T) < 1e-9 && W.view.T === Hd.view.T, [W.info.T, Hd.info.T, W.view.T, Hd.view.T]);
  const kd = Object.keys(Hd.keys).filter((id) => !W.keys[id] || maxDiff(Hd.keys[id], W.keys[id]) > 0.01);
  C.ok('every keycap DOM rect identical to HEAD', !kd.length && Object.keys(W.keys).length === Object.keys(Hd.keys).length, kd.map((id) => `${id} ${r1(Hd.keys[id])} vs ${r1(W.keys[id])}`).slice(0, 6));
  C.ok('bands and canvas DOM rects identical to HEAD', maxDiff(W.msgband, Hd.msgband) < 0.01 && maxDiff(W.statband, Hd.statband) < 0.01 && maxDiff(W.canvas, Hd.canvas) < 0.01,
    { msg: [r1(W.msgband), r1(Hd.msgband)], stat: [r1(W.statband), r1(Hd.statband)], cv: [r1(W.canvas), r1(Hd.canvas)] });
  C.ok('map view identical to HEAD', JSON.stringify(W.view) === JSON.stringify(Hd.view), [W.view, Hd.view]);
  // panels on a phone: only what layout() placed, off the map, the bands and the keys
  const shown = W.panels.filter((q) => q.vis);
  const want = W.spec.chrome.filter((c) => /^panel: (message log|inventory)/.test(c.name));
  C.ok(`panels as layout() places them (${want.map((c) => c.name.slice(7, 18)).join(', ') || 'none'})`, shown.length === want.length
    // each edge on a device pixel within one of layout()'s, moved inward
    && want.every((c) => shown.some((q) => [q.x - c.x, q.y - c.y, c.x + c.w - q.x - q.w, c.y + c.h - q.y - q.h].every((e) => e >= -1e-3 && e <= 1 / dpr + 0.02))),
    { want: want.map(r1), shown: shown.map((q) => [q.kind, r1(q)]) });
  const bad = [];
  const caps = Object.entries(W.keys).filter(([id]) => id !== 'longrest').map(([id, k]) => ({ id, ...k }));
  for (const q of shown) {
    for (const c of caps) if (gap(q, c) < 12 - 1 / dpr) bad.push(`${q.kind} near ${c.id}`);
    for (const t of [{ id: 'map', ...W.canvas }, { id: 'msgband', ...W.msgband }, { id: 'statband', ...W.statband }]) if (ov(q, t, 0.01)) bad.push(`${q.kind} on ${t.id}`);
    if (q.hit !== 'self') bad.push(`${q.kind} covered: ${q.hit}`);
  }
  C.ok('phone panels clear of the map, the bands and the keys', !bad.length, bad);
  const log = shown.find((q) => q.kind === 'log');
  if (log) {
    // a phone's log under the band: the history before the band's first message, no line twice
    const band = W.msgText.replace(/\s+/g, ' ');
    const twice = log.lines.filter((l) => l && band.includes(l));
    C.ok('phone log: no line also on the band', !twice.length, { log: log.lines, band });
  }
  // pixels outside the new panels (and a 2 px margin round them)
  const masks = shown.map((q) => ({ x: Math.floor((q.x - 2) * dpr), y: Math.floor((q.y - 2) * dpr), w: Math.ceil((q.w + 4) * dpr), h: Math.ceil((q.h + 4) * dpr) }));
  const pd = await pixelDiff(got.work.png, got.head.png, masks);
  C.ok('pixels identical to HEAD outside the new panels', pd.n === 0, pd);
  C.ok('no console errors (work)', !got.work.errors.length, got.work.errors.slice(0, 4));
  all.push(...C.list);
}
writeJson(`phones-${dpr}.json`, all);
console.log(`\nphones dpr ${dpr}: ${all.filter((c) => c.pass).length} pass, ${all.filter((c) => !c.pass).length} fail`);
for (const f of all.filter((c) => !c.pass)) console.log(`  FAIL ${f.tag} ${f.name}`);
await b.close();
