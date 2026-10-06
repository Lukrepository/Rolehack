process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/layers/rc/probes';
const { launch, newCtx, openPage, resume, sleep } = await import('../../common.mjs');
const b = await launch();
for (const [w, h] of [[896, 443], [844, 390], [640, 360], [443, 939], [360, 640]]) {
  const ctx = await newCtx(b, { w, h, dpr: 1 });
  const p = await openPage(ctx);
  await resume(p);
  const r = await p.evaluate(() => {
    const o = globalThis.__bt.overlay, pr = o.habitSpots.pray, out = [];
    for (const id of o.twin.keys.keys()) {
      const c = o.twinCapRect(id); const cell = o.twin.guard.cells.get(id);
      const ov = (a) => a && a.x < pr.x + pr.w && pr.x < a.x + (a.w ?? a.width) && a.y < pr.y + pr.h && pr.y < a.y + (a.h ?? a.height);
      if (ov({ x: c.x, y: c.y, w: c.width, h: c.height }) || ov(cell)) out.push(`${id}${ov({ x: c.x, y: c.y, w: c.width, h: c.height }) ? '(cap)' : '(cell)'}`);
    }
    return { pray: pr, keys: out };
  });
  console.log(`${w}x${h}`, JSON.stringify(r));
  await ctx.close();
}
await b.close();
