// A log scrolled back, with the history full (256, any game past its first
// few hundred messages): does a new message move the line at its top?
import { chromium, EXE, HOOK, CANVAS_SPY, stateFor, WORK, openPage, resume, sleep } from '../tablet/common.mjs';
const DPR = Number(process.argv[2] || 1);
const EXTRA = `
;globalThis.__bt.rx = {
  fill(n, tag) { for (let i = 0; i < n; i++) remember(tag + ' line ' + i); renderPanels(); },
  get follow() { return panels.get('log').follow; },
};`;
const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true, serviceWorkers: 'block', storageState: stateFor(WORK) });
await ctx.route('**/web.js', async (route) => { const resp = await route.fetch(); await route.fulfill({ response: resp, body: (await resp.text()) + HOOK + EXTRA, headers: { ...resp.headers(), 'content-type': 'text/javascript' } }); });
await ctx.addInitScript(CANVAS_SPY);
await ctx.addInitScript(() => { localStorage.setItem('rh.budgets', '{}'); localStorage.setItem('rh.ghostDeck', JSON.stringify({ on: false, clean: 0, session: null })); });
ctx.origin = WORK;
const p = await openPage(ctx); await resume(p); await sleep(300);
const cdp = await ctx.newCDPSession(p);
const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
const top = () => p.evaluate(() => { const b = document.querySelector('.rhpanel[data-kind="log"] .pbody'), br = b.getBoundingClientRect();
  const l = [...b.children].find((c) => c.getBoundingClientRect().bottom > br.top + 2); return { t: l && l.textContent, st: Math.round(b.scrollTop), my: b.scrollHeight - b.clientHeight, n: b.children.length, follow: globalThis.__bt.rx.follow }; });
const look = async () => { await p.keyboard.press(':'); await sleep(120); if (await p.evaluate(() => globalThis.__bt.moreShown)) { await p.keyboard.press('Space'); await sleep(60); } await sleep(250); };
for (const fill of [100, 400]) {
  await p.evaluate((n) => globalThis.__bt.rx.fill(n, `F${n}`), fill); await look();
  const box = await p.evaluate(() => { const r = document.querySelector('.rhpanel[data-kind="log"] .pbody').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  // three finger drags back (content down)
  for (let k = 0; k < 3; k++) { await T('touchStart', [{ x: box.x + box.w / 2, y: box.y + 10 }]); for (let i = 1; i <= 10; i++) { await T('touchMove', [{ x: box.x + box.w / 2, y: box.y + 10 + i * (box.h - 30) / 10 }]); await sleep(30); } await sleep(100); await T('touchEnd', []); await sleep(300); }
  await sleep(500);
  const a = await top();
  for (let i = 0; i < 5; i++) await look();
  const z = await top();
  console.log(`history +${fill} fillers (${a.n} lines): scrolled back to "${a.t}" (${a.st}/${a.my}, follow ${a.follow}); after 5 messages "${z.t}" (${z.st}/${z.my}, follow ${z.follow}) -> ${a.t === z.t ? 'kept' : 'MOVED'}`);
  await p.screenshot({ path: `shots/drift-${DPR}-${fill}.png` });
  // back to the end for the next round
  await p.evaluate(() => { const b = document.querySelector('.rhpanel[data-kind="log"] .pbody'); b.scrollTop = b.scrollHeight; }); await sleep(200);
}
console.log('errors', p.errors);
await b.close();
