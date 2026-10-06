// Interactive driver: one browser page, commands POSTed as JS bodies.
//   node server.mjs PORT W H DPR [prefsJSON]
import http from 'node:http';
import * as C from './common.mjs';
const [PORT, W, H, DPR] = process.argv.slice(2, 6).map(Number);
const prefs = JSON.parse(process.argv[6] || '{}');
const b = await C.launch();
const portrait = H > W;
const ctx = await C.newCtx(b, { w: W, h: H, dpr: DPR, screen: portrait ? { width: W, height: H } : { width: H, height: W }, prefs: { budgets: {}, ...prefs } });
const p = await C.openPage(ctx);
await C.resume(p);
const k = await C.touch(ctx, p);
const g = { p, k, ctx, C, sleep: C.sleep, state: {} };
g.tapId = async (id, hold = 0) => { const r = await C.ctlRect(p, id); if (!r) throw new Error('no ' + id); await k.tap(r.cx, r.cy, hold); return r; };
g.settle = async (ms = 3000) => { const t0 = Date.now(); let ok = 0; while (Date.now() - t0 < ms) { const s = await p.evaluate(() => ({ w: globalThis.__bt.waiting, q: globalThis.__bt.queue })); if (s.w && !s.q) { if (++ok >= 3) return true; } else ok = 0; await C.sleep(80); } return false; };
g.info = () => p.evaluate(() => { const $ = (i) => document.getElementById(i), R = globalThis.__bt; return { msg: $('msgband').innerText, st: $('statband').innerText, more: R.moreShown, modal: R.modalOpen, title: $('modal-title').textContent, body: $('modal-body').innerText.slice(0, 600), cur: R.cursor, T: R.view.T, chips: $('chips').innerText, errs: 0 }; });
g.shot = async (name) => { const f = `${C.SHOTS}/${name}.png`; await k.shot(f); return f; };
const srv = http.createServer(async (req, res) => {
  let body = ''; for await (const c of req) body += c;
  try {
    const fn = new Function('g', `return (async () => { const {p,k,ctx,C,sleep,tapId,settle,info,shot} = g; ${body} })();`);
    const out = await fn(g);
    res.end(JSON.stringify({ out, errors: p.errors.splice(0) }, null, 1));
  } catch (e) { res.end(JSON.stringify({ err: String(e && e.stack || e), errors: p.errors.splice(0) })); }
});
srv.listen(PORT, () => console.log('ready', PORT));
g.ascii = (r = 12) => p.evaluate((r) => { const B = globalThis.__bt, c = B.cursor, G = B.grid; const out = []; for (let y = Math.max(0, c.y - r); y < Math.min(21, c.y + r); y++) { let s = ''; for (let x = Math.max(0, c.x - 3*r); x < Math.min(80, c.x + 3*r); x++) { const q = G[y][x]; s += (x === c.x && y === c.y) ? '@' : (q.u ? String.fromCodePoint(q.u) : String.fromCharCode(q.ch || 32)); } out.push(String(y).padStart(2) + ' ' + s); } return out.join('\n'); }, r);
g.full = () => p.evaluate(() => { const B = globalThis.__bt, c = B.cursor, G = B.grid; const out = []; for (let y = 0; y < 21; y++) { let s = ''; for (let x = 0; x < 80; x++) { const q = G[y][x]; s += (x === c.x && y === c.y) ? '@' : (q.u ? String.fromCodePoint(q.u) : String.fromCharCode(q.ch || 32)); } out.push(String(y).padStart(2) + ' ' + s); } return out.join('\n'); });
g.heroVis = () => p.evaluate(() => { const B = globalThis.__bt, v = B.view, c = B.cursor, cv = document.getElementById('map'); const x = v.left + c.x * v.T, y = v.top + c.y * v.T; const W = cv.width / devicePixelRatio, H = cv.height / devicePixelRatio; return { x: +x.toFixed(1), y: +y.toFixed(1), inside: x >= -0.01 && y >= -0.01 && x + v.T <= W + 0.01 && y + v.T <= H + 0.01, panX: v.panX, panY: v.panY }; });
