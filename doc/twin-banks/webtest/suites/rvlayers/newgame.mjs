// A new game in twin banks, the ghost deck on (a new player), creation by
// thumb-sized touches on the creation keys; then a few steps.
process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/rvlayers';
const { launch, newCtx, openPage, touch, sleep } = await import('../layers/common.mjs');
const [wh] = process.argv.slice(2);
const [w, h] = wh.split('x').map(Number);
const b = await launch();
const ctx = await newCtx(b, { w, h, dpr: 2.4375, state: false });
const p = await openPage(ctx);
const t = await touch(ctx, p);
const tapEl = async (sel, re) => {
  const q = await p.evaluate(([sel, re]) => { const k = [...document.querySelectorAll(sel)].find((n) => n.offsetParent && (!re || new RegExp(re, 'i').test(n.textContent))); if (!k) return null; const r = k.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: k.textContent.trim().slice(0, 30) }; }, [sel, re]);
  if (!q) return null;
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: q.x, y: q.y, radiusX: 15, radiusY: 15 }] });
  await sleep(50);
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(400);
  return q.t;
};
const log = [];
for (let i = 0; i < 40; i++) {
  const s = await p.evaluate(() => ({ title: document.getElementById('modal-title').textContent, modal: !document.getElementById('modal').hidden,
    line: !!(document.getElementById('line') && document.getElementById('line').offsetParent), ck: !!document.getElementById('ckeys'), more: globalThis.__bt.moreShown, status: document.getElementById('statband').innerText.trim(), waiting: globalThis.__bt.waiting }));
  if (s.line) { await p.fill('#line', 'Rev'); await p.press('#line', 'Enter'); log.push('name'); await sleep(500); continue; }
  if (s.ck) { const got = await tapEl('#ckeys .ck', /Is this ok/i.test(s.title) ? 'yes' : '') ; log.push(`ck:${s.title.slice(0, 30)} -> ${got}`); continue; }
  if (s.modal) { const got = await tapEl('#modal .deck .cap', 'no|ok|esc') || (await p.keyboard.press('Escape'), 'Esc'); log.push(`modal:${s.title.slice(0, 30)} -> ${got}`); continue; }
  if (s.more) { await p.keyboard.press('Space'); log.push('more'); await sleep(300); continue; }
  if (s.status && s.waiting) break;
  const msg = await p.evaluate(() => document.getElementById('msgband').innerText);
  if (/\[yn/.test(msg) || /Shall I pick/.test(msg)) {
    const chips = await p.evaluate(() => [...document.querySelectorAll('#chips > *')].map((c) => c.textContent.trim()));
    const got = await tapEl('#chips > *', '^n') ; log.push(`yn:${msg.slice(0, 40)} chips ${chips.join('/')} -> ${got}`);
    if (!got) { await p.keyboard.press('n'); }
    continue;
  }
  log.push(`?? ${JSON.stringify(s).slice(0, 120)} msg ${msg.slice(0, 60)}`);
  await sleep(400);
}
console.log(log.join('\n'));
const st = await p.evaluate(() => ({ ui: document.documentElement.dataset.ui, ghost: localStorage.getItem('rh.ghostDeck'), guard: (globalThis.__bt.overlay.guardLog || []).length, status: document.getElementById('statband').innerText.trim().slice(0, 80) }));
console.log(JSON.stringify(st));
console.log('errors', JSON.stringify(p.errors));
await b.close();
