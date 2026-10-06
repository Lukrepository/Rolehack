// A live browser for playing by hand: node play.mjs WxH dpr port [fresh]
// POST JS (an async function body with ctx, p, k, H in scope) to the port.
import http from 'node:http';
import fs from 'node:fs';
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, ctlRect } from './common.mjs';

const [W, Hh] = (process.argv[2] || '896x443').split('x').map(Number);
const DPR = Number(process.argv[3] || 1);
const PORT = Number(process.argv[4] || 9333);
const b = await launch();
const portrait = Hh > W;
const ctx = await newCtx(b, { w: W, h: Hh, dpr: DPR, screen: portrait ? { width: W, height: Hh } : { width: Hh, height: W }, prefs: { budgets: {} } });
const p = await openPage(ctx);
await resume(p);
const k = await touch(ctx, p);
const H = {
  sleep, ctlRect, SHOTS, fs,
  async tapId(id, hold = 0) { const r = await ctlRect(p, id); if (!r) throw new Error(`no ${id}`); await k.tap(r.cx, r.cy, hold); return r; },
  async settle(ms = 4000) {
    const t0 = Date.now(); let ok = 0;
    while (Date.now() - t0 < ms) {
      const s = await p.evaluate(() => ({ w: globalThis.__bt.waiting, q: globalThis.__bt.queue }));
      if (s.w && !s.q) { if (++ok >= 3) return true; } else ok = 0;
      await sleep(60);
    }
    return false;
  },
  async state() {
    return p.evaluate(() => {
      const B = globalThis.__bt, $ = (id) => document.getElementById(id);
      return { msg: $('msgband').innerText.replace(/\s+/g, ' ').trim(), status: $('statband').innerText.replace(/\s+/g, ' ').trim(),
        more: B.moreShown, modal: B.modalOpen, title: $('modal-title').textContent, cursor: B.cursor, focus: B.focus,
        view: { T: B.view.T, left: B.view.left, top: B.view.top, panX: B.view.panX, panY: B.view.panY, area: B.view.area },
        chips: [...document.querySelectorAll('#chips button')].map((b) => b.textContent) };
    });
  },
  async shot(name) { const f = `${SHOTS}/${name}.png`; await k.shot(f); return f; },
};
const server = http.createServer(async (req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', async () => {
    try {
      const fn = new Function('ctx', 'p', 'k', 'H', `return (async () => { ${body} })();`);
      const out = await fn(ctx, p, k, H);
      res.end(JSON.stringify({ ok: true, out, errors: p.errors.splice(0) }, null, 1));
    } catch (e) {
      res.end(JSON.stringify({ ok: false, err: String(e && e.stack || e), errors: p.errors.splice(0) }, null, 1));
    }
  });
});
server.listen(PORT, () => console.log(`ready ${W}x${Hh}@${DPR} on ${PORT}`));
