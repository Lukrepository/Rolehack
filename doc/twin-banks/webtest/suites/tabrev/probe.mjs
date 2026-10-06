import { launch, newCtx, openPage, resume, sleep, SHOTS } from './common.mjs';
const sizes = (process.argv[2] || '1024x768,896x443,443x939').split(',');
const dpr = Number(process.argv[3] || 1);
const touch = process.argv[4] !== 'mouse';
const b = await launch();
for (const s of sizes) {
  const [w, h] = s.split('x').map(Number);
  const ctx = await newCtx(b, { w, h, dpr, touch });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(500);
  const info = await p.evaluate(() => {
    const R = globalThis.__bt, o = R.overlay, g = R.geom;
    const panels = [...document.querySelectorAll('.rhpanel')].map((e) => { const r = e.getBoundingClientRect(); return { kind: e.dataset.kind, pane: 'pane' in e.dataset, wide: 'wide' in e.dataset, disp: e.style.display, x: r.x, y: r.y, w: r.width, h: r.height, text: e.innerText.slice(0, 300) }; });
    return { tier: document.documentElement.dataset.tier, ui: document.documentElement.dataset.ui, T: g && g.cell, map: g && g.map, panels, gp: g && g.panels, info: o.twin && { tier: o.twin.info.tier, DC: o.twin.info.DC && o.twin.info.DC.tier, fit: o.twin.spec.fit } };
  });
  console.log(s, dpr, touch ? 'touch' : 'mouse', JSON.stringify(info, null, 1));
  await p.screenshot({ path: `${SHOTS}/probe-${s}-${dpr}${touch ? '' : '-mouse'}.png` });
  console.log('errors', p.errors);
  await ctx.close();
}
await b.close();
