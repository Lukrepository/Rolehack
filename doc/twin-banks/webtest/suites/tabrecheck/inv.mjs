// The narrow inventory scrolled back by a finger: the same item at its top through turns
import { chromium, EXE, HOOK, CANVAS_SPY, stateFor, WORK, openPage, resume, sleep } from '../tablet/common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await chromium.launch({ executablePath: EXE });
let fails = 0;
const ok = (c, what) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`); if (!c) fails++; };
const ctx = await b.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true, serviceWorkers: 'block', storageState: stateFor(WORK) });
await ctx.route('**/web.js', async (route) => { const resp = await route.fetch(); await route.fulfill({ response: resp, body: (await resp.text()) + HOOK, headers: { ...resp.headers(), 'content-type': 'text/javascript' } }); });
await ctx.addInitScript(CANVAS_SPY);
await ctx.addInitScript(() => { localStorage.setItem('rh.budgets', '{}'); localStorage.setItem('rh.ghostDeck', JSON.stringify({ on: false, clean: 0, session: null })); });
ctx.origin = WORK;
const p = await openPage(ctx); await resume(p); await sleep(300);
const cdp = await ctx.newCDPSession(p);
const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
const rot = async (w, h) => { await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: DPR, mobile: true, screenWidth: w, screenHeight: h, screenOrientation: w > h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } }); await sleep(800); };
await p.evaluate(() => {
  const items = []; let ch = 97;
  for (const h of ['Coins', 'Weapons', 'Armor', 'Comestibles', 'Scrolls', 'Potions', 'Rings', 'Wands', 'Tools']) { items.push({ selectable: false, text: h, attr: 0, clr: -1, tile: -1, ch: 0 }); for (let i = 0; i < 5; i++) items.push({ selectable: true, text: `an uncursed thing ${String.fromCharCode(ch)} of the ${h.toLowerCase()} kind, long enough to wrap`, attr: 0, clr: -1, tile: -1, ch: ch > 122 ? (ch++ - 58) : ch++ }); }
  globalThis.__bt.fakeInventory(items);
});
await sleep(300);
const st = () => p.evaluate(() => { const e = document.querySelector('.rhpanel[data-kind="inventory"]'); if (!e || e.style.display === 'none') return { shown: false };
  const b = e.querySelector('.pbody'), br = b.getBoundingClientRect(), list = [...(b.querySelector('.pcols') || b).children];
  const f = list.find((c) => c.getBoundingClientRect().bottom > br.top + 3);
  return { shown: true, parent: e.parentNode.id, wide: 'wide' in e.dataset, top: Math.round(b.scrollTop), my: b.scrollHeight - b.clientHeight, first: f && f.textContent.slice(0, 40), box: { x: br.x, y: br.y, w: br.width, h: br.height } }; });
let s = await st();
ok(s.shown && s.my > 0, `1024x768: inventory in ${s.parent}, scrolls ${s.my} px, wide ${s.wide}`);
await T('touchStart', [{ x: s.box.x + s.box.w / 2, y: s.box.y + s.box.h - 20 }]);
for (let i = 1; i <= 10; i++) { await T('touchMove', [{ x: s.box.x + s.box.w / 2, y: s.box.y + s.box.h - 20 - i * 20 }]); await sleep(30); }
await sleep(100); await T('touchEnd', []); await sleep(800);
const s0 = await st();
ok(s0.top > 0, `a finger scrolled it: ${s0.top}/${s0.my}, top "${s0.first}"`);
await rot(768, 1024); const s1 = await st();
ok(s1.shown && s1.first === s0.first, `turned to 768x1024 (${s1.parent}, ${s1.shown ? s1.top + '/' + s1.my : 'hidden'}): top "${s1.first}"`);
await rot(1366, 768); const s2 = await st();
ok(s2.shown && (s2.first === s0.first || s2.my <= 0 || s2.wide), `1366x768 (${s2.parent}, wide ${s2.wide}, ${s2.top}/${s2.my}): top "${s2.first}"`);
await rot(1024, 768); const s3 = await st();
ok(s3.first === s0.first, `back to 1024x768: top "${s3.first}"`);
ok(!p.errors.length, `console: ${p.errors.join(' | ')}`);
console.log(`inv dpr ${DPR}: ${fails ? fails + ' FAIL' : 'all pass'}`);
await b.close();
