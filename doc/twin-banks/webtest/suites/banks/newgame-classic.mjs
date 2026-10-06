// A NEW game with the setting on classic: the options file has no paranoid
// line and T with one item worn takes it off at once, as before.
import { launch, newCtx, openPage, sleep, NAME, writeJson } from './common.mjs';
const b = await launch();
const out = {};
for (const layout of ['classic', 'twin']) {
  const ctx = await newCtx(b, { w: 896, h: 443, state: false, prefs: { layout } });
  const p = await openPage(ctx);
  for (let step = 0; step < 80; step++) {
    await sleep(500);
    const s = await p.evaluate(() => { const R = globalThis.__bt, $ = (id) => document.getElementById(id), line = $('line');
      return { modal: R.modalOpen, title: $('modal-title').textContent, line: !!(line && line.offsetParent), ckeys: !!$('ckeys'), msg: $('msgband').innerText, more: R.moreShown,
        status: $('statband').innerText, answering: !!(R.overlay && R.overlay.answering), form: !$('formwrap').hidden, waiting: R.waiting }; });
    if (s.form) { await p.keyboard.press('Escape'); continue; }
    if (s.line) { await p.fill('#line', NAME); await p.press('#line', 'Enter'); continue; }
    if (s.ckeys) { if (/Is this ok/i.test(s.title)) await p.keyboard.press('y'); else if (/role|profession/i.test(s.title)) await p.keyboard.press('v'); else await p.keyboard.press('*'); continue; }
    if (s.modal && /tutorial/i.test(s.title)) { await p.keyboard.press('n'); continue; }
    if (s.modal) { await p.keyboard.press('Enter'); continue; }
    if (s.more) { await p.keyboard.press('Space'); continue; }
    if (/Shall I pick/i.test(s.msg) || s.answering) { await p.keyboard.press('n'); await sleep(400); continue; }
    if (s.status.trim() && s.waiting) break;
  }
  await sleep(800);
  const rc = await p.evaluate(() => globalThis.__bt.M.FS.readFile('/home/web_user/.nethackrc', { encoding: 'utf8' }));
  await p.keyboard.press('Shift+T');
  await sleep(1500);
  const s = await p.evaluate(() => ({ modal: globalThis.__bt.modalOpen, title: document.getElementById('modal-title').textContent, msg: document.getElementById('msgband').innerText.replace(/\s+/g, ' '), ui: document.documentElement.dataset.ui }));
  out[layout] = { liveParanoid: /^OPTIONS=paranoid_confirmation/m.test(rc), ...s, errors: p.errors };
  console.log(layout, JSON.stringify(out[layout]));
  await ctx.close();
}
writeJson('newgame.json', out);
await b.close();
