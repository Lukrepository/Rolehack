// The final integration pass's kit (webtest/final).  Built from the earlier
// stages' kits (header/tester/common.mjs, screens/common.mjs):
//  - WORK 8766: the working tree, synced by scratchpad/websync.sh.
//  - A read-only hook appended to web.js as served (the file on disk is
//    untouched) exposes module state as __ts; push() is recorded (__ev).
//  - wiz: sysconf's WIZARDS opened to all in the game's FS and
//    OPTIONS=playmode:debug in the player's own lines, for a game whose
//    monsters can be made on demand (^G), so the play test meets a fight.
//  - Every game here is new: no saved state, a fresh browser profile each.
import fs from 'node:fs';
const pw = await import('/usr/local/lib/node_modules/playwright/index.mjs');
export const { chromium } = pw;
export const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const DIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/final';
export const SHOTS = `${DIR}/shots`;
export const WORK = process.env.WORK || 'http://localhost:8766';
export const WIZRC = 'OPTIONS=playmode:debug';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(SHOTS, { recursive: true });

export const HOOK = `
;globalThis.__ts = {
  get geom() { return geom; }, get overlay() { return overlay; }, get P() { return P; }, get view() { return view; },
  get cursor() { return { ...cursor }; }, get focus() { return { ...focus }; }, get grid() { return grid; },
  get moreShown() { return moreShown; }, get modalOpen() { return !$('modal').hidden; },
  get waiting() { return !!waiter; }, get commandWait() { return commandWait; }, get M() { return M; },
  get history() { return history; }, get page() { return page; }, get status() { return status; },
  get invMenu() { try { return invMenu; } catch (e) { return undefined; } },
  get permInvent() { try { return permInvent; } catch (e) { return undefined; } },
  get panels() { try { return panels; } catch (e) { return undefined; } },
  get ghostPreview() { return ghostPreview; },
  send: (s) => send(s), tileSize: () => tileSize(), key: (k) => push({ key: k }),
};
{ const real = push;
  push = (ev) => { try { (globalThis.__ev = globalThis.__ev || []).push(JSON.parse(JSON.stringify(ev))); } catch (e) {} real(ev); }; }
`;

export async function launch() { return chromium.launch({ executablePath: EXE }); }

// A new browser profile for one device: touch and mobile for a phone or a
// tablet, touch without mobile for a touch laptop, neither for a mouse.
export async function newCtx(b, { w, h, dpr = 1, touch = true, mobile = touch, screen = null, prefs = {}, wiz = false }) {
  const ctx = await b.newContext({
    viewport: { width: w, height: h }, screen: screen ? { width: screen[0], height: screen[1] } : { width: w, height: h },
    deviceScaleFactor: dpr, hasTouch: touch, isMobile: mobile, serviceWorkers: 'block',
  });
  await ctx.route('**/web.js', async (route) => {
    const resp = await route.fetch();
    let body = await resp.text();
    if (wiz) body = body.replace('      M = this;\n', "      M = this; try { const sc = M.FS.readFile('/sysconf', { encoding: 'utf8' }); "
      + "M.FS.writeFile('/sysconf', sc.replace(/^WIZARDS=.*$/m, 'WIZARDS=*')); globalThis.__wizfs = 1; } catch (e) { globalThis.__wizfs = String(e); }\n");
    await route.fulfill({ response: resp, body: body + HOOK, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
  });
  const pr = { ...prefs, ...(wiz ? { userRc: WIZRC } : {}) };
  await ctx.addInitScript((pr) => {
    try { if (!sessionStorage.getItem('__seeded')) { for (const [k, v] of Object.entries(pr)) localStorage.setItem(`rh.${k}`, JSON.stringify(v)); sessionStorage.setItem('__seeded', '1'); } } catch (e) { /* none */ }
  }, pr);
  return ctx;
}

export async function openPage(ctx) {
  const p = await ctx.newPage();
  p.errors = [];
  p.warnings = [];
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); });
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  await p.goto(`${WORK}/index.html`);
  await p.waitForFunction(() => globalThis.__ts && !document.getElementById('boot'), null, { timeout: 90000 });
  return p;
}

export const probe = (p) => p.evaluate(() => {
  const R = globalThis.__ts, $ = (id) => document.getElementById(id), line = $('line');
  return { modal: R.modalOpen, title: $('modal-title').textContent, line: !!(line && line.offsetParent),
    ckeys: !!$('ckeys'), msg: $('msgband').innerText, more: R.moreShown, status: $('statband').innerText,
    answering: !!(R.overlay && R.overlay.answering), form: !$('formwrap').hidden, waiting: R.waiting, cw: R.commandWait };
});

// A new game: the name asked, the character picked at random and accepted,
// the tutorial declined, the opening --More--s passed, up to a command wait.
export async function newGame(p, name = 'Final', role = null) {
  let settled = 0;
  const steps = [];
  for (let step = 0; step < 160; step++) {
    await sleep(300);
    const s = await probe(p);
    if (s.form) { await p.keyboard.press('Escape'); steps.push('form'); settled = 0; continue; }
    if (s.line) { await p.fill('#line', name); await p.press('#line', 'Enter'); steps.push('name'); settled = 0; continue; }
    if (s.ckeys) { const ok = /Is this ok/i.test(s.title), r = role && /role/i.test(s.title); await p.keyboard.press(ok ? 'y' : r ? role : '*'); steps.push(ok ? 'ok' : r ? role : 'pick'); settled = 0; continue; }
    if (s.modal) { const tut = /tutorial/i.test(s.title); await p.keyboard.press(tut ? 'n' : 'Enter'); steps.push(tut ? 'tutorial' : 'modal'); settled = 0; continue; }
    if (s.more) { await p.keyboard.press('Space'); settled = 0; continue; }
    if (s.answering || /Shall I pick/i.test(s.msg)) { await p.keyboard.press(role ? 'n' : 'y'); steps.push(role ? 'n' : 'y'); settled = 0; continue; }
    if (s.status.trim() && s.waiting && s.cw) { if (++settled >= 3) return steps; } else settled = 0;
  }
  throw new Error(`no command wait after a new game (${steps.join(',')})`);
}

// until the core waits for a command again, passing --More--
export async function settle(p, ms = 6000) {
  const t0 = Date.now();
  let quiet = 0;
  while (Date.now() - t0 < ms) {
    await sleep(120);
    const s = await p.evaluate(() => ({ cw: globalThis.__ts.commandWait, more: globalThis.__ts.moreShown, modal: globalThis.__ts.modalOpen }));
    if (s.more) { await p.keyboard.press('Space'); quiet = 0; continue; }
    if (s.cw && !s.modal) { if (++quiet >= 3) return true; } else quiet = 0;
  }
  return false;
}

// Real touches through CDP, and the device turned with its screen.
export async function touch(ctx, p) {
  const cdp = await ctx.newCDPSession(p);
  const t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  return {
    cdp,
    async tap(x, y, hold = 0) { await t('touchStart', [{ x, y, id: 0 }]); await sleep(hold || 60); await t('touchEnd', []); await sleep(90); },
    async down(pts) { await t('touchStart', pts.map(([x, y], id) => ({ x, y, id }))); },
    async move(pts) { await t('touchMove', pts.map(([x, y], id) => ({ x, y, id }))); },
    async up() { await t('touchEnd', []); await sleep(60); },
    async slide(x0, y0, x1, y1, ms = 300, steps = 10) {
      await t('touchStart', [{ x: x0, y: y0, id: 0 }]);
      await sleep(ms / 2);
      for (let i = 1; i <= steps; i++) { await t('touchMove', [{ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps, id: 0 }]); await sleep(ms / 2 / steps); }
      await t('touchEnd', []); await sleep(120);
    },
    async rotate(w, h, dpr, screen = null) {
      const sw = screen ? screen[0] : w, sh = screen ? screen[1] : h;
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: w, height: h, deviceScaleFactor: dpr, mobile: true, screenWidth: sw, screenHeight: sh,
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

export class Checks {
  constructor(tag) { this.tag = tag; this.list = []; }
  ok(name, pass, detail = '') {
    this.list.push({ tag: this.tag, name, pass: !!pass, detail });
    const d = detail !== '' && detail != null ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : '';
    console.log(`${pass ? 'ok  ' : 'FAIL'} ${this.tag} ${name}${d.length > 700 ? d.slice(0, 700) + '...' : d}`);
    return !!pass;
  }
  get failed() { return this.list.filter((c) => !c.pass); }
}

export const writeJson = (name, v) => fs.writeFileSync(`${DIR}/${name}`, JSON.stringify(v, null, 1));
export const ov = (a, b, e = 0.5) => a.x + e < b.x + b.w && b.x + e < a.x + a.w && a.y + e < b.y + b.h && b.y + e < a.y + a.h;
export const gap = (a, b) => {
  const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), dy = Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h));
  return Math.hypot(dx, dy);
};
export const maxDiff = (a, b) => Math.max(...['x', 'y', 'w', 'h'].map((k) => Math.abs(a[k] - b[k])));
export const r1 = (r) => r && [r.x, r.y, r.w, r.h].map((v) => Math.round(v * 10) / 10);
