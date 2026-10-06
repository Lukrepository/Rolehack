// Start one new game on the working tree (8766, twin banks by default) and
// save the browser state, so every check restores the same game in progress.
//   node setup.mjs  -> _state.json, shots/setup-final.png, setup.json (the rc the game read)
import fs from 'node:fs';
import { launch, newCtx, openPage, sleep, STATE, SHOTS, NAME, writeJson } from './common.mjs';

const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, state: false });
const p = await openPage(ctx);
for (let step = 0; step < 80; step++) {
  await sleep(600);
  const s = await p.evaluate(() => {
    const R = globalThis.__bt, $ = (id) => document.getElementById(id), line = $('line');
    return { modal: R.modalOpen, title: $('modal-title').textContent, line: !!(line && line.offsetParent), ckeys: !!$('ckeys'),
      msg: $('msgband').innerText, more: R.moreShown, status: $('statband').innerText,
      answering: !!(R.overlay && R.overlay.answering), form: !$('formwrap').hidden, waiting: R.waiting };
  });
  if (s.form) { await p.keyboard.press('Escape'); continue; }
  if (s.line) { await p.fill('#line', NAME); await p.press('#line', 'Enter'); continue; }
  if (s.ckeys) {
    // a Valkyrie: a food ration, armour worn, a weapon -- every check has something to act on
    if (/Is this ok/i.test(s.title)) await p.keyboard.press('y');
    else if (/role|profession/i.test(s.title)) await p.keyboard.press('v');
    else await p.keyboard.press('*');
    continue;
  }
  if (s.modal && /tutorial/i.test(s.title)) { await p.keyboard.press('n'); continue; }
  if (s.modal) { await p.keyboard.press('Enter'); continue; }
  if (s.more) { await p.keyboard.press('Space'); continue; }
  if (/Shall I pick/i.test(s.msg) || s.answering) { await p.keyboard.press('n'); await sleep(400); continue; }
  if (s.status.trim() && s.waiting && !s.more && !s.modal) break;
}
await sleep(2500);
const rc = await p.evaluate(() => { try { return globalThis.__bt.M.FS.readFile('/home/web_user/.nethackrc', { encoding: 'utf8' }); } catch (e) { return `ERR ${e.message}`; } });
const status = await p.evaluate(() => document.getElementById('statband').innerText);
await p.screenshot({ path: `${SHOTS}/setup-final.png` });
await ctx.storageState({ path: STATE, indexedDB: true });
writeJson('setup.json', { status, rcTail: rc.slice(-600), errors: p.errors });
console.log(status, '\nerrors:', p.errors, '\nrc tail:', rc.slice(-300));
await b.close();
