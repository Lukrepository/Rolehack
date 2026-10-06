// Shared helpers for the twin-banks page checks (webtest/twin/*.mjs).
// A copy of webtest/tapdrift/common.mjs, pointed at the synced build on port
// 8766 (websync.sh), with read-only hooks:
//  - web.js gets lines appended that expose its module state as getters
//    (globalThis.__rh) and record every event the page pushes to the core
//    (globalThis.__pushed; clicks also in globalThis.__clicks).  While
//    globalThis.__swallowClicks is set a click is recorded and not delivered.
//  - each page records console errors and page errors.
import fs from 'node:fs';
let pw;
try { pw = await import('/usr/local/lib/node_modules/playwright/index.mjs'); }
catch (e) { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
export const { chromium } = pw;
export const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const URL = 'http://localhost:8766/index.html';
export const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/twin';
export const STATE = `${OUT}/_state.json`;
export const NAME = 'Twin';

export const HOOK = `
;globalThis.__rh = {
  get view() { return view; }, get geom() { return geom; }, get cursor() { return cursor; },
  get focus() { return focus; }, get overlay() { return overlay; }, get moreShown() { return moreShown; },
  get page() { return page; }, get modalOpen() { return !$('modal').hidden; }, get status() { return status; },
  COLNO, ROWNO, tileSize: () => tileSize(),
  get queue() { return queue.length; }, get waiting() { return !!waiter; }, get commandWait() { return commandWait; },
  get ghostPreview() { return ghostPreview; }, get grid() { return grid; }, get M() { return M; },
};
{ const realPush = push;
  push = (ev) => {
    (globalThis.__pushed = globalThis.__pushed || []).push(ev && ev.click ? { click: { ...ev.click } } : { ...ev });
    if (ev && ev.click) { (globalThis.__clicks = globalThis.__clicks || []).push({ ...ev.click }); if (globalThis.__swallowClicks) return; }
    realPush(ev);
  }; }
`;

export async function hookRoutes(ctx) {
  await ctx.route('**/web.js', async (route) => {
    const resp = await route.fetch();
    const body = (await resp.text()) + HOOK;
    await route.fulfill({ response: resp, body, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
  });
}

export async function launch() {
  return chromium.launch({ executablePath: EXE });
}

export function ctxOptions(w, h, input, extra = {}) {
  const touch = input === 'touch';
  return {
    viewport: { width: w, height: h },
    screen: { width: w, height: h },
    deviceScaleFactor: 1,
    hasTouch: touch,
    isMobile: touch,
    serviceWorkers: 'block',   // the page's sw.js would otherwise serve web.js from its cache, past the hook
    ...extra,
  };
}

// a page with its console watched
export async function openPage(ctx, prefs = {}) {
  await hookRoutes(ctx);
  await ctx.addInitScript((pr) => {
    try { for (const [k, v] of Object.entries(pr)) localStorage.setItem(`rh.${k}`, JSON.stringify(v)); } catch (e) { /* none */ }
  }, prefs);
  const p = await ctx.newPage();
  p.errors = [];
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); });
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  await p.goto(URL);
  await p.waitForFunction(() => globalThis.__rh && !document.getElementById('boot'), null, { timeout: 60000 });
  return p;
}

// Answer whatever stands between a restored page and the map (the name, a
// tutorial offer, --More--), until the status shows three times running.
export async function resumeGame(p) {
  const probe = () => p.evaluate(() => {
    const R = globalThis.__rh, $ = (id) => document.getElementById(id);
    const line = $('line');
    return {
      ready: !!R && !$('boot'),
      modal: R ? R.modalOpen : true,
      title: $('modal-title').textContent,
      line: !!(line && line.offsetParent),
      lineVal: line ? line.value : '',
      ckeys: !!$('ckeys'),
      msg: $('msgband').innerText,
      more: R ? R.moreShown : false,
      status: $('statband').innerText,
      answering: !!(R && R.overlay && R.overlay.answering),
      form: !$('formwrap').hidden,
    };
  });
  let settled = 0;
  const log = [];
  for (let step = 0; step < 80; step++) {
    await sleep(400);
    const s = await probe();
    log.push(`${step}: ready=${s.ready} modal=${s.modal} title=${JSON.stringify(s.title)} line=${s.line} more=${s.more} msg=${JSON.stringify(s.msg.slice(0, 80))}`);
    if (!s.ready) continue;
    if (s.form) { await p.keyboard.press('Escape'); settled = 0; continue; }
    if (s.line) {
      if (s.lineVal !== NAME) await p.fill('#line', NAME);
      await p.press('#line', 'Enter');
      settled = 0;
      continue;
    }
    if (s.ckeys) { await p.keyboard.press(/Is this ok/i.test(s.title) ? 'y' : '*'); settled = 0; continue; }
    if (s.modal) { await p.keyboard.press(/tutorial/i.test(s.title) ? 'n' : 'Enter'); settled = 0; continue; }
    if (s.more) { await p.keyboard.press('Space'); settled = 0; continue; }
    if (s.answering || /Shall I pick/i.test(s.msg)) { await p.keyboard.press('y'); settled = 0; continue; }
    if (s.status.trim()) { if (++settled >= 3) return log; }
  }
  throw new Error(`game did not resume:\n${log.join('\n')}`);
}

// Touch through CDP, so a tap is a real touch with its pointer events
export async function touchKit(ctx, p) {
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const kit = {
    cdp,
    async tap(x, y, holdMs = 0) {
      await touch('touchStart', [{ x, y }]);
      if (holdMs) await sleep(holdMs);
      await touch('touchEnd', []);
      await sleep(80);
    },
    async hold(x, y, ms) { return kit.tap(x, y, ms); },
    async drag(x0, y0, dx, dy, steps = 6, holdMs = 0) {
      await touch('touchStart', [{ x: x0, y: y0 }]);
      if (holdMs) await sleep(holdMs);
      for (let i = 1; i <= steps; i++) { await touch('touchMove', [{ x: x0 + (dx * i) / steps, y: y0 + (dy * i) / steps }]); await sleep(12); }
      await touch('touchEnd', []);
      await sleep(120);
    },
    async down(x, y) { await touch('touchStart', [{ x, y }]); },
    async up() { await touch('touchEnd', []); },
  };
  return kit;
}

// the centre of a twin control's DOM element, by layout id
export async function centreOf(p, id) {
  return p.evaluate((cid) => {
    const e = globalThis.__rh.overlay.twinEl(cid);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  }, id);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const exists = (p) => fs.existsSync(p);
export const writeJson = (name, v) => fs.writeFileSync(`${OUT}/${name}`, JSON.stringify(v, null, 1));
