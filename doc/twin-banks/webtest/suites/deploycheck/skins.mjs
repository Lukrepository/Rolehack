// Twin banks under each skin and caseless, Lucas's phone both ways: screenshots
// and the console.  node skins.mjs [dpr]  -> shots/skin-<name>-<WxH>@<dpr>.png
import { launch, newCtx, openPage, newGame, touch, sleep, SHOTS } from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await launch();
let bad = 0;
for (const [name, prefs] of [['light', { style: 'light' }], ['gamecube', { style: 'gamecube' }], ['caseless', { case: false }], ['keys-labels', { labelMode: 'both', phosphor: 'amber' }]]) {
  const ctx = await newCtx(b, { w: 896, h: 443, dpr: DPR, touch: true, mobile: true, screen: [939, 443], prefs });
  const p = await openPage(ctx);
  const k = await touch(ctx, p);
  await newGame(p, 'Skin');
  await sleep(600);
  await k.shot(`${SHOTS}/skin-${name}-896x443@${DPR}.png`);
  await k.rotate(443, 939, DPR, [443, 939]);
  await sleep(500);
  await k.shot(`${SHOTS}/skin-${name}-443x939@${DPR}.png`);
  const ui = await p.evaluate(() => [document.documentElement.dataset.ui, document.documentElement.dataset.skin, document.documentElement.dataset.case]);
  console.log(name, ui.join(' '), 'errors', p.errors.length, p.errors.slice(0, 2));
  if (p.errors.length || ui[0] !== 'twin') bad++;
  await ctx.close();
}
await b.close();
console.log(`skins dpr ${DPR}: ${bad ? `${bad} with errors` : 'no console error, twin throughout'}`);
