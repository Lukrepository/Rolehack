// Farlook from the keyboard and from LOOK's hold: does getpos come up?
import { launch, newCtx, openPage, resume, toucher, sleep } from './common.mjs';
import { cap, mark, pushed, state, reset } from './probe.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, prefs: { ghostDeck: { on: false, clean: 3, session: null } } });
const p = await openPage(ctx);
await resume(p);
const t = await toucher(ctx, p);
await mark(p);
await p.keyboard.press(';');
for (let i = 0; i < 10; i++) {
  await sleep(200);
  const s = await p.evaluate(() => ({ picking: globalThis.__tt.overlay.picking, cw: globalThis.__tt.commandWait, waiting: globalThis.__tt.waiting, msg: document.getElementById('msgband').innerText.slice(0, 120), ev: (globalThis.__ev || []).length }));
  console.log('kbd ;', i, JSON.stringify(s));
}
await p.keyboard.press('Escape');
await resume(p);
const look = await cap(p, 'look');
await mark(p);
await t.tap(look.cx, look.cy, { hold: 500 });
for (let i = 0; i < 6; i++) {
  await sleep(200);
  const s = await p.evaluate(() => ({ picking: globalThis.__tt.overlay.picking, cw: globalThis.__tt.commandWait, msg: document.getElementById('msgband').innerText.slice(0, 120) }));
  console.log('LOOK hold', i, JSON.stringify(s), await pushed(p));
}
console.log(p.errors);
await b.close();
