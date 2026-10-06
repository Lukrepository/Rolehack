// Start one game ("Twin") in the synced web build and save the browser state
// (localStorage + IndexedDB, where the game checkpoints) to _state.json, so
// every check resumes the same game in progress.  Classic layout while it
// starts (the setting is written before the page loads), so it runs on the
// page before and after the twin-banks change alike.
//   node setup.mjs
import { launch, ctxOptions, openPage, resumeGame, STATE, sleep } from './common.mjs';

const b = await launch();
const ctx = await b.newContext(ctxOptions(896, 443, 'touch'));
const p = await openPage(ctx, { layout: 'classic' });
const log = await resumeGame(p);
console.log(log.slice(-5).join('\n'));
await sleep(2500);   // the checkpoint's copy to IndexedDB
// the game's state only: the page's own settings are written by each check
await p.evaluate(() => { for (const k of Object.keys(localStorage)) if (k !== 'rh.macros') localStorage.removeItem(k); });
await ctx.storageState({ path: STATE, indexedDB: true });
console.log('saved', STATE, 'errors:', p.errors);
await b.close();
