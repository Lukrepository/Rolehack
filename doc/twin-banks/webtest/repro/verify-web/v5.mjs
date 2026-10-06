import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
const URL = 'http://127.0.0.1:8799/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const st = (p) => p.evaluate(() => {
  const vis = (id) => { const e = document.getElementById(id); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').slice(0, 200) : ''; };
  return { modal: vis('modal'), form: vis('formwrap'), msg: (document.getElementById('msgband') || {}).innerText?.replace(/\s+/g, ' ').slice(-300), stat: ((document.getElementById('statband') || {}).innerText || '').match(/T:\d+/)?.[0] };
});
const files = (p) => p.evaluate(() => { const FS = rolehackFiles(); const out = {};
  for (const d of ['/save', '/save/save']) { try { out[d] = FS.readdir(d).filter((f) => f[0] !== '.' && /Cor/.test(f)).map((f) => f + ':' + FS.stat(d + '/' + f).size); } catch (e) { out[d] = String(e); } } return out; });
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
console.log('newchar', JSON.stringify(await newChar(p, 'Cor')));
for (let i = 0; i < 4; i++) { await p.keyboard.press('s'); await p.waitForTimeout(250); }
await p.waitForTimeout(1500);
console.log('before close', JSON.stringify(await st(p)), JSON.stringify(await files(p)));
await p.close({ runBeforeUnload: true });
p = await open(ctx);
const patched = await p.evaluate(() => { const FS = rolehackFiles(); const d = FS.readFile('/save/0Cor.0'); const t = d.slice(0, 100); FS.writeFile('/save/0Cor.0', t); return { was: d.length, now: t.length }; });
console.log('patched', JSON.stringify(patched));
await p.keyboard.press('Control+a'); await p.keyboard.press('Backspace'); await p.keyboard.type('Cor'); await p.keyboard.press('Enter');
for (let i = 0; i < 4; i++) { await p.waitForTimeout(1500); console.log('step', i, JSON.stringify(await st(p))); await p.keyboard.press('Enter'); }
console.log('files', JSON.stringify(await files(p)));
await b.close();
