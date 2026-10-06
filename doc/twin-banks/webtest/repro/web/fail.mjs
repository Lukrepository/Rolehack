import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/release/web';
const run = async (tag, opts) => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: opts.args || [] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror ' + e.message.slice(0, 120)));
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text().slice(0, 120)); });
  if (opts.route) await p.route(opts.route, (r) => r.abort());
  if (opts.init) await p.addInitScript(opts.init);
  await p.goto('http://localhost:8791/'); await p.waitForTimeout(6000);
  const text = await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 200));
  const boot = await p.evaluate(() => { const e = document.getElementById('boot'); return e ? e.innerText : '(no boot)'; });
  console.log(tag, '| boot:', JSON.stringify(boot), '| text:', JSON.stringify(text.slice(0, 120)), '| errors:', JSON.stringify(errs.slice(0, 4)));
  await p.screenshot({ path: `${OUT}/fail-${tag}.png` });
  if (opts.after) await opts.after(p);
  await b.close();
};
await run('wasm-404', { route: '**/nethack.wasm' });
await run('no-wasm', { args: ['--js-flags=--noexpose_wasm'] });
await run('webjs-404', { route: '**/web.js' });
await run('idb-broken', { init: () => { const o = indexedDB.open.bind(indexedDB); indexedDB.open = () => { throw new DOMException('blocked', 'InvalidStateError'); }; },
  after: async (p) => { await p.keyboard.type('Idb'); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); console.log('   idb-broken after name:', JSON.stringify(await p.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(-200)))); } });
