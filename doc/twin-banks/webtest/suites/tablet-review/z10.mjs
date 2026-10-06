// fresh game at 1024x768: name prompt, creation, tutorial; screenshots each
import { launch, newCtx, openPage, sleep } from '../tablet/common.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/tablet-review/shots';
const b = await launch();
const ctx = await newCtx(b, { w: 1024, h: 768, dpr: 1, touch: true, state: false, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
for (let step = 0; step < 14; step++) {
  await sleep(900);
  const s = await p.evaluate(() => { const $ = (id) => document.getElementById(id); const line = $('line');
    return { modal: !$('modal').hidden, title: $('modal-title').textContent, line: !!(line && line.offsetParent), form: !$('formwrap').hidden, ckeys: !!$('ckeys'),
      panels: [...document.querySelectorAll('.rhpanel')].filter(e => e.style.display !== 'none').map(e => e.dataset.kind + ':' + e.querySelector('.pbody').innerText.slice(0, 60).replace(/\n/g, ' / ')) }; });
  console.log(step, JSON.stringify(s));
  await p.screenshot({ path: `${OUT}/z10-${step}.png` });
  if (s.line) { await p.fill('#line', 'Revw'); await p.press('#line', 'Enter'); continue; }
  if (s.ckeys) { await p.keyboard.press(/Is this ok/i.test(s.title) ? 'y' : '*'); continue; }
  if (s.modal) { await p.keyboard.press(/tutorial/i.test(s.title) ? 'n' : 'Enter'); continue; }
  if (await p.evaluate(() => globalThis.__bt.moreShown)) { await p.keyboard.press('Space'); continue; }
}
console.log('errors', p.errors);
await b.close();
