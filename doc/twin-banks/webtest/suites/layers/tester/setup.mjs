// Start one game on the working tree's page (8766) and save its storage state
// (localStorage + IndexedDB, where the game checkpoints) to _state.json.
import { launch, newCtx, openPage, resume, STATE, sleep } from './common.mjs';

const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, state: false });
const p = await openPage(ctx);
await resume(p);
await sleep(2500);   // the checkpoint's copy to IndexedDB
await ctx.storageState({ path: STATE, indexedDB: true });
console.log('saved', STATE, 'errors:', p.errors);
await b.close();
