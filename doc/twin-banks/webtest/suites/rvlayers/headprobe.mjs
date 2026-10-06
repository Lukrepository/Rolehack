// The same finger probes on HEAD's page (no guard), for comparison.
process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/rvlayers';
const { launch, newCtx, openPage, resume, touch, sleep, HEAD, WORK } = await import('../layers/common.mjs');
const [wh, site] = process.argv.slice(2);
const [w, h] = wh.split('x').map(Number);
const b = await launch();
const ctx = await newCtx(b, { w, h, dpr: 1, origin: site === 'work' ? WORK : HEAD, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(300);
const t = await touch(ctx, p);
const probe = async (x, y, r) => {
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, radiusX: r, radiusY: r }] });
  await sleep(30);
  const q = await p.evaluate(([x, y]) => {
    const k = document.querySelector('#keys .k.pressed'); const tw = k && k.closest('[data-tw]');
    const n = document.elementFromPoint(x, y);
    const log = ((globalThis.__bt.overlay.guardLog) || []).map((g) => g.what).join(',');
    globalThis.__bt.overlay.guardLog = [];
    return `${k ? (tw ? tw.dataset.tw : 'other') : (log || '-')} [${n ? (n.id || n.className) : ''}]`;
  }, [x, y]);
  await t.cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await sleep(20);
  return q;
};
const rect = (id) => p.evaluate((id) => { const o = globalThis.__bt.overlay; const r = o.twinCapRect ? o.twinCapRect(id) : o.twinEl(id).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, id);
for (const [id, dir] of [['rest', 'up'], ['world', 'up'], ['m2', 'up'], ['m2', 'in'], ['eq_wear', 'in'], ['menu', 'in'], ['sacrifice', 'in']]) {
  const c = await rect(id), row = [];
  for (const d of [4, 8, 10, 12, 14, 16, 18, 22]) {
    const x = dir === 'up' ? c.x + c.w / 2 : (c.x + c.w / 2 < w / 2 ? c.x + c.w + d : c.x - d), y = dir === 'up' ? c.y - d : c.y + c.h / 2;
    row.push(`${d}:${await probe(x, y, 15)}`);
  }
  console.log(`${site || 'head'} ${id} ${dir}: ${row.join('  ')}`);
}
console.log('errors', JSON.stringify(p.errors));
await b.close();
