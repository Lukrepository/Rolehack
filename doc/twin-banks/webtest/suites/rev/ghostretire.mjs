// Does the ghost deck retire from sessions in which it could never preview
// (classic layout; twin in portrait)?  Real turns: a counted search, then a
// reload starts the next session.
import { launch, ctxOptions, openPage, resumeGame, OUT, STATE, sleep } from './common.mjs';
const b = await launch();
for (const [label, W, H, layout] of [['classic landscape', 896, 443, 'classic'], ['twin portrait', 443, 939, 'twin']]) {
  const ctx = await b.newContext({ ...ctxOptions(W, H, 'touch'), storageState: STATE });
  const p = await openPage(ctx, { layout });
  await resumeGame(p);
  const log = [];
  for (let s = 0; s < 4; s++) {
    const t0 = await p.evaluate(() => globalThis.__rh.status.BL_TIME && globalThis.__rh.status.BL_TIME.text);
    for (let rep = 0; rep < 4; rep++) {
    for (const k of ['1', '2', '0', 's']) { await p.keyboard.press(k); await sleep(60); }
    for (let i = 0; i < 14; i++) {
      await sleep(300);
      const st = await p.evaluate(() => ({ more: globalThis.__rh.moreShown, modal: globalThis.__rh.modalOpen }));
      if (st.more) await p.keyboard.press('Space');
      if (st.modal) await p.keyboard.press('Escape');
    }
    }
    const g = await p.evaluate(() => ({ t: globalThis.__rh.status.BL_TIME && globalThis.__rh.status.BL_TIME.text, gd: JSON.parse(localStorage.getItem('rh.ghostDeck')) }));
    log.push(`session ${s}: T ${t0} -> ${g.t}; stored ${JSON.stringify(g.gd)}`);
    await sleep(2500);   // checkpoint
    await p.reload();
    await p.waitForFunction(() => globalThis.__rh && !document.getElementById('boot'), null, { timeout: 60000 });
    await resumeGame(p);
  }
  const g = await p.evaluate(() => ({ ui: document.documentElement.dataset.ui, portrait: globalThis.__rh.overlay.portrait, gd: JSON.parse(localStorage.getItem('rh.ghostDeck')), on: globalThis.__rh.overlay.ghostOn() }));
  console.log(label, '\n ', log.join('\n  '), '\n  after:', JSON.stringify(g), 'errors', p.errors);
  await ctx.close();
}
await b.close();
