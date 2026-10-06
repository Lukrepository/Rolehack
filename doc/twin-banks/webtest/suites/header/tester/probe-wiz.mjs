import { launch, newCtx, openPage, resume, sleep, WIZSTATE, SHOTS } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, state: WIZSTATE, wiz: true });
const p = await openPage(ctx);
await resume(p, 'wizard');
const st = () => p.evaluate(() => { const $ = (id) => document.getElementById(id); return { modal: !$('modal').hidden, title: $('modal-title').textContent,
  line: !!($('line') && $('line').offsetParent), form: !$('formwrap').hidden, formText: $('formwrap').innerText.slice(0,200),
  msg: $('msgband').innerText, more: globalThis.__T.moreShown, cw: globalThis.__T.commandWait, page: globalThis.__T.page }; });
await p.evaluate(() => globalThis.__T.M.FS.writeFile('/t1.lua', 'nh.pline("alpha one")\nnh.pline("beta two")\nnh.pline("gamma three")\nnh.pline("delta four")\nnh.pline("epsilon five")\n'));
await p.evaluate(() => globalThis.__T.key(17));
await sleep(600);
console.log(JSON.stringify(await st()));
if ((await st()).line) { await p.fill('#line', '/t1.lua'); await p.press('#line', 'Enter'); }
for (let i = 0; i < 8; i++) { await sleep(400); const s = await st(); console.log(JSON.stringify(s)); if (s.more) await p.keyboard.press('Space'); else if (s.cw) break; }
await p.screenshot({ path: `${SHOTS}/probe-ext.png` });
console.log(p.errors);
await b.close();
