// Two screenshots and where they differ: node pxshow.mjs a.png b.png out.png
// (out: b dimmed, the differing pixels red), and the boxes of the differences.
import fs from 'node:fs';
import { launch } from './common.mjs';
const [A, B, OUT] = process.argv.slice(2);
const b = await launch();
const p = await (await b.newContext()).newPage();
const r = await p.evaluate(async ({ A, B }) => {
  const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${s}`; });
  const [a, c] = await Promise.all([load(A), load(B)]);
  const W = a.width, H = a.height, cv = new OffscreenCanvas(W, H), x = cv.getContext('2d');
  x.drawImage(a, 0, 0); const da = x.getImageData(0, 0, W, H).data;
  x.clearRect(0, 0, W, H); x.drawImage(c, 0, 0); const img = x.getImageData(0, 0, W, H), db = img.data;
  const rows = new Map();
  for (let i = 0; i < da.length; i += 4) {
    const diff = da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2];
    if (diff) { db[i] = 255; db[i + 1] = 0; db[i + 2] = 0; const px = (i / 4) % W, py = Math.floor(i / 4 / W); const k = `${Math.floor(px / 20) * 20},${Math.floor(py / 20) * 20}`; rows.set(k, (rows.get(k) || 0) + 1); }
    else { db[i] = db[i] * 0.45; db[i + 1] = db[i + 1] * 0.45; db[i + 2] = db[i + 2] * 0.45; }
  }
  x.putImageData(img, 0, 0);
  const blob = await cv.convertToBlob({ type: 'image/png' });
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (const v of buf) s += String.fromCharCode(v);
  return { png: btoa(s), cells: [...rows.entries()].sort((q, w) => w[1] - q[1]).slice(0, 12) };
}, { A: fs.readFileSync(A).toString('base64'), B: fs.readFileSync(B).toString('base64') });
fs.writeFileSync(OUT, Buffer.from(r.png, 'base64'));
console.log(JSON.stringify(r.cells));
await b.close();
