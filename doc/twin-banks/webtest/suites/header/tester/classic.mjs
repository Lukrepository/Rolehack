// Classic keeps working unchanged: the working tree's classic against HEAD's
// (the committed page files over the same nethack.wasm, port 8769), the same
// saved game in both.
//  - opened in classic: every element under #app at the same rect, the same
//    viewport meta, the same options file, the screenshots' pixels compared;
//  - the same touches on the map in both -- a pinch out, two still fingers, a
//    pinch in, a drag, a tap -- give the same drawn grid after each, the same
//    classic zoom stored and the same clicks; zoomFactor never written;
//  - switched at run time from twin banks (the rows cell, with the header
//    over the banks where it goes there) to classic: the page then matches
//    HEAD's classic opened at that size, and switched back the twin keys and
//    bands match layout() again (pagecheck).
//   node classic.mjs <dpr>  -> classic-<dpr>.json, shots/classic-*.png
import fs from 'node:fs';
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, ALL, HEAD, ORIGIN, writeJson, frameGrid } from './common.mjs';
import { twinCheck } from './pagecheck.mjs';

const DPR = Number(process.argv[2] || 1);
const b = await launch();
const out = [];
let fails = 0;
const pw = await import('/usr/local/lib/node_modules/playwright/index.mjs');

const COUNT = () => {
  const set = Storage.prototype.setItem;
  globalThis.__writes = [];
  Storage.prototype.setItem = function (k, v) { if (/^rh\.(zoom|zoomFactor)$/.test(k)) globalThis.__writes.push([k, v]); return set.call(this, k, v); };
};

// every element under #app, in document order, with its rect
const snapshot = (p) => p.evaluate(() => {
  const els = [...document.querySelectorAll('#app *')].filter((e) => e.id !== 'insetprobe');
  return {
    ui: document.documentElement.dataset.ui, meta: document.querySelector('meta[name="viewport"]').content,
    rc: (() => { try { return globalThis.__T.M.FS.readFile('/home/web_user/.nethackrc', { encoding: 'utf8' }); } catch (e) { return null; } })(),
    els: els.map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return `${e.tagName}#${e.id}.${[...e.classList].join('.')} ${r.x.toFixed(2)},${r.y.toFixed(2)} ${r.width.toFixed(2)}x${r.height.toFixed(2)} ${cs.display} ${cs.visibility} z${cs.zIndex}`; }),
  };
});

async function open(origin, w, h, prefs) {
  const ctx = await newCtx(b, { w, h, dpr: DPR, origin, prefs: { ghostDeck: { on: false, clean: 0, session: null }, ...prefs } });
  await ctx.addInitScript(COUNT);
  const p = await openPage(ctx);
  const T = await touch(ctx, p);
  await T.rotate(w, h, DPR);
  await resume(p);
  await p.evaluate(() => document.fonts && document.fonts.ready);
  await sleep(500);
  return { ctx, p, T };
}

function diffList(a, b) {
  const out = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n && out.length < 6; i++) if (a[i] !== b[i]) out.push(`work ${a[i] || '-'} | head ${b[i] || '-'}`);
  return out;
}

async function pixels(T, path) { await T.shot(path); return path; }
async function pxdiff(pa, pb) {
  // decode both PNGs in a page and count differing pixels
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  const r = await p.evaluate(async ([a, c]) => {
    const load = (d) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = d; });
    const [ia, ib] = await Promise.all([load(a), load(c)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { size: true };
    const cv = new OffscreenCanvas(ia.width, ia.height), cx = cv.getContext('2d');
    cx.drawImage(ia, 0, 0); const da = cx.getImageData(0, 0, ia.width, ia.height).data;
    cx.clearRect(0, 0, ia.width, ia.height); cx.drawImage(ib, 0, 0); const db = cx.getImageData(0, 0, ia.width, ia.height).data;
    let n = 0; for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) n++;
    return { n, of: da.length / 4 };
  }, [`data:image/png;base64,${fs.readFileSync(pa).toString('base64')}`, `data:image/png;base64,${fs.readFileSync(pb).toString('base64')}`]);
  await ctx.close();
  return r;
}

async function gestures(p, T) {
  const seq = [];
  const g0 = await frameGrid(p);
  const cx = g0.canvas.x + g0.canvas.w / 2, cy = g0.canvas.y + g0.canvas.h / 2;
  const rec = async (what) => { await sleep(150); const g = await frameGrid(p);
    const z = await p.evaluate(() => [localStorage.getItem('rh.zoom'), localStorage.getItem('rh.zoomFactor'), globalThis.__writes.splice(0).map((x) => x[0]).join(',')]);
    seq.push(`${what}: ${g.Td}@${g.L},${g.Tp} zoom=${z[0]} zf=${z[1]} writes=[${z[2] ? [...new Set(z[2].split(','))].join(',') : ''}]`); };
  const d = Math.min(45, g0.canvas.w / 5);
  await T.down([[cx - d, cy], [cx + d, cy]]);
  for (let i = 1; i <= 10; i++) { await T.move([[cx - d - (d * i) / 10, cy], [cx + d + (d * i) / 10, cy]]); await sleep(16); }
  await T.up(); await rec('pinch out');
  await T.down([[cx - d, cy], [cx + d, cy]]); await sleep(400); await T.up(); await rec('still');
  await T.down([[cx - 2 * d, cy], [cx + 2 * d, cy]]);
  for (let i = 1; i <= 10; i++) { await T.move([[cx - 2 * d + (d * i) / 10, cy], [cx + 2 * d - (d * i) / 10, cy]]); await sleep(16); }
  await T.up(); await rec('pinch in');
  await T.down([[cx, cy]]);
  for (let i = 1; i <= 8; i++) { await T.move([[cx - 5 * i, cy - 3 * i]]); await sleep(16); }
  await T.up(); await rec('drag');
  await p.evaluate(() => { globalThis.__swallowClicks = true; globalThis.__ev = []; });
  await T.tap(cx + 17, cy + 9); await sleep(100);
  const ev = await p.evaluate(() => globalThis.__ev.splice(0).filter((e) => e.click).map((e) => `${e.click.x},${e.click.y}`));
  seq.push(`tap: ${ev.join(' ')}`);
  return seq;
}

const WINS = DPR === 1 ? ALL : [[896, 443], [443, 939], [1024, 768]];
for (const [w, h] of WINS) {
  const name = `classic-${DPR}-${w}x${h}`;
  const bad = [], notes = [];
  const A = await open(ORIGIN, w, h, { layout: 'classic' });
  const B = await open(HEAD, w, h, { layout: 'classic' });
  const sa = await snapshot(A.p), sb = await snapshot(B.p);
  if (sa.ui !== 'classic') bad.push(`work ui=${sa.ui}`);
  if (sa.meta !== sb.meta) bad.push(`viewport meta: work "${sa.meta}" head "${sb.meta}"`);
  if (sa.rc !== sb.rc) bad.push('the options file differs from HEAD\'s');
  const dl = diffList(sa.els, sb.els);
  if (dl.length) bad.push(`elements differ (${sa.els.length} vs ${sb.els.length}): ${dl.join(' ;; ')}`);
  const pa = await pixels(A.T, `${SHOTS}/${name}-work.png`), pb = await pixels(B.T, `${SHOTS}/${name}-head.png`);
  const px = await pxdiff(pa, pb);
  if (px.size || px.n > 0) bad.push(`screenshots differ: ${px.size ? 'size' : `${px.n} of ${px.of} pixels`}`);
  const ga = await gestures(A.p, A.T), gb = await gestures(B.p, B.T);
  for (let i = 0; i < Math.max(ga.length, gb.length); i++) if (ga[i] !== gb[i]) bad.push(`gesture ${i}: work "${ga[i]}" head "${gb[i]}"`);
  if (ga.some((x) => /writes=\[[^\]]*zoomFactor/.test(x))) bad.push('classic wrote zoomFactor');
  bad.push(...A.p.errors.splice(0).map((x) => `console (work): ${x}`));
  await A.ctx.close();
  await B.ctx.close();

  // a run-time switch: twin (rows cell) -> classic -> twin
  const C = await open(ORIGIN, w, h, { layout: 'twin', mapCell: 'rows' });
  const t0 = await C.p.evaluate(twinCheck, {});
  if (t0.bad.length) bad.push(...t0.bad.map((x) => `twin before the switch: ${x}`));
  await C.p.evaluate(async () => { const P = await import('./prefs.js'); P.set('layout', 'classic'); });
  await sleep(700);
  const sc = await snapshot(C.p);
  await C.T.shot(`${SHOTS}/${name}-switched.png`);
  // HEAD switched the same way, from its own twin banks (the header stacked in the glass)
  const D = await open(HEAD, w, h, { layout: 'twin', mapCell: 'rows' });
  await D.p.evaluate(async () => { const P = await import('./prefs.js'); P.set('layout', 'classic'); });
  await sleep(700);
  const sd = await snapshot(D.p);
  const sdFresh = sb;
  const dlFresh = diffList(sc.els, sdFresh.els);
  if (dlFresh.length) notes.push(`switched twin -> classic vs HEAD's classic opened fresh: ${dlFresh.slice(0, 2).join(' ;; ')}`);
  // The message band's rows aside: since the fix-up (2026-10-02) a switch
  // re-finds the paged message's place in classic's band, where HEAD's
  // classic sliced its rows from twin's count and could show none.  The band
  // must not be blank.
  const isRow = (e) => /^DIV#\.r(\.old)? /.test(e), noRows = (els) => els.filter((e) => !isRow(e));
  const dl2 = diffList(noRows(sc.els), noRows(sd.els));
  if (!sc.els.some(isRow)) bad.push('the message band is blank after the switch');
  if (sc.ui !== 'classic') bad.push(`after the switch ui=${sc.ui}`);
  if (dl2.length) bad.push(`switched twin(${t0.info.over ? 'header over the banks' : 'header in the glass'}) -> classic differs from HEAD switched the same way (${sc.els.length} vs ${sd.els.length}): ${dl2.join(' ;; ')}`);
  if (sc.meta !== sd.meta) bad.push(`switched: viewport meta "${sc.meta}" vs HEAD "${sd.meta}"`);
  await D.ctx.close();
  await C.p.evaluate(async () => { const P = await import('./prefs.js'); P.set('layout', 'twin'); });
  await sleep(900);
  const t1 = await C.p.evaluate(twinCheck, {});
  if (t1.bad.length) bad.push(...t1.bad.map((x) => `twin after switching back: ${x}`));
  bad.push(...C.p.errors.splice(0).map((x) => `console (switch): ${x}`));
  await C.ctx.close();

  fails += bad.length;
  out.push({ name, w, h, dpr: DPR, bad, notes, gestures: ga, overBefore: t0.info.over });
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${name} (${sa.els.length} elements, px diff ${px.n}, twin rows over=${t0.info.over})${bad.length ? `\n     ${bad.slice(0, 8).join('\n     ')}` : ''}${notes.length ? `\n     note: ${notes.join('\n     note: ')}` : ''}`);
}
writeJson(`classic-${DPR}.json`, out);
console.log(`${fails} failures in ${out.length} windows`);
await b.close();
