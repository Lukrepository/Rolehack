// Independent test kit for the stage "The twin banks on the page".
// Written by the tester; does not import anything from webtest/twin/.
//  - BASE 8766: the working tree (websync.sh); HEAD 8767: HEAD's page files over
//    the same nethack.wasm (head-site/), the classic baseline.
//  - A read-only hook appended to web.js exposes module state (__bt) and logs
//    every event pushed to the core (__ev) without changing it.
import fs from 'node:fs';
const pw = await import('/usr/local/lib/node_modules/playwright/index.mjs');
export const { chromium } = pw;
export const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const DIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/banks';
export const SHOTS = `${DIR}/shots`;
export const STATE = `${DIR}/_state.json`;
export const WORK = 'http://localhost:8766';
export const HEAD = 'http://localhost:8767';
export const NAME = 'Banks';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const HOOK = `
;globalThis.__bt = {
  get view() { return view; }, get geom() { return geom; }, get overlay() { return overlay; },
  get moreShown() { return moreShown; }, get modalOpen() { return !$('modal').hidden; },
  get cursor() { return cursor; }, get status() { return status; }, get M() { return M; },
  get waiting() { return !!waiter; }, get queue() { return queue.length; },
  get commandWait() { try { return commandWait; } catch (e) { return undefined; } },
  tileSize: () => tileSize(),
};
{ const real = push;
  push = (ev) => { try { (globalThis.__ev = globalThis.__ev || []).push(JSON.parse(JSON.stringify(ev))); } catch (e) {} real(ev); }; }
`;

export async function launch() { return chromium.launch({ executablePath: EXE }); }

// A storage state saved on 8766, copied for 8767 so both sites restore one game.
export function stateFor(origin) {
  const s = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  const o = s.origins.find((x) => x.origin === WORK);
  return { cookies: [], origins: [{ ...o, origin }] };
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
  const k = {
    cdp,
    async tap(x, y, hold = 0) { await t('touchStart', [{ x, y }]); if (hold) await sleep(hold); await t('touchEnd', []); await sleep(120); },
    async down(x, y) { await t('touchStart', [{ x, y }]); },
    async move(x, y) { await t('touchMove', [{ x, y }]); },
    async up() { await t('touchEnd', []); await sleep(60); },
    async swipe(x0, y0, dx, dy, steps = 8, hold = 0) {
      await t('touchStart', [{ x: x0, y: y0 }]);
      if (hold) await sleep(hold);
      for (let i = 1; i <= steps; i++) { await t('touchMove', [{ x: x0 + (dx * i) / steps, y: y0 + (dy * i) / steps }]); await sleep(16); }
      await t('touchEnd', []); await sleep(150);
    },
    // Turn the device: the window and the screen swap, as on a phone (not just
    // the viewport), with the orientation reported to the page.
    async rotate(w, h, dpr, screen) {
      const sw = screen ? screen[0] : w, sh = screen ? screen[1] : h;
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: w, height: h, deviceScaleFactor: dpr, mobile: true, screenWidth: sw, screenHeight: sh,
        screenOrientation: w > h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 },
      });
      await sleep(700);
    },
    // a screenshot through the same CDP session: page.screenshot() would put
    // Playwright's own viewport back and undo a turn
    async shot(path) {
      const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path, Buffer.from(r.data, 'base64'));
    },
  };
  return k;
}

// the DOM rect of the element the twin layout built for a control id, by its
// data-tw attribute; also its visible label text, to check it is the right key
export async function ctlRect(p, id) {
  return p.evaluate((cid) => {
    const e = document.querySelector(`[data-tw="${cid}"]`);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2, text: e.innerText.replace(/\s+/g, ' ').trim() };
  }, id);
}

export const evs = (p) => p.evaluate(() => globalThis.__ev || []);
export const clearEvs = (p) => p.evaluate(() => { globalThis.__ev = []; });
export const writeJson = (name, v) => fs.writeFileSync(`${DIR}/${name}`, JSON.stringify(v, null, 1));
