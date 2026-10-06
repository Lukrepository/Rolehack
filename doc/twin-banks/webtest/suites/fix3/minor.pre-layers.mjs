// The minor fixes of the twin banks stage, in the browser (real CDP touches):
//  zoom      a pinch in twin writes zoomFactor, never classic's zoom; a classic
//            zoom set before does not change twin's map cell
//  skirt     at 360x640 and 640x360 no key's hold hint overflows its skirt
//  more      at --More--, a tap on the status lines is Space (twin)
//  combat    a second tap on COMBAT disarms Fight; the pad tints while armed
//  pins      PIN 1 and PIN 2 stay (dimmed) while the COMBAT layer is open
import fs from 'node:fs';
import { launch, newCtx, openPage, resume, touch, sleep, ctlRect, evs, clearEvs } from '../banks/common.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/fix3';
const DPR = Number(process.argv[2]) || 1;
const b = await launch();
const res = [];
const ok = (name, pass, detail) => { res.push({ name, pass, detail }); console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(detail)); };
const page = async (w, h, prefs = {}) => {
  const ctx = await newCtx(b, { w, h, dpr: DPR, prefs });
  const p = await openPage(ctx); await resume(p);
  return { ctx, p, k: await touch(ctx, p) };
};
const mapCentre = (p) => p.evaluate(() => { const m = globalThis.__bt.overlay.twin.spec.mapArea; return { x: m.x + m.w / 2, y: m.y + m.h / 2 }; });
const drawn = (p) => p.evaluate(() => ({ T: globalThis.__bt.view.T, cell: globalThis.__bt.geom.cell, zoom: localStorage.getItem('rh.zoom'), zf: localStorage.getItem('rh.zoomFactor') }));

// ---- zoom
if (!process.env.ONLY_MORE)
{
  const { ctx, p, k } = await page(896, 443);
  const c = await mapCentre(p);
  const before = await drawn(p);
  await k.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x - 30, y: c.y, id: 1 }, { x: c.x + 30, y: c.y, id: 2 }] });
  for (let i = 1; i <= 10; i++) {
    await k.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x - 30 - 6 * i, y: c.y, id: 1 }, { x: c.x + 30 + 6 * i, y: c.y, id: 2 }] });
    await sleep(20);
  }
  const mid = await drawn(p);
  await k.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(300);
  const after = await drawn(p);
  const want = Math.floor(after.cell * Number(after.zf) * DPR + 1e-6) / DPR;
  ok('zoom: a pinch in twin writes zoomFactor, not zoom', after.zoom === null && Number(after.zf) > 1.5 && mid.zf === null
    && Math.abs(after.T - want) < 0.01 && mid.T > before.T, { before, mid, after, want });
  // Reset zoom in twin puts the factor back to 1, still not touching zoom
  await p.evaluate(() => globalThis.__bt.overlay.openSettings());
  await sleep(300);
  await p.evaluate(() => [...document.querySelectorAll('#formwrap button')].find((x) => /Reset zoom/i.test(x.innerText)).click());
  await sleep(300);
  const reset = await drawn(p);
  ok('zoom: Reset zoom in twin resets the factor', reset.zf === '1' && reset.zoom === null && Math.abs(reset.T - before.T) < 0.01, reset);
  await ctx.close();
  // a classic zoom set before leaves twin's cell alone, and the classic page still reads it
  const t = await page(896, 443, { zoom: 26 });
  const tz = await drawn(t.p);
  ok('zoom: classic zoom 26 does not change twin\'s cell', Math.abs(tz.T - Math.floor(tz.cell * DPR + 1e-6) / DPR) < 0.01, tz);
  await t.ctx.close();
  const cl = await page(896, 443, { zoom: 26, layout: 'classic' });
  const cz = await cl.p.evaluate(() => globalThis.__bt.view.T);
  ok('zoom: classic still draws its zoom', Math.abs(cz - Math.floor(26 * DPR) / DPR) < 0.01, { T: cz });
  await cl.ctx.close();
}

// ---- skirt
if (!process.env.ONLY_MORE)
for (const [w, h] of [[360, 640], [640, 360]]) {
  const { ctx, p, k } = await page(w, h);
  const over = () => p.evaluate(() => [...document.querySelectorAll('#keys button.k')].filter((e) => e.offsetParent)
    .map((e) => { const f = e.querySelector('.fr'); return { tw: e.dataset.tw || e.closest('[data-tw]')?.dataset.tw, text: f.textContent, sw: f.scrollWidth, cw: f.clientWidth, fs: f.style.fontSize }; })
    .filter((x) => x.text && x.sw > x.cw + 0.5));
  const o1 = await over();
  const pin2 = await p.evaluate(() => { const e = document.querySelector('[data-tw="pin2"] .fr'); return e ? [e.textContent, e.style.fontSize] : null; });
  // SEARCH's count row open: 'pick a count'
  const s = await ctlRect(p, 'search');
  await k.tap(s.cx, s.cy, 450);
  await sleep(300);
  const o2 = await over();
  const sr = await p.evaluate(() => document.querySelector('[data-tw="search"] .fr').textContent);
  await k.shot(`${OUT}/shots/minor-${DPR}-${w}x${h}-skirts.png`);
  ok(`skirt ${w}x${h}: no hold hint overflows`, !o1.length && !o2.length, { o1, o2, pin2, search: sr });
  if (p.errors.length) ok(`skirt ${w}x${h}: console`, false, p.errors);
  await ctx.close();
}

// ---- --More--, COMBAT, pins (896x443)
{
  const { ctx, p, k } = await page(896, 443);
  // pins under the COMBAT layer
  const cb = await ctlRect(p, 'combat');
  await k.tap(cb.cx, cb.cy, 480);
  await sleep(250);
  const pins = await p.evaluate(() => ['pin1', 'pin2'].map((id) => { const e = document.querySelector(`[data-tw="${id}"]`); const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { id, shown: !!e.offsetParent && cs.display !== 'none', underScrim: top && top.id === 'scrim' }; }));
  const fan = await p.evaluate(() => globalThis.__bt.overlay.fanOpen);
  await k.shot(`${OUT}/shots/minor-${DPR}-combatlayer.png`);
  ok('pins: PIN 1 and PIN 2 stay, under the scrim, with the COMBAT layer open', fan && pins.every((x) => x.shown && x.underScrim), { fan, pins });
  await p.keyboard.press('Escape'); await sleep(300);
  // COMBAT twice
  await clearEvs(p);
  await k.tap(cb.cx, cb.cy, 60);
  await sleep(200);
  const armed = await p.evaluate(() => { const o = globalThis.__bt.overlay, m = o.padMold, t = m.querySelector('.k .tp');
    return { armed: o.armed && o.armed.word, by: o.armedBy, cls: m.classList.contains('armed'), tint: getComputedStyle(t, '::after').backgroundColor }; });
  await k.shot(`${OUT}/shots/minor-${DPR}-armed.png`);
  await k.tap(cb.cx, cb.cy, 60);
  await sleep(200);
  const dis = await p.evaluate(() => { const o = globalThis.__bt.overlay; return { armed: o.armed, cls: o.padMold.classList.contains('armed'), banner: o.banner.el.style.display }; });
  const pushed = (await evs(p)).map((e) => e.key);
  ok('combat: a second tap on COMBAT disarms; the pad tints while armed', armed.armed === 'Fight' && armed.cls && /rgba\(255, 70, 50/.test(armed.tint)
    && !dis.armed && !dis.cls && pushed.join() === '27', { armed, dis, pushed });
  // and a pin's Fight is not disarmed by COMBAT: COMBAT arms from itself instead (ARMED moves to COMBAT)
  // --More--: pray, then a tap on the status lines
  const sac = await ctlRect(p, 'sacrifice');
  await k.tap(sac.cx, sac.cy, 420);
  let more = false;
  const mlog = [];
  for (let i = 0; i < 30 && !more; i++) {
    await sleep(300);
    const st = await p.evaluate(() => ({ more: globalThis.__bt.moreShown, answering: !!globalThis.__bt.overlay.answering, msg: document.getElementById('msgband').innerText }));
    mlog.push(st);
    if (st.more) { more = true; break; }
    if (st.answering || /\[yn\]/.test(st.msg)) await p.keyboard.press('y');
  }
  if (!more) ok('more: reached --More--', false, mlog.slice(0, 4));
  else {
    const sb = await p.evaluate(() => { const r = document.getElementById('statband').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2).id }; });
    await clearEvs(p);
    await k.tap(sb.x, sb.y, 60);
    await sleep(300);
    const pushed2 = (await evs(p)).map((e) => e.key);
    // and outside --More-- the same tap does nothing
    let n = 0;
    while (n++ < 20 && await p.evaluate(() => globalThis.__bt.moreShown)) { await p.keyboard.press('Space'); await sleep(300); }
    await sleep(500);
    await clearEvs(p);
    await k.tap(sb.x, sb.y, 60);
    await sleep(300);
    const pushed3 = (await evs(p)).map((e) => e.key);
    ok('more: a tap on the status lines at --More-- is Space, and nothing otherwise', pushed2.join() === '32' && !pushed3.length, { sb, pushed2, pushed3 });
  }
  if (p.errors.length) ok('console', false, p.errors);
  await ctx.close();
}
fs.writeFileSync(`${OUT}/minor-${DPR}.json`, JSON.stringify(res, null, 1));
console.log(res.filter((r) => r.pass).length, 'of', res.length);
await b.close();
