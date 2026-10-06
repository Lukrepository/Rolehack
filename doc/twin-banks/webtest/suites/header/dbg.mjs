import { launch, newCtx, openPage, resume, touch, sleep, evs, clearEvs } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, prefs: { budgets: {} } });
const p = await openPage(ctx); await resume(p);
const st = () => p.evaluate(() => { const R = globalThis.__bt; return { modal: R.modalOpen, title: document.getElementById('modal-title').textContent, body: document.getElementById('modal-body').innerText.slice(0,200), msg: document.getElementById('msgband').innerText, chips: document.getElementById('chips').innerText, ans: R.overlay.answering, form: !document.getElementById('formwrap').hidden }; });
for (const k of ['w', 'Escape', 'd', 'Escape', 'Shift+Digit3']) { await p.keyboard.press(k); await sleep(1000); console.log(k, JSON.stringify(await st())); }
await b.close();
