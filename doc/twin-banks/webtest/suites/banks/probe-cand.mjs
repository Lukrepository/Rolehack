import { launch, newCtx, openPage, resume, touch, sleep, evs, clearEvs, ctlRect, SHOTS } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, screen: { width: 443, height: 896 }, prefs: { budgets: {} } });
const p = await openPage(ctx); await resume(p);
const k = await touch(ctx, p);
const st = () => p.evaluate(() => ({ msg: document.getElementById('msgband').innerText.replace(/\s+/g, ' '), modal: globalThis.__bt.modalOpen, title: document.getElementById('modal-title').textContent,
  cands: globalThis.__bt.overlay.candidates.map((a) => a.word), here: globalThis.__bt.overlay.here, ctx: document.querySelector('[data-tw="context"]').innerText.replace(/\s+/g, ' ') }));
console.log(0, JSON.stringify(await st()));
await p.keyboard.press('d'); await sleep(800);
console.log(1, JSON.stringify(await st()));
await p.keyboard.press('b'); await sleep(1200);
console.log(2, JSON.stringify(await st()));
await p.keyboard.press('s'); await sleep(1200);
console.log(3, JSON.stringify(await st()));
await ctx.close(); await b.close();
