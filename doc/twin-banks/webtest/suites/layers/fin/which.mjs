process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/layers/fin';
const { launch, newCtx, openPage, resume, sleep } = await import('../common.mjs');
const b = await launch();
for (const [w, h, x, y] of [[896, 443, 716, 263], [640, 360, 510, 200], [443, 939, 263, 759]]) {
  const ctx = await newCtx(b, { w, h, prefs: {} });
  const p = await openPage(ctx);
  await resume(p);
  console.log(w, h, await p.evaluate(([x, y]) => { const o = globalThis.__bt.overlay; return o.twin.spec.controls.filter((c) => !c.behind).filter((c) => { const r = o.twinCapRect(c.id); return x >= r.x && x <= r.right && y >= r.y && y <= r.bottom; }).map((c) => `${c.id}: ${o.twinEl(c.id).innerText.replace(/\s+/g, ' ')}`); }, [x, y]));
  await ctx.close();
}
await b.close();
