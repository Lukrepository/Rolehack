// Test kit for the stage "The header over the banks, and the map cell".
// Built on webtest/banks/common.mjs and webtest/tapdrift/common.mjs:
//  - WORK 8766: the working tree (websync.sh); HEAD 8768: the committed page
//    files (git HEAD) over the same nethack.wasm (head-site/, headsite.sh), for
//    the classic comparison.
//  - A hook appended to web.js as it is served (the file on disk is untouched)
//    exposes module state (__bt) read-only, logs every event pushed to the core
//    (__ev), records clicks (__clicks) and, while __swallowClicks is set, keeps
//    them from the core so the hero stays put.  msg.* drives the page's own
//    putMessage()/--More-- with the core's waiter set aside, so the real band,
//    its metrics and its paging are what is tested.
//  - An init script records the #map canvas's draw calls of the last frame
//    (__frame), so the drawn grid is read from what was drawn.
import fs from 'node:fs';
const pw = await import('/usr/local/lib/node_modules/playwright/index.mjs');
export const { chromium } = pw;
export const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
// OUTDIR keeps a run on another copy of the page from overwriting these results
export const DIR = process.env.OUTDIR || '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/header';
export const SHOTS = `${DIR}/shots`;
export const STATE = "/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/header/_state.json";
// WORK may name another copy of the page (a commit's own files on another port)
export const WORK = process.env.WORK || 'http://localhost:8766';
const SAVED = 'http://localhost:8766';   // where the saved game's storage state was made
export const HEAD = 'http://localhost:8768';
export const NAME = 'Banks';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const HOOK = `
;globalThis.__bt = {
  get view() { return view; }, get geom() { return geom; }, get overlay() { return overlay; },
  get moreShown() { return moreShown; }, get modalOpen() { return !$('modal').hidden; },
  get cursor() { return cursor; }, get focus() { return focus; }, get status() { return status; }, get M() { return M; },
  get waiting() { return !!waiter; }, get queue() { return queue.length; }, get overview() { return overview; },
  get page() { return page; }, get history() { return history; }, get scrollRow() { return scrollRow; },
  get commandWait() { try { return commandWait; } catch (e) { return undefined; } },
  tileSize: () => tileSize(), bandMetrics: () => { const m = bandMetrics(); return { width: m.width, slot: m.slot, rows: m.rows }; },
  rowsOf: (texts) => { const m = bandMetrics(); return pageRowsOf(texts.map((text) => ({ text })), m).map((r) => r.t); },
  renderMap: () => renderMap(), send: (seq) => send(seq), chips: (list) => showChips(list),
  // the view for the hero at (x, y), as if the core's cliparound put it there
  viewAt: (x, y) => { const f = focus, c = cursor; focus = { x, y }; cursor = { x, y }; renderMap();
    const v = { T: view.T, left: view.left, top: view.top, panX: view.panX, panY: view.panY, area: view.area };
    focus = f; cursor = c; renderMap(); return v; },
  msg: {
    saved: null,
    begin() { this.saved = waiter; waiter = null; endTurn(); },
    put(t) { this.last = putMessage(t).then(() => 'done'); return true; },
    async settle() { return Promise.race([this.last, new Promise((r) => setTimeout(() => r('waiting'), 150))]); },
    key(k) { push({ key: k }); },
    end() { endTurn(); renderBands(); waiter = this.saved; this.saved = null; },
  },
};
{ const real = push;
  push = (ev) => {
    try { (globalThis.__ev = globalThis.__ev || []).push(JSON.parse(JSON.stringify(ev))); } catch (e) {}
    if (ev && ev.click) { (globalThis.__clicks = globalThis.__clicks || []).push({ ...ev.click }); if (globalThis.__swallowClicks) return; }
    real(ev);
  }; }
`;

// Records the #map canvas's draw calls, a frame at a time (a frame starts at
// the full-canvas black fill renderMap begins with).
export const CANVAS_SPY = () => {
  const P = CanvasRenderingContext2D.prototype;
  const isMap = (cx) => cx.canvas && cx.canvas.id === 'map';
  const fillRect = P.fillRect, strokeRect = P.strokeRect;
  let cur = null;
  P.fillRect = function (x, y, w, h) {
    if (isMap(this) && x === 0 && y === 0 && w === this.canvas.width && h === this.canvas.height) {
      cur = { cw: this.canvas.width, ch: this.canvas.height, strokes: [], n: (globalThis.__frameN = (globalThis.__frameN || 0) + 1) };
      globalThis.__frame = cur;
    }
    return fillRect.call(this, x, y, w, h);
  };
  P.strokeRect = function (x, y, w, h) {
    if (isMap(this) && cur) cur.strokes.push({ x, y, w, h, style: String(this.strokeStyle), lw: this.lineWidth });
    return strokeRect.call(this, x, y, w, h);
  };
};

export async function launch() { return chromium.launch({ executablePath: EXE }); }

// The saved game, for either site.  Its remembered budget and ghost deck are
// left out: each test window is a device of its own (prefs adds what a test needs).
export function stateFor(origin) {
  const s = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  const o = s.origins.find((x) => x.origin === SAVED);
  return { cookies: [], origins: [{ ...o, origin, localStorage: o.localStorage.filter((l) => !/^rh\.(budgets|ghostDeck)$/.test(l.name)) }] };
}

export async function newCtx(b, { w, h, dpr = 1, touch = true, screen = null, origin = WORK, state = true, prefs = {} }) {
  const ctx = await b.newContext({
    viewport: { width: w, height: h }, screen: screen || { width: w, height: h },
    deviceScaleFactor: dpr, hasTouch: touch, isMobile: touch, serviceWorkers: 'block',
    ...(state ? { storageState: stateFor(origin) } : {}),
  });
  await ctx.route('**/web.js', async (route) => {
    const resp = await route.fetch();
    const body = (await resp.text()) + HOOK;
    await route.fulfill({ response: resp, body, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
  });
  await ctx.addInitScript(CANVAS_SPY);
  await ctx.addInitScript((pr) => {
    try { for (const [k, v] of Object.entries(pr)) localStorage.setItem(`rh.${k}`, JSON.stringify(v)); } catch (e) { /* none */ }
  }, prefs);
  ctx.origin = origin;
  return ctx;
}

export async function openPage(ctx) {
  const p = await ctx.newPage();
  p.errors = [];
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); });
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  await p.goto(`${ctx.origin}/index.html`);
  await p.waitForFunction(() => globalThis.__bt && !document.getElementById('boot'), null, { timeout: 60000 });
  return p;
}

// Get past whatever stands between a restored page and the map.
export async function resume(p) {
  let settled = 0;
  for (let step = 0; step < 90; step++) {
    await sleep(350);
    const s = await p.evaluate(() => {
      const R = globalThis.__bt, $ = (id) => document.getElementById(id), line = $('line');
      return { modal: R.modalOpen, title: $('modal-title').textContent, line: !!(line && line.offsetParent),
        ckeys: !!$('ckeys'), msg: $('msgband').innerText, more: R.moreShown, status: $('statband').innerText,
        answering: !!(R.overlay && R.overlay.answering), form: !$('formwrap').hidden, waiting: R.waiting };
    });
    if (s.form) { await p.keyboard.press('Escape'); settled = 0; continue; }
    if (s.line) { await p.fill('#line', NAME); await p.press('#line', 'Enter'); settled = 0; continue; }
    if (s.ckeys) { await p.keyboard.press(/Is this ok/i.test(s.title) ? 'y' : '*'); settled = 0; continue; }
    if (s.modal) { await p.keyboard.press(/tutorial/i.test(s.title) ? 'n' : 'Enter'); settled = 0; continue; }
    if (s.more) { await p.keyboard.press('Space'); settled = 0; continue; }
    if (s.answering || /Shall I pick/i.test(s.msg)) { await p.keyboard.press('y'); settled = 0; continue; }
    if (s.status.trim() && s.waiting) { if (++settled >= 3) return true; }
  }
  throw new Error('game did not resume');
}

// Real touches through CDP.
export async function touch(ctx, p) {
  const cdp = await ctx.newCDPSession(p);
  const t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  return {
    cdp,
    async tap(x, y, hold = 0) { await t('touchStart', [{ x, y }]); if (hold) await sleep(hold); await t('touchEnd', []); await sleep(120); },
    async down(pts) { await t('touchStart', pts.map(([x, y], id) => ({ x, y, id }))); },
    async move(pts) { await t('touchMove', pts.map(([x, y], id) => ({ x, y, id }))); },
    async up() { await t('touchEnd', []); await sleep(60); },
    async drag(x0, y0, dx, dy, steps = 8) {
      await t('touchStart', [{ x: x0, y: y0 }]);
      for (let i = 1; i <= steps; i++) { await t('touchMove', [{ x: x0 + (dx * i) / steps, y: y0 + (dy * i) / steps }]); await sleep(16); }
      await t('touchEnd', []); await sleep(150);
    },
    // Turn the device: the window and the screen swap, as on a phone.
    async rotate(w, h, dpr, screen) {
      const sw = screen ? screen[0] : w, sh = screen ? screen[1] : h;
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: w, height: h, deviceScaleFactor: dpr, mobile: true, screenWidth: sw, screenHeight: sh,
        screenOrientation: w > h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 },
      });
      await sleep(700);
    },
    // a screenshot through the same CDP session (page.screenshot() would undo a turn)
    async shot(path) {
      const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path, Buffer.from(r.data, 'base64'));
    },
  };
}

export const evs = (p) => p.evaluate(() => globalThis.__ev || []);
export const clearEvs = (p) => p.evaluate(() => { globalThis.__ev = []; });
export const writeJson = (name, v) => fs.writeFileSync(`${DIR}/${name}`, JSON.stringify(v, null, 1));

// The windows: the phones both ways, Lucas's browser tab pair, three tablet
// or laptop windows.  scr is the device's screen in portrait.
export const PHONES = [
  { tag: 'lucas', L: [896, 443], P: [443, 939], scr: [443, 939] },
  { tag: 'small', L: [640, 360], P: [360, 640], scr: [360, 640] },
  { tag: 'p412', L: [915, 412], P: [412, 915], scr: [412, 915] },
  { tag: 'p390', L: [844, 390], P: [390, 844], scr: [390, 844] },
  { tag: 'tab', L: [896, 363], P: [443, 859], scr: [443, 939] },
];
export const BIG = [[1024, 768], [768, 1024], [1366, 768]];
