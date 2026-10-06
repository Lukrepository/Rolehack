// The reported thumb-radius examples, as full taps with a contact radius.
//   node thumb.mjs WxH dpr radius
process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/layers/rc/probes';
const { launch, newCtx, openPage, resume, touch, sleep } = await import('../../common.mjs');
const { capOf, state, mark, pushed } = await import('../../kit.mjs');
const [wh, dprS, radS] = process.argv.slice(2);
const [w, h] = wh.split('x').map(Number);
const DPR = Number(dprS || 1), R = Number(radS || 16);
const b = await launch();
const ctx = await newCtx(b, { w, h, dpr: DPR, prefs: { ghostDeck: { on: false, clean: 3, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(300);
const t = await touch(ctx, p);
await p.evaluate(() => { globalThis.__swallowClicks = true; });
// hold every key event back from the core too, so nothing acts
await p.evaluate(() => { globalThis.__pd = []; window.addEventListener('pointerdown', (e) => globalThis.__pd.push(`${e.isTrusted ? 'T' : 's'}:${(e.target.closest && e.target.closest('[data-tw]') ? e.target.closest('[data-tw]').dataset.tw : e.target.id || e.target.className)}`), true); });
const ids = await p.evaluate(() => [...globalThis.__bt.overlay.twin.keys.keys()].filter((id) => id !== 'longrest'));
const K = {};
for (const id of ids) K[id] = await capOf(p, id);
const W = w;
const pts = [];
const top = Math.min(...ids.map((id) => K[id].y));
for (const id of ids) {
  const k = K[id];
  for (const d of [12.5, 13, 14, 16, 18, 20]) {
    if (Math.abs(k.y - top) < 2) pts.push({ id, why: `up ${d}`, x: k.cx, y: k.y - d });
    const inward = k.cx < W / 2 ? { x: k.x + k.w + d, side: 'right' } : { x: k.x - d, side: 'left' };
    pts.push({ id, why: `${inward.side} ${d}`, x: inward.x, y: k.cy });
  }
  for (const d of [13]) {
    pts.push({ id, why: `tr ${d}`, x: k.x + k.w + d / Math.SQRT2, y: k.y - d / Math.SQRT2 });
    pts.push({ id, why: `tl ${d}`, x: k.x - d / Math.SQRT2, y: k.y - d / Math.SQRT2 });
  }
}
let bad = 0, n = 0;
for (const q of pts) {
  if (q.x < 1 || q.y < 1 || q.x > w - 1 || q.y > h - 1) continue;
  // nearest keycap distance
  const dist = Math.min(...ids.map((id) => { const k = K[id]; return Math.hypot(Math.max(k.x - q.x, 0, q.x - (k.x + k.w)), Math.max(k.y - q.y, 0, q.y - (k.y + k.h))); }));
  if (dist <= 12.01) continue;   // only points the design says no key takes
  n++;
  const under = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? `${e.id || String(e.className).slice(0, 20)}` : null; }, [q.x, q.y]);
  if (await p.evaluate(() => !!globalThis.__bt.ghostPreview)) {
    // a deep map tap clears the ring's preview (its click is held back)
    const m = await p.evaluate(() => { const a = globalThis.__bt.overlay.twin.spec.mapArea; return { x: a.x + a.w / 2, y: a.y + a.h / 2 }; });
    await t.tap(m.x, m.y); await sleep(250);
  }
  await mark(p);
  await p.evaluate(() => { globalThis.__pd = []; globalThis.__bt.overlay.guardLog = []; });
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y, radiusX: R, radiusY: R }] });
  await sleep(50);
  const s1 = await state(p);
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(220);
  const s = await state(p);
  const sent = await pushed(p);
  const pd = await p.evaluate(() => globalThis.__pd.join(' '));
  const acted = sent || s.armed || s.layer || s.drawer || s.fan || s.modal || s.form || s1.layer || s1.fan;
  // the band's own action, or Space at --More--, is not a key's
  const bandOwn = /msgband|statband|bands/.test(under) && (sent === '^P' || sent === ' ');
  if (acted && !bandOwn) {
    bad++;
    console.log(`ACT ${q.id} ${q.why} @${q.x.toFixed(1)},${q.y.toFixed(1)} d=${dist.toFixed(1)} under ${under}: sent ${JSON.stringify(sent)} armed ${s.armed} layer ${JSON.stringify(s.layer || s1.layer)} drawer ${s.drawer} fan ${s.fan || s1.fan} modal ${s.modal} pd ${pd}`);
  }
  // put things back
  if (s.drawer || s.modal || s.form || s.layer || s.fan || s.armed) { await p.keyboard.press('Escape'); await sleep(200); await p.evaluate(() => { const o = globalThis.__bt.overlay; o.closePadLayer && o.closePadLayer(); o.closeFan && o.closeFan(); o.disarm && o.disarm(); o.closeDrawer && o.closeDrawer(); }); }
  if (sent && sent !== '^P') await resume(p);
  if (sent === '^P') { await p.keyboard.press('Escape'); await sleep(200); }
}
console.log(`${wh}@${DPR} r${R}: ${n} points 12+ dp off every keycap, ${bad} acted; console errors ${JSON.stringify(p.errors)}`);
await b.close();
