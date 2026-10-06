// MENU (a real touch) then DONE (a real touch): no setting may change, in
// either orientation and layout, on the page (8766) and the no-guard control (8768).
import fs from 'node:fs';
import { launch, newCtx, openPage, resume, touch, sleep, ctlRect } from '../banks/common.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/recheck';
const b = await launch();
const res = [];
const prefs = (p) => p.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('rh.') && !/budgets|ghostDeck|save|game/i.test(k)).map((k) => [k, localStorage.getItem(k)])));
for (const origin of ['http://localhost:8766', 'http://localhost:8768']) {
  for (const [w, h, scr, layout, cased] of [[896, 443, [939, 443], 'twin', false], [896, 443, [939, 443], 'twin', true], [443, 939, [443, 939], 'twin', false], [443, 939, [443, 939], 'twin', true],
    [360, 640, [360, 640], 'twin', true], [640, 360, [640, 360], 'twin', true], [896, 443, [939, 443], 'classic', false], [443, 939, [443, 939], 'classic', true]]) {
    const ctx = await newCtx(b, { w, h, screen: { width: scr[0], height: scr[1] }, origin, prefs: { layout, case: cased } });
    const p = await openPage(ctx); await resume(p);
    const k = await touch(ctx, p);
    let menu;
    if (layout === 'twin') menu = await ctlRect(p, 'menu');
    else menu = await p.evaluate(() => { const e = [...document.querySelectorAll('#keys button.k')].find((x) => x.offsetParent && /^MENU/.test(x.innerText.trim())); const r = e.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; });
    const before = await prefs(p);
    await k.tap(menu.cx, menu.cy, 80); await sleep(600);
    const open = await p.evaluate(() => !document.getElementById('formwrap').hidden);
    const under = await p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}.${e.className} ${(e.innerText || '').trim().slice(0, 30)}` : null; }, { x: menu.cx, y: menu.cy });
    const done = await p.evaluate(() => { const x = [...document.querySelectorAll('#formwrap button')].find((e) => /DONE/i.test(e.innerText)); if (!x) return null; const r = x.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; });
    if (done) await k.tap(done.cx, done.cy, 60);
    await sleep(600);
    const after = await prefs(p);
    const changed = Object.keys({ ...before, ...after }).filter((x) => before[x] !== after[x]).map((x) => `${x}: ${before[x]} -> ${after[x]}`);
    const ok = open && !changed.length;
    res.push({ origin, w, h, layout, cased, open, under, changed, errors: p.errors });
    console.log(ok ? 'PASS' : 'FAIL', origin.slice(-4), `${w}x${h}`, layout, cased ? 'cased' : 'caseless', 'form', open, 'under finger:', under, 'changed:', JSON.stringify(changed), p.errors.length ? p.errors : '');
    await ctx.close();
  }
}
fs.writeFileSync(`${OUT}/menudone.json`, JSON.stringify(res, null, 1));
await b.close();
