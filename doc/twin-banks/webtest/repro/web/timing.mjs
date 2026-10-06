import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
for (const visit of [1, 2]) {
  const p = await ctx.newPage();
  await p.goto('http://localhost:8791/'); await p.waitForTimeout(4000);
  const t = await p.evaluate(() => performance.getEntriesByType('resource').filter((e) => /wasm|nethack\.js|web\.js|tiles\.png|sw\.js|defaults/.test(e.name))
    .map((e) => `${e.name.split('/').pop()} start=${Math.round(e.startTime)} end=${Math.round(e.responseEnd)} via=${e.deliveryType || ''}${e.workerStart ? ' sw' : ''}`));
  console.log('visit', visit, t.join(' | '));
  await p.close();
}
await b.close();
