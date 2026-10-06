import { launch, ctxOptions, openPage, OUT, sleep } from './common.mjs';
const b = await launch();
for (const [W, H] of [[443, 939], [896, 443]]) {
  const ctx = await b.newContext(ctxOptions(W, H, 'touch'));
  const p = await openPage(ctx, {});
  const shots = [];
  for (let step = 0; step < 12; step++) {
    await sleep(700);
    const s = await p.evaluate(() => ({ line: !!(document.getElementById('line') && document.getElementById('line').offsetParent), modal: globalThis.__rh.modalOpen,
      title: document.getElementById('modal-title').textContent, answering: !!globalThis.__rh.overlay.answering, msg: document.getElementById('msgband').innerText.slice(0, 80), ui: document.documentElement.dataset.ui }));
    await p.screenshot({ path: `${OUT}/shots/ng-${W}x${H}-${step}.png` });
    shots.push(`${step}: ${JSON.stringify(s)}`);
    if (s.line) { await p.fill('#line', 'Newbie'); await p.press('#line', 'Enter'); continue; }
    if (s.answering) { await p.keyboard.press('y'); continue; }
    if (s.modal) { await p.keyboard.press(/tutorial/i.test(s.title) ? 'n' : 'Enter'); continue; }
    if (/--More--/.test(s.msg)) { await p.keyboard.press('Space'); continue; }
  }
  console.log(W, H, shots.join('\n'), '\nerrors', p.errors);
  await ctx.close();
}
await b.close();
