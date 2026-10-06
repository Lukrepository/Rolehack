import { chromium, EXE, HOOK, CANVAS_SPY, stateFor, WORK, openPage, resume, sleep } from '../tablet/common.mjs';
const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.333, hasTouch: false, isMobile: false, serviceWorkers: 'block', storageState: stateFor(WORK) });
await ctx.route('**/web.js', async (route) => { const resp = await route.fetch(); await route.fulfill({ response: resp, body: (await resp.text()) + HOOK, headers: { ...resp.headers(), 'content-type': 'text/javascript' } }); });
await ctx.addInitScript(() => { localStorage.setItem('rh.budgets', '{}'); localStorage.setItem('rh.ghostDeck', JSON.stringify({ on: false, clean: 3, session: null })); });
ctx.origin = WORK;
const p = await openPage(ctx); await resume(p); await sleep(300);
const r = await p.evaluate(() => {
  const o = globalThis.__bt.overlay, S = o.twin.spec;
  const pts = [[44.5, 417], [47.5, 417], [113.63, 426.04], [223.2, 414.21], [640, 417], [1200, 417]];
  return { map: S.mapArea, glass: S.glass, tier: o.twin.info.tier, banks: S.controls.filter((c) => /bank|halo/i.test(c.id)).slice(0, 4),
    dist: pts.map(([x, y]) => ({ x, y, d: o.keyDistance(x, y), g: (() => { try { return JSON.stringify(o.guardAt(x, y)).slice(0, 120); } catch (e) { return String(e); } })() })),
    lowestKeyTop: Math.min(...S.controls.filter((c) => c.kind !== 'band').map((c) => c.y)) };
});
console.log(JSON.stringify(r, null, 1).slice(0, 3000));
await p.screenshot({ path: 'shots/ring-1280x800.png' });
await b.close();
