import { launch, ctxOptions, openPage, resumeGame, OUT, STATE, sleep } from './common.mjs';
const b = await launch();
for (const [W, H] of [[896, 443], [443, 939]]) {
  const ctx = await b.newContext({ ...ctxOptions(W, H, 'touch'), storageState: STATE });
  const p = await openPage(ctx, {});
  await resumeGame(p); await sleep(400);
  const r = await p.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('#keys button.k')) {
      if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue;
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      let anc = e, tw = null; while (anc && anc.id !== 'keys') { if (anc.dataset && anc.dataset.tw) { tw = anc.dataset.tw; break; } anc = anc.parentElement; }
      if (tw) continue;
      const rr = e.getBoundingClientRect();
      out.push(`${e.getAttribute('aria-label')} @ ${rr.x.toFixed(0)},${rr.y.toFixed(0)} ${rr.width.toFixed(0)}x${rr.height.toFixed(0)} parent=${e.parentElement.className || e.parentElement.id}`);
    }
    const spec = globalThis.__rh.overlay.twin.spec.controls.map((c) => c.id);
    const built = [...globalThis.__rh.overlay.twin.keys.keys()];
    return { out, notBuilt: spec.filter((i) => !built.includes(i)), extra: built.filter((i) => !spec.includes(i)) };
  });
  console.log(W, H, JSON.stringify(r, null, 1));
  await ctx.close();
}
await b.close();
