// Re-check of the log's place (the stage's one major): node log.mjs <dpr>
// Real touches scroll it, real CDP rotations move it; the scenarios the
// fixer's own check (tabfix/fixes.mjs) does not cover.
import { chromium, EXE, HOOK, CANVAS_SPY, stateFor, WORK, openPage, resume, sleep } from '../tablet/common.mjs';
const DPR = Number(process.argv[2] || 1);
const SH = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/tabrecheck/shots';
const EXTRA = `
;globalThis.__bt.rx = {
  fill(n, tag) { for (let i = 0; i < n; i++) remember(tag + ' filler line number ' + i + ' of a long history, long enough to wrap on a narrow log panel'); renderPanels(); },
  get panels() { const o = {}; for (const [k, p] of panels) o[k] = { follow: p.follow, top: p.top, geo: p.geo, beyond: p.beyond }; return o; },
  get hist() { return history.length; },
  rebuild() { overlay.twinSig = ''; overlay.rebuild(); },
};
`;
const b = await chromium.launch({ executablePath: EXE });
let fails = 0;
const ok = (c, what) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`); if (!c) fails++; };
async function ctxFor(w, h, { touch = true, prefs = {} } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, screen: { width: w, height: h }, deviceScaleFactor: DPR,
    hasTouch: touch, isMobile: touch, serviceWorkers: 'block', storageState: stateFor(WORK) });
  await ctx.route('**/web.js', async (route) => {
    const resp = await route.fetch();
    await route.fulfill({ response: resp, body: (await resp.text()) + HOOK + EXTRA, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
  });
  await ctx.addInitScript(CANVAS_SPY);
  await ctx.addInitScript((pr) => { try { for (const [k, v] of Object.entries(pr)) localStorage.setItem(`rh.${k}`, JSON.stringify(v)); } catch (e) {} }, prefs);
  ctx.origin = WORK;
  return ctx;
}
const st = (p) => p.evaluate(() => {
  const e = document.querySelector('.rhpanel[data-kind="log"]');
  if (!e || e.style.display === 'none') return { shown: false };
  const b = e.querySelector('.pbody'), my = b.scrollHeight - b.clientHeight, br = b.getBoundingClientRect();
  const lines = [...b.children];
  const vis = lines.filter((l) => { const r = l.getBoundingClientRect(); return r.bottom > br.top + 2 && r.top < br.bottom - 2; });
  return { shown: true, parent: e.parentNode.id, top: Math.round(b.scrollTop), my, atEnd: b.scrollTop >= my - 4,
    first: vis.length ? vis[0].textContent.slice(0, 60) : null, lastVis: vis.length ? vis[vis.length - 1].textContent.slice(0, 60) : null,
    last: lines.length ? lines[lines.length - 1].textContent.slice(0, 60) : null, n: lines.length,
    hist: globalThis.__bt.rx.hist, follow: globalThis.__bt.rx.panels.log && globalThis.__bt.rx.panels.log.follow,
    box: { x: br.x, y: br.y, w: br.width, h: br.height } };
});
const look = async (p, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(':'); await sleep(90); if (await p.evaluate(() => globalThis.__bt.moreShown)) { await p.keyboard.press('Space'); await sleep(60); } } await sleep(300); };
const newest = (p) => p.evaluate(() => globalThis.__bt.history[globalThis.__bt.history.length - 1].slice(0, 60));
async function rig(ctx, p) {
  const cdp = await ctx.newCDPSession(p);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  return {
    cdp,
    async rot(w, h, wait = 700) { await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: DPR, mobile: true, screenWidth: w, screenHeight: h,
      screenOrientation: w > h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } }); if (wait) await sleep(wait); },
    async drag(x0, y0, dx, dy, steps = 10, gap = 16) {
      await T('touchStart', [{ x: x0, y: y0 }]);
      for (let i = 1; i <= steps; i++) { await T('touchMove', [{ x: x0 + (dx * i) / steps, y: y0 + (dy * i) / steps }]); await sleep(gap); }
      await sleep(80); await T('touchEnd', []); await sleep(400);
    },
    async shot(path) { const r = await cdp.send('Page.captureScreenshot', { format: 'png' }); (await import('node:fs')).writeFileSync(path, Buffer.from(r.data, 'base64')); },
  };
}
(await import('node:fs')).mkdirSync(SH, { recursive: true });

// ---- 1. touch scrolling, rotations, full history
{
  const ctx = await ctxFor(1024, 768, { prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx); await resume(p); await sleep(300);
  const r = await rig(ctx, p);
  await look(p, 30);
  let s = await st(p);
  ok(s.shown && s.atEnd, `1 1024x768 after 30 looks: at its end (${s.top}/${s.my}) in ${s.parent}`);
  // the player drags the log back by a finger (content moves down)
  await r.drag(s.box.x + s.box.w / 2, s.box.y + 20, 0, Math.min(140, s.box.h - 40), 8, 30);
  s = await st(p);
  ok(!s.atEnd && s.follow === false, `1 a finger dragged it back: ${s.top}/${s.my}, follow ${s.follow}, top "${s.first}"`);
  const back = s.first;
  await r.rot(768, 1024); s = await st(p);
  ok(!s.atEnd && s.first === back, `1 turned to 768x1024 (${s.parent}): top "${s.first}" (was "${back}")`);
  await look(p); s = await st(p);
  ok(!s.atEnd && s.first === back, `1 768x1024 + message while scrolled back: top "${s.first}"`);
  await r.rot(1024, 768); s = await st(p);
  ok(!s.atEnd && s.first === back, `1 back to 1024x768 (${s.parent}): top "${s.first}"`);
  // a fling to the end by a finger
  for (let k = 0; k < 4; k++) { s = await st(p); await r.drag(s.box.x + s.box.w / 2, s.box.y + s.box.h - 15, 0, -(s.box.h - 30), 4, 8); }
  await sleep(800);
  s = await st(p);
  ok(s.atEnd && s.follow === true, `1 flung to its end: ${s.top}/${s.my}, follow ${s.follow}`);
  await r.rot(768, 1024); await look(p); s = await st(p);
  let nw = await newest(p);
  ok(s.atEnd && s.lastVis === nw.slice(0, 60), `1 turned + message: at its end, newest visible "${s.lastVis}"`);
  await r.rot(1024, 768); await look(p); s = await st(p); nw = await newest(p);
  ok(s.atEnd && s.lastVis === nw.slice(0, 60), `1 turned back + message: at its end, newest visible "${s.lastVis}"`);
  // a full history (256): follows, and scrolled back keeps its line through new messages
  await p.evaluate(() => globalThis.__bt.rx.fill(300, 'A'));
  await look(p); s = await st(p); nw = await newest(p);
  ok(s.hist === 256 && s.atEnd && s.lastVis === nw.slice(0, 60), `1 full history (${s.hist}) + message: at its end, newest visible`);
  await r.drag(s.box.x + s.box.w / 2, s.box.y + 20, 0, Math.min(200, s.box.h - 40), 8, 30);
  await sleep(300);
  s = await st(p);
  const back2 = s.first;
  await look(p, 3); s = await st(p);
  ok(!s.atEnd && s.first === back2, `1 full history, scrolled back, + 3 messages: top "${s.first}" (was "${back2}")`);
  await r.rot(768, 1024); s = await st(p);
  ok(!s.atEnd && s.first === back2, `1 full history, scrolled back, turned: top "${s.first}" (was "${back2}")`);
  await r.shot(`${SH}/log1-${DPR}-fullback.png`);
  await r.rot(1024, 768);
  ok(!p.errors.length, `1 console: ${p.errors.join(' | ')}`);
  await ctx.close();
}

// ---- 2. windows over the glass and settings: history window, inventory menu, text size, layout switch, a quick double turn, hidden while messages come
{
  const ctx = await ctxFor(1024, 768, { prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx); await resume(p); await sleep(300);
  const r = await rig(ctx, p);
  await look(p, 30);
  let s = await st(p), nw;
  // ^P history window
  await p.keyboard.press('Control+p'); await sleep(500);
  const modal = await p.evaluate(() => globalThis.__bt.modalOpen);
  await p.keyboard.press('Escape'); await sleep(400);
  await look(p); s = await st(p); nw = await newest(p);
  ok(s.atEnd && s.lastVis === nw.slice(0, 60), `2 after ^P (modal ${modal}) + message: at its end`);
  // the inventory menu
  await p.keyboard.press('i'); await sleep(500);
  await p.keyboard.press('Escape'); await sleep(400);
  await look(p); s = await st(p); nw = await newest(p);
  ok(s.atEnd && s.lastVis === nw.slice(0, 60), `2 after i + message: at its end`);
  // text size: re-wraps the log
  await p.evaluate(() => globalThis.__bt.P.set('msgSize', 1.4)); await sleep(700);
  s = await st(p);
  ok(s.atEnd, `2 message size 1.4: at its end (${s.top}/${s.my})`);
  await look(p); s = await st(p); nw = await newest(p);
  ok(s.atEnd && s.lastVis === nw.slice(0, 60), `2 message size 1.4 + message: newest visible`);
  await p.evaluate(() => globalThis.__bt.P.set('msgSize', 0.85)); await sleep(700);
  await look(p); s = await st(p); nw = await newest(p);
  ok(s.atEnd && s.lastVis === nw.slice(0, 60), `2 message size 0.85 + message: newest visible (${s.top}/${s.my})`);
  await p.evaluate(() => globalThis.__bt.P.set('msgSize', 1)); await sleep(700);
  // a quick double turn
  await r.rot(768, 1024, 30); await r.rot(1024, 768, 700);
  s = await st(p);
  ok(s.atEnd, `2 a quick turn and back: at its end (${s.top}/${s.my})`);
  await r.rot(768, 1024, 0); await sleep(10); await r.rot(1024, 768, 0); await sleep(5); await r.rot(768, 1024, 800);
  await look(p); s = await st(p); nw = await newest(p);
  ok(s.atEnd && s.lastVis === nw.slice(0, 60), `2 three quick turns + message: newest visible (${s.parent} ${s.top}/${s.my})`);
  await r.rot(1024, 768);
  // a phone-size window (no log) while messages come, then back
  await r.rot(896, 443); s = await st(p);
  const hidden = !s.shown;
  await look(p, 4);
  await r.rot(1024, 768); s = await st(p); nw = await newest(p);
  ok(s.atEnd && s.lastVis === nw.slice(0, 60), `2 896x443 (log ${hidden ? 'hidden' : 'shown'}) + 4 messages, back: newest visible "${s.lastVis}"`);
  // classic and back
  await p.evaluate(() => globalThis.__bt.P.set('layout', 'classic')); await sleep(300);
  await p.evaluate(() => { window.dispatchEvent(new Event('resize')); }); await sleep(700);
  await look(p, 2);
  await p.evaluate(() => globalThis.__bt.P.set('layout', 'twin')); await sleep(300);
  await p.evaluate(() => { window.dispatchEvent(new Event('resize')); }); await sleep(900);
  s = await st(p); nw = await newest(p);
  ok(s.shown && s.atEnd && s.lastVis === nw.slice(0, 60), `2 classic and back: at its end, newest visible (${s.top}/${s.my}) "${s.lastVis}"`);
  await look(p); s = await st(p); nw = await newest(p);
  ok(s.atEnd && s.lastVis === nw.slice(0, 60), `2 classic and back + message: newest visible`);
  await r.shot(`${SH}/log2-${DPR}.png`);
  ok(!p.errors.length, `2 console: ${p.errors.join(' | ')}`);
  await ctx.close();
}

// ---- 3. phones: the log under the map ('beyond'), turned
for (const [P0, L0] of [[[443, 939], [939, 443]], [[412, 915], [915, 412]]]) {
  const ctx = await ctxFor(P0[0], P0[1], { prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx); await resume(p); await sleep(300);
  const r = await rig(ctx, p);
  await look(p, 20);
  let s = await st(p);
  const had = s.shown;
  ok(!had || s.atEnd, `3 ${P0.join('x')}: log ${had ? `shown, at its end (${s.top}/${s.my})` : 'not shown'}`);
  await r.rot(L0[0], L0[1]); await look(p, 2); await r.rot(P0[0], P0[1]); await look(p, 1);
  s = await st(p);
  ok(!had || s.atEnd, `3 ${P0.join('x')} turned and back + messages: ${s.shown ? `at its end ${s.atEnd} (${s.top}/${s.my})` : 'not shown'}`);
  ok(!p.errors.length, `3 console: ${p.errors.join(' | ')}`);
  await ctx.close();
}
console.log(`log dpr ${DPR}: ${fails ? `${fails} FAIL` : 'all pass'}`);
await b.close();
