// Review driver: one touch phone page, driven over http://localhost:9333/
// POST JSON {op, ...}. Ops: tap {x,y,hold}, drag {x,y,dx,dy,steps,hold}, key {k},
// shot {name}, eval {js}, resize {w,h}, info, type {text}
import http from 'node:http';
import fs from 'node:fs';
import { chromium, EXE, hookRoutes, sleep } from '../twin/common.mjs';

const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/review3';
const W = +process.env.W || 896, H = +process.env.H || 443, DPR = +process.env.DPR || 1;
const STATE = process.env.STATE || '';
const prefs = JSON.parse(process.env.PREFS || '{}');
const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({
  viewport: { width: W, height: H }, screen: { width: Math.min(W, H) === W ? W : W, height: H },
  deviceScaleFactor: DPR, hasTouch: true, isMobile: true, serviceWorkers: 'block',
  ...(STATE ? { storageState: STATE } : {}),
});
await hookRoutes(ctx);
await ctx.addInitScript((pr) => {
  try { for (const [k, v] of Object.entries(pr)) if (localStorage.getItem(`rh.${k}`) === null) localStorage.setItem(`rh.${k}`, JSON.stringify(v)); } catch (e) { /* none */ }
}, prefs);
const p = await ctx.newPage();
const errors = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await p.goto('http://localhost:8766/index.html');
const cdp = await ctx.newCDPSession(p);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });

const info = () => p.evaluate(() => {
  const $ = (id) => document.getElementById(id);
  const R = globalThis.__rh;
  return {
    msg: $('msgband') ? $('msgband').innerText : '',
    status: $('statband') ? $('statband').innerText : '',
    modal: R ? R.modalOpen : null,
    modalTitle: $('modal-title') ? $('modal-title').textContent : '',
    modalText: !$('modal').hidden ? $('modal').innerText.slice(0, 1500) : '',
    form: !$('formwrap').hidden ? $('formwrap').innerText.slice(0, 400) : '',
    more: R ? R.moreShown : null,
    ui: document.documentElement.dataset.ui,
    armed: R && R.overlay && R.overlay.armed ? R.overlay.armed.word : null,
    drawer: R && R.overlay ? R.overlay.drawerOpen : null,
    fan: R && R.overlay ? R.overlay.fanOpen : null,
    answering: R && R.overlay && R.overlay.answering ? true : false,
    waiting: R ? R.waiting : null, commandWait: R ? R.commandWait : null,
    chips: $('chips') ? $('chips').innerText : '',
  };
});

const server = http.createServer(async (req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', async () => {
    let out;
    try {
      const c = JSON.parse(body || '{}');
      if (c.op === 'tap') {
        await touch('touchStart', [{ x: c.x, y: c.y }]);
        await sleep(c.hold || 60);
        await touch('touchEnd', []);
        await sleep(c.wait ?? 350);
        out = await info();
      } else if (c.op === 'drag') {
        await touch('touchStart', [{ x: c.x, y: c.y }]);
        if (c.hold) await sleep(c.hold);
        const n = c.steps || 8;
        for (let i = 1; i <= n; i++) { await touch('touchMove', [{ x: c.x + (c.dx * i) / n, y: c.y + (c.dy * i) / n }]); await sleep(16); }
        if (c.holdEnd) await sleep(c.holdEnd);
        await touch('touchEnd', []);
        await sleep(c.wait ?? 350);
        out = await info();
      } else if (c.op === 'down') { await touch('touchStart', [{ x: c.x, y: c.y }]); out = 'down'; }
      else if (c.op === 'up') { await touch('touchEnd', []); await sleep(300); out = await info(); }
      else if (c.op === 'key') { await p.keyboard.press(c.k); await sleep(c.wait ?? 300); out = await info(); }
      else if (c.op === 'type') { await p.keyboard.type(c.text); await sleep(300); out = await info(); }
      else if (c.op === 'shot') { await p.screenshot({ path: `${OUT}/shots/${c.name}.png` }); out = `${OUT}/shots/${c.name}.png`; }
      else if (c.op === 'eval') { out = await p.evaluate(c.js); }
      else if (c.op === 'resize') { await p.setViewportSize({ width: c.w, height: c.h }); await sleep(c.wait ?? 700); out = await info(); }
      else if (c.op === 'info') out = await info();
      else if (c.op === 'errors') out = errors.splice(0);
      else if (c.op === 'save') { await ctx.storageState({ path: c.path, indexedDB: true }); out = c.path; }
      else if (c.op === 'quit') { res.end('bye'); await b.close(); process.exit(0); }
      else out = 'unknown op';
    } catch (e) { out = { error: String(e && e.stack || e) }; }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(out, null, 1));
  });
});
server.listen(+process.env.PORT || 9333, () => console.log('driver ready'));
