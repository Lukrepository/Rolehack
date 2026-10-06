// The follow-up click of a key's touch must not press what the key opened
// under the finger (review3 blocker).  Real CDP touches.
//  1. a trap: INVENTORY's pointerup puts a button over the whole screen,
//     outside #keys; the touch's click must not reach it, while a touch begun
//     on the trap itself still clicks it;
//  2. MENU -> Settings with the case off: the Case row under MENU must stay
//     'Caseless', and DONE must keep rh.case false;
//  3. the same at 443x939, and in classic (both layouts get the guard).
import fs from 'node:fs';
import { launch, newCtx, openPage, resume, touch, sleep, ctlRect, evs, clearEvs } from '../banks/common.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/fix3';
const b = await launch();
const res = [];
const ok = (name, pass, detail) => { res.push({ name, pass, detail }); console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(detail)); };
for (const [w, h, layout] of [[896, 443, 'twin'], [443, 939, 'twin'], [896, 443, 'classic']]) {
  const ctx = await newCtx(b, { w, h, prefs: { layout, case: false } });
  const p = await openPage(ctx); await resume(p);
  const k = await touch(ctx, p);
  const tag = `${w}x${h} ${layout}`;
  // where INVENTORY and MENU are, in either layout
  const at = async (id, label) => {
    if (layout === 'twin') return ctlRect(p, id);
    // classic: INVENTORY is the equipment hub's face, MENU the hood's first key
    return p.evaluate((lb) => {
      const o = globalThis.__bt.overlay;
      const e = lb === 'INVENTORY' ? o.hubs.find((hv) => hv.hub.id === 'equip').face.el
        : [...document.querySelectorAll('#keys button.k')].find((x) => x.offsetParent && /^MENU/.test(x.innerText.trim()));
      if (!e) return null; const r = e.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; }, label);
  };
  const inv = await at('inventory', 'INVENTORY');
  await p.evaluate(({ x, y }) => {
    window.__trap = 0;
    const key = document.elementFromPoint(x, y).closest('button');
    key.addEventListener('pointerup', () => {
      if (document.getElementById('trap')) return;
      const t = document.createElement('button');
      t.id = 'trap';
      Object.assign(t.style, { position: 'fixed', inset: '0', zIndex: 99, opacity: 0.3 });
      t.addEventListener('click', () => { window.__trap++; });
      document.body.appendChild(t);
    }, { capture: true, once: true });
  }, { x: inv.cx, y: inv.cy });
  await clearEvs(p);
  await k.tap(inv.cx, inv.cy, 80);
  await sleep(300);
  const trapped = await p.evaluate(() => window.__trap);
  const pushed = (await evs(p)).map((e) => e.key);
  ok(`${tag}: INVENTORY's touch does not click what opened under it`, trapped === 0, { trapped, pushed });
  // a touch begun on the trap itself clicks it
  await k.tap(inv.cx, inv.cy, 60);
  await sleep(200);
  const trapped2 = await p.evaluate(() => window.__trap);
  ok(`${tag}: a touch begun on the window still clicks it`, trapped2 === 1, { trapped2 });
  await p.evaluate(() => document.getElementById('trap').remove());
  // close whatever INVENTORY opened
  for (let i = 0; i < 4; i++) { if (await p.evaluate(() => !document.getElementById('modal').hidden)) { await p.keyboard.press('Escape'); await sleep(300); } }
  // MENU -> Settings: the Case row stays 'Caseless'
  const menu = await at('menu', 'MENU');
  await k.tap(menu.cx, menu.cy, 80);
  await sleep(500);
  const form = await p.evaluate(() => {
    const f = document.getElementById('formwrap');
    const sel = [...f.querySelectorAll('[aria-pressed="true"], .on, .sel, input:checked')].map((e) => (e.value || e.innerText || '').trim()).filter(Boolean);
    return { open: !f.hidden, sel: sel.slice(0, 40) };
  });
  await k.shot(`${OUT}/shots/ghostclick-${w}x${h}-${layout}-settings.png`);
  // DONE by the keyboard (Enter), as the reviewer's DONE did
  const done = await p.evaluate(() => { const b = [...document.querySelectorAll('#formwrap button')].find((x) => /DONE/i.test(x.innerText)); if (!b) return null; const r = b.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; });
  if (done) await k.tap(done.cx, done.cy, 60);
  await sleep(400);
  const caseNow = await p.evaluate(() => [localStorage.getItem('rh.case'), document.documentElement.dataset.case]);
  ok(`${tag}: MENU then DONE leaves the case off`, form.open && caseNow[0] === 'false' && caseNow[1] === 'off', { form, caseNow });
  if (p.errors.length) ok(`${tag}: console`, false, p.errors);
  await ctx.close();
}
fs.writeFileSync(`${OUT}/ghostclick.json`, JSON.stringify(res, null, 1));
console.log(res.filter((r) => r.pass).length, 'of', res.length);
await b.close();
