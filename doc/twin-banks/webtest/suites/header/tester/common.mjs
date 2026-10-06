// The tester's own kit for the stage "The header over the banks, and the map
// cell" (independent of the implementer's ../common.mjs).
//  - The page is the working tree, synced to the test site on port 8766.
//  - A read-only hook is appended to web.js as served (the file on disk is
//    untouched): getters on module state, and a recorder on push() that logs
//    every event (clicks too) and, while __swallowClicks is set, keeps clicks
//    from the core so the hero stays put.  setHero() is a test-only placement
//    of the core's cursor, for the sweep over every edge cell (the saved game
//    alone cannot reach them); everything else is read only.
//  - A canvas spy records the #map canvas's last frame: the level border
//    strokeRect (its origin is the drawn grid's), the hero outline, and every
//    drawImage/fillText destination, so the drawn grid is read from what was
//    drawn, not from the page's own view state.
//  - wiz: sysconf's WIZARDS opened to all, in the game's FS, and OPTIONS=playmode:debug,
//    a debug-mode game for the real walks and the real --More-- tests (Lua
//    scripts written into the game's FS and run with #wizloadlua).
import fs from 'node:fs';
const pw = await import('/usr/local/lib/node_modules/playwright/index.mjs');
export const { chromium } = pw;
export const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const DIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/header/tester';
export const SHOTS = `${DIR}/shots`;
export const ORIGIN = 'http://localhost:8766';
export const STATE = `${DIR}/_state.json`;
export const WIZSTATE = `${DIR}/_wizstate.json`;
// the debug game's own option lines: #wizloadlua on ^Q, #wizloaddes on ^S
export const WIZRC = 'OPTIONS=playmode:debug\nBINDINGS=^Q:wizloadlua\nBINDINGS=^S:wizloaddes';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const PHONES = [
  { tag: 'lucas', L: [896, 443], P: [443, 939] },
  { tag: 'small', L: [640, 360], P: [360, 640] },
  { tag: 'p412', L: [915, 412], P: [412, 915] },
  { tag: 'p390', L: [844, 390], P: [390, 844] },
];
export const BIG = [[1024, 768], [768, 1024], [1366, 768]];
export const ALL = [...PHONES.flatMap((p) => [p.L, p.P]), ...BIG];

export const HOOK = `
;globalThis.__T = {
  get view() { return { ...view, area: view.area && { ...view.area } }; }, get geom() { return geom; },
  get overlay() { return overlay; }, get moreShown() { return moreShown; }, get cursor() { return { ...cursor }; },
  get focus() { return { ...focus }; }, get M() { return M; }, get waiting() { return !!waiter; },
  get page() { return page.map((e) => e.text); }, get scrollRow() { return scrollRow; }, get history() { return history.slice(); },
  get commandWait() { return commandWait; }, get overview() { return overview; }, get grid() { return grid; },
  tileSize: () => tileSize(), key: (k) => push({ key: k }), send: (s) => send(s),
  setHero(x, y) { cursor = { x, y }; focus = { x, y }; view.panX = 0; view.panY = 0; renderMap(); },
};
{ const real = push;
  push = (ev) => {
    try { (globalThis.__ev = globalThis.__ev || []).push(JSON.parse(JSON.stringify(ev))); } catch (e) {}
    if (ev && ev.click && globalThis.__swallowClicks) return;
    real(ev);
  }; }
`;

// the #map canvas's draw calls, one frame at a time (a frame starts with the
// full-canvas black fill renderMap begins with)
export const SPY = () => {
  const P = CanvasRenderingContext2D.prototype;
  const isMap = (cx) => cx.canvas && cx.canvas.id === 'map';
  const { fillRect, strokeRect, drawImage, fillText } = P;
  let cur = null;
  P.fillRect = function (x, y, w, h) {
    if (isMap(this) && x === 0 && y === 0 && w === this.canvas.width && h === this.canvas.height) {
      cur = { cw: this.canvas.width, ch: this.canvas.height, strokes: [], images: [], texts: [], n: (globalThis.__frameN = (globalThis.__frameN || 0) + 1) };
      globalThis.__frame = cur;
    }
    return fillRect.call(this, x, y, w, h);
  };
  P.strokeRect = function (x, y, w, h) {
    if (isMap(this) && cur) cur.strokes.push({ x, y, w, h, style: String(this.strokeStyle), lw: this.lineWidth });
    return strokeRect.call(this, x, y, w, h);
  };
  P.drawImage = function (...a) {
    if (isMap(this) && cur) { const d = a.length === 9 ? a.slice(5) : a.slice(1); cur.images.push(d); }
    return drawImage.apply(this, a);
  };
  P.fillText = function (t, x, y, ...r) {
    if (isMap(this) && cur) cur.texts.push([t, x, y]);
    return fillText.call(this, t, x, y, ...r);
  };
};

export async function launch() { return chromium.launch({ executablePath: EXE }); }

// A saved game's browser state, without the remembered budgets and ghost deck
// (each window here is a device of its own).
export const HEAD = 'http://localhost:8769';
export function stateFrom(file, origin = ORIGIN) {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  const o = s.origins.find((x) => x.origin === ORIGIN);
  return { cookies: [], origins: [{ ...o, origin, localStorage: o.localStorage.filter((l) => !/^rh\.(budgets|ghostDeck)$/.test(l.name)) }] };
}

export async function newCtx(b, { w, h, dpr = 1, touch = true, screen = null, state = STATE, prefs = {}, wiz = false, origin = ORIGIN }) {
  const ctx = await b.newContext({
    viewport: { width: w, height: h }, screen: screen ? { width: screen[0], height: screen[1] } : { width: w, height: h },
    deviceScaleFactor: dpr, hasTouch: touch, isMobile: touch, serviceWorkers: 'block',
    ...(state ? { storageState: stateFrom(state, origin) } : {}),
  });
  await ctx.route('**/web.js', async (route) => {
    const resp = await route.fetch();
    let body = await resp.text();
    // debug mode for this test game only: sysconf's WIZARDS opened to all
    if (wiz) body = body.replace('      M = this;\n', "      M = this; try { const sc = M.FS.readFile('/sysconf', { encoding: 'utf8' }); "
      + "M.FS.writeFile('/sysconf', sc.replace(/^WIZARDS=.*$/m, 'WIZARDS=*')); globalThis.__wizfs = 1; } catch (e) { globalThis.__wizfs = String(e); }\n");
    await route.fulfill({ response: resp, body: body + HOOK, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
  });
  ctx.origin = origin;
  await ctx.addInitScript(SPY);
  await ctx.addInitScript((pr) => {
    try { for (const [k, v] of Object.entries(pr)) localStorage.setItem(`rh.${k}`, JSON.stringify(v)); } catch (e) { /* none */ }
  }, prefs);
  return ctx;
}

export async function openPage(ctx, { fontSize = 0 } = {}) {
  const p = await ctx.newPage();
  // the system's text size: the browser's default font size (overlay.js osTextScale)
  if (fontSize) { const c = await ctx.newCDPSession(p); await c.send('Page.enable'); await c.send('Page.setFontSizes', { fontSizes: { standard: fontSize } }); }
  p.errors = [];
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); });
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  await p.goto(`${ctx.origin || ORIGIN}/index.html`);
  await p.waitForFunction(() => globalThis.__T && !document.getElementById('boot'), null, { timeout: 60000 });
  return p;
}

const probe = (p) => p.evaluate(() => {
  const R = globalThis.__T, $ = (id) => document.getElementById(id), line = $('line');
  return { modal: !$('modal').hidden, title: $('modal-title').textContent, line: !!(line && line.offsetParent),
    ckeys: !!$('ckeys'), msg: $('msgband').innerText, more: R.moreShown, status: $('statband').innerText,
    answering: !!(R.overlay && R.overlay.answering), form: !$('formwrap').hidden, waiting: R.waiting, cw: R.commandWait };
});

// Past whatever stands between a (restored or new) page and a command wait.
export async function resume(p, name = 'Tester') {
  let settled = 0;
  for (let step = 0; step < 120; step++) {
    await sleep(300);
    const s = await probe(p);
    if (s.form) { await p.keyboard.press('Escape'); settled = 0; continue; }
    if (s.line) { await p.fill('#line', name); await p.press('#line', 'Enter'); settled = 0; continue; }
    if (s.ckeys) { await p.keyboard.press(/Is this ok/i.test(s.title) ? 'y' : '*'); settled = 0; continue; }
    if (s.modal) { await p.keyboard.press(/tutorial/i.test(s.title) ? 'n' : 'Enter'); settled = 0; continue; }
    if (s.more) { await p.keyboard.press('Space'); settled = 0; continue; }
    if (s.answering || /Shall I pick/i.test(s.msg)) { await p.keyboard.press('y'); settled = 0; continue; }
    if (s.status.trim() && s.waiting && s.cw) {
      if (++settled >= 3) {
        const h = await p.evaluate(() => globalThis.__T.history.slice());
        p.restored = h.some((t) => /welcome back/.test(t));
        p.hero = (await p.evaluate(() => document.getElementById('statband').innerText.split('\n')[0]));
        if (!p.restored && !p.newOk) console.log(`  [resume] no restore: ${p.hero} | ${h.slice(-5).join(' | ')}`);
        return true;
      }
    }
  }
  throw new Error('game did not reach a command wait');
}

// Real touches through CDP.
export async function touch(ctx, p) {
  const cdp = await ctx.newCDPSession(p);
  const t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  return {
    cdp,
    async tap(x, y, hold = 0) { await t('touchStart', [{ x, y, id: 0 }]); if (hold) await sleep(hold); await t('touchEnd', []); await sleep(80); },
    async down(pts) { await t('touchStart', pts.map(([x, y], id) => ({ x, y, id }))); },
    async move(pts) { await t('touchMove', pts.map(([x, y], id) => ({ x, y, id }))); },
    async up() { await t('touchEnd', []); await sleep(60); },
    // Turn the device: window and screen swap, as on a phone.
    async rotate(w, h, dpr) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: w, height: h, deviceScaleFactor: dpr, mobile: true, screenWidth: w, screenHeight: h,
        screenOrientation: w > h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 },
      });
      await sleep(900);
    },
    async shot(path) {
      const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path, Buffer.from(r.data, 'base64'));
    },
  };
}

// The drawn grid, from the last frame: the border is strokeRect(L - 3, Tp - 3,
// 80 Td + 6, 21 Td + 6) in device px (renderMap), so L, Tp and Td come from
// what was drawn; the hero is the outline stroked at a cell.
export const frameGrid = (p) => p.evaluate(() => {
  const f = globalThis.__frame;
  if (!f) return null;
  const b = f.strokes.find((s) => s.lw === 2 && /39, ?39, ?48|#272730/i.test(s.style));
  if (!b) return null;
  const L = b.x + 3, Tp = b.y + 3, Td = (b.w - 6) / 80, Th = (b.h - 6) / 21;
  const hero = f.strokes.find((s) => s !== b && !/ffb347/i.test(s.style) && Math.abs(s.w - (Td - s.lw)) < 0.01 && Math.abs(s.h - (Td - s.lw)) < 0.01);
  let hx = null, hy = null;
  if (hero) { hx = Math.round((hero.x - hero.lw / 2 - L) / Td); hy = Math.round((hero.y - hero.lw / 2 - Tp) / Td); }
  const cv = document.getElementById('map').getBoundingClientRect();
  return { L, Tp, Td, Th, cw: f.cw, ch: f.ch, n: f.n, hx, hy, hero, images: f.images.length,
    canvas: { x: cv.x, y: cv.y, w: cv.width, h: cv.height }, dpr: devicePixelRatio };
});

export const writeJson = (name, v) => fs.writeFileSync(`${DIR}/${name}`, JSON.stringify(v, null, 1));
export const evs = (p) => p.evaluate(() => globalThis.__ev || []);
export const clearEvs = (p) => p.evaluate(() => { globalThis.__ev = []; });
