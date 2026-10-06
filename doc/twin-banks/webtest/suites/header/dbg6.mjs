import { launch, newCtx, openPage, resume, touch, sleep } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx); await resume(p);
const k = await touch(ctx, p);
const st = () => p.evaluate(() => { const R = globalThis.__bt; return JSON.stringify({ c: R.cursor, f: R.focus, pan: [R.view.panX, R.view.panY], top: R.view.top, msg: document.getElementById('msgband').innerText.slice(0, 60), more: R.moreShown }); });
for (const key of ['Shift+KeyL']) { await p.keyboard.press(key); await sleep(900); console.log(key, await st()); }
const v = await p.evaluate(() => { const r = document.getElementById('map').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await k.drag(v.x, v.y, 30, 50, 10);
console.log('drag', await st());
for (const key of ['s', 'l', 'h', 'h']) { await p.keyboard.press(key); await sleep(700); console.log(key, await st()); }
await b.close();
