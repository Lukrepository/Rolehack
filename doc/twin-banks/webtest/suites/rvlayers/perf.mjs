process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/rvlayers';
const { launch, newCtx, openPage, resume, sleep, HEAD, WORK } = await import('../layers/common.mjs');
const b = await launch();
for (const site of ['head', 'work']) {
  const ctx = await newCtx(b, { w: 896, h: 443, dpr: 2.4375, origin: site === 'work' ? WORK : HEAD, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const r = await p.evaluate(async () => {
    const o = globalThis.__bt.overlay, ts = [];
    for (let i = 0; i < 30; i++) { const t0 = performance.now(); o.rebuild(); document.body.offsetHeight; ts.push(performance.now() - t0); await new Promise((r) => requestAnimationFrame(r)); }
    ts.sort((a, b) => a - b);
    return { median: ts[15].toFixed(2), p90: ts[27].toFixed(2), nodes: document.querySelectorAll('#keys *').length };
  });
  console.log(site, JSON.stringify(r));
  await ctx.close();
}
await b.close();
