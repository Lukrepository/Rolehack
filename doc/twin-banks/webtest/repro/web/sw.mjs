import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const SITE = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/release/web/site';
const URL = 'http://localhost:8791/';
const setVersion = (v) => {
  fs.writeFileSync(`${SITE}/sw.js`, fs.readFileSync(`${SITE}/sw.js`, 'utf8').replace(/const VERSION = '[^']*'/, `const VERSION = '${v}'`));
  const bj = JSON.parse(fs.readFileSync(`${SITE}/build.json`, 'utf8')); bj.short = v; fs.writeFileSync(`${SITE}/build.json`, JSON.stringify(bj));
};
setVersion('v1');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
const open = async () => { const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(3500); return p; };
const shown = (p) => p.evaluate(async () => {
  const r = await fetch('build.json'); const j = await r.json();
  return { buildShownAtBoot: (document.getElementById('build') || {}).textContent || '(boot gone)', fetchNow: j.short, caches: await caches.keys(),
    controller: !!navigator.serviceWorker.controller };
});
let p = await open();
await p.waitForTimeout(3000);
console.log('visit1 (v1 published)', JSON.stringify(await shown(p)));
await p.close();
setVersion('v2');
p = await open();
console.log('visit2 (v2 published), boot label read at load:', await p.evaluate(() => window.__x || ''), JSON.stringify(await shown(p)));
await p.waitForTimeout(4000);
console.log('visit2 after 4s', JSON.stringify(await shown(p)));
await p.close();
p = await open();
console.log('visit3', JSON.stringify(await shown(p)));
// mid-game update
await p.keyboard.type('Mid'); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
await p.keyboard.press('y'); await p.waitForTimeout(1200); await p.keyboard.press('y'); await p.waitForTimeout(1500);
for (let i = 0; i < 6; i++) { const s = await p.evaluate(() => !document.getElementById('modal').hidden && document.getElementById('modal').innerText); if (!s) break; await p.keyboard.press(/tutorial/.test(s) ? 'n' : 'Enter'); await p.waitForTimeout(700); }
const t = () => p.evaluate(() => document.getElementById('statband').innerText.match(/T:\d+/)[0]);
console.log('mid-game before update', await t());
setVersion('v3');
await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
await p.waitForTimeout(4000);
console.log('after update()', JSON.stringify(await shown(p)));
await p.keyboard.press('2'); await p.keyboard.press('0'); await p.keyboard.press('s'); await p.waitForTimeout(1500);
console.log('mid-game after update, keys still work:', await t());
await b.close();
setVersion('dev-copy');
