import { launch, newCtx, openPage, resume, sleep } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 360, h: 640, dpr: 1, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(500);
console.log(await p.evaluate(() => {
  const o = globalThis.__bt.overlay, k = o.twin.keys.get('eq_remove');
  const cs = (e, props) => props.map((q) => `${q}=${getComputedStyle(e)[q]}`).join(' ');
  return [k.capEl.getAttribute('style'), cs(k.capEl, ['position', 'display', 'width', 'left']), k.tp.getAttribute('style'), cs(k.tp, ['position', 'left', 'right', 'width']), k.el.getAttribute('style'), cs(k.el, ['width', 'overflow'])].join('\n');
}));
await b.close();
