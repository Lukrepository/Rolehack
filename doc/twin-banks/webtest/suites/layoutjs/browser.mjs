// layout.js in the browser: the page's own origin imports it as an ES module,
// with no build step, and it gives the design's golden layout for Lucas's
// phone; then the installed app's service worker caches it (sw.js FILES).
//   node browser.mjs -> browser.json
import fs from 'node:fs';
import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/layoutjs';
const golden = JSON.parse(fs.readFileSync('/home/user/Rolehack/win/web/test/fixtures/spec.json', 'utf8')).screens;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const res = {};
{
  const ctx = await b.newContext({ viewport: { width: 896, height: 443 }, deviceScaleFactor: 2.4375, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  const resp = [];
  p.on('response', (r) => { if (r.url().endsWith('/layout.js')) resp.push({ status: r.status(), type: r.headers()['content-type'] }); });
  await p.goto('http://localhost:8766/index.html');
  await p.waitForTimeout(1500);
  res.module = await p.evaluate(async () => {
    const m = await import('./layout.js');
    const L = m.layout(896, 443, 'touch', { budget: { w: 443, h: 443, l: 896 } });
    const P = m.layout(443, 939, 'touch', { budget: { w: 443, h: 443, l: 896 } });
    const D = m.layout(1920, 1080, 'mouse', {});
    return { exports: Object.keys(m).sort(), land: L.spec, port: P.spec, desk: D.spec, usable: [L.usable, P.usable, D.usable] };
  });
  const same = (a, g) => a.controls.every((c, i) => ['x', 'y', 'w', 'h'].every((k) => Math.abs(c[k] - g.controls[i][k]) <= 0.5) && c.id === g.controls[i].id)
    && ['x', 'y', 'w', 'h'].every((k) => Math.abs(a.mapArea[k] - g.mapArea[k]) <= 0.5);
  res.matchesGolden = { '896x443': same(res.module.land, golden['896x443']), '443x939': same(res.module.port, golden['443x939']), '1920x1080': same(res.module.desk, golden['1920x1080']) };
  res.served = resp;
  res.exports = res.module.exports; res.usable = res.module.usable;
  delete res.module;
  res.errors = errors;
  await ctx.close();
}
{
  // the service worker, allowed this once: does its install (cache.addAll of FILES) succeed with layout.js in it?
  const ctx = await b.newContext({ viewport: { width: 896, height: 443 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await p.goto('http://localhost:8766/index.html');
  res.sw = await p.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const keys = await caches.keys();
    const c = await caches.open(keys.find((k) => k.startsWith('rolehack-')));
    const hit = await c.match('layout.js');
    return { active: !!reg.active, state: reg.active && reg.active.state, cache: keys, layoutCached: !!hit, cachedBytes: hit ? (await hit.text()).length : 0 };
  });
  res.swErrors = errors;
  await ctx.close();
}
fs.writeFileSync(`${OUT}/browser.json`, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res, null, 1));
await b.close();
