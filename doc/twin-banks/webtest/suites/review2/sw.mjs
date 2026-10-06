import { chromium, EXE, URL, sleep } from './common.mjs';
const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport: { width: 896, height: 443 }, deviceScaleFactor: 2.4375, hasTouch: true, isMobile: true, serviceWorkers: 'allow' });
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await p.goto(URL);
const r = await p.evaluate(async () => {
  const reg = await navigator.serviceWorker.ready;
  for (let i = 0; i < 100 && !(reg.active && reg.active.state === 'activated'); i++) await new Promise((r) => setTimeout(r, 100));
  const keys = await caches.keys();
  const c = await caches.open(keys.find((k) => k.startsWith('rolehack-')));
  const urls = (await c.keys()).map((q) => new URL(q.url).pathname);
  const m = await import('./layout.js');
  const lay = m.layout(896, 443, 'touch', {});
  return { state: reg.active && reg.active.state, keys, n: urls.length, hasLayout: urls.includes('/layout.js'), urls, usable: lay.usable, pad: lay.spec.fit.pad };
});
console.log(JSON.stringify(r));
// offline reload: the page still boots from the cache
await ctx.setOffline(true);
await p.reload();
await p.waitForFunction(() => !document.getElementById('boot') || document.readyState === 'complete', null, { timeout: 30000 });
await sleep(3000);
const off = await p.evaluate(async () => { const m = await import('./layout.js'); return { boot: !!document.getElementById('boot'), ok: typeof m.layout === 'function' }; });
console.log('offline', JSON.stringify(off), 'errors', JSON.stringify(errors));
await b.close();
