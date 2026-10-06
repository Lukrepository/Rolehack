// The left thumb swipes REST's strip slowly while the right thumb's hold opens
// COMBAT's layer: the right hold must not count for the left, nor the left's
// swipe be taken for the old Pray hold.   node twothumb.mjs WxH dpr
process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/layers/rc2';
const { launch, newCtx, openPage, resume, touch, sleep } = await import('../common.mjs');
const { capOf, state, mark, pushed } = await import('../kit.mjs');
const [w, h] = (process.argv[2] || '896x443').split('x').map(Number);
const DPR = Number(process.argv[3] || 1);
const b = await launch();
const ctx = await newCtx(b, { w, h, dpr: DPR });
const p = await openPage(ctx);
await resume(p); await sleep(300);
const t = await touch(ctx, p);
await p.evaluate(() => { globalThis.__swallowClicks = true; });
const T = (type, pts) => t.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
const pr = await p.evaluate(() => JSON.parse(JSON.stringify(globalThis.__bt.overlay.habitSpots.pray)));
const rest = await capOf(p, 'rest'), cb = await capOf(p, 'combat');
const x0 = pr.x + pr.w / 2, y0 = pr.y + pr.h / 2;
let fails = 0;
const flash = () => p.evaluate(() => { const g = globalThis.__bt.overlay.ghostEl; return g.classList.contains('on') ? g.textContent : ''; });
for (const order of ['combat first', 'rest first']) {
  await p.evaluate(() => { const o = globalThis.__bt.overlay; o.guardLog = []; o.ghostEl.classList.remove('on'); o.habit = null; });
  const L = (i) => ({ x: x0, y: y0 - (rest.h * 1.2 * i) / 10, id: 0 }), R = { x: cb.cx, y: cb.cy, id: 1 };
  await T('touchStart', [L(0)]);
  await sleep(40);
  await T('touchMove', [L(1)]);
  await T('touchMove', [L(2)]);           // the strip is sliding: the left hold is REST's own
  await T('touchStart', [L(2), R]);       // the right thumb lands on COMBAT
  for (let i = 3; i <= 10; i++) { await T('touchMove', [L(i), R]); await sleep(55); }
  await sleep(150);                       // COMBAT's hold has fired: its layer is up
  const s1 = await state(p);
  if (order === 'combat first') { await T('touchEnd', [L(10)]); await sleep(40); await T('touchEnd', []); }
  else { await T('touchEnd', [R]); await sleep(40); await T('touchEnd', []); }
  await sleep(80);
  const fl = await flash();
  const H = await p.evaluate(() => globalThis.__bt.overlay.habit);
  const rv = await p.evaluate(() => globalThis.__bt.overlay.restWell.revealed);
  const ok = !fl && !H && rv;
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${w}x${h}@${DPR} ${order} lifts: layer while held ${JSON.stringify(s1.layer || s1.fan)}; Long rest shown ${rv}; flash ${JSON.stringify(fl)}; habit ${JSON.stringify(H)}`);
  await p.keyboard.press('Escape'); await sleep(200);
  await p.evaluate(() => { const o = globalThis.__bt.overlay; o.closePadLayer && o.closePadLayer(); o.closeAll && o.closeAll(); o.scrollWell(false); });
  await sleep(1700);
}
console.log('console errors:', JSON.stringify(p.errors));
await b.close();
console.log(fails ? `FAIL: ${fails}` : 'PASS');
