// A full pack in the inventory panel, screenshotted: node pack.mjs WxH [mouse] [dpr]
import { launch, newCtx, openPage, resume, sleep, SHOTS } from './common.mjs';
const [w, h] = (process.argv[2] || '1920x1080').split('x').map(Number);
const touchOn = process.argv[3] !== 'mouse';
const dpr = Number(process.argv[4] || 1);
const b = await launch();
const ctx = await newCtx(b, { w, h, dpr, touch: touchOn, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(400);
const r = await p.evaluate(async () => {
  const B = globalThis.__bt, real = B.invMenu ? B.invMenu.items : [];
  const items = [];
  const name = ['a +1 long sword (weapon in hand)', 'an uncursed potion of extra healing', 'a blessed scroll of enchant armor', 'a wand of digging (0:5)', 'an uncursed +0 pair of hard shoes (being worn)'];
  for (let hd = 0; hd < 8; hd++) {
    items.push({ selectable: false, ch: 0, tile: -1, attr: 7, clr: -1, text: ['Weapons', 'Armor', 'Rings', 'Wands', 'Comestibles', 'Scrolls', 'Potions', 'Tools'][hd] });
    for (let i = 0; i < 5; i++) items.push({ selectable: true, ch: 97 + ((hd * 5 + i) % 26), tile: (real.find((q) => q.tile >= 0) || { tile: -1 }).tile, attr: 0, clr: -1, text: `${name[i]} ${hd}-${i}` });
  }
  B.fakeInventory(items);
  await new Promise((res) => setTimeout(res, 150));
  const e = document.querySelector('.rhpanel[data-kind="inventory"]'), body = e.querySelector('.pbody');
  const cs = getComputedStyle(e.querySelector('.pcols'));
  return { font: getComputedStyle(e).fontSize, colW: cs.columnWidth, body: [body.clientWidth, body.clientHeight, body.scrollWidth, body.scrollHeight],
    hs: [...e.querySelectorAll('.pi')].slice(0, 6).map((q) => Math.round(q.getBoundingClientRect().height)) };
});
console.log(JSON.stringify(r));
await p.screenshot({ path: `${SHOTS}/pack-${w}x${h}-${dpr}.png` });
const box = await p.evaluate(() => { const r = document.querySelector('.rhpanel[data-kind="inventory"]').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
await p.screenshot({ path: `${SHOTS}/pack-${w}x${h}-${dpr}-panel.png`, clip: box });
console.log('errors', p.errors);
await b.close();
