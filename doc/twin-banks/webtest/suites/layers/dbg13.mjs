// pixel values on a row / column of two screenshots: node dbg13.mjs a b row|col N from to
import fs from 'node:fs';
import { launch } from './common.mjs';
const [A, B, kind, N, from, to] = process.argv.slice(2);
const b = await launch();
const p = await (await b.newContext()).newPage();
console.log(await p.evaluate(async ({ A, B, kind, N, from, to }) => {
  const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${s}`; });
  const [a, c] = await Promise.all([load(A), load(B)]);
  const cv = new OffscreenCanvas(a.width, a.height), x = cv.getContext('2d');
  const get = (im) => { x.clearRect(0, 0, a.width, a.height); x.drawImage(im, 0, 0); return x.getImageData(0, 0, a.width, a.height).data; };
  const da = get(a), db = get(c), out = [];
  for (let t = from; t <= to; t++) { const px = kind === 'row' ? t : N, py = kind === 'row' ? N : t, i = (py * a.width + px) * 4;
    out.push(`${t}:${da[i]},${da[i+1]},${da[i+2]}/${db[i]},${db[i+1]},${db[i+2]}`); }
  return out.join(' ');
}, { A: fs.readFileSync(A).toString('base64'), B: fs.readFileSync(B).toString('base64'), kind, N: +N, from: +from, to: +to }));
await b.close();
