// Size classes across the 600 / 480 dp boundaries (the stage "Tablet and
// touch-laptop tier, size classes and panels"):
//  1. a desktop window (a mouse) dragged narrower a few px at a time from 700
//     to 556 dp wide and back to 660 (then 1024), then shorter from 600 to 436 dp tall and
//     back to 540: every re-layout's tier is recorded (overlay.rebuildTwin
//     wrapped), and it changes exactly twice each way -- phone under 576 /
//     456, tablet again from 624 / 504 -- never back and forth; jittered
//     about 600 and 480 it never changes; no key moves for a tier;
//  2. what the player had survives every tier change: Fight armed (COMBAT),
//     the message band's text, the panels' content when the tablet comes
//     back, and the game answers a key afterwards;
//  3. a touch window: a finger held on the glass while the window crosses the
//     boundary keeps the tier and the keys until it lifts, then the tier
//     changes.
//   node resize.mjs [dpr]  -> resize-<dpr>.json
import { launch, newCtx, openPage, resume, sleep, writeJson, SHOTS } from './common.mjs';
import { Checks } from './kit.mjs';

const DPR = Number(process.argv[2] || 1);
const b = await launch();
const results = {};
let failed = 0;

async function size(cdp, w, h, mobile, settle = 90) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: DPR, mobile, screenWidth: Math.max(w, 1920), screenHeight: Math.max(h, 1080) });
  await sleep(settle);
}
const watchBuilds = (p) => p.evaluate(() => {
  const o = globalThis.__bt.overlay;
  globalThis.__builds = [];
  const real = o.rebuildTwin.bind(o);
  o.rebuildTwin = function () {
    real();
    const S = this.twin && this.twin.spec;
    globalThis.__builds.push({ W: S ? S.W : null, H: S ? S.H : null, ui: document.documentElement.dataset.ui, tier: document.documentElement.dataset.tier || null,
      cellTier: this.twin ? this.twin.info.DC.tier : null, panels: document.querySelectorAll('.rhpanel:not([style*="display: none"])').length });
  };
});
const builds = (p) => p.evaluate(() => globalThis.__builds.splice(0));
const now = (p) => p.evaluate(() => {
  const o = globalThis.__bt.overlay, S = o.twin && o.twin.spec;
  const caps = {};
  if (S) for (const id of o.twin.keys.keys()) { const k = o.twinCapRect(id); if (k) caps[id] = [k.x, k.y, k.width, k.height].map((v) => Math.round(v * 100) / 100); }
  const pan = (k) => { const e = document.querySelector(`.rhpanel[data-kind="${k}"]`); return e && e.style.display !== 'none' ? e.querySelector('.pbody').innerText.replace(/\s+/g, ' ').trim() : null; };
  return { tier: document.documentElement.dataset.tier || null, ui: document.documentElement.dataset.ui, armed: o.armed ? o.armed.key : null,
    band: document.getElementById('msgband').innerText.replace(/\s+/g, ' ').trim(), log: pan('log'), inv: pan('inventory'), caps,
    W: S && S.W, H: S && S.H, status: document.getElementById('statband').innerText };
});
// the keys' offsets from their own bottom corner: a tier never moves a key
const offsets = (n) => Object.fromEntries(Object.entries(n.caps).map(([id, [x, y, w, h]]) => [id, [Math.min(x, n.W - x - w).toFixed(2), (n.H - y - h).toFixed(2), w.toFixed(2), h.toFixed(2)]]));
const flips = (list) => list.filter((q, i) => i && q.tier !== list[i - 1].tier).map((q) => `${q.W}x${q.H}->${q.tier}`);

// ---- 1 and 2: a window with a mouse
{
  const C = new Checks(`mouse window @${DPR}`);
  const ctx = await newCtx(b, { w: 700, h: 768, dpr: DPR, touch: false, screen: { width: 1920, height: 1080 }, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const cdp = await ctx.newCDPSession(p);
  // arm Fight with a click on COMBAT
  const cb = await p.evaluate(() => { const r = globalThis.__bt.overlay.twinCapRect('combat'); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.click(cb.x, cb.y); await sleep(250);
  const n0 = await now(p);
  C.ok('the tablet tier at 700x768, Fight armed', n0.tier === 'tablet' && n0.armed === 'F', { tier: n0.tier, armed: n0.armed });
  await watchBuilds(p);
  const widths = [];
  for (let w = 700; w >= 556; w -= 4) widths.push([w, 768]);
  for (let w = 560; w <= 660; w += 4) widths.push([w, 768]);
  const seen = [];
  let lost = [];
  for (const [w, h] of widths) {
    await size(cdp, w, h, false);
    const n = await now(p);
    seen.push(n);
    if (n.armed !== 'F') lost.push(`${w}x${h}: Fight ${n.armed}`);
  }
  let bl = await builds(p);
  const fw = flips(bl);
  C.ok('narrower and back: the tier changes twice, at 575 and 624', JSON.stringify(fw) === JSON.stringify(['572x768->phone', '624x768->tablet']), { flips: fw, builds: bl.length });
  C.ok('every re-layout was twin banks', bl.every((q) => q.ui === 'twin'), bl.filter((q) => q.ui !== 'twin').slice(0, 3));
  // the device cell is decided on the landscape geometry, 768 x the width:
  // a tablet's all along
  const cw = flips(bl.map((q) => ({ ...q, tier: q.cellTier })));
  C.ok('the device cell (768 x the width, turned) stays a tablet\'s', !cw.length && bl.every((q) => q.cellTier === 'tablet'), cw);
  C.ok('Fight stays armed through every re-layout', !lost.length, lost.slice(0, 3));
  // a tier moves no key: the same window as phone (going down) and as tablet (coming up)
  const asPhone = seen.find((n) => n.W === 600 && n.tier === 'phone'), asTablet = seen.find((n) => n.W === 600 && n.tier === 'tablet');
  C.ok('600x768 as phone and as tablet: every key at the same place', asPhone && asTablet && JSON.stringify(offsets(asPhone)) === JSON.stringify(offsets(asTablet)), { phone: !!asPhone, tablet: !!asTablet });
  // (at 660 the tray between the banks is under 240 dp: no panel; at 700 the
  // log alone)  The window grown to 1024 wide has both again, filled.
  const n700 = seen.find((n) => n.W === 700);
  C.ok('700x768: the log in the tray, no room for the inventory', n700.log && !n700.inv, { log: !!n700.log, inv: !!n700.inv });
  await size(cdp, 1024, 768, false, 300);
  const back = await now(p);
  C.ok('back to a 1024 dp tablet: the log and the inventory, with what they held', back.tier === 'tablet' && back.log && /welcome back/.test(back.log) && back.inv && /spear/.test(back.inv), { log: back.log && back.log.slice(-60), inv: back.inv && back.inv.slice(0, 60) });
  C.ok('the message band kept its text', back.band === n0.band, { before: n0.band, after: back.band });
  // jitter about 600: no change
  await size(cdp, 610, 768, false, 200); await builds(p);
  for (let i = 0; i < 20; i++) await size(cdp, i % 2 ? 607 : 593, 768, false, 50);
  await sleep(150);
  bl = await builds(p);
  C.ok('jittered 593 <-> 607 wide: no tier change', !flips(bl).length && bl.every((q) => q.tier === 'tablet'), { flips: flips(bl), builds: bl.length });
  // the height, 1024 wide
  await size(cdp, 1024, 600, false, 250); await builds(p);
  for (let h = 600; h >= 436; h -= 4) await size(cdp, 1024, h, false);
  for (let h = 440; h <= 540; h += 4) await size(cdp, 1024, h, false);
  bl = await builds(p);
  const fh = flips(bl);
  C.ok('shorter and back: the tier changes twice, at 455 and 504', JSON.stringify(fh) === JSON.stringify(['1024x452->phone', '1024x504->tablet']), { flips: fh, builds: bl.length, ui: [...new Set(bl.map((q) => q.ui))] });
  const ch = flips(bl.map((q) => ({ ...q, tier: q.cellTier })));
  C.ok('and the device cell\'s tier with it, at the same windows', JSON.stringify(ch) === JSON.stringify(fh), ch);
  await size(cdp, 1024, 470, false, 200); await builds(p);
  for (let i = 0; i < 20; i++) await size(cdp, 1024, i % 2 ? 487 : 473, false, 50);
  await sleep(150);
  bl = await builds(p);
  C.ok('jittered 473 <-> 487 tall: no tier change', !flips(bl).length, { flips: flips(bl), tiers: [...new Set(bl.map((q) => q.tier))] });
  // the game still answers: Esc disarms (the overlay), then a search is a turn
  await size(cdp, 1024, 768, false, 300);
  const t0 = (await now(p)).status.match(/T:(\d+)/);
  await p.keyboard.press('Escape'); await sleep(200);
  await p.keyboard.press('s'); await sleep(600);
  const n1 = await now(p);
  const t1 = n1.status.match(/T:(\d+)/);
  C.ok('the game goes on: a search takes a turn', t0 && t1 && +t1[1] > +t0[1], { before: t0 && t0[1], after: t1 && t1[1], armed: n1.armed });
  await p.screenshot({ path: `${SHOTS}/resize-${DPR}-end.png` });
  C.ok('no console errors', !p.errors.length, p.errors);
  failed += C.failed; results[C.tag] = C.list;
  await ctx.close();
}

// ---- 2b: a monitor's window grown and shrunk through the sizes where the
// level's cell grows past a tablet's 24 dp and the panels move (the tray, the
// glass under the map, beside the level): at each, the keys and the panels at
// layout()'s rects, Fight still armed, the log and the inventory still full
{
  const C = new Checks(`monitor window @${DPR}`);
  const ctx = await newCtx(b, { w: 1920, h: 1080, dpr: DPR, touch: false, screen: { width: 5120, height: 1440 }, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const cdp = await ctx.newCDPSession(p);
  const cb = await p.evaluate(() => { const r = globalThis.__bt.overlay.twinCapRect('combat'); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.click(cb.x, cb.y); await sleep(250);
  const seen = [];
  for (const [w, h] of [[2300, 1300], [2400, 1300], [2408, 1300], [2416, 1300], [2424, 1300], [2600, 1300], [2560, 1440], [3440, 1440], [5120, 1440], [3440, 1080], [1920, 1080], [1024, 768]]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: DPR, mobile: false, screenWidth: 5120, screenHeight: 1440 });
    await sleep(350);
    const n = await p.evaluate(async () => {
      const o = globalThis.__bt.overlay, T = o.twin, S = T.spec, L = await import('./layout.js');
      const again = L.layout(T.W, T.H, 'touch', { ...T.settings, prevTier: T.info.tier, prevCellTier: T.info.DC.tier });
      let capErr = 0;
      for (const c of again.spec.controls.filter((q) => !q.behind)) { const k = o.twinCapRect(c.id); capErr = Math.max(capErr, Math.abs(k.x - c.x), Math.abs(k.y - c.y), Math.abs(k.width - c.w), Math.abs(k.height - c.h)); }
      const dpr = window.devicePixelRatio;
      let panelErr = 0;
      for (const c of S.chrome) {
        const e = document.querySelector(`.rhpanel[data-kind="${c.name.startsWith('panel: inventory') ? 'inventory' : 'log'}"]`), q = e.getBoundingClientRect();
        panelErr = Math.max(panelErr, Math.abs(q.x - c.x), Math.abs(q.y - c.y), Math.abs(q.right - c.x - c.w), Math.abs(q.bottom - c.y - c.h));
      }
      const pan = (k) => { const e = document.querySelector(`.rhpanel[data-kind="${k}"]`); return e && e.style.display !== 'none' ? e.querySelector('.pbody').innerText.replace(/\s+/g, ' ').trim() : null; };
      return { W: S.W, H: S.H, tier: T.info.tier, T: T.info.T, glass: T.info.G.kind, capErr, panelErr: panelErr - 1 / dpr, panels: S.chrome.length,
        armed: o.armed ? o.armed.key : null, log: pan('log'), inv: pan('inventory'), drawn: globalThis.__bt.view.T };
    });
    seen.push(n);
  }
  const bad = seen.filter((n) => n.capErr > 0.05 || n.panelErr > 0.01 || n.armed !== 'F' || n.panels !== 2 || !/welcome back/.test(n.log || '') || !/spear/.test(n.inv || ''));
  C.ok(`through ${seen.map((n) => `${n.W}x${n.H} ${n.T} dp ${n.glass}`).join(', ')}: keys and panels at layout()'s rects, Fight armed, both panels full`, !bad.length, bad.map((n) => ({ ...n, log: n.log && n.log.slice(-40), inv: n.inv && n.inv.slice(0, 30) })));
  // the cap rises with the width once the strips at 24 dp would be a panel wide, not at once
  // (the reviews, 2026-10-03: 2406 -> 2408 dp wide went from 24 to 30 dp)
  const ramp = seen.slice(0, 6).map((n) => n.T);
  C.ok('the cell is 24 dp until the strips at 24 would be a panel wide, then grows half a dp at a time per 8 px, to fill the width by 2600', ramp[0] === 24 && ramp[1] === 24
    && ramp.slice(1, 5).every((t, i) => i === 0 || (t >= ramp[i] && t - ramp[i] <= 0.5)) && ramp[5] >= 31.5, ramp);
  C.ok('no console errors', !p.errors.length, p.errors);
  failed += C.failed; results[C.tag] = C.list;
  await ctx.close();
}

// ---- 3: never under a finger
{
  const C = new Checks(`touch window @${DPR}`);
  const ctx = await newCtx(b, { w: 700, h: 768, dpr: DPR, touch: true, screen: { width: 1920, height: 1080 }, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const cdp = await ctx.newCDPSession(p);
  const t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const n0 = await now(p);
  const sb = await p.evaluate(() => { const r = document.getElementById('statband').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await t('touchStart', [{ x: sb.x, y: sb.y }]);
  await sleep(100);
  await size(cdp, 560, 768, true, 900);
  const held = await now(p);
  C.ok('a finger down: the tier and the keys stay while the window crosses 576', held.tier === 'tablet' && JSON.stringify(held.caps) === JSON.stringify(n0.caps), { tier: held.tier, W: held.W });
  await t('touchEnd', []);
  await sleep(500);
  const lifted = await now(p);
  C.ok('lifted: the phone tier, laid out for the new window', lifted.tier === 'phone' && lifted.W === 560, { tier: lifted.tier, W: lifted.W });
  // and back, with a finger down across 624
  await t('touchStart', [{ x: 280, y: 60 }]);
  await sleep(100);
  await size(cdp, 680, 768, true, 900);
  const held2 = await now(p);
  C.ok('a finger down: still the phone while the window crosses 624', held2.tier === 'phone' && held2.W === 560, { tier: held2.tier, W: held2.W });
  await t('touchEnd', []);
  await sleep(500);
  const lifted2 = await now(p);
  C.ok('lifted: the tablet tier again', lifted2.tier === 'tablet' && lifted2.W === 680, { tier: lifted2.tier, W: lifted2.W });
  C.ok('no console errors', !p.errors.length, p.errors);
  failed += C.failed; results[C.tag] = C.list;
  await ctx.close();
}
writeJson(`resize-${DPR}.json`, results);
console.log(failed ? `FAILURES: ${failed}` : 'ALL PASS');
await b.close();
