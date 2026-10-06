// a long pack in the wide inventory on a mouse window: can a mouse wheel reach the rest?
import { launch, newCtx, openPage, resume, sleep } from '../tablet/common.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/tablet-review/shots';
const b = await launch();
const ctx = await newCtx(b, { w: 1920, h: 1080, dpr: 1, touch: false, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(400);
await p.evaluate(() => {
  const B = globalThis.__bt; const items = [];
  const name = ['a +1 long sword (weapon in hand)', 'an uncursed potion of extra healing', 'a blessed scroll of enchant armor', 'a wand of digging (0:5)', 'an uncursed +0 pair of hard shoes (being worn)'];
  for (let hd = 0; hd < 10; hd++) { items.push({ selectable: false, ch: 0, tile: -1, attr: 7, clr: -1, text: 'Heading ' + hd });
    for (let i = 0; i < 6; i++) items.push({ selectable: true, ch: 97 + ((hd * 6 + i) % 26), tile: -1, attr: 0, clr: -1, text: `${name[i % 5]} ${hd}-${i}` }); }
  B.fakeInventory(items);
});
await sleep(200);
const box = await p.evaluate(() => { const e = document.querySelector('.rhpanel[data-kind="inventory"]'); const b = e.querySelector('.pbody'); const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, sw: b.scrollWidth, cw: b.clientWidth, sl: b.scrollLeft, wide: e.dataset.wide !== undefined }; });
console.log('before', JSON.stringify(box));
await p.mouse.move(box.x + box.w / 2, box.y + box.h / 2);
for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, 200); await sleep(100); }
const after = await p.evaluate(() => { const b = document.querySelector('.rhpanel[data-kind="inventory"] .pbody'); return { sl: b.scrollLeft, st: b.scrollTop, max: b.scrollWidth - b.clientWidth }; });
console.log('after vertical wheel', JSON.stringify(after));
await p.screenshot({ path: `${OUT}/z9-wide.png`, clip: { x: box.x, y: box.y, width: box.w, height: box.h } });
console.log('errors', p.errors);
await b.close();
