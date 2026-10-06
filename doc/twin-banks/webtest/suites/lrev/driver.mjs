// Review driver: one live phone page, driven over HTTP so the game can be
// played step by step (curl localhost:9911 -d '{"op":"tap","x":..,"y":..}').
import http from 'node:http';
import fs from 'node:fs';
import { launch, newCtx, openPage, resume, touch, sleep } from './common.mjs';

const [W, H, DPR, FRESH] = [+(process.argv[2] || 896), +(process.argv[3] || 443), +(process.argv[4] || 1), process.argv[5] === 'fresh'];
const b = await launch();
const ctx = await newCtx(b, { w: W, h: H, dpr: DPR, state: !FRESH, screen: { width: Math.min(W, H), height: Math.max(W, H) } });
const p = await openPage(ctx);
const t = await touch(ctx, p);
const log = [];
p.on('console', (m) => log.push(`${m.type()}: ${m.text()}`));
if (!FRESH) await resume(p);

const S = () => p.evaluate(() => {
  const R = globalThis.__bt, o = R.overlay, $ = (id) => document.getElementById(id);
  const L = o.padLayer;
  return {
    msg: $('msgband').innerText, status: $('statband').innerText, more: R.moreShown, modal: R.modalOpen,
    modalTitle: $('modal-title').textContent, modalText: R.modalOpen ? $('modal').innerText.slice(0, 1500) : '',
    form: !$('formwrap').hidden, waiting: R.waiting, commandWait: R.commandWait,
    layer: L ? { kind: L.kind, from: typeof L.from === 'string' ? L.from : L.fromId, sticky: !!L.sticky, lit: L.lit } : null,
    fan: o.fanOpen ? String(o.fanOpen.id || o.fanOpen) : null, armed: o.armed ? o.armed.key : null, answering: !!o.answering,
    drawer: o.drawerOpen || null, picking: !!o.picking, scrim: o.scrim.classList.contains('on'),
    pill: o.layerPill && o.layerPill.classList.contains('on') ? o.layerPill.textContent : '',
    guard: (o.guardLog || []).slice(-6).map((g) => `${g.what}${g.id ? ':' + g.id : ''}@${g.x},${g.y}`),
    cursor: R.cursor, view: { T: R.view.T, left: R.view.left, top: R.view.top },
  };
});

const srv = http.createServer(async (req, res) => {
  let body = '';
  for await (const c of req) body += c;
  let out;
  try {
    const c = JSON.parse(body || '{}');
    switch (c.op) {
      case 'tap': await t.tap(c.x, c.y, c.hold || 0); break;
      case 'drag': await t.drag(c.x, c.y, c.dx, c.dy, c.steps || 8); break;
      case 'down': await t.down(c.pts); break;
      case 'move': await t.move(c.pts); break;
      case 'up': await t.up(); break;
      case 'raw': await t.cdp.send('Input.dispatchTouchEvent', { type: c.type, touchPoints: c.pts.map(([x, y, id]) => ({ x, y, id })) }); break;
      case 'key': await p.keyboard.press(c.k); break;
      case 'type': await p.keyboard.type(c.s); break;
      case 'sleep': await sleep(c.ms); break;
      case 'rotate': await t.rotate(c.w, c.h, DPR, c.screen || [Math.min(c.w, c.h), Math.max(c.w, c.h)]); break;
      case 'eval': out = await p.evaluate(c.js); break;
      case 'shot': await t.shot(c.path); break;
      case 'log': out = log.splice(0); break;
      case 'quit': res.end('bye'); await b.close(); process.exit(0);
    }
    if (c.wait !== 0) await sleep(c.wait || 250);
    const st = await S();
    res.end(JSON.stringify({ out, st, errors: p.errors.splice(0) }, null, 1));
  } catch (e) { res.end(JSON.stringify({ error: String(e && e.stack || e) })); }
});
srv.listen(+(process.env.PORT || 9911), () => console.log('driver up', W, H, DPR));
