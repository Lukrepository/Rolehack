// The mouse wheel over a wide inventory panel that scrolls sideways (a
// monitor's tray with a long pack): can a mouse reach the columns past its edge?
import { launch, newCtx, openPage, resume, sleep, Checks, SHOTS, writeJson } from './common.mjs';
const dpr = Number(process.argv[2] || 1);
const b = await launch();
const all = [];
for (const [w, h] of [[1920, 1080], [3440, 1440]]) {
  const C = new Checks(`wheel-${w}x${h}-mouse@${dpr}`);
  const ctx = await newCtx(b, { w, h, dpr, touch: false });
  const p = await openPage(ctx);
  await resume(p);
  await p.evaluate(() => {
    const R = globalThis.__ts, real = R.invMenu.items, item = real.find((i) => i.selectable), head = real.find((i) => !i.selectable);
    const items = []; let ch = 97;
    for (const c of ['Weapons', 'Armor', 'Rings', 'Amulets', 'Potions', 'Scrolls', 'Spellbooks', 'Tools']) {
      items.push({ ...head, text: c });
      for (let i = 0; i < 5; i++) { items.push({ ...item, ch, text: `an uncursed +0 pair of hard shoes (being worn)` }); ch = ch === 122 ? 65 : ch + 1; }
    }
    R.fakeInventory(items);
  });
  await sleep(300);
  const g = await p.evaluate(() => { const e = document.querySelector('.rhpanel[data-kind="inventory"]'), b = e.querySelector('.pbody'), r = e.getBoundingClientRect();
    const sb = b.offsetHeight - b.clientHeight; return { wide: 'wide' in e.dataset, sw: b.scrollWidth, cw: b.clientWidth, x: r.x, y: r.y, w: r.width, h: r.height, scrollbarH: sb }; });
  C.ok('the pack overflows sideways (test premise)', g.wide && g.sw > g.cw + 10, g);
  if (g.sw > g.cw + 10) {
    await p.mouse.move(g.x + g.w / 2, g.y + g.h / 2);
    for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 200); await sleep(60); }
    await sleep(300);
    const l = await p.evaluate(() => document.querySelector('.rhpanel[data-kind="inventory"] .pbody').scrollLeft);
    C.ok('a vertical wheel over it scrolls it sideways', l > 0, { scrollLeft: l });
    // (no scrollbar check: Playwright's Chromium runs with --hide-scrollbars)
    await p.keyboard.down('Shift');
    for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 200); await sleep(60); }
    await p.keyboard.up('Shift');
    await sleep(300);
    const l2 = await p.evaluate(() => document.querySelector('.rhpanel[data-kind="inventory"] .pbody').scrollLeft);
    C.ok('shift + wheel scrolls it sideways', l2 > 0, { scrollLeft: l2 });
  }
  await p.screenshot({ path: `${SHOTS}/wheel-${w}x${h}-mouse@${dpr}.png` });
  C.ok('no console errors', !p.errors.length, p.errors.slice(0, 4));
  all.push(...C.list);
  await ctx.close();
}
writeJson(`wheel-${dpr}.json`, all);
console.log(`\nwheel dpr ${dpr}: ${all.filter((c) => c.pass).length} pass, ${all.filter((c) => !c.pass).length} fail`);
await b.close();
