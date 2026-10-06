// This round's fixes in the browser, at a density: node fixes.mjs <dpr>
//  A. the log follows its end across rotations and re-wrapping resizes, and a
//     log scrolled back keeps its place (share of the way down) through them
//     and through new messages; scrolled to its end, it follows again;
//  B. the wide inventory: a vertical wheel moves along its columns, its right
//     edge fades while columns run on; the share across survives a resize; the
//     map's wheel zoom is untouched;
//  C. a layout change that moves no panel keeps its content (no refill) and
//     only a move or resize puts the place back;
//  D. a prompt's chips stand clear of the ANSWER pill at the map's foot;
//  E. a fresh page's inventory panel never says "this game began in classic".
import fs from 'node:fs';
import { chromium, EXE, HOOK, CANVAS_SPY, stateFor, WORK, openPage, resume, sleep } from '../tablet/common.mjs';
const DPR = Number(process.argv[2] || 1);
const SH = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/tabfix/shots';
const EXTRA = `
;globalThis.__bt.fx = {
  setFocus(x, y) { focus = { x, y }; cursor = { x, y }; renderMap(); },
  ask(q, resp, def) { this.saved = waiter; waiter = null; this.p = handlers.shim_yn_function(q, resp, def); return true; },
  answer(k) { push({ key: k }); },
  async done() { await this.p; waiter = this.saved; this.saved = null; return true; },
  fills: 0,
};
{ const real = fillPanel; fillPanel = (...a) => { globalThis.__bt.fx.fills++; return real(...a); }; }
`;
const b = await chromium.launch({ executablePath: EXE });
let fails = 0;
const ok = (c, what) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`); if (!c) fails++; };
async function ctxFor(w, h, { touch = true, screen = null, state = true, prefs = {} } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, screen: screen || { width: w, height: h }, deviceScaleFactor: DPR,
    hasTouch: touch, isMobile: touch, serviceWorkers: 'block', ...(state ? { storageState: stateFor(WORK) } : {}) });
  await ctx.route('**/web.js', async (route) => {
    const resp = await route.fetch();
    let body = (await resp.text());
    // fillPanel is a function declaration: make it reassignable for the count
    body = body + HOOK + EXTRA;
    await route.fulfill({ response: resp, body, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
  });
  await ctx.addInitScript(CANVAS_SPY);
  await ctx.addInitScript((pr) => { try { for (const [k, v] of Object.entries(pr)) localStorage.setItem(`rh.${k}`, JSON.stringify(v)); } catch (e) {} }, prefs);
  ctx.origin = WORK;
  return ctx;
}
const logState = (p, kind = 'log') => p.evaluate((kind) => {
  const e = document.querySelector(`.rhpanel[data-kind="${kind}"]`);
  if (!e || e.style.display === 'none') return { shown: false };
  const b = e.querySelector('.pbody'), my = b.scrollHeight - b.clientHeight, mx = b.scrollWidth - b.clientWidth;
  return { shown: true, parent: e.parentNode.id, top: b.scrollTop, my, left: b.scrollLeft, mx, fy: my > 0 ? b.scrollTop / my : 0, fx: mx > 0 ? b.scrollLeft / mx : 0,
    atEnd: b.scrollTop >= my - 4, more: 'more' in e.dataset,
    // the first line wholly or partly below the panel's top edge, and its index
    firstI: (() => { const br = b.getBoundingClientRect(); const items = [...(b.querySelector('.pcols') || b).children]; return items.findIndex((c) => c.getBoundingClientRect().bottom > br.top + b.clientTop + 1); })(), wide: 'wide' in e.dataset, n: b.children.length, last: b.lastElementChild && b.lastElementChild.textContent };
}, kind);
const look = async (p, n = 1) => { for (let i = 0; i < n; i++) { await p.keyboard.press(':'); await sleep(90); if (await p.evaluate(() => globalThis.__bt.moreShown)) { await p.keyboard.press('Space'); await sleep(60); } } await sleep(300); };

// ---- D. the chips and the ANSWER pill, 443x939 with the hero in the map's top-left
for (const [w, h] of [[443, 939], [1024, 768], [896, 443]]) {
  const ctx = await ctxFor(w, h, { prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx); await resume(p); await sleep(300);
  await p.evaluate(() => globalThis.__bt.fx.setFocus(2, 2));
  await p.evaluate(() => globalThis.__bt.fx.ask('This door is locked.  Kick it?', 'ynq', 113));
  await sleep(400);
  const g = await p.evaluate(() => {
    const o = globalThis.__bt.overlay, pill = o.layerPill, pr = pill && pill.classList.contains('on') ? pill.getBoundingClientRect() : null;
    const chips = [...document.getElementById('chips').children].map((c) => { const r = c.getBoundingClientRect(); return { t: c.textContent, x: r.x, y: r.y, w: r.width, h: r.height }; });
    const m = o.twin.spec.mapArea;
    return { pill: pr && { x: pr.x, y: pr.y, w: pr.width, h: pr.height, t: pill.textContent }, chips, m };
  });
  const ov = (a, q) => a.x < q.x + q.w && q.x < a.x + a.w && a.y < q.y + q.h && q.y < a.y + a.h;
  const hit = g.pill ? g.chips.filter((c) => ov(c, g.pill)) : [];
  const low = g.chips.length && g.chips[0].y > g.m.y + g.m.h / 2;
  ok(g.chips.length >= 3 && !!g.pill && low && !hit.length, `D ${w}x${h}: ${g.chips.length} chips ${low ? 'at the foot' : 'at the top'}, pill ${g.pill ? `"${g.pill.t}" at ${g.pill.y.toFixed(0)}` : 'none'}; on the pill: ${hit.map((c) => c.t).join(',') || 'none'}`);
  ok(g.chips.every((c) => c.y >= g.m.y - 0.5 && c.y + c.h <= g.m.y + g.m.h + 0.5), `D ${w}x${h}: the chips inside the map`);
  await p.screenshot({ path: `${SH}/D-${DPR}-${w}x${h}.png` });
  await p.evaluate(() => globalThis.__bt.fx.answer(113));
  await p.evaluate(() => globalThis.__bt.fx.done());
  ok(!p.errors.length, `D console: ${p.errors.join(' | ')}`);
  await ctx.close();
}

await b.close();
console.log(`\nchips dpr ${DPR}: ${fails} fail`);
