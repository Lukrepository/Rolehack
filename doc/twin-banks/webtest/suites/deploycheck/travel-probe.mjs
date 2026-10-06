// Classic's map tap: how far does a travel go, on the branch's page and on the
// page before the branch (ec134a7, port 8795)?  node travel-probe.mjs <origin> [runs]
import { chromium, EXE, sleep, touch } from './common.mjs';
const ORIGIN = process.argv[2], RUNS = Number(process.argv[3] || 3);
const HOOK = `;globalThis.__tp = { get cursor() { return { ...cursor }; }, get grid() { return grid; }, get view() { return view; },
  get waiting() { return !!waiter; }, get more() { return moreShown; } };
{ const real = push; push = (ev) => { (globalThis.__ev = globalThis.__ev || []).push(JSON.parse(JSON.stringify(ev))); real(ev); }; }`;
const b = await chromium.launch({ executablePath: EXE });
for (let run = 0; run < RUNS; run++) {
  const ctx = await b.newContext({ viewport: { width: 896, height: 443 }, screen: { width: 939, height: 443 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  await ctx.route('**/web.js', async (route) => { const r = await route.fetch(); await route.fulfill({ response: r, body: (await r.text()) + HOOK, headers: { ...r.headers(), 'content-type': 'text/javascript' } }); });
  await ctx.addInitScript(() => { try { localStorage.setItem('rh.layout', JSON.stringify('classic')); } catch (e) {} });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${ORIGIN}/index.html`);
  await p.waitForFunction(() => globalThis.__tp && !document.getElementById('boot'), null, { timeout: 90000 });
  const k = await touch(ctx, p);
  const st = () => p.evaluate(() => { const $ = (id) => document.getElementById(id), line = $('line');
    return { modal: !$('modal').hidden, title: $('modal-title').textContent, line: !!(line && line.offsetParent), ckeys: !!$('ckeys'), msg: $('msgband').innerText,
      more: __tp.more, status: $('statband').innerText, form: !$('formwrap').hidden, waiting: __tp.waiting, cur: __tp.cursor }; });
  let settled = 0;
  for (let i = 0; i < 160; i++) {
    await sleep(300);
    const s = await st();
    if (s.form) { await p.keyboard.press('Escape'); continue; }
    if (s.line) { await p.fill('#line', 'Probe'); await p.press('#line', 'Enter'); continue; }
    if (s.ckeys) { await p.keyboard.press(/Is this ok/i.test(s.title) ? 'y' : '*'); continue; }
    if (s.modal) { await p.keyboard.press(/tutorial/i.test(s.title) ? 'n' : 'Enter'); continue; }
    if (s.more) { await p.keyboard.press('Space'); continue; }
    if (/Shall I pick/i.test(s.msg)) { await p.keyboard.press('y'); continue; }
    if (s.status.trim() && s.waiting) { if (++settled >= 3) break; } else settled = 0;
  }
  const tgt = await p.evaluate(() => {
    const v = __tp.view, g = __tp.grid, c = __tp.cursor, cv = document.getElementById('map').getBoundingClientRect();
    let best = null;
    for (let y = 0; y < 21; y++) for (let x = 0; x < 80; x++) {
      if (g[y][x].ch !== 46) continue;
      const px = cv.left + v.left + (x + 0.5) * v.T, py = cv.top + v.top + (y + 0.5) * v.T;
      if (document.elementFromPoint(px, py) !== document.getElementById('map')) continue;
      const far = Math.abs(x - c.x) + Math.abs(y - c.y);
      if (far >= 4 && (!best || far > best.far)) best = { x, y, px, py, far };
    }
    return best;
  });
  const a = (await st()).cur;
  if (tgt) await k.tap(tgt.px, tgt.py);
  let quiet = 0;
  for (let i = 0; i < 60 && quiet < 4; i++) { await sleep(150); const s = await st(); if (s.more) { await p.keyboard.press('Space'); quiet = 0; } else if (s.waiting) quiet++; else quiet = 0; }
  const c = (await st()).cur, m = (await st()).msg.replace(/\s+/g, ' ');
  const ev = await p.evaluate(() => (globalThis.__ev || []).filter((e) => e.click || e.key !== undefined).slice(-4));
  console.log(`${ORIGIN} run ${run}: from ${a.x},${a.y} tap ${tgt && `${tgt.x},${tgt.y}`} -> at ${c.x},${c.y} ${c.x === tgt?.x && c.y === tgt?.y ? 'ARRIVED' : 'stopped'} | msg "${m.slice(0, 60)}" | ev ${JSON.stringify(ev)} | errors ${errors.length}`);
  await ctx.close();
}
await b.close();
