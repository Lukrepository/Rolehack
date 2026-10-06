// Two PNGs' same region, enlarged side by side, with the differing pixels marked in a third copy.
import fs from 'node:fs';
import * as C from './common.mjs';
const [a, z, box, out] = [process.argv[2], process.argv[3], process.argv[4].split(',').map(Number), process.argv[5]];
const b = await C.launch();
const p = await (await b.newContext()).newPage();
const url = await p.evaluate(async ([A, Z, B]) => {
  const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
  const [ia, iz] = await Promise.all([load(A), load(Z)]);
  const [x0, y0, x1, y1] = B, w = x1 - x0 + 1, h = y1 - y0 + 1, S = 2;
  const c = document.createElement('canvas'); c.width = w * S * 3 + 20; c.height = h * S; const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(ia, x0, y0, w, h, 0, 0, w * S, h * S);
  x.drawImage(iz, x0, y0, w, h, w * S + 10, 0, w * S, h * S);
  const g = (i) => { const q = document.createElement('canvas'); q.width = i.width; q.height = i.height; const t = q.getContext('2d'); t.drawImage(i, 0, 0); return t.getImageData(x0, y0, w, h); };
  const da = g(ia), dz = g(iz);
  for (let k = 0; k < da.data.length; k += 4) if (da.data[k] !== dz.data[k] || da.data[k + 1] !== dz.data[k + 1] || da.data[k + 2] !== dz.data[k + 2]) { da.data[k] = 255; da.data[k + 1] = 0; da.data[k + 2] = 255; }
  const q = document.createElement('canvas'); q.width = w; q.height = h; q.getContext('2d').putImageData(da, 0, 0);
  x.drawImage(q, 0, 0, w, h, 2 * (w * S + 10), 0, w * S, h * S);
  return c.toDataURL('image/png');
}, [`data:image/png;base64,${fs.readFileSync(a).toString('base64')}`, `data:image/png;base64,${fs.readFileSync(z).toString('base64')}`, box]);
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
await b.close();
