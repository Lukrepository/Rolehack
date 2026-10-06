// Start one game (a normal one, or with "wiz" a debug-mode one) and save the
// browser state, so every test resumes the same game.
//   node setup.mjs [wiz]
import { launch, newCtx, openPage, resume, sleep, STATE, WIZSTATE, WIZRC } from './common.mjs';
const wiz = process.argv[2] === 'wiz';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, state: null, wiz, prefs: wiz ? { userRc: WIZRC } : {} });
const p = await openPage(ctx);
p.newOk = true;
await resume(p, 'Tester');
const s = await p.evaluate(() => ({ status: document.getElementById('statband').innerText, wizard: globalThis.__T.overlay.wizard,
  hist: globalThis.__T.history.slice(-6), wizfs: globalThis.__wizfs }));
console.log(JSON.stringify(s));
await sleep(2500);
await ctx.storageState({ path: wiz ? WIZSTATE : STATE, indexedDB: true });
console.log('errors', JSON.stringify(p.errors));
await b.close();
