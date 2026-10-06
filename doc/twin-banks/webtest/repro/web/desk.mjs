import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/release/web';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('console', m.type(), m.text().slice(0, 200)); });
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto('http://localhost:8766/');
await p.waitForTimeout(5000);
const shot = async (n) => { await p.screenshot({ path: `${OUT}/desk-${n}.png` }); };
const txt = async () => (await p.evaluate(() => {
  const vis = (id) => { const e = document.getElementById(id); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').slice(0, 300) : ''; };
  return { modal: vis('modal'), form: vis('formwrap'), msg: (document.getElementById('msgband')||{}).innerText, active: document.activeElement && (document.activeElement.tagName + '#' + document.activeElement.id) };
}));
console.log('who', JSON.stringify(await txt()));
await shot('1who');
await p.keyboard.type('Deskie');
await p.keyboard.press('Enter');
await p.waitForTimeout(1500);
console.log('after name', JSON.stringify(await txt()));
await shot('2pick');
// Shall I pick?  -> y
await p.keyboard.press('y');
await p.waitForTimeout(1500);
console.log('after y', JSON.stringify(await txt()));
await shot('3after-y');
for (let i = 0; i < 6; i++) {
  const t = await txt();
  if (t.modal || t.form) { await p.keyboard.press('Enter'); await p.waitForTimeout(700); } else break;
}
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
console.log('in game', JSON.stringify(await txt()));
await shot('4ingame');
const status = async () => p.evaluate(() => document.getElementById('statband').innerText.replace(/\s+/g, ' '));
console.log('status0', await status());
for (const k of ['l', 'l', 'j', 'h', 'k']) { await p.keyboard.press(k); await p.waitForTimeout(250); }
console.log('after hjkl', await status(), JSON.stringify(await txt()));
await p.keyboard.press('2'); await p.keyboard.press('0'); await p.keyboard.press('s'); await p.waitForTimeout(1200);
console.log('after 20s', await status(), JSON.stringify(await txt()));
await shot('5count');
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.keyboard.press('#'); await p.waitForTimeout(800);
console.log('after #', JSON.stringify(await txt()));
await shot('6hash');
await p.keyboard.type('version'); await p.waitForTimeout(300);
await shot('6hash-typed');
await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
console.log('after #version', JSON.stringify(await txt()));
await shot('7version');
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
await p.keyboard.press('i'); await p.waitForTimeout(800);
console.log('after i', JSON.stringify(await txt()));
await shot('8inv');
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
await p.keyboard.press('Control+x'); await p.waitForTimeout(800);
console.log('after ^X', JSON.stringify(await txt()));
await shot('9ctrlx');
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
await p.keyboard.press('?'); await p.waitForTimeout(800);
console.log('after ?', JSON.stringify(await txt()));
await shot('10help');
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
// mouse: click a map cell next to hero? click the MENU key
const menu = await p.evaluate(() => { const els=[...document.querySelectorAll('#keys *')].filter(e=>e.childElementCount===0 && /^MENU$/.test(e.textContent.trim())); if(!els.length) return null; const r=els[0].getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; });
console.log('menu at', JSON.stringify(menu));
if (menu) { await p.mouse.click(menu.x, menu.y); await p.waitForTimeout(800); console.log('after MENU click', JSON.stringify(await txt())); await shot('11settings'); }
await b.close();
