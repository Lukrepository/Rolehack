// Real prompts in the game with the header over the banks and in the glass.
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, evs, clearEvs } from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await launch();
for (const [mc, w, h, scr] of [['rows', 896, 443, [443, 939]], ['columns', 896, 443, [443, 939]], ['columns', 1024, 768, null]]) {
  const ctx = await newCtx(b, { w, h, dpr: DPR, screen: scr ? { width: scr[1], height: scr[0] } : null, prefs: { mapCell: mc } });
  const p = await openPage(ctx);
  await resume(p);
  const k = await touch(ctx, p);
  const geo = () => p.evaluate(() => {
    const R = (e) => { const q = e.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, h: q.height }; };
    const c = document.getElementById('chips');
    return { msg: document.getElementById('msgband').innerText, chips: [...c.querySelectorAll('button')].map((e) => ({ t: e.textContent, ...R(e) })),
      top: (() => { const bs = [...c.querySelectorAll('button')]; if (!bs.length) return null; const q = bs[0].getBoundingClientRect(); const el = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2); return el && (el.id || el.className || el.tagName); })(),
      more: globalThis.__bt.moreShown };
  });
  // eat: a getobj prompt with chips
  await p.evaluate(() => globalThis.__bt.send('e'));
  await sleep(500);
  let g = await geo();
  console.log(mc, w, h, 'eat prompt:', JSON.stringify(g.msg), 'chips', g.chips.map((c) => `${c.t}@${Math.round(c.x)},${Math.round(c.y)}`).join(' '), 'hit at first chip:', g.top);
  await k.shot(`${SHOTS}/flow-${mc}-${w}x${h}-eat-${DPR}.png`);
  // tap the Esc chip
  const esc = g.chips.find((c) => c.t === 'ESC' || /esc/i.test(c.t)) || g.chips[g.chips.length - 1];
  if (esc) await k.tap(esc.x + esc.w / 2, esc.y + esc.h / 2);
  await sleep(400);
  g = await geo();
  console.log('  after Esc chip:', JSON.stringify(g.msg), 'chips left', g.chips.length);
  // pray: a yn question
  await p.evaluate(() => globalThis.__bt.send('#pray\n'));
  await sleep(300);


  await sleep(600);
  g = await geo();
  console.log('  pray:', JSON.stringify(g.msg), 'chips', g.chips.map((c) => c.t).join(' '), 'modal', await p.evaluate(() => globalThis.__bt.modalOpen));
  await k.shot(`${SHOTS}/flow-${mc}-${w}x${h}-pray-${DPR}.png`);
  const n = g.chips.find((c) => c.t === 'n');
  if (n) await k.tap(n.x + n.w / 2, n.y + n.h / 2);
  await sleep(500);
  g = await geo();
  console.log('  after n:', JSON.stringify(g.msg), 'chips', g.chips.length, 'errors', p.errors);
  await ctx.close();
}
await b.close();
