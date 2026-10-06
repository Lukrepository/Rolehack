import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/release/web';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rh.userRc', JSON.stringify('OPTIONS=!extmenu')); } catch (e) {} });
const p = await ctx.newPage();
await p.goto('http://localhost:8791/'); await p.waitForTimeout(4500);
await p.keyboard.type('Exty'); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
console.log('after name', JSON.stringify(await p.evaluate(() => document.getElementById('msgband').innerText)));
await p.keyboard.press('y'); await p.waitForTimeout(1200); await p.keyboard.press('y'); await p.waitForTimeout(1500);
for (let i = 0; i < 6; i++) { const s = await p.evaluate(() => !document.getElementById('modal').hidden && document.getElementById('modal').innerText); if (!s) break; await p.keyboard.press(/tutorial/.test(s) ? 'n' : 'Enter'); await p.waitForTimeout(700); }
await p.keyboard.press('#'); await p.waitForTimeout(600);
await p.keyboard.type('version'); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
console.log(JSON.stringify(await p.evaluate(() => ({ modal: document.getElementById('modal').hidden ? '' : document.getElementById('modal').innerText.replace(/\s+/g, ' ').slice(0, 160), msg: document.getElementById('msgband').innerText }))));
await p.screenshot({ path: `${OUT}/ext-noextmenu.png` });
await b.close();
