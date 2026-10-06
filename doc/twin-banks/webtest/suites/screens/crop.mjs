// crop.mjs a.png b.png x y w h scale out.png : the two crops side by side, scaled, plus the differing pixels' values
import { launch } from './common.mjs';
import fs from 'node:fs';
const [a, z, x, y, w, h, sc, out] = process.argv.slice(2);
const b = await launch(); const p = await (await b.newContext()).newPage();
const r = await p.evaluate(async ({ a, z, x, y, w, h, sc }) => {
  const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
  const [A, Z] = await Promise.all([load(a), load(z)]);
  const c = document.createElement('canvas'); c.width = w * sc * 2 + 10; c.height = h * sc; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  g.fillStyle = '#f0f'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(A, x, y, w, h, 0, 0, w * sc, h * sc); g.drawImage(Z, x, y, w, h, w * sc + 10, 0, w * sc, h * sc);
  const px = (I) => { const k = document.createElement('canvas'); k.width = I.width; k.height = I.height; const q = k.getContext('2d'); q.drawImage(I, 0, 0); return q.getImageData(x, y, w, h).data; };
  const da = px(A), dz = px(Z), diffs = [];
  for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - dz[i]) > 8 || Math.abs(da[i + 1] - dz[i + 1]) > 8 || Math.abs(da[i + 2] - dz[i + 2]) > 8) diffs.push([x + (i / 4) % w, y + Math.floor(i / 4 / w), [...da.slice(i, i + 3)], [...dz.slice(i, i + 3)]]);
  return { url: c.toDataURL(), diffs };
}, { a: 'data:image/png;base64,' + fs.readFileSync(a).toString('base64'), z: 'data:image/png;base64,' + fs.readFileSync(z).toString('base64'), x: +x, y: +y, w: +w, h: +h, sc: +sc });
fs.writeFileSync(out, Buffer.from(r.url.split(',')[1], 'base64'));
console.log(JSON.stringify(r.diffs));
await b.close();
