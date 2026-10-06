// What lies under a touch just past a halo (13-20 dp off a keycap), and what a
// touch there presses, with no contact radius and with a finger's.
import { launch, newCtx, openPage, resume, toucher, sleep, SP } from './common.mjs';
import { cap, spec, mark, state, reset, pushed } from './probe.mjs';
const { hitModel } = await import(`${SP}/design/v2/checks/lib.mjs`);
const [W, H] = (process.argv[2] || '443x939').split('x').map(Number);
const b = await launch();
const MACROS = [{ name: 'M1', keys: 'Q' }, { name: 'M2', keys: 'Q' }, { name: 'M3', keys: 'Q' }, { name: 'Tap', keys: 'Q' }, { name: 'Kick', keys: '^D' }, { name: 'UR', keys: 'Q' }];
const ctx = await newCtx(b, { w: W, h: H, prefs: { ghostDeck: { on: false, clean: 3, session: null }, macros: MACROS } });
const p = await openPage(ctx);
await resume(p);
await p.evaluate(() => { globalThis.__swallowAll = true; globalThis.__pd = []; window.addEventListener('pointerdown', (e) => globalThis.__pd.push({ trusted: e.isTrusted, x: e.clientX, y: e.clientY, w: e.width, h: e.height, t: `${e.target.tagName}.${String(e.target.className).slice(0, 20)}` }), true); });
const S = await spec(p);
const hm = hitModel(S);
const t = await toucher(ctx, p);
const K = {};
for (const c of S.controls) if (!c.behind) K[c.id] = await cap(p, c.id);
const pts = [];
// diagonal past the top corners of the top rows, and straight up from the top row, and in from the inner side
for (const id of ['sacrifice', 'm2', 'rest', 'world', 'keys', 'm3', 'pad_u', 'menu', 'pin1', 'combat', 'pin2', 'inventory']) {
  const k = K[id];
  for (const d of [13, 14, 16, 20, 26]) {
    pts.push({ id, why: `up ${d}`, x: k.cx, y: k.y - d });
    pts.push({ id, why: `tr ${d}`, x: k.x + k.w + d / Math.SQRT2, y: k.y - d / Math.SQRT2 });
    pts.push({ id, why: `tl ${d}`, x: k.x - d / Math.SQRT2, y: k.y - d / Math.SQRT2 });
    pts.push({ id, why: `right ${d}`, x: k.x + k.w + d, y: k.cy });
    pts.push({ id, why: `left ${d}`, x: k.x - d, y: k.cy });
  }
}
const out = [];
for (const r of [0, 10, 16]) {
  for (const q of pts) {
    if (q.x < 1 || q.y < 1 || q.x > W - 1 || q.y > H - 1) continue;
    const want = hm(q.x, q.y);
    if (want !== 'none') continue;   // only points the model says do nothing
    await reset(p); await mark(p);
    await p.evaluate(() => { globalThis.__pd = []; });
    const under = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}#${e.id}.${String(e.className).slice(0, 24)}` : null; }, [q.x, q.y]);
    await t.tap(q.x, q.y, { r, after: 40 });
    const s = await state(p);
    const sent = await pushed(p);
    const pd = await p.evaluate(() => globalThis.__pd);
    if (s.downs.length || s.log.length || sent) out.push({ r, ...q, want, under, downs: s.downs, log: s.log, sent, pd: pd.map((e) => `${e.trusted ? 'T' : 's'}:${e.t}`).join(' > ') });
  }
}
for (const o of out) console.log(JSON.stringify(o));
console.log('fired or acted on', out.length, 'model-none points');
await b.close();
