// The final review's two map-guard gaps, with real touches (CDP):
//  - chips: a double tap (or a bounce) on a prompt's chip, the row gone under
//    the second touch, must not travel (web.js showChips -> windowClosed);
//  - busy: a ring tap made while the core travels (commandWait false) must
//    preview, not queue a click the next command travels to (wouldTravel).
//   node busy.mjs WxH dpr
process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/layers/fin';
const { launch, newCtx, openPage, resume, touch, sleep } = await import('../common.mjs');
const { mark, pushed, Checks } = await import('../kit.mjs');
const [wh, dprS] = process.argv.slice(2);
const [w, h] = (wh || '896x443').split('x').map(Number);
const DPR = Number(dprS || 1);
const C = new Checks(`busy ${w}x${h}@${DPR}`);
const b = await launch();
const ctx = await newCtx(b, { w, h, dpr: DPR, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(300);
const t = await touch(ctx, p);
const raw = (type, pts) => t.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
const quick = async (x, y, hold = 50) => { await raw('touchStart', [{ x, y }]); await sleep(hold); await raw('touchEnd', []); };
const log = () => p.evaluate(() => (globalThis.__bt.overlay.guardLog || []).map((g) => g.what));

// 1. a direction prompt's chips: Esc tapped twice, 157 ms apart
await p.evaluate(() => { globalThis.__swallowClicks = true; globalThis.__bt.overlay.guardLog = []; });
await p.evaluate(() => globalThis.__bt.send('^D'));
let chip = null;
for (let i = 0; i < 20 && !chip; i++) {
  await sleep(100);
  chip = await p.evaluate(() => { const e = document.querySelector('#chips button.esc'); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; });
}
C.ok('Kick asks a direction, with chips', !!chip, chip);
if (chip) {
  const under = await p.evaluate(([x, y]) => { const c = document.getElementById('chips'); c.style.visibility = 'hidden'; const n = document.elementFromPoint(x, y); c.style.visibility = ''; return n && n.id; }, [chip.x, chip.y]);
  await mark(p);
  await quick(chip.x, chip.y, 50);
  await sleep(107);
  await quick(chip.x + 1, chip.y + 1, 60);
  await sleep(300);
  const got = await p.evaluate(() => (globalThis.__ev || []).map((e) => (e.click ? 'click' : e.key)));
  const lg = await log();
  C.ok(`Esc chip tapped twice, 157 ms apart (over ${under}): Esc alone, the second swallowed`, got.length === 1 && got[0] === 27 && lg.includes('closing'), { got, log: lg });
}
await resume(p);

// 2. a ring tap while the hero travels
const ring = await p.evaluate(() => {
  const o = globalThis.__bt.overlay, m = o.twin.spec.mapArea, v = globalThis.__bt.view, r = document.getElementById('map').getBoundingClientRect();
  for (let y = m.y + 4; y < m.y + m.h - 4; y += 2) for (let x = m.x + 4; x < m.x + m.w - 4; x += 2) {
    const d = o.keyDistance(x, y);
    if (d === null || d < 18 || d > 24) continue;
    if (document.elementFromPoint(x, y) !== document.getElementById('map')) continue;
    const cx = Math.floor((x - r.left - v.left) / v.T), cy = Math.floor((y - r.top - v.top) / v.T);
    if (cx >= 0 && cx < 80 && cy >= 0 && cy < 21) return { x, y, d };
  }
  return null;
});
C.ok('a ring point on the level', !!ring, ring);
// a travel: the hero's cell and a far cell of the level, on screen and deep in the map
const far = await p.evaluate(() => {
  const R = globalThis.__bt, o = R.overlay, v = R.view, r = document.getElementById('map').getBoundingClientRect(), c = R.cursor;
  const at = (cx, cy) => ({ x: r.left + v.left + (cx + 0.5) * v.T, y: r.top + v.top + (cy + 0.5) * v.T });
  let best = null;
  for (let cy = 1; cy < 20; cy++) for (let cx = 1; cx < 79; cx++) {
    const q = at(cx, cy);
    if (document.elementFromPoint(q.x, q.y) !== document.getElementById('map')) continue;
    const d = o.keyDistance(q.x, q.y);
    if (d !== null && d < 60) continue;
    const dist = Math.max(Math.abs(cx - c.x), Math.abs(cy - c.y));
    if (dist >= 6 && (!best || dist < best.dist)) best = { cx, cy, ...q, dist };
  }
  return { hero: c, best };
});
C.ok('a deep cell 6 or more squares off', !!far.best, far);
if (ring && far.best) {
  await p.evaluate(() => { globalThis.__swallowClicks = false; globalThis.__bt.overlay.guardLog = []; });
  await mark(p);
  await quick(far.best.x, far.best.y, 50);
  // wait for the core to be busy (travelling), then the ring tap
  let busy = false;
  for (let i = 0; i < 40 && !busy; i++) { await sleep(10); busy = await p.evaluate(() => !globalThis.__bt.commandWait && !globalThis.__bt.waiting); }
  await sleep(60);
  const stillBusy = await p.evaluate(() => !globalThis.__bt.commandWait && !globalThis.__bt.waiting);
  await quick(ring.x, ring.y, 60);
  await sleep(100);
  const lg = await log();
  const prev = await p.evaluate(() => { const g = globalThis.__bt.ghostPreview; return g ? { x: g.x, y: g.y, ring: !!g.ring } : null; });
  for (let i = 0; i < 60; i++) { await sleep(100); if (await p.evaluate(() => globalThis.__bt.commandWait)) break; }
  await sleep(400);
  const clicks = await p.evaluate(() => (globalThis.__ev || []).filter((e) => e.click).length);
  C.ok(`the core busy with the travel when the ring tap lands (${busy}, ${stillBusy})`, busy && stillBusy);
  C.ok('the ring tap during the travel previews (ring), queues nothing', lg.includes('ring') && clicks === 1, { log: lg, clicks, preview: prev });
  const cw = await p.evaluate(() => globalThis.__bt.commandWait);
  C.ok('the travel ended at a command, the hero not sent on to the ring', cw);
}
C.ok('console clean', p.errors.length === 0, p.errors.slice(0, 5));
const f = C.list.filter((c) => !c.pass);
console.log(`busy ${w}x${h}@${DPR}: ${C.list.length - f.length}/${C.list.length} pass`);
await b.close();
