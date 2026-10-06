// Start one game on the working tree's page (8766) at a phone window and save
// the browser state (localStorage + IndexedDB) to _state.json.
import { launch, newCtx, openPage, STATE, NAME, sleep, DIR } from './common.mjs';
import fs from 'node:fs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, state: false });
const p = await openPage(ctx);
const probe = () => p.evaluate(() => {
  const R = globalThis.__ts, $ = (id) => document.getElementById(id), line = $('line');
  return { modal: R.modalOpen, title: $('modal-title').textContent, line: !!(line && line.offsetParent), ckeys: !!$('ckeys'),
    msg: $('msgband').innerText, more: R.moreShown, status: $('statband').innerText,
    answering: !!(R.overlay && R.overlay.answering), form: !$('formwrap').hidden, cw: R.commandWait };
});
let settled = 0;
for (let step = 0; step < 80; step++) {
  await sleep(600);
  const s = await probe();
  console.log(step, JSON.stringify({ ...s, status: s.status.slice(0, 40), msg: s.msg.slice(0, 60) }));
  if (s.form) { await p.keyboard.press('Escape'); continue; }
  if (s.line) { await p.fill('#line', NAME); await p.press('#line', 'Enter'); continue; }
  if (s.ckeys) { await p.keyboard.press(/Is this ok/i.test(s.title) ? 'y' : '*'); continue; }
  if (s.modal && /tutorial/i.test(s.title)) { await p.keyboard.press('n'); continue; }
  if (s.modal) { await p.keyboard.press('Enter'); continue; }
  if (s.more) { await p.keyboard.press('Space'); continue; }
  if (/Shall I pick/i.test(s.msg) || s.answering) { await p.keyboard.press('y'); continue; }
  if (s.status.trim() && s.cw) { if (++settled >= 3) break; }
}
// save the game so a restore lands on the map (S, y), then reload? No: the page checkpoints; let IDB sync
await sleep(3000);
await p.screenshot({ path: `${DIR}/shots/setup-final.png` });
console.log('errors', p.errors);
await ctx.storageState({ path: STATE, indexedDB: true });
console.log('saved', STATE, fs.statSync(STATE).size);
await b.close();
