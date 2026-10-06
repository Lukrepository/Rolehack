import { launch, newCtx, openPage, resume, touch, sleep, evs, clearEvs, ctlRect, SHOTS } from './common.mjs';
const b = await launch();
for (const site of ['twin', 'classic-newgame-flags']) {
  if (site !== 'twin') break;
  const ctx = await newCtx(b, { w: 896, h: 443, screen: { width: 443, height: 896 }, prefs: { budgets: {} } });
  const p = await openPage(ctx); await resume(p);
  const k = await touch(ctx, p);
  await clearEvs(p);
  const r = await ctlRect(p, 'eq_takeoff');
  console.log('eq_takeoff', r);
  await k.tap(r.cx, r.cy);
  await sleep(1500);
  const s = await p.evaluate(() => ({ ev: globalThis.__ev, msg: document.getElementById('msgband').innerText, modal: globalThis.__bt.modalOpen, title: document.getElementById('modal-title').textContent,
    body: document.getElementById('modal-body').innerText.slice(0, 200), more: globalThis.__bt.moreShown, ans: !!globalThis.__bt.overlay.answering, status: document.getElementById('statband').innerText.slice(0, 80) }));
  console.log(JSON.stringify(s, null, 1));
  await k.shot(`${SHOTS}/probe-takeoff.png`);
  // keyboard T for comparison
  await p.keyboard.press('Escape'); await sleep(500);
  await clearEvs(p);
  await p.keyboard.press('Shift+T'); await sleep(1500);
  console.log('keyboard T:', JSON.stringify(await p.evaluate(() => ({ ev: globalThis.__ev, msg: document.getElementById('msgband').innerText, modal: globalThis.__bt.modalOpen, body: document.getElementById('modal-body').innerText.slice(0, 120) }))));
  await ctx.close();
}
await b.close();
