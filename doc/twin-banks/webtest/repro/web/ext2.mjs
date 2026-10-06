import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/release/web';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => { try { localStorage.setItem('rh.userRc', JSON.stringify('OPTIONS=!extmenu')); } catch (e) {} });
const p = await ctx.newPage();
const st = () => p.evaluate(() => ({ modal: document.getElementById('modal').hidden ? '' : document.getElementById('modal').innerText.replace(/\s+/g, ' ').slice(0, 100), form: document.getElementById('formwrap').hidden ? '' : 'FORM', msg: document.getElementById('msgband').innerText.replace(/\s+/g, ' ').slice(-120) }));
await p.goto('http://localhost:8791/'); await p.waitForTimeout(4500);
await p.keyboard.type('Exty'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
for (let i = 0; i < 12; i++) {
  const s = await st(); console.log(i, JSON.stringify(s));
  if (/T:\d/.test(await p.evaluate(() => document.getElementById('statband').innerText)) && !s.modal && !/More|\[yn/.test(s.msg)) break;
  const k = /tutorial/.test(s.modal) ? 'n' : /Is this ok/.test(s.modal) ? 'y' : s.modal ? 'Enter' : /Shall I pick[^]]*\]$/.test(s.msg) ? 'y' : 'Enter';
  await p.keyboard.press(k); await p.waitForTimeout(900);
}
await p.keyboard.press('#'); await p.waitForTimeout(700);
console.log('after #', JSON.stringify(await st()));
await p.keyboard.type('version'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
console.log('after #version', JSON.stringify(await st()));
await p.screenshot({ path: `${OUT}/ext-noextmenu.png` });
await b.close();
