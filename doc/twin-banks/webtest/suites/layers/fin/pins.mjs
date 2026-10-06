// Twin's attack pins kept apart from classic's (the final review): PIN 2's
// Fire default never reaches classic, and classic's own pins carry into twin.
//   node pins.mjs
process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/layers/fin';
const { launch, newCtx, openPage, resume, touch, sleep } = await import('../common.mjs');
const { capOf, Checks } = await import('../kit.mjs');
const C = new Checks('pins');
const b = await launch();
const face = (p) => p.evaluate(() => {
  const o = globalThis.__bt.overlay, P = globalThis.__bt.P;
  return { twin: !!o.twin, slots: o.atkSlotKeys, classic: P.get('atkSlots'), own: P.get('atkSlotsTwin') };
});
const reload = async (p) => {
  await p.reload();
  await p.waitForFunction(() => globalThis.__bt && !document.getElementById('boot'), null, { timeout: 60000 });
  await resume(p);
};
const NO_DECK = { ghostDeck: { on: false, clean: 0, session: null } };
// 1. a classic player's pins, PIN 2 empty: twin shows them, PIN 2 Fire
{
  const ctx = await newCtx(b, { w: 896, h: 443, prefs: { atkSlots: ['F', null], ...NO_DECK } });
  const p = await openPage(ctx);
  await resume(p);
  const f = await face(p);
  C.ok('classic [F, null] -> twin [F, f], nothing written', JSON.stringify(f.slots) === '["F","f"]' && f.own === null && JSON.stringify(f.classic) === '["F",null]', f);
  await ctx.close();
}
// 2. Fire already pinned in classic: not twice
{
  const ctx = await newCtx(b, { w: 896, h: 443, prefs: { atkSlots: ['f', null], ...NO_DECK } });
  const p = await openPage(ctx);
  await resume(p);
  const f = await face(p);
  C.ok('classic [f, null] -> twin [f, null]', JSON.stringify(f.slots) === '["f",null]', f);
  await ctx.close();
}
// 3. fresh: [null, f]; PIN 1 tapped, Throw picked, by touch; then classic
{
  const ctx = await newCtx(b, { w: 896, h: 443, prefs: NO_DECK });
  const p = await openPage(ctx);
  await resume(p);
  const t = await touch(ctx, p);
  let f = await face(p);
  C.ok('fresh -> twin [null, f]', JSON.stringify(f.slots) === '[null,"f"]', f);
  const pin1 = await capOf(p, 'pin1');
  await t.tap(pin1.cx, pin1.cy); await sleep(400);
  const item = await p.evaluate(() => { const ks = [...document.querySelectorAll('#drawer .grid .k')]; const k = ks.find((k) => /throw/i.test(k.textContent)); const r = k.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await t.tap(item.x, item.y); await sleep(400);
  f = await face(p);
  C.ok('PIN 1 = Throw: twin [t, f], under its own name, classic\'s untouched', JSON.stringify(f.slots) === '["t","f"]' && JSON.stringify(f.own) === '["t","f"]' && f.classic === null, f);
  await p.evaluate(() => globalThis.__bt.P.set('layout', 'classic'));
  await sleep(500);
  f = await face(p);
  C.ok('switched to classic: its two points empty', !f.twin && JSON.stringify(f.slots) === '[null,null]', f);
  await reload(p);
  f = await face(p);
  C.ok('classic after a reload: still empty', !f.twin && JSON.stringify(f.slots) === '[null,null]', f);
  await p.evaluate(() => globalThis.__bt.P.set('layout', 'twin'));
  await sleep(500);
  f = await face(p);
  C.ok('twin again: its own pins', f.twin && JSON.stringify(f.slots) === '["t","f"]', f);
  C.ok('console clean', p.errors.length === 0, p.errors.slice(0, 5));
  await ctx.close();
}
const bad = C.list.filter((c) => !c.pass);
console.log(`pins: ${C.list.length - bad.length}/${C.list.length} pass`);
await b.close();
