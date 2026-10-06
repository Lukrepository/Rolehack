// PIN 2's Fire default against a stored atkSlots (a classic player's pins),
// and what a pin set in twin leaves for classic.
import { launch, newCtx, openPage, resume, sleep } from './common.mjs';
const b = await launch();
const face = (p) => p.evaluate(() => {
  const o = globalThis.__bt.overlay;
  return { twin: !!o.twin, slots: o.atkSlotKeys, stored: globalThis.__bt.P.get('atkSlots') };
});
// 1. a classic player who once set PIN 1 (classic stores both points)
{
  const ctx = await newCtx(b, { w: 896, h: 443, prefs: { atkSlots: ['F', null], ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  console.log('stored [F,null], twin:', JSON.stringify(await face(p)));
  await ctx.close();
}
// 2. fresh prefs: twin's default, then a pin set in twin, then classic
{
  const ctx = await newCtx(b, { w: 896, h: 443, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  console.log('fresh, twin:', JSON.stringify(await face(p)));
  // what the overlay's own pin assignment saves (setSlot's P.set of the whole array)
  await p.evaluate(() => { const o = globalThis.__bt.overlay; const k = o.atkSlotKeys.slice(); k[0] = 'F'; globalThis.__bt.P.set('atkSlots', k); });
  await p.evaluate(() => globalThis.__bt.P.set('layout', 'classic'));
  await p.reload();
  await p.waitForFunction(() => globalThis.__bt && !document.getElementById('boot'), null, { timeout: 60000 });
  await resume(p);
  console.log('after a twin pin edit, classic:', JSON.stringify(await face(p)));
  await ctx.close();
}
await b.close();
