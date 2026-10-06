import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/fix2';
const STATE = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/review2/_state.json';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const res = [];
for (const [w, h, dpr] of [[443, 939, 2.4375], [896, 443, 1]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: true, isMobile: true, serviceWorkers: 'block', storageState: STATE });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://localhost:8766/index.html');
  await page.waitForTimeout(6000);
  const probe = await page.evaluate(async () => {
    const m = await import('./layout.js');
    const r = m.layout(344, 882, 'touch', {});
    const c = document.getElementById('map');
    return { level: r.spec.fit.level, pad: r.spec.fit.pad, decor: r.spec.decor.length, canvas: c ? [c.width, c.height] : null };
  });
  await page.screenshot({ path: `${OUT}/smoke-${w}x${h}.png` });
  res.push({ w, h, dpr, probe, errs });
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(res, null, 1));
