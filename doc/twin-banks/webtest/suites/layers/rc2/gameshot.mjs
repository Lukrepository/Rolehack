// What the SACRIFICE flash looks like over the drawer a hold of the old spot opened.
process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/layers/rc2';
const { launch, newCtx, openPage, resume, touch, sleep } = await import('../common.mjs');
const b = await launch();
for (const wh of (process.argv[2] || '443x939,844x390').split(',')) {
  const [w, h] = wh.split('x').map(Number);
  const ctx = await newCtx(b, { w, h, dpr: 1 });
  const p = await openPage(ctx);
  await resume(p); await sleep(300);
  const t = await touch(ctx, p);
  await p.evaluate(() => { globalThis.__swallowClicks = true; });
  const pr = await p.evaluate(() => JSON.parse(JSON.stringify(globalThis.__bt.overlay.habitSpots.pray)));
  const g = await p.evaluate(() => { const r = globalThis.__bt.overlay.twinEl('game').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  const x = Math.min(Math.max(g.x, pr.x + 2), pr.x + pr.w - 2), y = Math.min(Math.max(g.y, pr.y + 2), pr.y + pr.h - 2);
  await t.down([[x, y]]); await sleep(450); await t.up(); await sleep(120);
  await t.shot(`${process.env.OUTDIR}/shots/gamehold-${wh}.png`);
  console.log(wh, 'ghost', await p.evaluate(() => globalThis.__bt.overlay.ghostEl.classList.contains('on')));
  await ctx.close();
}
await b.close();
