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

// ---- A. the log across rotations
{
  const ctx = await ctxFor(1024, 768, { prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx); await resume(p); await sleep(300);
  await look(p, 30);
  const cdp = await ctx.newCDPSession(p);
  const rot = async (w, h) => { await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: DPR, mobile: true, screenWidth: w, screenHeight: h,
    screenOrientation: w > h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } }); await sleep(700); };
  let s = await logState(p);
  ok(s.atEnd, `A 1024x768: the log at its end after 30 looks (${s.top}/${s.my})`);
  await rot(768, 1024); s = await logState(p);
  ok(s.parent === 'glass' && s.atEnd, `A turned to 768x1024: in the glass, at its end (${s.top}/${s.my})`);
  await look(p); s = await logState(p);
  ok(s.atEnd && /staircase|see|here/i.test(s.last || ''), `A 768x1024 +1 message: at its end, newest "${(s.last || '').slice(0, 40)}"`);
  await rot(1024, 768); s = await logState(p);
  ok(s.parent === 'panes' && s.atEnd, `A back to 1024x768: in the tray, at its end (${s.top}/${s.my})`);
  await p.screenshot({ path: `${SH}/A-${DPR}-back.png` });
  // scrolled back to 40% of the way: kept through two turns and a message
  await p.evaluate(() => { const b = document.querySelector('.rhpanel[data-kind="log"] .pbody'); b.scrollTop = 0.4 * (b.scrollHeight - b.clientHeight); });
  await sleep(200);
  const s0 = await logState(p);
  await rot(768, 1024); const s1 = await logState(p);
  ok(!s1.atEnd && s1.firstI === s0.firstI, `A scrolled back: line ${s0.firstI} at the top -> turned: line ${s1.firstI}`);
  await look(p); const s2 = await logState(p);
  ok(!s2.atEnd && Math.abs(s2.top - s1.top) < 2, `A scrolled back + message: stays (${s1.top} -> ${s2.top})`);
  await rot(1024, 768); const s3 = await logState(p);
  ok(!s3.atEnd && s3.firstI === s0.firstI, `A scrolled back, turned back: line ${s3.firstI} at the top`);
  await rot(1366, 768); const s3b = await logState(p);
  ok(!s3b.atEnd && s3b.firstI === s0.firstI, `A scrolled back, 1366x768 re-wraps: line ${s3b.firstI} at the top`);
  await rot(1024, 768);
  // to its end by the player: follows again
  await p.evaluate(() => { const b = document.querySelector('.rhpanel[data-kind="log"] .pbody'); b.scrollTop = b.scrollHeight; });
  await sleep(200); await look(p); const s4 = await logState(p);
  ok(s4.atEnd, `A scrolled to its end, +message: follows (${s4.top}/${s4.my})`);
  // C. a layout that moves no panel: no refill
  const f0 = await p.evaluate(() => globalThis.__bt.fx.fills);
  await p.evaluate(() => { globalThis.__bt.overlay.twinSig = ''; window.dispatchEvent(new Event('resize')); });
  await sleep(400);
  const f1 = await p.evaluate(() => globalThis.__bt.fx.fills);
  ok(f1 === f0, `C a rebuild with the panels where they were refills nothing (${f1 - f0} fills)`);
  await look(p); const f2 = await p.evaluate(() => globalThis.__bt.fx.fills);
  ok(f2 > f1, `C ...and a message does refill the log (${f2 - f1} fills)`);
  const s5 = await logState(p);
  ok(s5.atEnd, 'C ...and the log is still at its end');
  ok(!p.errors.length, `A console: ${p.errors.join(' | ')}`);
  await ctx.close();
}

// ---- B. the wide inventory with a mouse at 1920x1080
{
  const ctx = await ctxFor(1920, 1080, { touch: false, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx); await resume(p); await sleep(300);
  await p.evaluate(() => {
    const items = [];
    const heads = ['Coins', 'Weapons', 'Armor', 'Comestibles', 'Scrolls', 'Potions', 'Rings', 'Wands', 'Tools', 'Gems/Stones'];
    let ch = 97;
    for (const h of heads) { items.push({ selectable: false, text: h, attr: 0, clr: -1, tile: -1, ch: 0 }); for (let i = 0; i < 6; i++) items.push({ selectable: true, text: `an uncursed thing number ${ch} of the ${h.toLowerCase()}`, attr: 0, clr: -1, tile: -1, ch: ch > 122 ? ch - 58 : ch++ }); }
    globalThis.__bt.fakeInventory(items);
  });
  await sleep(300);
  let s = await logState(p, 'inventory');
  ok(s.wide && s.mx > 0 && s.more, `B wide, ${s.mx} px to scroll, the edge fades: ${s.more}`);
  const box = await p.evaluate(() => { const r = document.querySelector('.rhpanel[data-kind="inventory"] .pbody').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.move(box.x, box.y);
  for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 200); await sleep(120); }
  s = await logState(p, 'inventory');
  ok(s.left > 0, `B a vertical wheel moved along the columns: ${s.left}/${s.mx}`);
  for (let i = 0; i < 20; i++) { await p.mouse.wheel(0, 300); await sleep(60); }
  s = await logState(p, 'inventory');
  ok(s.left >= s.mx - 1 && !s.more, `B at the last column the edge no longer fades (${s.left}/${s.mx}, more ${s.more})`);
  await p.screenshot({ path: `${SH}/B-${DPR}-end.png` });
  for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, -200); await sleep(80); }
  const s0 = await logState(p, 'inventory');
  await p.setViewportSize({ width: 1900, height: 1080 }); await sleep(600);
  const s1 = await logState(p, 'inventory');
  ok(Math.abs(s1.fx - s0.fx) < 0.03, `B the share across kept through a resize (${s0.fx.toFixed(3)} -> ${s1.fx.toFixed(3)})`);
  // the inventory, one column (1024x768's tray), scrolled down: the same item at the top through a turn

  // the map's wheel zooms as before
  const z0 = await p.evaluate(() => globalThis.__bt.view.T);
  const mb = await p.evaluate(() => { const r = document.getElementById('map').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await p.mouse.move(mb.x, mb.y); await p.mouse.wheel(0, -300); await sleep(400);
  const z1 = await p.evaluate(() => globalThis.__bt.view.T);
  ok(z1 !== z0, `B the map's wheel still zooms (${z0} -> ${z1})`);
  await p.mouse.wheel(0, 300); await sleep(300);
  await p.screenshot({ path: `${SH}/B-${DPR}-mid.png` });
  ok(!p.errors.length, `B console: ${p.errors.join(' | ')}`);
  await ctx.close();
}

// ---- G. 32:9 (5120x1440, a mouse): both panels in the glass beside the level; a rebuild
// moves neither (a node moved loses its scroll), and the log keeps to its end
{
  const ctx = await ctxFor(5120, 1440, { touch: false, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx); await resume(p); await sleep(300);
  await look(p, 110);
  let s = await logState(p), i = await logState(p, 'inventory');
  ok(s.my > 0, `G the log scrolls (${s.my} px)`);
  ok(s.parent === 'glass' && i.parent === 'glass' && s.atEnd, `G both panels in the glass (${s.parent}, ${i.parent}); the log at its end (${s.top}/${s.my})`);
  await p.evaluate(() => { const b = document.querySelector('.rhpanel[data-kind="log"]'); b.dataset.mark = '1'; globalThis.__moved = 0;
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.removedNodes) if (n.classList && n.classList.contains('rhpanel')) globalThis.__moved++; }).observe(document.getElementById('glass'), { childList: true }); });
  for (let k = 0; k < 3; k++) { await p.evaluate(() => { globalThis.__bt.overlay.twinSig = ''; window.dispatchEvent(new Event('resize')); }); await sleep(300); }
  s = await logState(p);
  const moved = await p.evaluate(() => globalThis.__moved);
  ok(moved === 0 && s.atEnd, `G three rebuilds: ${moved} panel moves, the log at its end (${s.top}/${s.my})`);
  await look(p); s = await logState(p);
  ok(s.atEnd, `G +message: at its end (${s.top}/${s.my})`);
  await p.screenshot({ path: `${SH}/G-${DPR}-5120x1440.png` });
  ok(!p.errors.length, `G console: ${p.errors.join(' | ')}`);
  await ctx.close();
}

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

// ---- E. a fresh page: the name prompt, then the panel
{
  const ctx = await ctxFor(1024, 768, { state: false, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await ctx.newPage(); p.errors = [];
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); });
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  await p.goto(`${WORK}/index.html`);
  let seen = '';
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    const t = await p.evaluate(() => { const e = document.querySelector('.rhpanel[data-kind="inventory"]'); return e ? e.textContent : ''; });
    if (/classic/.test(t)) seen = t;
  }
  ok(!seen, `E a fresh page's inventory never says it began in classic (${seen.slice(0, 50)})`);
  ok(!p.errors.length, `E console: ${p.errors.join(' | ')}`);
  await ctx.close();
}
// ---- F. a new game as a Healer (who starts with gold): the panel lists the coins, as INVENTORY does
{
  const ctx = await ctxFor(1024, 768, { state: false, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await ctx.newPage(); p.errors = [];
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); });
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  await p.goto(`${WORK}/index.html`);
  await p.waitForFunction(() => globalThis.__bt && !document.getElementById('boot'), null, { timeout: 60000 });
  const titles = [];
  let settled = 0;
  for (let step = 0; step < 120; step++) {
    await sleep(300);
    const s = await p.evaluate(() => {
      const R = globalThis.__bt, $ = (id) => document.getElementById(id), line = $('line');
      return { modal: R.modalOpen, title: $('modal-title').textContent, body: R.modalOpen ? $('modal').innerText.slice(0, 300) : '', line: !!(line && line.offsetParent),
        ckeys: !!$('ckeys'), msg: $('msgband').innerText, more: R.moreShown, status: $('statband').innerText,
        answering: !!(R.overlay && R.overlay.answering), form: !$('formwrap').hidden, waiting: R.waiting };
    });
    if (s.modal) titles.push(`${s.title}: ${s.body.replace(/\s+/g, ' ').slice(0, 120)}`);
    if (s.form) { await p.keyboard.press('Escape'); settled = 0; continue; }
    if (s.line) { await p.fill('#line', 'Gold-Hea-Hum-Mal-Neu'); await p.press('#line', 'Enter'); settled = 0; continue; }
    if (s.ckeys) { await p.keyboard.press(/Is this ok/i.test(s.title) ? 'y' : '*'); settled = 0; continue; }
    if (s.modal) { await p.keyboard.press(/tutorial/i.test(s.title) ? 'n' : 'Enter'); settled = 0; continue; }
    if (s.more) { await p.keyboard.press('Space'); settled = 0; continue; }
    if (s.answering || /Shall I pick|Is this ok/i.test(s.msg)) { await p.keyboard.press('y'); settled = 0; continue; }
    if (s.status.trim() && s.waiting) { if (++settled >= 3) break; }
  }
  await sleep(500);
  const inv = await p.evaluate(() => document.querySelector('.rhpanel[data-kind="inventory"] .pbody').innerText);
  const status = await p.evaluate(() => document.getElementById('statband').innerText);
  ok(/Coins/.test(inv) && /gold piece/.test(inv), `F the inventory panel lists the coins: ${inv.split('\n').slice(0, 3).join(' | ')} (status ${(status.match(/\$:\d+/) || [''])[0]})`);
  ok(!titles.some((t) => /perminv|Unknown|error/i.test(t)), `F no option error at start (${titles.filter((t) => /option|error/i.test(t)).join(' / ')})`);
  await p.screenshot({ path: `${SH}/F-${DPR}-healer.png` });
  ok(!p.errors.length, `F console: ${p.errors.join(' | ')}`);
  await ctx.close();
}
await b.close();
console.log(`\nfixes dpr ${DPR}: ${fails} fail`);
