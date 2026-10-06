import { launch, ctxOptions, openPage, resumeGame, touchKit, centreOf, OUT, STATE, sleep } from './common.mjs';
const b = await launch();
const ctx = await b.newContext({ ...ctxOptions(896, 443, 'touch'), storageState: STATE });
const p = await openPage(ctx, {});
await resumeGame(p); await sleep(400);
const T = await touchKit(ctx, p);
const rotate = async (w, h) => { await p.setViewportSize({ width: w, height: h }); await sleep(800); };
const st = () => p.evaluate(() => { const o = globalThis.__rh.overlay; return {
  answering: !!o.answering, places: o.answering && o.answering.places, pill: o.layerPill && o.layerPill.classList.contains('on') ? o.layerPill.textContent : null,
  frame: o.layerFrame && o.layerFrame.classList.contains('on'), padLabels: o.padCells.map((k) => k.text).join('|'), centre: o.padCentre.text,
  ctx: o.ctxRadialOpen, radial: o.radialOpen, scrim: o.scrim.classList.contains('on'), msg: document.getElementById('msgband').innerText.replace(/\n/g, ' ').slice(0, 100), W: o.twin && o.twin.W }; });
// 1. pray's question on the pad, through a turn
const sac = await centreOf(p, 'sacrifice');
await T.hold(sac.x, sac.y, 600); await sleep(700);
console.log('after pray hold:', JSON.stringify(await st()));
await rotate(443, 939);
console.log('rotated:', JSON.stringify(await st()));
await p.screenshot({ path: `${OUT}/shots/r2-answer-portrait.png` });
// answer No with the pad place holding n
const s1 = await st();
const idx = s1.places ? s1.places.indexOf('n') : -1;
const ids = ['pad_y', 'pad_k', 'pad_u', 'pad_h', 'pad_centre', 'pad_l', 'pad_b', 'pad_j', 'pad_n'];
if (idx >= 0) { const c = await centreOf(p, ids[idx]); await T.tap(c.x, c.y); await sleep(700); }
console.log('answered n:', JSON.stringify(await st()), 'pushed', JSON.stringify((globalThis.__x = await p.evaluate(() => (globalThis.__pushed || []).slice(-3)))));
// 2. the pad-centre hold: the context row, through a turn
const pc = await centreOf(p, 'pad_centre');
await T.hold(pc.x, pc.y, 700); await sleep(300);
console.log('ctx radial:', JSON.stringify(await st()));
await rotate(896, 443);
console.log('rotated:', JSON.stringify(await st()));
await p.screenshot({ path: `${OUT}/shots/r2-ctx-landscape.png` });
const row = await p.evaluate(() => { const o = globalThis.__rh.overlay; const ks = [...o.ctxRadialEl.querySelectorAll('button.k')]; return ks.map((k) => { const r = k.getBoundingClientRect(); return [k.getAttribute('aria-label'), r.x + r.width / 2, r.y + r.height / 2]; }); });
console.log('row', JSON.stringify(row));
await p.keyboard.press('Escape'); await sleep(300);
// 3. the flick radial left open by a hold, through a turn
const fl = await centreOf(p, 'flick');
await T.hold(fl.x, fl.y, 700); await sleep(300);
console.log('flick hold:', JSON.stringify(await st()));
await rotate(443, 939);
const fs2 = await st();
const nodes = await p.evaluate(() => globalThis.__rh.overlay.flickNodes.map((n) => { const r = n.el.getBoundingClientRect(); return [n.text, r.x, r.y, r.width, getComputedStyle(n.el.parentElement).display]; }));
console.log('rotated:', JSON.stringify(fs2), JSON.stringify(nodes));
await p.screenshot({ path: `${OUT}/shots/r2-flick-portrait.png` });
await p.keyboard.press('Escape'); await sleep(300);
console.log('errors', p.errors);
await b.close();
