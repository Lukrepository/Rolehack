// Hold a WORLD drawer item to pin it, at a window: what is under the finger,
// and whether the command ends in hand.
import { launch, newCtx, openPage, resume, toucher, sleep } from './common.mjs';
import { cap, mark, state, reset } from './probe.mjs';
const [W, H] = (process.argv[2] || '360x640').split('x').map(Number);
const dpr = Number(process.argv[3] || 1);
const b = await launch();
const ctx = await newCtx(b, { w: W, h: H, dpr, prefs: { ghostDeck: { on: false, clean: 3, session: null } } });
const p = await openPage(ctx);
await resume(p);
await p.evaluate(() => { globalThis.__swallowAll = true; });
const t = await toucher(ctx, p);
const world = await cap(p, 'world');
for (const want of ['search', null]) {
  await reset(p); await mark(p);
  await t.tap(world.cx, world.cy); await sleep(400);
  const info = await p.evaluate((want) => {
    const o = globalThis.__tt.overlay, g = o.drawerGrid;
    const gr = g.getBoundingClientRect();
    const items = [...g.querySelectorAll('button')].map((b) => { const r = b.getBoundingClientRect(); return { t: b.innerText.replace(/\s+/g, ' ').slice(0, 20), x: r.x, y: r.y, w: r.width, h: r.height }; });
    const it = want ? items.find((i) => /search/i.test(i.t)) : items[0];
    const at = it ? document.elementFromPoint(it.x + it.w / 2, it.y + it.h / 2) : null;
    return { grid: { x: gr.x, y: gr.y, w: gr.width, h: gr.height, scrollTop: g.scrollTop, scrollH: g.scrollHeight }, n: items.length, it, under: at ? `${at.tagName}.${at.className} ${at.innerText ? at.innerText.slice(0, 20) : ''}` : null };
  }, want);
  console.log(W, H, want, JSON.stringify(info));
  if (!info.it) continue;
  await p.evaluate(() => { globalThis.__pl = []; for (const ty of ['pointerdown', 'pointerup', 'pointercancel']) window.addEventListener(ty, (e) => globalThis.__pl.push(`${ty}:${e.target.tagName}.${e.target.className}`), true); });
  await t.tap(info.it.x + info.it.w / 2, info.it.y + info.it.h / 2, { hold: 650 }); await sleep(250);
  const s = await state(p);
  console.log('  after hold:', JSON.stringify({ assign: s.assign, drawer: s.drawer, scrim: s.scrim, form: s.form }), (await p.evaluate(() => globalThis.__pl)).join(' | '));
}
console.log(p.errors);
await b.close();
