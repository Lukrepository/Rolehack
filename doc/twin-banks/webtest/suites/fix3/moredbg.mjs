import { launch, newCtx, openPage, resume, touch, sleep, ctlRect } from '../banks/common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443 });
const p = await openPage(ctx); await resume(p);
const k = await touch(ctx, p);
const sac = await ctlRect(p, 'sacrifice');
await k.tap(sac.cx, sac.cy, 420);
for (let i = 0; i < 20; i++) {
  await sleep(300);
  const st = await p.evaluate(() => ({ more: globalThis.__bt.moreShown, answering: !!globalThis.__bt.overlay.answering, msg: document.getElementById('msgband').innerText, modal: globalThis.__bt.modalOpen, ev: (globalThis.__ev || []).slice(-3) }));
  console.log(i, JSON.stringify(st));
  if (st.answering || /\[yn/.test(st.msg)) { await p.keyboard.press('y'); }
  if (st.more) break;
}
await b.close();
