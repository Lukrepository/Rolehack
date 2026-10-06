// Tester's kit for the stage "Tablet and touch-laptop tier, size classes and
// panels (no desktop mode)".  Independent of webtest/tablet (the implementer's).
//  - WORK 8766: the working tree (scratchpad/websync.sh).
//  - HEAD 8772: git HEAD's page files over the same nethack.wasm (screens/head-site).
//  - A read-only hook appended to web.js as served exposes module state (__ts).
import fs from 'node:fs';
const pw = await import('/usr/local/lib/node_modules/playwright/index.mjs');
export const { chromium } = pw;
export const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const DIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/screens';
export const SHOTS = `${DIR}/shots`;
export const STATE = `${DIR}/_state.json`;
export const WORK = 'http://localhost:8766';
export const HEAD = 'http://localhost:8772';
export const NAME = 'Screens';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const HOOK = `
;globalThis.__ts = {
  get geom() { return geom; }, get overlay() { return overlay; }, get P() { return P; }, get view() { return view; },
  get cursor() { return cursor; }, get focus() { return focus; },
  get moreShown() { return moreShown; }, get modalOpen() { return !$('modal').hidden; },
  get waiting() { return !!waiter; }, get commandWait() { return commandWait; },
  get history() { return history; }, get page() { return page; },
  get invMenu() { try { return invMenu; } catch (e) { return undefined; } },
  get permInvent() { try { return permInvent; } catch (e) { return undefined; } },
  get panels() { try { return panels; } catch (e) { return undefined; } },
  send: (s) => send(s), tileSize: () => tileSize(),
  // test only: a pack as the core would send it for the panel (takePermInventory does the same)
  fakeInventory: (items) => { invMenu = { items, n: (invMenu ? invMenu.n : 0) + 1 }; renderPanels(); },
  // test only: the page's own message path with the core's waiter set aside
  msg: {
    saved: null,
    begin() { this.saved = waiter; waiter = null; endTurn(); },
    put(t) { this.last = putMessage(t).then(() => 'done'); return true; },
    async settle() { return Promise.race([this.last, new Promise((r) => setTimeout(() => r('waiting'), 150))]); },
    end() { endTurn(); renderBands(); waiter = this.saved; this.saved = null; },
  },
};
{ const real = push;
  push = (ev) => { try { (globalThis.__ev = globalThis.__ev || []).push(JSON.parse(JSON.stringify(ev))); } catch (e) {} real(ev); }; }
`;

export async function launch() { return chromium.launch({ executablePath: EXE }); }

// the saved game for a site, without its remembered budget or ghost deck
export function stateFor(origin) {
  const s = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  const o = s.origins.find((x) => x.origin === WORK);
  return { cookies: [], origins: [{ ...o, origin, localStorage: o.localStorage.filter((l) => !/^rh\.(budgets|ghostDeck)$/.test(l.name)) }] };
}

export async function newCtx(b, { w, h, dpr = 1, touch = true, origin = WORK, state = true, prefs = {}, screen = null }) {
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
  await p.waitForFunction(() => globalThis.__ts && !document.getElementById('boot'), null, { timeout: 60000 });
  return p;
}

// past whatever stands between a restored game and the map
export async function resume(p) {
  let settled = 0;
  for (let step = 0; step < 100; step++) {
    await sleep(300);
    const s = await p.evaluate(() => {
      const R = globalThis.__ts, $ = (id) => document.getElementById(id), line = $('line');
      return { modal: R.modalOpen, title: $('modal-title').textContent, line: !!(line && line.offsetParent),
        ckeys: !!$('ckeys'), msg: $('msgband').innerText, more: R.moreShown, status: $('statband').innerText,
        answering: !!(R.overlay && R.overlay.answering), form: !$('formwrap').hidden, waiting: R.waiting, cw: R.commandWait };
    });
    if (s.form) { await p.keyboard.press('Escape'); settled = 0; continue; }
    if (s.line) { await p.fill('#line', NAME); await p.press('#line', 'Enter'); settled = 0; continue; }
    if (s.ckeys) { await p.keyboard.press(/Is this ok/i.test(s.title) ? 'y' : '*'); settled = 0; continue; }
    if (s.modal) { await p.keyboard.press(/tutorial/i.test(s.title) ? 'n' : 'Enter'); settled = 0; continue; }
    if (s.more) { await p.keyboard.press('Space'); settled = 0; continue; }
    if (s.answering || /Shall I pick/i.test(s.msg)) { await p.keyboard.press('y'); settled = 0; continue; }
    if (s.status.trim() && s.waiting && s.cw) { if (++settled >= 3) return true; }
  }
  throw new Error('game did not resume');
}

// wait until the core waits for a command again (after a key sent)
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

export class Checks {
  constructor(tag) { this.tag = tag; this.list = []; }
  ok(name, pass, detail = '') {
    this.list.push({ tag: this.tag, name, pass: !!pass, detail });
    const d = detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : '';
    console.log(`${pass ? 'ok  ' : 'FAIL'} ${this.tag} ${name}${d.length > 600 ? d.slice(0, 600) + '...' : d}`);
    return !!pass;
  }
  get failed() { return this.list.filter((c) => !c.pass); }
}

export const writeJson = (name, v) => fs.writeFileSync(`${DIR}/${name}`, JSON.stringify(v, null, 1));

// rect helpers
export const ov = (a, b, e = 0.5) => a.x + e < b.x + b.w && b.x + e < a.x + a.w && a.y + e < b.y + b.h && b.y + e < a.y + a.h;
export const inter = (a, b) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
};
export const r1 = (r) => r && [r.x, r.y, r.w, r.h].map((v) => Math.round(v * 10) / 10);
