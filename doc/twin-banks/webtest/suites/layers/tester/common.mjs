// Independent tester's kit for the stage "Layers on the pad and the near-miss
// guard".  Written apart from the implementer's webtest/layers/*.mjs: its own
// hook, its own game state, its own oracle (the design's checks/lib.mjs
// hitModel and win/web/layout.js run in node).
import fs from 'node:fs';
const pw = await import('/usr/local/lib/node_modules/playwright/index.mjs');
export const { chromium } = pw;
export const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const SP = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad';
export const DIR = `${SP}/webtest/layers/tester`;
export const SHOTS = `${DIR}/shots`;
export const STATE = `${DIR}/_state.json`;
export const ORIGIN = 'http://localhost:8766';
export const NAME = 'Tester';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const SIZES = [[896, 443], [443, 939], [360, 640], [390, 844]];

// Read-only module access plus an event recorder, appended to web.js as served.
export const HOOK = `
;globalThis.__tt = {
  get view() { return view; }, get geom() { return geom; }, get overlay() { return overlay; },
  get moreShown() { return moreShown; }, get waiting() { return !!waiter; },
  get commandWait() { return commandWait; }, set commandWait(v) { commandWait = v; },
  get ghostPreview() { return ghostPreview; }, get modalOpen() { return !$('modal').hidden; },
  get closedAt() { return closedAt; },
  get focus() { return focus; }, get cursor() { return cursor; },
  resetClocks() { closedAt = -1e9; if (overlay) overlay.keyUpAt = -1e9; },
  clearPreview() { if (ghostPreview) { clearTimeout(ghostPreview.timer); ghostPreview = null; renderMap(); } },
  closeModal: () => closeModal(),
  showKeyboard: (on) => showKeyboard(on),
  kbdOn: () => $('kbd').classList.contains('on'),
  renderMap: () => renderMap(),
  more: {
    saved: null, cw: false,
    begin() { this.saved = waiter; waiter = null; this.cw = commandWait; commandWait = false; endTurn(); },
    put(t) { this.p = putMessage(t); return true; },
    end() { endTurn(); renderBands(); waiter = this.saved; commandWait = this.cw; this.saved = null; },
  },
};
{ const real = push;
  push = (ev) => {
    try { (globalThis.__ev = globalThis.__ev || []).push(JSON.parse(JSON.stringify(ev))); } catch (e) {}
    if (globalThis.__swallowAll) return;
    if (ev && ev.click && globalThis.__swallowClicks) return;
    real(ev);
  }; }
`;

// Records, at each twin key element, which one received a pointerdown (the
// element's capture phase, so a key's own stopPropagation cannot hide it).
export const RECORDER = () => {
  globalThis.__downs = [];
  const tag = () => {
    for (const e of document.querySelectorAll('[data-tw]')) {
      if (e.__rec) continue;
      e.__rec = true;
      e.addEventListener('pointerdown', (ev) => { globalThis.__downs.push({ id: e.dataset.tw, trusted: ev.isTrusted, t: performance.now() }); }, true);
    }
  };
  globalThis.__tagKeys = tag;
  const mo = new MutationObserver(() => tag());
  const go = () => { mo.observe(document.body, { childList: true, subtree: true }); tag(); };
  if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
};

export async function launch() { return chromium.launch({ executablePath: EXE }); }

export function savedState() {
  const s = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  const o = s.origins.find((x) => x.origin === ORIGIN);
  // each window is a device of its own: no remembered budget
  return { cookies: [], origins: [{ ...o, localStorage: o.localStorage.filter((l) => !/^rh\.(budgets|ghostDeck|atkSlots)$/.test(l.name)) }] };
}

export async function newCtx(b, { w, h, dpr = 1, touch = true, prefs = {}, state = true }) {
  const ctx = await b.newContext({
    viewport: { width: w, height: h }, screen: { width: w, height: h },
    deviceScaleFactor: dpr, hasTouch: touch, isMobile: touch, serviceWorkers: 'block',
    ...(state ? { storageState: savedState() } : {}),
  });
  await ctx.route('**/web.js', async (route) => {
    const resp = await route.fetch();
    const body = (await resp.text()) + HOOK;
    await route.fulfill({ response: resp, body, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
  });
  await ctx.addInitScript(RECORDER);
  await ctx.addInitScript((pr) => {
    try { for (const [k, v] of Object.entries(pr)) localStorage.setItem(`rh.${k}`, JSON.stringify(v)); } catch (e) { /* none */ }
  }, prefs);
  return ctx;
}

export async function openPage(ctx) {
  const p = await ctx.newPage();
  p.errors = [];
  p.warnings = [];
  p.on('console', (m) => { if (m.type() === 'error') p.errors.push(m.text()); if (m.type() === 'warning') p.warnings.push(m.text()); });
  p.on('pageerror', (e) => p.errors.push(`pageerror: ${e.message}`));
  await p.goto(`${ORIGIN}/index.html`);
  await p.waitForFunction(() => globalThis.__tt && !document.getElementById('boot'), null, { timeout: 60000 });
  return p;
}

// past whatever stands between a restored game and the map
export async function resume(p) {
  let settled = 0;
  for (let step = 0; step < 100; step++) {
    await sleep(300);
    const s = await p.evaluate(() => {
      const R = globalThis.__tt, $ = (id) => document.getElementById(id), line = $('line');
      return { modal: R.modalOpen, title: $('modal-title').textContent, line: !!(line && line.offsetParent),
        ckeys: !!$('ckeys'), msg: $('msgband').innerText, more: R.moreShown, status: $('statband').innerText,
        answering: !!(R.overlay && R.overlay.answering), form: !$('formwrap').hidden, waiting: R.waiting, cw: R.commandWait, picking: !!(R.overlay && R.overlay.picking) };
    });
    if (s.form) { await p.keyboard.press('Escape'); settled = 0; continue; }
    if (s.picking && s.waiting) { await p.keyboard.press('Escape'); settled = 0; continue; }
    if (s.line) { await p.fill('#line', NAME); await p.press('#line', 'Enter'); settled = 0; continue; }
    if (s.ckeys) { await p.keyboard.press(/Is this ok/i.test(s.title) ? 'y' : '*'); settled = 0; continue; }
    if (s.modal) { await p.keyboard.press(/tutorial/i.test(s.title) ? 'n' : 'Enter'); settled = 0; continue; }
    if (s.more) { await p.keyboard.press('Space'); settled = 0; continue; }
    if (s.answering || /Shall I pick/i.test(s.msg)) { await p.keyboard.press('y'); settled = 0; continue; }
    if (s.status.trim() && s.waiting && s.cw) { if (++settled >= 3) return true; }
  }
  throw new Error('game did not resume');
}

// Touches through CDP: real touch events, with a contact radius (Chrome's
// touch adjustment uses it), as a phone sends them.
export async function toucher(ctx, p) {
  const cdp = await ctx.newCDPSession(p);
  const t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const pt = (x, y, r, id = 0) => (r ? { x, y, radiusX: r, radiusY: r, id } : { x, y, id });
  return {
    cdp,
    async tap(x, y, { r = 0, hold = 0, after = 60 } = {}) {
      await t('touchStart', [pt(x, y, r)]);
      if (hold) await sleep(hold);
      await t('touchEnd', []);
      if (after) await sleep(after);
    },
    async start(x, y, r = 0) { await t('touchStart', [pt(x, y, r)]); },
    async move(x, y, r = 0) { await t('touchMove', [pt(x, y, r)]); },
    async end() { await t('touchEnd', []); },
    // two fingers: a = held, b = tapping
    async two(a, b) { await t('touchStart', [pt(a[0], a[1], 0, 0), pt(b[0], b[1], 0, 1)]); },
    async lift1(a) { await t('touchEnd', [pt(a[0], a[1], 0, 0)]); },   // finger 1 lifts, finger 0 stays
    async raw(type, pts) { await t(type, pts); },
    async slide(from, to, { steps = 10, hold = 0, r = 0 } = {}) {
      await t('touchStart', [pt(from[0], from[1], r)]);
      if (hold) await sleep(hold);
      for (let i = 1; i <= steps; i++) { await t('touchMove', [pt(from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps, r)]); await sleep(16); }
      await t('touchEnd', []);
      await sleep(80);
    },
  };
}

export const writeJson = (name, v) => fs.writeFileSync(`${DIR}/${name}`, JSON.stringify(v, null, 1));

export class Checks {
  constructor(tag) { this.tag = tag; this.list = []; }
  ok(name, pass, detail = '') {
    this.list.push({ tag: this.tag, name, pass: !!pass, detail });
    if (!pass || process.env.VERBOSE) console.log(`${pass ? 'ok  ' : 'FAIL'} ${this.tag} ${name}${detail ? ` -- ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
    return pass;
  }
  get failed() { return this.list.filter((c) => !c.pass); }
}
