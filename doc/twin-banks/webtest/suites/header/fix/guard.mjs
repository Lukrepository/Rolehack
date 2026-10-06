// A touch on the glass or the bands must not click what its lift opened under
// the finger (the review: the 'n' chip's click ate a food ration), in every
// layout.  Real CDP touches (node guard.mjs DPR).
//  1. a trap: the pointerup of a chip, the message band, the status band and
//     the map puts a button over the whole screen; that touch's click must
//     not reach it, and a touch begun on the trap still clicks it once;
//  2. the 'i' chip opens the inventory under the finger, and nothing but 'i'
//     reaches the game (the reviewer's chipghost2.mjs);
//  3. the keys' own guard still holds (INVENTORY's touch, the same trap).
import * as C from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await C.launch();
const res = [];
const ok = (name, pass, detail) => { res.push({ name, pass }); console.log(pass ? 'ok  ' : 'FAIL', name, JSON.stringify(detail)); };
for (const [w, h, prefs] of [[896, 443, {}], [443, 939, {}], [896, 443, { mapCell: 'rows' }], [896, 443, { layout: 'classic' }], [443, 939, { layout: 'classic' }]]) {
  const ctx = await C.newCtx(b, { origin: process.env.ORIGIN || C.WORK, w, h, dpr: DPR, screen: h > w ? { width: w, height: h } : { width: h, height: w }, prefs });
  const p = await C.openPage(ctx);
  await C.resume(p);
  const t = await C.touch(ctx, p);
  const tag = `${w}x${h} ${JSON.stringify(prefs)}`;
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const centre = (sel) => p.evaluate((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return { cx: r.x + Math.min(r.width / 2, 30), cy: r.y + r.height / 2 }; }, sel);
  const closeAll = async () => { for (let i = 0; i < 4; i++) { if (await p.evaluate(() => !document.getElementById('modal').hidden || !document.getElementById('formwrap').hidden)) { await p.keyboard.press('Escape'); await C.sleep(300); } } };
  const trapOn = (sel) => p.evaluate((s) => {
    window.__trap = 0;
    document.querySelector(s).addEventListener('pointerup', () => {
      if (document.getElementById('trap')) return;
      const x = document.createElement('button');
      x.id = 'trap';
      Object.assign(x.style, { position: 'fixed', inset: '0', zIndex: 99, opacity: 0.3 });
      x.addEventListener('click', () => { window.__trap++; });
      document.body.appendChild(x);
    }, { capture: true, once: true });
  }, sel);
  const cases = [
    ['a chip', '#chips button', async () => p.evaluate(() => globalThis.__bt.chips(['y', 'n', 'q']))],
    ['the message band', '#msgband', null],
    ['the status band', '#statband', null],
    ['the map', '#map', null],
    ['INVENTORY (a key)', prefs.layout === 'classic' ? null : '[data-tw="inventory"]', null],
  ];
  for (const [name, sel, setup] of cases) {
    if (!sel) continue;
    if (setup) await setup();
    const at = await centre(sel);
    await trapOn(sel);
    await C.clearEvs(p);
    await t.tap(at.cx, at.cy, 80);
    await C.sleep(300);
    const trapped = await p.evaluate(() => window.__trap);
    const pushed = (await C.evs(p)).map((e) => (e.key !== undefined ? e.key : e.click ? 'click' : '?'));
    // classic's status band lets touches through to the map: no pointerup of its own, no trap
    if (!(await p.evaluate(() => !!document.getElementById('trap')))) { console.log('n/a ', `${tag}: ${name} takes no touch here`, JSON.stringify({ pushed })); await closeAll(); continue; }
    ok(`${tag}: ${name}'s touch does not click what opened under it`, trapped === 0, { trapped, pushed });
    await t.tap(at.cx, at.cy, 60);
    await C.sleep(200);
    const trapped2 = await p.evaluate(() => window.__trap);
    ok(`${tag}: a touch begun on the trap still clicks it`, trapped2 === 1, { trapped2 });
    await p.evaluate(() => { const x = document.getElementById('trap'); if (x) x.remove(); globalThis.__bt.chips([]); });
    await closeAll();
  }
  // the reviewer's case: a chip whose key opens a window under the finger
  for (const dy of [4, 24, 44]) {
    await C.clearEvs(p);
    await p.evaluate(() => globalThis.__bt.chips(['i']));
    const r = await p.evaluate(() => { const q = document.querySelector('#chips button').getBoundingClientRect(); return [q.x, q.y, q.width]; });
    await t.tap(r[0] + r[2] / 2, r[1] + dy, 60);
    await C.sleep(800);
    const keys = (await C.evs(p)).map((e) => (e.key !== undefined ? String.fromCharCode(e.key) : JSON.stringify(e))).join('');
    const open = await p.evaluate(() => document.getElementById('modal-title').textContent);
    ok(`${tag}: the 'i' chip at dy ${dy} sends 'i' alone`, keys === 'i', { keys, open });
    await p.evaluate(() => globalThis.__bt.chips([]));
    await closeAll();
  }
  if (p.errors.length) ok(`${tag}: console`, false, p.errors);
  await ctx.close();
}
await b.close();
console.log(`guard @${DPR}: ${res.filter((r) => r.pass).length} of ${res.length}`);
