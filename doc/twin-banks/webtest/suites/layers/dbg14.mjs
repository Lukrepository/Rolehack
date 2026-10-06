// twin at one window: HEAD vs HEAD, WORK vs WORK, HEAD vs WORK screenshots, and the glass/case rects
import fs from 'node:fs';
import { launch, newCtx, openPage, resume, sleep, HEAD, WORK, SHOTS } from './common.mjs';
const [w, h] = (process.argv[2] || '443x939').split('x').map(Number), dpr = Number(process.argv[3] || 1);
const b = await launch();
async function shot(origin, tag) {
  const ctx = await newCtx(b, { w, h, dpr, origin, prefs: { budgets: {}, atkSlots: [null, null] } });
  const p = await openPage(ctx); await resume(p); await sleep(1200);
  const f = `${SHOTS}/n-${tag}.png`; await p.screenshot({ path: f });
  const rects = await p.evaluate(() => Object.fromEntries(['glass', 'case', 'keys', 'map'].map((id) => { const e = document.getElementById(id); if (!e) return [id, null]; const r = e.getBoundingClientRect(); return [id, [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(3))]; })));
  const layers = await p.evaluate(() => [...document.querySelectorAll('#keys > .halo')].map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => +v.toFixed(2)).join(','); }));
  await ctx.close(); return { f, rects, layers };
}
const h1 = await shot(HEAD, 'h1'), h2 = await shot(HEAD, 'h2'), w1 = await shot(WORK, 'w1'), w2 = await shot(WORK, 'w2');
console.log('HEAD', JSON.stringify(h1.rects)); console.log('WORK', JSON.stringify(w1.rects)); console.log('halos', w1.layers.join(' | '));
const p = await (await b.newContext()).newPage();
const cmp = (A, B) => p.evaluate(async ({ A, B }) => {
  const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${s}`; });
  const [a, c] = await Promise.all([load(A), load(B)]);
  const cv = new OffscreenCanvas(a.width, a.height), x = cv.getContext('2d');
  const get = (im) => { x.clearRect(0, 0, a.width, a.height); x.drawImage(im, 0, 0); return x.getImageData(0, 0, a.width, a.height).data; };
  const da = get(a), db = get(c); let n = 0; const pts = [];
  for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i+1] !== db[i+1] || da[i+2] !== db[i+2]) { n++; if (pts.length < 8) pts.push(`${(i/4)%a.width},${Math.floor(i/4/a.width)}`); }
  return { n, pts };
}, { A: fs.readFileSync(A).toString('base64'), B: fs.readFileSync(B).toString('base64') });
console.log('HEAD/HEAD', JSON.stringify(await cmp(h1.f, h2.f)));
console.log('WORK/WORK', JSON.stringify(await cmp(w1.f, w2.f)));
console.log('HEAD/WORK', JSON.stringify(await cmp(h1.f, w1.f)));
await b.close();
