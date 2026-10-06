// debug: WORLD drawer, hold an item, FLICK with a command in hand
import { launch, newCtx, openPage, resume, touch, sleep } from './common.mjs';
import { capOf, state, mark, pushed } from './kit.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, dpr: 1, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p); await sleep(300);
const t = await touch(ctx, p);
const w = await capOf(p, 'world');
await t.tap(w.cx, w.cy); await sleep(400);
console.log('drawer', (await state(p)).drawer);
const item = await p.evaluate(() => { const k = document.querySelector('#drawer .grid .k'); const r = k.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: k.textContent, top: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.className }; });
console.log('item', item);
await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: item.x, y: item.y }] });
for (let i = 0; i < 8; i++) { await sleep(100); console.log(i, await p.evaluate(() => { const o = globalThis.__bt.overlay; return { assign: o.assign && o.assign.word, drawer: o.drawerOpen }; })); }
await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await sleep(200);
console.log('after', await p.evaluate(() => { const o = globalThis.__bt.overlay; return { assign: o.assign && o.assign.word, drawer: o.drawerOpen, macros: globalThis.__bt.P.macros() }; }));
await b.close();
