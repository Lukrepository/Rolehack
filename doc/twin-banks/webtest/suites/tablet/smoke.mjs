// Quick look: one window, the panels' rects and text, console errors.
//   node smoke.mjs 1024x768 [mouse] [dpr]
import { launch, newCtx, openPage, resume, sleep, SHOTS } from './common.mjs';
const [w, h] = (process.argv[2] || '1024x768').split('x').map(Number);
const touch = process.argv[3] !== 'mouse';
const dpr = Number(process.argv[4] || 1);
const b = await launch();
const ctx = await newCtx(b, { w, h, dpr, touch, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(600);
const r = await p.evaluate(() => {
  const o = globalThis.__bt.overlay;
  const R = (e) => { const q = e.getBoundingClientRect(); return [q.x, q.y, q.width, q.height].map((v) => Math.round(v * 10) / 10); };
  return { ui: document.documentElement.dataset.ui, tier: document.documentElement.dataset.tier, pointer: o.twin && o.twin.spec.pointer,
    panels: [...document.querySelectorAll('.rhpanel')].map((e) => ({ kind: e.dataset.kind, pane: e.dataset.pane !== undefined, parent: e.parentNode.id, disp: e.style.display, rect: R(e), text: e.innerText.slice(0, 300) })) };
});
console.log(JSON.stringify(r, null, 1));
await p.screenshot({ path: `${SHOTS}/smoke-${w}x${h}${touch ? '' : '-mouse'}-${dpr}.png` });
console.log('errors', p.errors);
await b.close();
