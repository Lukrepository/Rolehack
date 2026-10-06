// Fat-finger taps (Chrome's touch adjustment in play) round the banks: what
// each one does -- a key, a swallow, a ring preview or a walk.
import { launch, newCtx, openPage, resume, touch, sleep } from './common.mjs';
const dpr = +(process.argv[2] || 1);
const b = await launch();
const out = [];
for (const [W, H] of [[896, 443], [443, 939]]) {
  const ctx = await newCtx(b, { w: W, h: H, dpr, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  const t = await touch(ctx, p);
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const cap = (id) => p.evaluate((id) => { const r = globalThis.__bt.overlay.twinCapRect(id); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, id);
  const tapAt = async (x, y, r) => {
    await p.evaluate(() => { globalThis.__ev = []; globalThis.__bt.overlay.guardLog = []; });
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, radiusX: r, radiusY: r }] });
    await sleep(60);
    await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(350);
    const res = await p.evaluate(() => {
      const ev = (globalThis.__ev || []).map((e) => (e.click ? `@${e.click.x},${e.click.y}` : String.fromCharCode(e.key))).join('');
      const g = (globalThis.__bt.overlay.guardLog || []).map((q) => q.what + (q.id ? `:${q.id}` : '')).join(',');
      const gp = globalThis.__bt.ghostPreview;
      return { ev, g, ring: !!(gp && gp.ring) };
    });
    // undo whatever opened
    await p.evaluate(() => { const o = globalThis.__bt.overlay; o.dismissPopups(); o.disarm(); });
    await p.keyboard.press('Escape'); await sleep(250);
    await p.evaluate(() => { globalThis.__bt.overlay.closeAll && globalThis.__bt.overlay.closeAll(); });
    await sleep(2100);   // let any ring preview lapse
    return res;
  };
  const L = await cap('pad_l'), CB = await cap('combat'), CX = await cap('context');
  const portrait = H > W;
  const cases = [];
  const ly = L.y + L.h / 2, cy = CB.y + CB.h / 2;
  for (const dx of [-4, 4, 10, 14, 22, 30, 50]) cases.push({ name: `pad_l right edge +${dx}`, x: L.x + L.w + dx, y: ly });
  for (const dx of [-4, 4, 10, 14, 22, 30, 50]) cases.push({ name: `combat left edge -${dx}`, x: CB.x - dx, y: cy });
  cases.push({ name: 'seam combat|context', x: (CB.x + CB.w + CX.x) / 2, y: cy });
  for (const r of [1, 12]) {
    for (const c of cases) {
      const res = await tapAt(c.x, c.y, r);
      const line = `${dpr} ${W}x${H} r${r} ${c.name} (${c.x.toFixed(1)},${c.y.toFixed(1)}) -> keys:${JSON.stringify(res.ev)} guard:${res.g} ring:${res.ring}`;
      console.log(line); out.push(line);
    }
  }
  if (p.errors.length) console.log('ERRORS', p.errors);
  await ctx.close();
}
await b.close();
