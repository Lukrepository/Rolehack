// Review probes for the stage "Layers on the pad and the near-miss guard".
//   node probe.mjs WxH dpr scenario[,scenario...]
process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/rvlayers';
const { launch, newCtx, openPage, resume, touch, sleep } = await import('../layers/common.mjs');
const { capOf, PAD, state, mark, pushed, popups } = await import('../layers/kit.mjs');
const [wh, dprS, list] = process.argv.slice(2);
const [w, h] = wh.split('x').map(Number);
const DPR = Number(dprS || 1);
const extraPrefs = process.env.PREFS ? JSON.parse(process.env.PREFS) : {};
const b = await launch();
const ctx = await newCtx(b, { w, h, dpr: DPR, prefs: { ghostDeck: { on: false, clean: 0, session: null }, ...extraPrefs } });
const p = await openPage(ctx);
await resume(p);
await sleep(300);
const t = await touch(ctx, p);
const out = (...a) => console.log(...a);
const cap = async (id) => { const c = await capOf(p, id); return { x: c.cx, y: c.cy, r: c }; };
const S = {};
const mod = await import(process.env.SCEN || './scen.mjs');
for (const name of (list || '').split(',').filter(Boolean)) {
  out(`== ${name}`);
  try { await mod[name]({ p, t, ctx, cap, state, mark, pushed, popups, sleep, out, PAD, w, h, DPR, resume }); } catch (e) { out('ERROR', e.stack); }
}
out('console errors:', JSON.stringify(p.errors));
await b.close();
