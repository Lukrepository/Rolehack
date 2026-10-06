// Classic, before and after: the same restored game at every test size, the
// layout set to classic (the setting is ignored by the page before the
// change), and every keycap's rect, the glass, the canvas and the view
// recorded, with a screenshot.  "node classic.mjs before" on the unchanged
// page, "node classic.mjs after" on the changed one, then
// "node classic.mjs compare" diffs the two (rects exactly, screenshots pixel
// by pixel in the browser).
import fs from 'node:fs';
import { launch, ctxOptions, openPage, resumeGame, OUT, STATE, sleep, writeJson } from './common.mjs';

const mode = process.argv[2] || 'after';
export const SIZES = [[896, 443], [443, 939], [640, 360], [360, 640], [915, 412], [412, 915], [844, 390], [390, 844], [896, 363], [443, 859]];
const b = await launch();
if (mode === 'compare') {
  const A = JSON.parse(fs.readFileSync(`${OUT}/classic-before.json`)), B = JSON.parse(fs.readFileSync(`${OUT}/classic-after.json`));
  const p = await (await b.newContext()).newPage();
  const out = [];
  for (const k of Object.keys(A)) {
    const a = A[k], c = B[k];
    const diffs = [];
    if (a.keys.length !== c.keys.length) diffs.push(`key count ${a.keys.length} vs ${c.keys.length}`);
    a.keys.forEach((r, i) => {
      const q = c.keys[i];
      if (!q || r.label !== q.label || ['x', 'y', 'w', 'h'].some((f) => Math.abs(r[f] - q[f]) > 0.01)) diffs.push(`key ${i} ${r.label} ${JSON.stringify(r)} vs ${JSON.stringify(q)}`);
    });
    for (const f of ['glass', 'map', 'area', 'T', 'caseRect', 'keysRect']) if (JSON.stringify(a[f]) !== JSON.stringify(c[f])) diffs.push(`${f} ${JSON.stringify(a[f])} vs ${JSON.stringify(c[f])}`);
    const px = await p.evaluate(async ([fa, fb]) => {
      const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
      const [ia, ib] = await Promise.all([load(fa), load(fb)]);
      const cv = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: 'differs' };
      const da = cv(ia), db = cv(ib);
      let n = 0, minY = 1e9, maxY = -1;
      for (let i = 0; i < da.length; i += 4) {
        if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 30) { n++; const y = Math.floor(i / 4 / ia.width); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      }
      return { differing: n, of: da.length / 4, rows: n ? [minY, maxY] : null };
    }, [`data:image/png;base64,${fs.readFileSync(`${OUT}/shots/classic-before-${k}.png`).toString('base64')}`, `data:image/png;base64,${fs.readFileSync(`${OUT}/shots/classic-after-${k}.png`).toString('base64')}`]);
    out.push({ k, diffs, px, errorsBefore: a.errors, errorsAfter: c.errors });
    console.log(k, diffs.length ? diffs.slice(0, 5) : 'rects identical', JSON.stringify(px), 'errors', a.errors.length, c.errors.length);
  }
  writeJson('classic-compare.json', out);
  await b.close();
  process.exit(0);
}
const res = {};
for (const [W, H] of SIZES) {
  const ctx = await b.newContext({ ...ctxOptions(W, H, 'touch'), storageState: STATE });
  const p = await openPage(ctx, { layout: 'classic' });
  await resumeGame(p);
  await sleep(600);
  const r = await p.evaluate(() => {
    const R = globalThis.__rh, rr = (e) => { const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2) }; };
    const keys = [...document.querySelectorAll('#keys button.k')].filter((e) => e.offsetParent || getComputedStyle(e).display !== 'none')
      .map((e) => ({ label: e.getAttribute('aria-label'), ...rr(e) }));
    return { keys, glass: rr(document.getElementById('glass')), map: rr(document.getElementById('map')), area: R.view.area, T: R.view.T,
      caseRect: rr(document.getElementById('case')), keysRect: rr(document.getElementById('keys')) };
  });
  await p.screenshot({ path: `${OUT}/shots/classic-${mode}-${W}x${H}.png` });
  res[`${W}x${H}`] = { ...r, errors: p.errors };
  console.log(`${W}x${H}`, r.keys.length, 'keys', JSON.stringify(r.glass), 'errors', p.errors.length);
  await ctx.close();
}
writeJson(`classic-${mode}.json`, res);
await b.close();
