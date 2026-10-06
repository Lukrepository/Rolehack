// A fresh twin page: what the message band shows once the game is up (rows, scroll).
import { launch, ctxOptions, openPage, resumeGame, sleep } from './revc.mjs';
import { STATE } from './revc.mjs';
const b = await launch();
const [W, H] = (process.argv[2] || '640x360').split('x').map(Number);
const n = Number(process.argv[3] || 4);
for (let i = 0; i < n; i++) {
  const ctx = await b.newContext({ ...ctxOptions(W, H, 'touch'), storageState: STATE });
  const p = await openPage(ctx, { layout: 'twin' });
  await resumeGame(p); await sleep(600);
  const r = await p.evaluate(() => ({ band: document.getElementById('msgband').innerText.replace(/\n/g, ' | '), scroll: globalThis.__rh.scrollRow, hist: (globalThis.__rh.history || []).length }));
  console.log(process.env.ORIGIN || '8766', `${W}x${H}`, JSON.stringify(r), 'errors', JSON.stringify(p.errors));
  await ctx.close();
}
await b.close();
