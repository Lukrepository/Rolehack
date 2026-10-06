import { launch, newCtx, openPage, resume, sleep } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 1024, h: 768 });
const p = await openPage(ctx);
await resume(p);
const s = await p.evaluate(() => {
  const o = globalThis.__ts.overlay;
  const els = [...document.querySelectorAll('#keys [data-tw]')].map((e) => {
    const cap = e.querySelector(':scope > .kcap'); const r = (cap || e).getBoundingClientRect();
    return { id: e.dataset.tw, cap: !!cap, r: [r.x, r.y, r.width, r.height], disp: getComputedStyle(e).display, vis: getComputedStyle(e).visibility };
  });
  return { ids: o.twin.spec.controls.map((c) => c.id), els, settings: o.twin.settings, budget: o.twin.budget, pointer: o.twin.spec.pointer,
    textScale: o.geom.textScale, statusH: o.geom.statusLinesH, chrome: o.twin.spec.chrome.map((c) => c.name), decor: (o.twin.spec.decor||[]).map(d=>d.name) };
});
console.log(JSON.stringify(s, null, 0));
await b.close();
