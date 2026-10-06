// Start one game in the deployed web build and save the browser state
// (localStorage + IndexedDB, where the game checkpoints) to _state.json, so
// every viewport in capture.mjs resumes the same game in progress.
//   node setup.mjs
import { launch, ctxOptions, hookRoutes, URL, OUT, STATE, NAME, sleep } from './common.mjs';

const b = await launch();
const ctx = await b.newContext(ctxOptions(896, 443, 'touch'));
await hookRoutes(ctx);
const p = await ctx.newPage();
p.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
p.on('pageerror', (e) => console.log('pageerror:', e.message));
await p.goto(URL);
await p.waitForFunction(() => globalThis.__rh && !document.getElementById('boot'), null, { timeout: 60000 });

const probe = () => p.evaluate(() => {
  const R = globalThis.__rh, $ = (id) => document.getElementById(id);
  const line = $('line');
  return {
    modal: R.modalOpen,
    title: $('modal-title').textContent,
    line: !!(line && line.offsetParent),
    ckeys: !!$('ckeys'),
    ckeyText: $('ckeys') ? $('ckeys').innerText.replace(/\s+/g, ' ').slice(0, 200) : '',
    body: $('modal-body').innerText.slice(0, 200),
    msg: $('msgband').innerText,
    more: R.moreShown,
    status: $('statband').innerText,
    answering: !!(R.overlay && R.overlay.answering),
    form: !$('formwrap').hidden,
  };
});

let n = 0, settled = 0;
for (let step = 0; step < 60; step++) {
  await sleep(700);
  const s = await probe();
  console.log(step, JSON.stringify({ ...s, status: s.status.slice(0, 40), body: s.body.slice(0, 60) }));
  await p.screenshot({ path: `${OUT}/_steps/setup-${String(n++).padStart(2, '0')}.png` });
  if (s.form) { await p.keyboard.press('Escape'); continue; }
  if (s.line) {
    await p.fill('#line', NAME);
    await p.press('#line', 'Enter');
    continue;
  }
  if (s.ckeys) {
    // creation drawn as keys: at "Is this ok?" say yes, else pick at random
    if (/Is this ok/i.test(s.title)) await p.keyboard.press('y');
    else await p.keyboard.press('*');
    continue;
  }
  if (s.modal && /tutorial/i.test(s.title)) { await p.keyboard.press('n'); continue; }
  if (s.modal) { await p.keyboard.press('Enter'); continue; }
  if (s.more) { await p.keyboard.press('Space'); continue; }
  if (/Shall I pick/i.test(s.msg) || s.answering) { await p.keyboard.press('y'); continue; }
  if (s.status.trim() && !s.more && !s.modal) {
    if (++settled >= 3) break;
  }
}
// let the checkpoint's copy to IndexedDB finish
await sleep(2500);
await p.screenshot({ path: `${OUT}/_steps/setup-final.png` });
await ctx.storageState({ path: STATE, indexedDB: true });
console.log('saved', STATE);
await b.close();
