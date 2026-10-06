// The chips and the ANSWER pill through turns, other questions and short maps: node chips.mjs <dpr>
import { chromium, EXE, HOOK, CANVAS_SPY, stateFor, WORK, openPage, resume, sleep } from '../tablet/common.mjs';
const DPR = Number(process.argv[2] || 1);
const EXTRA = `
;globalThis.__bt.fx = {
  setFocus(x, y) { focus = { x, y }; cursor = { x, y }; renderMap(); },
  ask(q, resp, def) { this.saved = waiter; waiter = null; this.p = handlers.shim_yn_function(q, resp, def); return true; },
  answer(k) { push({ key: k }); },
  async done() { await this.p; waiter = this.saved; this.saved = null; return true; },
};`;
const b = await chromium.launch({ executablePath: EXE });
let fails = 0;
const ok = (c, what) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`); if (!c) fails++; };
const geo = (p) => p.evaluate(() => {
  const o = globalThis.__bt.overlay, pill = o.layerPill, pr = pill && pill.classList.contains('on') ? pill.getBoundingClientRect() : null;
  const box = document.getElementById('chips'), bb = box.getBoundingClientRect();
  const chips = [...box.children].map((c) => { const r = c.getBoundingClientRect(); return { t: c.textContent, x: r.x, y: r.y, w: r.width, h: r.height }; });
  const cv = document.getElementById('map').getBoundingClientRect();
  return { pill: pr && { x: pr.x, y: pr.y, w: pr.width, h: pr.height, t: pill.textContent }, chips, box: { y: bb.y, h: bb.height, shown: !box.hidden && bb.height > 0 }, m: o.twin.spec.mapArea, cv: { x: cv.x, y: cv.y, w: cv.width, h: cv.height }, W: innerWidth, H: innerHeight };
});
const ov = (a, q) => a.x < q.x + q.w && q.x < a.x + a.w && a.y < q.y + q.h && q.y < a.y + a.h;
function check(tag, g) {
  const hit = g.pill ? g.chips.filter((c) => ov(c, g.pill)) : [];
  const inMap = g.chips.every((c) => c.y >= g.m.y - 0.5 && c.y + c.h <= g.m.y + g.m.h + 0.5);
  ok(g.chips.length >= 2 && !hit.length && inMap, `${tag}: ${g.chips.length} chips at y ${g.chips.length ? g.chips[0].y.toFixed(0) : '-'}..${g.chips.length ? (g.chips[g.chips.length - 1].y + g.chips[g.chips.length - 1].h).toFixed(0) : '-'}, map ${g.m.y.toFixed(0)}..${(g.m.y + g.m.h).toFixed(0)}, pill ${g.pill ? `${g.pill.y.toFixed(0)}..${(g.pill.y + g.pill.h).toFixed(0)}` : 'none'}; on the pill: ${hit.map((c) => c.t).join(',') || 'none'}; in map ${inMap}`);
}
const CASES = process.env.ALL ? [
  { a: [443, 939], z: [939, 443], scr: [443, 939] },
  { a: [1024, 768], z: [768, 1024], scr: [768, 1024] },
] : [];
CASES.push(
  { a: [896, 363], z: [443, 859], scr: [443, 939] },
  { a: [640, 360], z: [360, 640], scr: [360, 640] },
  { a: [939, 443], z: [443, 939], scr: [443, 939] });
for (const c of CASES) for (const [q, resp, def] of [['This door is locked.  Kick it?', 'ynq', 113], ['Really attack the shopkeeper?', 'yn', 110], ['Pick up which? [abcdefg or ?*]', 'abcdefg', 27]]) {
  const ctx = await b.newContext({ viewport: { width: c.a[0], height: c.a[1] }, screen: { width: c.scr[0], height: c.scr[1] }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true, serviceWorkers: 'block', storageState: stateFor(WORK) });
  await ctx.route('**/web.js', async (route) => { const resp = await route.fetch(); await route.fulfill({ response: resp, body: (await resp.text()) + HOOK + EXTRA, headers: { ...resp.headers(), 'content-type': 'text/javascript' } }); });
  await ctx.addInitScript(CANVAS_SPY);
  await ctx.addInitScript(() => { localStorage.setItem('rh.budgets', '{}'); localStorage.setItem('rh.ghostDeck', JSON.stringify({ on: false, clean: 0, session: null })); });
  ctx.origin = WORK;
  const p = await openPage(ctx); await resume(p); await sleep(300);
  const cdp = await ctx.newCDPSession(p);
  const rot = async (w, h) => { await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: DPR, mobile: true, screenWidth: w > h ? c.scr[1] : c.scr[0], screenHeight: w > h ? c.scr[0] : c.scr[1],
    screenOrientation: w > h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } }); await sleep(900); };
  await p.evaluate(() => globalThis.__bt.fx.setFocus(2, 2));
  await p.evaluate(([q, r, d]) => globalThis.__bt.fx.ask(q, r, d), [q, resp, def]);
  await sleep(400);
  for (let i = 0; i < 4 && await p.evaluate(() => globalThis.__bt.moreShown); i++) { await p.keyboard.press('Space'); await sleep(300); }
  const tag = `${c.a.join('x')} "${resp}"`;
  check(`${tag}`, await geo(p));
  await rot(c.z[0], c.z[1]);
  await p.evaluate(() => globalThis.__bt.fx.setFocus(2, 2)); await sleep(200);
  check(`${tag} turned to ${c.z.join('x')}`, await geo(p));
  await p.screenshot({ path: `shots/chips-${DPR}-${c.a.join('x')}-${resp}-turned.png` });
  await rot(c.a[0], c.a[1]);
  await p.evaluate(() => globalThis.__bt.fx.setFocus(2, 2)); await sleep(200);
  check(`${tag} turned back`, await geo(p));
  await p.evaluate((d) => globalThis.__bt.fx.answer(d), resp.charCodeAt(0) === 97 ? 97 : def);
  { let back = false; await Promise.race([p.evaluate(() => globalThis.__bt.fx.done()).then(() => { back = true; }), sleep(3000)]); ok(back, tag + ' answered'); }
  ok(!p.errors.length, `${tag} console: ${p.errors.join(' | ')}`);
  await ctx.close();
}
console.log(`chips dpr ${DPR}: ${fails ? `${fails} FAIL` : 'all pass'}`);
await b.close();
