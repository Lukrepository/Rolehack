import { launch, ctxOptions, openPage, resumeGame, OUT, sleep } from './common.mjs';
const b = await launch();
const ctx = await b.newContext(ctxOptions(896, 443, 'touch'));
const p = await openPage(ctx, { layout: 'twin', userRc: 'OPTIONS=role:Samurai,race:human,gender:male,align:lawful\nOPTIONS=paranoid_confirmation:none' });
await resumeGame(p);
const rc = await p.evaluate(() => new TextDecoder().decode(globalThis.__rh.M.FS.readFile('/home/web_user/.nethackrc')));
console.log(rc.split('\n').filter((l) => /paranoid|Your own|Twin banks/.test(l)).join('\n'));
await p.keyboard.press('T'); await sleep(900);
const seen = await p.evaluate(() => ({ msg: document.getElementById('msgband').innerText, menu: !document.getElementById('modal').hidden ? document.getElementById('modal-title').textContent : '' }));
console.log('after T:', JSON.stringify(seen));
await p.keyboard.press('Escape'); await sleep(300);
// pray: the player's "none" asked for no pray confirmation either
await p.keyboard.press('#'); await sleep(300);
console.log('errors', p.errors);
await b.close();
