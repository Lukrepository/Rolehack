// Where the old SACRIFICE spot falls on twin banks' hit cells, per window.
process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/layers/rc2';
const { launch, newCtx, openPage, resume, sleep } = await import('../common.mjs');
const b = await launch();
for (const wh of (process.argv[2] || '896x443,844x390,640x360,915x412,1280x800,443x939,360x640').split(',')) {
  const [w, h] = wh.split('x').map(Number);
  const ctx = await newCtx(b, { w, h, dpr: 1 });
  const p = await openPage(ctx);
  await resume(p); await sleep(200);
  const r = await p.evaluate(() => {
    const o = globalThis.__bt.overlay, pr = o.habitSpots.pray, S = 8; // GHOST_SLOP
    const core = { x: pr.x + S, y: pr.y + S, w: pr.w - 2 * S, h: pr.h - 2 * S };
    const ov = (a, c) => Math.max(0, Math.min(a.x + a.w, c.x + c.w) - Math.max(a.x, c.x)) * Math.max(0, Math.min(a.y + a.h, c.y + c.h) - Math.max(a.y, c.y));
    const out = [];
    for (const [id, c] of o.twin.guard.cells) {
      const a = ov(pr, c), k = ov(core, c);
      if (a > 0) out.push(`${id} slop ${(100 * a / (pr.w * pr.h)).toFixed(0)}% core ${(100 * k / (core.w * core.h)).toFixed(0)}%`);
    }
    return { pr: [pr.x, pr.y, pr.w, pr.h].map((v) => Math.round(v)), out };
  });
  console.log(wh, JSON.stringify(r.pr), r.out.join('; '));
  await ctx.close();
}
await b.close();
