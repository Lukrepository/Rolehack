// Where the twin canvas sits in device pixels, at the densities where
// screen.mjs found a one-pixel compositing offset.
import { launch, newCtx, openPage, resume, sleep } from '../banks/common.mjs';
const b = await launch();
for (const [w, h, dpr] of [[896, 443, 2.4375], [915, 412, 2.625], [360, 800, 3], [443, 939, 2.4375]]) {
  const ctx = await newCtx(b, { w, h, dpr });
  const p = await openPage(ctx); await resume(p); await sleep(300);
  const s = await p.evaluate(() => { const cv = document.getElementById('map'), gl = document.getElementById('glass'), r = cv.getBoundingClientRect(), g = gl.getBoundingClientRect(), d = devicePixelRatio;
    return { dpr: d, canvas: [r.x * d, r.y * d, r.width * d, r.height * d].map((v) => +v.toFixed(3)), store: [cv.width, cv.height], glass: [g.x * d, g.y * d].map((v) => +v.toFixed(3)),
      style: [cv.style.left, cv.style.top, gl.style.left, gl.style.top], ui: document.documentElement.dataset.ui }; });
  console.log(`${w}x${h}@${dpr}`, JSON.stringify(s));
  await ctx.close();
}
await b.close();
