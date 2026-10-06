// Shared helpers for the tap-drift checks (setup.mjs, taps.mjs, dprchange.mjs).
// A copy of audit/web/common.mjs pointed at the synced build on port 8766
// (websync.sh), with two read-only hooks:
//  - web.js gets a few lines appended that expose its module state as getters
//    (globalThis.__rh) and record every click the page pushes to the core
//    (globalThis.__clicks); while globalThis.__swallowClicks is set the click is
//    recorded and not delivered, so the hero stays put and the view keeps its pan;
//  - every page gets an init script that records the #map canvas's draw calls
//    of the last frame (globalThis.__frame): the border, tile and text cells,
//    so the drawn grid is read from what was drawn, not from web.js's own maths.
import fs from 'node:fs';
let pw;
try { pw = await import('/usr/local/lib/node_modules/playwright/index.mjs'); }
catch (e) { pw = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
export const { chromium } = pw;
export const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const URL = 'http://localhost:8766/index.html';
export const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/review2';
export const STATE = `${OUT}/_state.json`;
export const NAME = 'Drift';

export const HOOK = `
;globalThis.__rh = {
  get view() { return view; }, get geom() { return geom; }, get cursor() { return cursor; },
  get focus() { return focus; }, get overlay() { return overlay; }, get moreShown() { return moreShown; },
  get page() { return page; }, get modalOpen() { return !$('modal').hidden; },
  COLNO, ROWNO, tileSize: () => tileSize(),
};
{ const realPush = push;
  push = (ev) => {
    if (ev && ev.click) { (globalThis.__clicks = globalThis.__clicks || []).push({ ...ev.click }); if (globalThis.__swallowClicks) return; }
    realPush(ev);
  }; }
`;

// Records the #map canvas's draw calls, a frame at a time (a frame starts at
// the full-canvas black fill renderMap begins with).
export const CANVAS_SPY = () => {
  const P = CanvasRenderingContext2D.prototype;
  const isMap = (cx) => cx.canvas && cx.canvas.id === 'map';
  const fillRect = P.fillRect, strokeRect = P.strokeRect, drawImage = P.drawImage, fillText = P.fillText;
  let cur = null;
  P.fillRect = function (x, y, w, h) {
    if (isMap(this) && x === 0 && y === 0 && w === this.canvas.width && h === this.canvas.height) {
      cur = { cw: this.canvas.width, ch: this.canvas.height, strokes: [], images: [], texts: 0, n: (globalThis.__frameN = (globalThis.__frameN || 0) + 1) };
      globalThis.__frame = cur;
    }
    return fillRect.call(this, x, y, w, h);
  };
  P.strokeRect = function (x, y, w, h) {
    if (isMap(this) && cur) cur.strokes.push({ x, y, w, h, style: String(this.strokeStyle), lw: this.lineWidth });
    return strokeRect.call(this, x, y, w, h);
  };
  P.drawImage = function (...a) {
    if (isMap(this) && cur && cur.images.length < 4000) {
      const d = a.length >= 9 ? a.slice(5, 9) : a.length >= 5 ? a.slice(1, 5) : [a[1], a[2], a[0].width, a[0].height];
      cur.images.push(d);
    }
    return drawImage.apply(this, a);
  };
  P.fillText = function (...a) {
    if (isMap(this) && cur) cur.texts++;
    return fillText.apply(this, a);
  };
};

export async function hookRoutes(ctx) {
  await ctx.route('**/web.js', async (route) => {
    const resp = await route.fetch();
    const body = (await resp.text()) + HOOK;
    await route.fulfill({ response: resp, body, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
  });
  await ctx.addInitScript(CANVAS_SPY);
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
  for (let step = 0; step < 60; step++) {
    await sleep(500);
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
    if (s.answering) { await p.keyboard.press('Escape'); settled = 0; continue; }
    if (s.status.trim()) { if (++settled >= 3) return log; }
  }
  throw new Error(`game did not resume:\n${log.join('\n')}`);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const exists = (p) => fs.existsSync(p);
