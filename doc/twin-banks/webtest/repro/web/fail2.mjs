import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/release/web';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
const p = await ctx.newPage();
const errs = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text().slice(0, 100)); });
// IndexedDB works for the first read, then every write transaction fails (a full disk / quota)
await p.addInitScript(() => {
  const realTx = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (names, mode, ...rest) {
    if (mode === 'readwrite' && globalThis.__failWrites) throw new DOMException('quota', 'QuotaExceededError');
    return realTx.call(this, names, mode, ...rest);
  };
});
await p.goto('http://localhost:8791/'); await p.waitForTimeout(4500);
console.log('wasm typeof', await p.evaluate(() => typeof WebAssembly));
await p.evaluate(() => { globalThis.__failWrites = true; });
await p.keyboard.type('Full'); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
await p.keyboard.press('y'); await p.waitForTimeout(1200); await p.keyboard.press('y'); await p.waitForTimeout(1500);
for (let i = 0; i < 6; i++) { const s = await p.evaluate(() => !document.getElementById('modal').hidden && document.getElementById('modal').innerText); if (!s) break; await p.keyboard.press(/tutorial/.test(s) ? 'n' : 'Enter'); await p.waitForTimeout(700); }
await p.keyboard.press('2'); await p.keyboard.press('0'); await p.keyboard.press('s'); await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/fail-quota.png` });
console.log('visible text:', JSON.stringify(await p.evaluate(() => document.getElementById('msgband').innerText)));
console.log('errors:', JSON.stringify(errs.slice(0, 6)), errs.length);
await p.close();
const p2 = await ctx.newPage(); await p2.goto('http://localhost:8791/'); await p2.waitForTimeout(4500);
console.log('reopen who list:', JSON.stringify(await p2.evaluate(() => document.getElementById('modal').innerText.replace(/\s+/g, ' '))), 'prefill=', await p2.evaluate(() => document.querySelector('#line').value));
await b.close();
