import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
const URL = 'http://127.0.0.1:8799/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const st = (p) => p.evaluate(() => {
  const vis = (id) => { const e = document.getElementById(id); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').slice(0, 200) : ''; };
  return { modal: vis('modal'), form: vis('formwrap'), msg: (document.getElementById('msgband') || {}).innerText?.replace(/\s+/g, ' ').slice(-200), stat: ((document.getElementById('statband') || {}).innerText || '').match(/T:\d+/)?.[0] };
});
const open = async (ctx) => { const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(4500); return p; };
async function newChar(p, name) {
  await p.keyboard.press('Control+a'); await p.keyboard.press('Backspace');
  await p.keyboard.type(name); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  for (let i = 0; i < 14; i++) {
    const s = await st(p); const all = s.modal + ' ' + s.form + ' ' + s.msg;
    if (/T:\d/.test(s.stat || '') && !s.modal && !s.form && !/More|\[yn/.test(s.msg)) return s;
    const k = /tutorial/.test(all) ? 'n' : /Is this ok/.test(s.modal + s.msg.slice(-60)) ? 'y' : (!s.modal && /Shall I pick[^\]]*\]\s*$/.test(s.msg)) ? 'y' : 'Enter';
    await p.keyboard.press(k); await p.waitForTimeout(900);
  }
  return st(p);
}
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
let p = await open(ctx);
console.log('newchar', JSON.stringify(await newChar(p, 'Roll')));
let got = null;
for (let round = 0; round < 8 && !got; round++) {
  for (const k of ['2', '0', 's']) await p.keyboard.press(k);
  for (let i = 0; i < 20; i++) {
    await p.waitForTimeout(250);
    const s = await st(p);
    if (/--More--/.test(s.msg)) { got = s; break; }
  }
  if (!got) console.log('round', round, JSON.stringify(await st(p)));
}
console.log('at More', JSON.stringify(got));
await p.waitForTimeout(1500);
await p.close({ runBeforeUnload: true });
p = await open(ctx);
await p.keyboard.press('Control+a'); await p.keyboard.press('Backspace');
await p.keyboard.type('Roll'); await p.keyboard.press('Enter'); await p.waitForTimeout(3500);
console.log('restored', JSON.stringify(await st(p)));
await b.close();
