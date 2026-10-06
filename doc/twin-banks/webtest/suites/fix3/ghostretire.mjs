// The ghost deck retires only from sessions in which it could act (rev major
// 2).  Real turns, a counted search 120s four times a session (~480 turns),
// then a reload starts the next session.  Classic and twin portrait must keep
// the deck on after four sessions; twin landscape (the control) must retire it.
import fs from 'node:fs';
import { launch, ctxOptions, openPage, resumeGame, STATE, sleep } from '../rev/common.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/fix3';
const b = await launch();
const res = [];
for (const [label, W, H, layout, wantOn] of [['classic landscape', 896, 443, 'classic', true], ['twin portrait', 443, 939, 'twin', true], ['twin landscape', 896, 443, 'twin', false]]) {
  const ctx = await b.newContext({ ...ctxOptions(W, H, 'touch'), storageState: STATE });
  const p = await openPage(ctx, { layout });
  await resumeGame(p);
  // a fresh deck, then a reload: the first counted session starts with it
  await p.evaluate(() => localStorage.setItem('rh.ghostDeck', JSON.stringify({ on: true, clean: 0, session: null })));
  await p.reload();
  await p.waitForFunction(() => globalThis.__rh && !document.getElementById('boot'), null, { timeout: 60000 });
  await resumeGame(p);
  const log = [];
  let expect = 0, bad = 0;
  for (let s = 0; s < 4; s++) {
    const t0 = await p.evaluate(() => globalThis.__rh.status.BL_TIME && globalThis.__rh.status.BL_TIME.text);
    for (let rep = 0; rep < 10; rep++) {
      const now = await p.evaluate(() => globalThis.__rh.status.BL_TIME && globalThis.__rh.status.BL_TIME.text);
      if (Number(now) - Number(t0) >= 140) break;
      for (const k of ['1', '2', '0', 's']) { await p.keyboard.press(k); await sleep(60); }
      for (let i = 0; i < 14; i++) {
        await sleep(300);
        const st = await p.evaluate(() => ({ more: globalThis.__rh.moreShown, modal: globalThis.__rh.modalOpen }));
        if (st.more) await p.keyboard.press('Space');
        if (st.modal) await p.keyboard.press('Escape');
      }
    }
    const g = await p.evaluate(() => ({ t: globalThis.__rh.status.BL_TIME && globalThis.__rh.status.BL_TIME.text, gd: JSON.parse(localStorage.getItem('rh.ghostDeck')), live: globalThis.__rh.overlay.ghostLive() }));
    // the in-memory count is stored every ten turns: what counts at the reload
    const counted = (g.gd.session && g.gd.session.turns) || 0;
    if (layout === 'twin' && W > H && counted >= 100) expect++;
    if (!(layout === 'twin' && W > H) && counted) bad++;
    log.push(`session ${s}: T ${t0} -> ${g.t}; live ${g.live}; stored ${JSON.stringify(g.gd)}`);
    await sleep(2500);   // checkpoint
    await p.reload();
    await p.waitForFunction(() => globalThis.__rh && !document.getElementById('boot'), null, { timeout: 60000 });
    await resumeGame(p);
    const after = await p.evaluate(() => JSON.parse(localStorage.getItem('rh.ghostDeck')));
    log.push(`  reloaded: clean ${after.clean} (expected ${Math.min(expect, 3)}), on ${after.on}`);
    if (after.clean !== (expect >= 3 ? 3 : expect) && !(expect >= 3 && after.on === false)) bad++;
  }
  const g = await p.evaluate(() => ({ ui: document.documentElement.dataset.ui, gd: JSON.parse(localStorage.getItem('rh.ghostDeck')), on: globalThis.__rh.overlay.ghostOn() }));
  const pass = !bad && (wantOn ? g.on === true : (expect < 3 || g.on === false)) && !p.errors.length;
  res.push({ label, pass, log, after: g, errors: p.errors });
  console.log(pass ? 'PASS' : 'FAIL', label, '\n ', log.join('\n  '), '\n  after:', JSON.stringify(g), 'errors', p.errors);
  await ctx.close();
}
fs.writeFileSync(`${OUT}/ghostretire.json`, JSON.stringify(res, null, 1));
await b.close();
