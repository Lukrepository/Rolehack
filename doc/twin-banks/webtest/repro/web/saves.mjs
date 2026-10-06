import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/release/web';
const URL = 'http://localhost:8791/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
const open = async () => {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('  console', m.type(), m.text().slice(0, 160)); });
  await p.goto(URL); await p.waitForTimeout(4500); return p;
};
const state = (p) => p.evaluate(() => {
  const vis = (id) => { const e = document.getElementById(id); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').slice(0, 220) : ''; };
  return { modal: vis('modal'), form: vis('formwrap'), msg: document.getElementById('msgband').innerText.replace(/\s+/g, ' ').slice(0, 300),
    status: document.getElementById('statband').innerText.replace(/\s+/g, ' ').slice(0, 120) };
});
const files = (p) => p.evaluate(() => { const FS = rolehackFiles(); const out = {};
  for (const d of ['/save', '/save/save']) { try { out[d] = FS.readdir(d).filter((f) => f[0] !== '.').map((f) => f + ':' + FS.stat(d + '/' + f).size); } catch (e) { out[d] = String(e); } } return out; });
const newChar = async (p, name) => {
  await p.keyboard.type(name); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
  await p.keyboard.press('y'); await p.waitForTimeout(1200);
  await p.keyboard.press('y'); await p.waitForTimeout(1500);
  for (let i = 0; i < 4; i++) { const s = await state(p); if (s.modal || s.form) { await p.keyboard.press('Enter'); await p.waitForTimeout(600); } }
};
// --- A: checkpoint across a closed tab
let p = await open();
await newChar(p, 'Alpha');
for (const k of ['2', '0', 's']) await p.keyboard.press(k);
await p.waitForTimeout(1500);
console.log('A in game', JSON.stringify(await state(p)));
console.log('A files', JSON.stringify(await files(p)));
await p.close({ runBeforeUnload: true });
p = await open();
console.log('A reopened who', JSON.stringify(await state(p)), 'input=', await p.evaluate(() => document.querySelector('#line') && document.querySelector('#line').value));
await p.keyboard.press('Enter'); await p.waitForTimeout(2500);
console.log('A restored', JSON.stringify(await state(p)));
await p.screenshot({ path: `${OUT}/saves-A-restored.png` });
// --- B: explicit save, then an incompatible save file
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.keyboard.press('S'); await p.waitForTimeout(800);
console.log('B after S', JSON.stringify(await state(p)));
await p.keyboard.press('y'); await p.waitForTimeout(2500);
console.log('B saved', JSON.stringify(await state(p)));
await p.screenshot({ path: `${OUT}/saves-B-saved.png` });
console.log('B files', JSON.stringify(await files(p)));
const hdr = await p.evaluate(() => Array.from(rolehackFiles().readFile('/save/save/0Alpha').slice(0, 64)));
console.log('B save header', JSON.stringify(hdr));
await p.close();
p = await open();
console.log('B who', JSON.stringify(await state(p)));
// corrupt the incarnation: the 4 bytes after indicator, count and the critical sizes
const info = await p.evaluate(() => { const FS = rolehackFiles(); const d = FS.readFile('/save/save/0Alpha');
  const n = d[1]; const off = 2 + n; const before = Array.from(d.slice(off, off + 12));
  d[off] ^= 0x01; FS.writeFile('/save/save/0Alpha', d); return { n, off, before }; });
console.log('B patched version at', JSON.stringify(info));
await p.keyboard.press('Enter'); await p.waitForTimeout(3000);
console.log('B after restore attempt', JSON.stringify(await state(p)));
await p.screenshot({ path: `${OUT}/saves-B-outdated.png` });
console.log('B history', JSON.stringify(await p.evaluate(() => document.body.innerText.match(/outdated[^\n]*/g))));
// keep the version bytes for C
globalThis.VBYTES = info;
await p.close();
// --- C: checkpoint (closed tab) whose version is wrong
p = await open();
await p.keyboard.press('Control+a'); await p.keyboard.press('Backspace');
await newChar(p, 'Gamma');
for (const k of ['l', 'l', 'j']) { await p.keyboard.press(k); await p.waitForTimeout(200); }
await p.waitForTimeout(1200);
console.log('C in game', JSON.stringify(await state(p)));
const T1 = (await state(p)).status;
await p.close({ runBeforeUnload: true });
p = await open();
const c = await p.evaluate((vb) => { const FS = rolehackFiles(); const d = FS.readFile('/save/0Gamma.0');
  const pat = vb.before; let at = -1;
  for (let i = 0; i + 12 <= d.length && i < 4096; i++) { let ok = true; for (let j = 0; j < 12; j++) if (d[i + j] !== pat[j]) { ok = false; break; } if (ok) { at = i; break; } }
  if (at >= 0) { d[at] ^= 0x01; d[at + 8] ^= 0x01; FS.writeFile('/save/0Gamma.0', d); }
  return { at, size: d.length }; }, VBYTES);
console.log('C patched checkpoint version at', JSON.stringify(c));
await p.keyboard.press('Control+a'); await p.keyboard.press('Backspace');
await p.keyboard.type('Gamma'); await p.keyboard.press('Enter'); await p.waitForTimeout(3000);
console.log('C before', T1);
console.log('C after', JSON.stringify(await state(p)));
await p.screenshot({ path: `${OUT}/saves-C.png` });
console.log('C idb names', JSON.stringify(await p.evaluate(async () => (indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : 'n/a'))));
await b.close();
