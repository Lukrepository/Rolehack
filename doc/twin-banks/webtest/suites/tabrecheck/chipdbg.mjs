import { chromium, EXE, HOOK, CANVAS_SPY, stateFor, WORK, openPage, resume, sleep } from '../tablet/common.mjs';
const EXTRA = `
;globalThis.__bt.fx = {
  setFocus(x, y) { focus = { x, y }; cursor = { x, y }; renderMap(); },
  ask(q, resp, def) { this.saved = waiter; waiter = null; this.p = handlers.shim_yn_function(q, resp, def); return true; },
};`;
const b = await chromium.launch({ executablePath: EXE });
for (const [w, h, sw, sh] of [[640, 360, 360, 640], [640, 360, 640, 360], [896, 363, 896, 363]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, screen: { width: sw, height: sh }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: 'block', storageState: stateFor(WORK) });
  await ctx.route('**/web.js', async (route) => { const resp = await route.fetch(); await route.fulfill({ response: resp, body: (await resp.text()) + HOOK + EXTRA, headers: { ...resp.headers(), 'content-type': 'text/javascript' } }); });
  await ctx.addInitScript(CANVAS_SPY);
  await ctx.addInitScript(() => { localStorage.setItem('rh.budgets', '{}'); localStorage.setItem('rh.ghostDeck', JSON.stringify({ on: false, clean: 0, session: null })); });
  ctx.origin = WORK;
  const p = await openPage(ctx); await resume(p); await sleep(300);
  await p.evaluate(() => globalThis.__bt.fx.setFocus(2, 2));
  await p.evaluate(() => globalThis.__bt.fx.ask('This door is locked.  Kick it?', 'ynq', 113));
  await sleep(500);
  const s = await p.evaluate(() => ({ ui: document.documentElement.dataset.ui, tier: document.documentElement.dataset.tier, chips: document.getElementById('chips').children.length, chipsHidden: document.getElementById('chips').hidden,
    answering: !!globalThis.__bt.overlay.answering, pill: globalThis.__bt.overlay.layerPill && globalThis.__bt.overlay.layerPill.className, msg: document.getElementById('msgband').innerText }));
  console.log(w, h, sw, sh, JSON.stringify(s));
  await p.screenshot({ path: `shots/chipdbg-${w}x${h}-${sw}x${sh}.png` });
  await ctx.close();
}
await b.close();
