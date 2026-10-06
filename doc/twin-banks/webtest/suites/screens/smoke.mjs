import { launch, newCtx, openPage, resume, sleep, SHOTS } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 1024, h: 768 });
const p = await openPage(ctx);
await resume(p);
await sleep(500);
const s = await p.evaluate(() => {
  const R = globalThis.__ts;
  return { tier: document.documentElement.dataset.tier, ui: document.documentElement.dataset.ui, perm: R.permInvent,
    inv: R.invMenu && R.invMenu.items.map((i) => i.text), hist: R.history.slice(-5), panels: R.geom.panels,
    status: document.getElementById('statband').innerText };
});
console.log(JSON.stringify(s, null, 1));
await p.screenshot({ path: `${SHOTS}/smoke-1024x768.png` });
console.log(p.errors);
await b.close();
