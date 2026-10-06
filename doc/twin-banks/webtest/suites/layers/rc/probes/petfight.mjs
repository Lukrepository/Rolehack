// COMBAT armed, then the pad direction of the pet: is Fight disarmed and its lamp off after?
//   WORK=http://localhost:8766 node petfight.mjs [tries]
process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/layers/rc/probes';
const { launch, newCtx, openPage, resume, touch, sleep } = await import('../../../lrev/common.mjs');
const tries = Number(process.argv[2] || 6);
const b = await launch();
const DIRS = { '-1,-1': 'pad_y', '0,-1': 'pad_k', '1,-1': 'pad_u', '-1,0': 'pad_h', '1,0': 'pad_l', '-1,1': 'pad_b', '0,1': 'pad_j', '1,1': 'pad_n' };
let done = 0;
for (let i = 0; i < tries * 3 && done < tries; i++) {
  const ctx = await newCtx(b, { w: 896, h: 443, prefs: { ghostDeck: { on: false, clean: 3, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  const t = await touch(ctx, p);
  const pet = await p.evaluate(() => {
    const g = globalThis.__bt.grid, c = globalThis.__bt.cursor;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const q = g[c.y + dy] && g[c.y + dy][c.x + dx];
      if (q && String.fromCharCode(q.ch) === 'f') return { dx, dy };
    }
    return null;
  });
  if (!pet) { await ctx.close(); continue; }
  done++;
  const cap = (id) => p.evaluate((id) => { const r = globalThis.__bt.overlay.twinCapRect(id); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, id);
  const st = () => p.evaluate(() => { const O = globalThis.__bt.overlay; const e = O.twinEl('combat'); const l = e && e.querySelector('.lamp.armed');
    return { armed: O.armed ? O.armed.key : null, lamp: l ? l.classList.contains('on') : null, more: globalThis.__bt.moreShown, answering: !!O.answering, msg: document.getElementById('msgband').innerText.replace(/\n/g, ' | ').slice(0, 120), padTint: O.padMold && O.padMold.classList.contains('armed') }; });
  for (let n = 0; n < 6; n++) {
  const c = await cap('combat'); await t.tap(c.x, c.y); await sleep(200);
  if (process.env.ROT) { await t.rotate(n % 2 ? 896 : 443, n % 2 ? 443 : 939, 1, [443, 939]); await sleep(300); }
  const s0 = await st();
  const d = await cap(DIRS[`${pet.dx},${pet.dy}`]);
  await p.evaluate(() => { globalThis.__ev = []; });
  await t.tap(d.x, d.y); await sleep(100);
  const sA = await st();
  await sleep(500);
  const s1 = await st();
  s1.at100 = { armed: sA.armed, lamp: sA.lamp, more: sA.more };
  const sent = await p.evaluate(() => (globalThis.__ev || []).map((e) => (e.key ? String.fromCharCode(e.key) : JSON.stringify(e))).join(''));
  console.log(`${process.env.WORK || '8766'} pet at ${pet.dx},${pet.dy}: armed after COMBAT ${s0.armed}; after the direction: sent ${JSON.stringify(sent)} ${JSON.stringify(s1)}`);
  if (/kill|destroy/i.test(s1.msg) || s1.more) break;
  for (let k = 0; k < 4; k++) { const s = await st(); if (s.more) { await p.keyboard.press('Space'); await sleep(300); } else if (s.answering) { await p.keyboard.press('n'); await sleep(300); } }
  }
  // answer what's up and look again
  for (let k = 0; k < 4; k++) { const s = await st(); if (s.more) { await p.keyboard.press('Space'); await sleep(300); } else if (s.answering) { await p.keyboard.press('n'); await sleep(300); } }
  console.log('   after --More--/answers:', JSON.stringify(await st()), 'errors', JSON.stringify(p.errors));
  await ctx.close();
}
await b.close();
