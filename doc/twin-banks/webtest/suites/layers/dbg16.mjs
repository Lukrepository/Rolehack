// glass corner at 443x939: which of WORK's new elements changes it
import fs from 'node:fs';
import { launch, newCtx, openPage, resume, sleep, HEAD, WORK, SHOTS } from './common.mjs';
const [w, h] = [443, 939];
const b = await launch();
async function shot(origin, tag, css) {
  const ctx = await newCtx(b, { w, h, dpr: 1, origin, prefs: { budgets: {}, atkSlots: [null, null] } });
  const p = await openPage(ctx); await resume(p); await sleep(1200);
  if (css) { await p.addStyleTag({ content: css }); await sleep(300); }
  const under = await p.evaluate(() => [[5, 560], [8, 562], [7, 563]].map(([x, y]) => document.elementsFromPoint(x, y).slice(0, 4).map((e) => e.tagName + '#' + e.id + '.' + (typeof e.className === 'string' ? e.className.replace(/ /g, '.') : '')).join(' > ')));
  const f = `${SHOTS}/n-${tag}.png`; await p.screenshot({ path: f });
  await ctx.close(); return { f, under };
}
const p = await (await b.newContext()).newPage();
const cmp = (A, B) => p.evaluate(async ({ A, B }) => {
  const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${s}`; });
  const [a, c] = await Promise.all([load(A), load(B)]);
  const cv = new OffscreenCanvas(a.width, a.height), x = cv.getContext('2d');
  const get = (im) => { x.clearRect(0, 0, a.width, a.height); x.drawImage(im, 0, 0); return x.getImageData(0, 0, a.width, a.height).data; };
  const da = get(a), db = get(c); let n = 0; const pts = [];
  for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i+1] !== db[i+1] || da[i+2] !== db[i+2]) { const px = (i/4)%a.width; const py = Math.floor(i/4/a.width); if (!(py >= 550 && py <= 566 && (px < 14 || px > 428))) continue; n++; if (pts.length < 6) pts.push(`${px},${Math.floor(i/4/a.width)}`); }
  return { n, pts };
}, { A: fs.readFileSync(A).toString('base64'), B: fs.readFileSync(B).toString('base64') });
const H = await shot(HEAD, 'ch');
console.log('HEAD under', H.under);
for (const [tag, css] of [['plain', ''], ['nohalo', '#keys > .halo { display: none !important; }'], ['noseam', '#keys > .seam { display: none !important; }'], ['nocells', 'button.k, .well-slot { display: none !important; }']]) {
  const W = await shot(WORK, 'c' + tag, css);
  console.log(tag, JSON.stringify(await cmp(H.f, W.f)), tag === 'plain' ? W.under : '');
}
await b.close();
