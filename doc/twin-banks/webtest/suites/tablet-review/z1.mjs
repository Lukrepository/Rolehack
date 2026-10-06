import { launch, newCtx, openPage, resume, sleep } from '../tablet/common.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/tablet-review/shots';
const b = await launch();
const sizes = [[1024,768,true],[1920,1080,false]];
for (const [w,h,touch] of sizes) {
  const ctx = await newCtx(b, { w, h, dpr: 1, touch, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(500);
  const tag = `${w}x${h}${touch?'':'-mouse'}`;
  await p.screenshot({ path: `${OUT}/z1-${tag}-a.png` });
  // open inventory as a menu
  await p.keyboard.press('i'); await sleep(700);
  await p.screenshot({ path: `${OUT}/z1-${tag}-inv.png` });
  const z = await p.evaluate(() => {
    const m = document.getElementById('modal'); const r = m.getBoundingClientRect();
    const panes = [...document.querySelectorAll('.rhpanel')].map(e => { const q = e.getBoundingClientRect(); return { kind: e.dataset.kind, pane: e.dataset.pane !== undefined, x:q.x,y:q.y,w:q.width,h:q.height, disp: e.style.display}; });
    // elementFromPoint at panel centres
    const hits = panes.map(q => { const el = document.elementFromPoint(q.x+q.w/2, q.y+q.h/2); return el ? (el.closest('.rhpanel') ? 'panel' : el.id || el.className) : null; });
    return { modalHidden: m.hidden, modal: { x:r.x,y:r.y,w:r.width,h:r.height }, panes, hits, zModal: getComputedStyle(m).zIndex };
  });
  console.log(tag, JSON.stringify(z));
  await p.keyboard.press('Escape'); await sleep(400);
  console.log('errors', p.errors);
  await ctx.close();
}
await b.close();
