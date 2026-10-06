// Two fingers on the map, with real touches (CDP), judged from the canvas's
// own frames and from what is written to localStorage (every write counted):
//  - pinch out x2 then in: the drawn cell follows the fingers while they
//    move, twin's zoomFactor is written once, on the lift, never classic's
//    zoom; the cell after the lift is floor(T x factor x dpr) / dpr;
//  - overview: two still fingers (2 px of tremor) for 400 ms show the whole
//    level, fitted and centred; on the lift the cell comes back, nothing
//    written;
//  - a quick spread (inside 250 ms) is a pinch, never the overview;
//  - two fingers sliding together (no spread) are neither;
//  - after a two-finger gesture the finger left neither pans nor taps;
//  - a one-finger tap still travels afterwards (the click is recorded);
//  - phones: turned to portrait and back at the pinched zoom, the cell stays;
//  - classic: a pinch writes classic's zoom and never zoomFactor; no overview.
//   node gestures.mjs <dpr>  -> gestures-<dpr>.json, shots/gestures-*.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, ALL, writeJson, frameGrid } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const b = await launch();
const out = [];
let fails = 0;

const COUNT = () => {
  const set = Storage.prototype.setItem;
  globalThis.__writes = [];
  Storage.prototype.setItem = function (k, v) { if (/^rh\.(zoom|zoomFactor)$/.test(k)) globalThis.__writes.push([k, v, performance.now()]); return set.call(this, k, v); };
};
const writes = (p) => p.evaluate(() => globalThis.__writes.splice(0));
const pref = (p, k) => p.evaluate((k) => { const v = localStorage.getItem(`rh.${k}`); return v == null ? null : JSON.parse(v); }, k);
const frame = async (p) => { await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r()))); return frameGrid(p); };

async function pinch(T, cx, cy, d0, d1, steps = 12, gap = 16) {
  await T.down([[cx - d0, cy], [cx + d0, cy]]);
  for (let i = 1; i <= steps; i++) { const d = d0 + ((d1 - d0) * i) / steps; await T.move([[cx - d, cy], [cx + d, cy]]); await sleep(gap); }
}

for (const [w, h] of ALL) for (const layout of ['twin', 'classic']) {
  if (layout === 'classic' && ![[896, 443], [443, 939], [1024, 768]].some(([a, c]) => a === w && c === h)) continue;
  const name = `gestures-${DPR}-${layout}-${w}x${h}`;
  const ctx = await newCtx(b, { w, h, dpr: DPR, prefs: { layout, ghostDeck: { on: false, clean: 0, session: null } } });
  await ctx.addInitScript(COUNT);
  const p = await openPage(ctx);
  const T = await touch(ctx, p);
  await T.rotate(w, h, DPR);
  await resume(p);
  await sleep(300);
  const bad = [], info = {};
  await writes(p);
  const g0 = await frame(p);
  const cx = g0.canvas.x + g0.canvas.w / 2, cy = g0.canvas.y + g0.canvas.h / 2;
  const span = Math.min(g0.canvas.w, 240) / 2 - 10;   // the widest spread the map holds
  const dA = Math.max(20, span / 2.2), dB = Math.min(span, dA * 2);
  info.Td0 = g0.Td; info.spread = [dA, dB];
  const geom = await p.evaluate(() => ({ cell: globalThis.__T.geom && globalThis.__T.geom.cell, twin: !!(globalThis.__T.geom && globalThis.__T.geom.twin) }));
  const zf0 = await pref(p, 'zoomFactor'), z0 = await pref(p, 'zoom');

  // 1. pinch out
  await pinch(T, cx, cy, dA, dB);
  await sleep(50);
  const gMid = await frame(p);
  const wMid = await writes(p);
  await T.up();
  await sleep(200);
  const gOut = await frame(p);
  const wOut = await writes(p);
  info.pinchOut = { mid: gMid.Td, after: gOut.Td, writesMid: wMid.length, writesLift: wOut.map((x) => x[0]) };
  const ratio = dB / dA;
  if (layout === 'twin') {
    if (wMid.length) bad.push(`pinch out: ${wMid.length} zoom writes while the fingers moved (${wMid.map((x) => x[0]).join(',')})`);
    if (wOut.length !== 1 || wOut[0][0] !== 'rh.zoomFactor') bad.push(`pinch out: on the lift ${JSON.stringify(wOut.map((x) => x[0]))}, want one rh.zoomFactor`);
    const zf = await pref(p, 'zoomFactor');
    info.zf = zf;
    const want = Math.max(4, Math.floor(Math.min(Math.max(geom.cell * zf, 8), 96) * DPR + 1e-6));
    if (Math.abs(gOut.Td - want) > 0.01) bad.push(`pinch out: drawn cell ${gOut.Td}, want floor(${geom.cell} x ${zf} x ${DPR}) = ${want}`);
    const wantRatio = Math.min(ratio, 96 / (g0.Td / DPR));
    if (!(gMid.Td > g0.Td * 1.3)) bad.push(`pinch out: the cell did not grow with the fingers (${g0.Td} -> ${gMid.Td} mid-pinch)`);
    if (Math.abs(gOut.Td / g0.Td - wantRatio) > 0.25) bad.push(`pinch out x${ratio.toFixed(2)}: the cell went ${g0.Td} -> ${gOut.Td} (x${(gOut.Td / g0.Td).toFixed(2)})`);
    if (await pref(p, 'zoom') !== z0) bad.push(`twin pinch changed classic's zoom ${z0} -> ${await pref(p, 'zoom')}`);
  } else {
    if (!(gOut.Td > g0.Td * 1.3)) bad.push(`classic pinch out: the cell did not grow (${g0.Td} -> ${gOut.Td})`);
    if (!wMid.concat(wOut).some((x) => x[0] === 'rh.zoom')) bad.push('classic pinch wrote no rh.zoom');
    if (wMid.concat(wOut).some((x) => x[0] === 'rh.zoomFactor')) bad.push('classic pinch wrote rh.zoomFactor');
  }
  await T.shot(`${SHOTS}/${name}-pinched.png`);

  // 2. overview: two still fingers
  await writes(p);
  const gPre = await frame(p);
  await T.down([[cx - dA, cy], [cx + dA, cy]]);
  for (let i = 0; i < 8; i++) { await sleep(50); const j = i % 2 ? 2 : 0; await T.move([[cx - dA + j, cy], [cx + dA, cy + j]]); }
  await sleep(50);
  const gOv = await frame(p);
  if (layout === 'twin') await T.shot(`${SHOTS}/${name}-overview.png`);
  const area = await p.evaluate(() => { const a = globalThis.__T.view.area; return a && { w: a.w, h: a.h }; });
  await T.up();
  await sleep(200);
  const gBack = await frame(p);
  const wOv = await writes(p);
  info.overview = { pre: gPre.Td, during: gOv.Td, after: gBack.Td, writes: wOv.length };
  if (layout === 'twin') {
    const fit = Math.floor(Math.min(area.w / 80, area.h / 21) * DPR + 1e-6);
    if (!(80 * gOv.Td <= gOv.cw + 0.01 && 21 * gOv.Td <= gOv.ch + 0.01)) bad.push(`overview: the level (${80 * gOv.Td}x${21 * gOv.Td}) does not fit the ${gOv.cw}x${gOv.ch} canvas`);
    if (Math.abs(gOv.Td - fit) > 1.01) bad.push(`overview: cell ${gOv.Td} device px, the fitted cell is ${fit}`);
    const cxOk = Math.abs(gOv.L - (gOv.cw - 80 * gOv.Td) / 2) <= 1.01, cyOk = Math.abs(gOv.Tp - (gOv.ch - 21 * gOv.Td) / 2) <= 1.01;
    if (!cxOk || !cyOk) bad.push(`overview: the level is not centred (L ${gOv.L}, top ${gOv.Tp} in ${gOv.cw}x${gOv.ch} at ${gOv.Td})`);
    if (gBack.Td !== gPre.Td || gBack.L !== gPre.L || gBack.Tp !== gPre.Tp) bad.push(`overview: after the lift the view is ${gBack.Td}@${gBack.L},${gBack.Tp}, before it was ${gPre.Td}@${gPre.L},${gPre.Tp}`);
    if (wOv.length) bad.push(`overview wrote ${JSON.stringify(wOv.map((x) => x[0]))}`);
  }

  // 3. a quick spread is a pinch, not the overview
  if (layout === 'twin') {
    await writes(p);
    const gq0 = await frame(p);
    await pinch(T, cx, cy, dB, dA, 6, 12);   // in, fast
    await sleep(350);                          // past the overview's 250 ms
    const gq = await frame(p);
    await T.up();
    await sleep(200);
    const gq1 = await frame(p);
    const wq = await writes(p);
    info.quick = { before: gq0.Td, held: gq.Td, after: gq1.Td, writes: wq.map((x) => x[0]) };
    const fitOv = gOv.Td;
    if (gq.Td === fitOv && Math.abs(gq.Td * (dB / dA) - gq0.Td) > 2) bad.push(`quick spread: the overview's cell ${fitOv} shown instead of a pinch`);
    if (!(gq.Td < gq0.Td * 0.8)) bad.push(`quick pinch in: the cell stayed ${gq0.Td} -> ${gq.Td}`);
    if (wq.length !== 1) bad.push(`quick pinch: ${wq.length} zoom writes, want 1 on the lift`);

    // 4. sliding together: neither
    const gs0 = await frame(p);
    await T.down([[cx - dA, cy], [cx + dA, cy]]);
    for (let i = 1; i <= 8; i++) { await T.move([[cx - dA + 5 * i, cy + 2 * i], [cx + dA + 5 * i, cy + 2 * i]]); await sleep(18); }
    await sleep(350);
    const gs = await frame(p);
    await T.up();
    await sleep(200);
    const gs1 = await frame(p);
    const ws = await writes(p);
    info.slide = { before: gs0.Td, held: gs.Td, after: gs1.Td };
    if (gs.Td !== gs0.Td) bad.push(`sliding together changed the cell ${gs0.Td} -> ${gs.Td} (overview or pinch)`);
    if (ws.length) bad.push(`sliding together wrote ${JSON.stringify(ws.map((x) => x[0]))}`);

    // 5. the finger left after a two-finger gesture neither pans nor taps
    await p.evaluate(() => { globalThis.__swallowClicks = true; globalThis.__ev = []; });
    const gl0 = await frame(p);
    await T.down([[cx - dA, cy], [cx + dA, cy]]);
    await sleep(80);
    // the first finger lifts (CDP's touchEnd names the point released)
    await T.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: cx - dA, y: cy, id: 0 }] });
    await sleep(30);
    for (let i = 1; i <= 6; i++) { await T.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cx + dA - 8 * i, y: cy - 5 * i, id: 1 }] }); await sleep(16); }
    await T.up();
    await sleep(200);
    const gl1 = await frame(p);
    const ev1 = await p.evaluate(() => globalThis.__ev.splice(0));
    if (gl1.L !== gl0.L || gl1.Tp !== gl0.Tp) bad.push(`the finger left after two panned the map (${gl0.L},${gl0.Tp} -> ${gl1.L},${gl1.Tp})`);
    if (ev1.some((e) => e.click)) bad.push(`the finger left after two tapped: ${JSON.stringify(ev1)}`);

    // 6. a plain tap still travels
    await T.tap(cx + 3, cy + 3);
    await sleep(150);
    const ev2 = await p.evaluate(() => globalThis.__ev.splice(0));
    if (!ev2.some((e) => e.click)) bad.push(`a one-finger tap after the gestures pushed no click (${JSON.stringify(ev2)})`);
    await p.evaluate(() => { globalThis.__swallowClicks = false; });

    // 7. a phone turned at the pinched zoom keeps its cell
    if (w !== 1024 && w !== 768 && w !== 1366) {
      await pinch(T, cx, cy, dA, dA * 1.6);
      await T.up();
      await sleep(250);
      const gz = await frame(p);
      await T.rotate(h, w, DPR);
      await sleep(300);
      const gzr = await frame(p);
      await T.shot(`${SHOTS}/${name}-turned-zoomed.png`);
      await T.rotate(w, h, DPR);
      await sleep(300);
      const gzb = await frame(p);
      info.turned = [gz.Td, gzr.Td, gzb.Td];
      if (gzr.Td !== gz.Td || gzb.Td !== gz.Td) bad.push(`turned at zoom ${await pref(p, 'zoomFactor')}: drawn cell ${gz.Td} / ${gzr.Td} / ${gzb.Td}`);
    }
  }
  const errs = p.errors.splice(0);
  bad.push(...errs.map((x) => `console: ${x}`));
  fails += bad.length;
  out.push({ name, w, h, dpr: DPR, layout, bad, info });
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${name} ${JSON.stringify(info)}${bad.length ? `\n     ${bad.join('\n     ')}` : ''}`);
  await ctx.close();
}
writeJson(`gestures-${DPR}.json`, out);
console.log(`${fails} failures in ${out.length} windows`);
await b.close();
