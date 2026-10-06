// A first look at the layers: hold REST, hold the pad centre, tap CONTEXT.
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, dpr: 1 });
const p = await openPage(ctx);
await resume(p);
const t = await touch(ctx, p);
const cap = (id) => p.evaluate((id) => { const r = globalThis.__bt.overlay.twinCapRect(id); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, id);
const st = () => p.evaluate(() => { const o = globalThis.__bt.overlay; return { L: o.padLayer && { kind: o.padLayer.kind, from: o.padLayer.from, sticky: o.padLayer.sticky, lit: o.padLayer.lit },
  pad: [0,1,2,3,4,5,6,7,8].map((i) => o.padFace(i).lg.textContent).join('|'), pill: o.layerPill.classList.contains('on') ? o.layerPill.textContent : '', scrim: o.scrim.classList.contains('on'),
  counts: JSON.stringify(localStorage.getItem('rh.counts')), ev: (globalThis.__ev || []).slice(-3) }; });
const rest = await cap('rest');
await t.down([[rest.x, rest.y]]); await sleep(450);
console.log('REST held 450', await st()); await p.screenshot({ path: `${SHOTS}/quick-rest-held.png` });
await t.up(); await sleep(100);
console.log('REST lifted', await st());
await t.down([[rest.x, rest.y]]); await sleep(750); await t.up(); await sleep(100);
console.log('REST held 750 lifted', await st());
const k = await cap('pad_k'); await t.tap(k.x, k.y); await sleep(100);
console.log('tapped ↑', await st());
const c = await cap('pad_centre');
await t.down([[c.x, c.y]]); await sleep(550);
console.log('centre held', await st()); await p.screenshot({ path: `${SHOTS}/quick-here-held.png` });
const n = await cap('pad_n');
await t.move([[ (c.x + n.x) / 2, (c.y + n.y) / 2]]); await sleep(30); await t.move([[n.x, n.y]]); await sleep(50);
await t.up(); await sleep(300);
console.log('slid to ↘', await st());
await resume(p);
const ctxk = await cap('context');
await t.tap(ctxk.x, ctxk.y); await sleep(100);
console.log('CONTEXT tapped', await st()); await p.screenshot({ path: `${SHOTS}/quick-stairs.png` });
await sleep(2200);
console.log('2.2 s later', await st());
console.log('errors', p.errors);
await b.close();
