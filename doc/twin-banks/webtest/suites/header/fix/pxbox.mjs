// The bounding box of the pixels that differ between two PNGs (in a browser canvas).
import fs from 'node:fs';
import * as C from './common.mjs';
const [a, z] = process.argv.slice(2);
const b = await C.launch();
const p = await (await b.newContext()).newPage();
const r = await p.evaluate(async ([A, Z]) => {
  const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
  const [ia, iz] = await Promise.all([load(A), load(Z)]);
  const px = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
  const da = px(ia), dz = px(iz);
  let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < ia.height; y++) for (let x = 0; x < ia.width; x++) {
    const k = (y * ia.width + x) * 4;
    if (da[k] !== dz[k] || da[k + 1] !== dz[k + 1] || da[k + 2] !== dz[k + 2]) { n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  return { n, box: [x0, y0, x1, y1], size: [ia.width, ia.height] };
}, [a, z].map((f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`));
console.log(JSON.stringify(r));
await b.close();
