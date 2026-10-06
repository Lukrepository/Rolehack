// Recheck of the key-tap follow-up click blocker, with the game's own windows
// (no trap): INVENTORY's list and MENU's Settings form, at windows where the
// list's caps lie under the INVENTORY key, on the page (8766) and on the same
// page with guardClicks() removed (8768, the control).  Real CDP touches.
import fs from 'node:fs';
import { launch, newCtx, openPage, resume, touch, sleep, ctlRect, evs, clearEvs } from '../banks/common.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/recheck';
const b = await launch();
const res = [];
const SIZES = [[896, 443, [939, 443]], [896, 363, [939, 443]], [640, 360, [640, 360]], [844, 390, [844, 390]], [443, 939, [443, 939]], [360, 640, [360, 640]]];
const capsRects = (p) => p.evaluate(() => {
  const m = document.getElementById('modal');
  if (m.hidden) return null;
  const box = m.querySelector('.box').getBoundingClientRect();
  return { box: [box.x, box.y, box.width, box.height].map((v) => +v.toFixed(1)),
    caps: [...m.querySelectorAll('.cap, button')].filter((e) => e.offsetParent).map((e) => { const r = e.getBoundingClientRect(); return { t: e.innerText.trim().slice(0, 12), r: [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(1)) }; }) };
});
const inside = (x, y, r) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
for (const origin of ['http://localhost:8766', 'http://localhost:8768']) {
  for (const [w, h, scr] of SIZES) {
    const ctx = await newCtx(b, { w, h, screen: { width: scr[0], height: scr[1] }, origin, prefs: { layout: 'twin', case: false, ghostDeck: { on: false, clean: 3 } } });
    const p = await openPage(ctx); await resume(p);
    const k = await touch(ctx, p);
    const tag = `${origin.slice(-4)} ${w}x${h}`;
    const ui = await p.evaluate(() => document.documentElement.dataset.ui);
    const inv = await ctlRect(p, 'inventory');
    // open the list from the keyboard to see where its caps fall
    await p.keyboard.press('i'); await sleep(500);
    const cr = await capsRects(p);
    for (let i = 0; i < 3; i++) { if (await p.evaluate(() => !document.getElementById('modal').hidden)) { await p.keyboard.press('Escape'); await sleep(300); } }
    // points of the key that lie under a cap of the open list
    const pts = [[inv.cx, inv.cy]];
    if (cr) for (const c of cr.caps) {
      for (let fx = 0.15; fx <= 0.85; fx += 0.35) for (let fy = 0.15; fy <= 0.85; fy += 0.35) {
        const x = inv.x + fx * inv.w, y = inv.y + fy * inv.h;
        if (inside(x, y, c.r)) { pts.push([x, y]); }
      }
    }
    const under = cr ? cr.caps.filter((c) => inside(inv.cx, inv.cy, c.r) || pts.length > 1 && pts.slice(1).some(([x, y]) => inside(x, y, c.r))).map((c) => c.t) : [];
    const taps = [];
    for (const [x, y] of pts.slice(0, 3)) {
      await clearEvs(p);
      await k.tap(x, y, 80); await sleep(600);
      const open = await p.evaluate(() => !document.getElementById('modal').hidden);
      const pushed = (await evs(p)).map((e) => e.key);
      taps.push({ at: [+x.toFixed(1), +y.toFixed(1)], pushed, open });
      for (let i = 0; i < 3; i++) { if (await p.evaluate(() => !document.getElementById('modal').hidden)) { await p.keyboard.press('Escape'); await sleep(300); } }
    }
    const invOk = taps.every((t) => t.pushed.join() === '105' && t.open);
    // MENU -> Settings -> DONE (by a touch on DONE): the case stays off
    const menu = await ctlRect(p, 'menu');
    await k.tap(menu.cx, menu.cy, 80); await sleep(600);
    const formOpen = await p.evaluate(() => !document.getElementById('formwrap').hidden);
    const done = await p.evaluate(() => { const x = [...document.querySelectorAll('#formwrap button')].find((e) => /DONE/i.test(e.innerText)); if (!x) return null; const r = x.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; });
    if (done) await k.tap(done.cx, done.cy, 60);
    await sleep(500);
    const caseNow = await p.evaluate(() => [localStorage.getItem('rh.case'), document.documentElement.dataset.case]);
    const menuOk = formOpen && caseNow[0] === 'false';
    const row = { tag, ui, inv: [inv.x, inv.y, inv.w, inv.h], list: cr && cr.box, under, taps, invOk, formOpen, caseNow, menuOk, errors: p.errors };
    res.push(row);
    console.log(invOk && menuOk ? 'PASS' : 'FAIL', tag, ui, 'caps under INVENTORY:', JSON.stringify(under), JSON.stringify(taps), 'menu', formOpen, caseNow, p.errors.length ? p.errors : '');
    await ctx.close();
  }
}
fs.writeFileSync(`${OUT}/ghostclick.json`, JSON.stringify(res, null, 1));
await b.close();
