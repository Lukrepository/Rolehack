// The largest difference of any colour channel between two screenshots, and
// how many pixels differ by more than 2: node pxmax.mjs a.png b.png
import fs from 'node:fs';
import { launch } from './common.mjs';
const [A, B] = process.argv.slice(2);
const b = await launch();
const p = await (await b.newContext()).newPage();
console.log(await p.evaluate(async ({ A, B }) => {
  const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${s}`; });
  const [a, c] = await Promise.all([load(A), load(B)]);
  const cv = new OffscreenCanvas(a.width, a.height), x = cv.getContext('2d');
  x.drawImage(a, 0, 0); const da = x.getImageData(0, 0, a.width, a.height).data;
  x.clearRect(0, 0, a.width, a.height); x.drawImage(c, 0, 0); const db = x.getImageData(0, 0, a.width, a.height).data;
  let max = 0, over2 = 0, n = 0;
  for (let i = 0; i < da.length; i += 4) {
    const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
    if (d) n++; if (d > 2) over2++; if (d > max) max = d;
  }
  return `${n} pixels differ, by at most ${max} of 255; ${over2} by more than 2`;
}, { A: fs.readFileSync(A).toString('base64'), B: fs.readFileSync(B).toString('base64') }));
await b.close();
