// node pxdiff.mjs a.png b.png out.png : marks differing pixels red over a dimmed a.png, and prints per-row bands
import fs from 'node:fs';
import { launch } from './common.mjs';
const [A, B, OUT] = process.argv.slice(2);
const b = await launch();
const p = await (await b.newContext()).newPage();
const r = await p.evaluate(async ({ A, B }) => {
  const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${s}`; });
  const [a, c] = await Promise.all([load(A), load(B)]);
  const W = a.width, H = a.height, cv = new OffscreenCanvas(W, H), x = cv.getContext('2d');
  x.drawImage(a, 0, 0); const da = x.getImageData(0, 0, W, H);
  x.clearRect(0, 0, W, H); x.drawImage(c, 0, 0); const db = x.getImageData(0, 0, W, H).data;
  const rows = new Map(); let maxd = 0;
  for (let i = 0; i < da.data.length; i += 4) {
    const d = Math.max(Math.abs(da.data[i] - db[i]), Math.abs(da.data[i + 1] - db[i + 1]), Math.abs(da.data[i + 2] - db[i + 2]));
    if (d) { const y = Math.floor(i / 4 / W); rows.set(y, (rows.get(y) || 0) + 1); maxd = Math.max(maxd, d); da.data[i] = 255; da.data[i + 1] = 0; da.data[i + 2] = 0; }
    else { da.data[i] *= 0.35; da.data[i + 1] *= 0.35; da.data[i + 2] *= 0.35; }
  }
  x.putImageData(da, 0, 0);
  const blob = await cv.convertToBlob({ type: 'image/png' });
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  const ys = [...rows.keys()].sort((m, n) => m - n);
  const bands = []; for (const y of ys) { const l = bands[bands.length - 1]; if (l && y === l[1] + 1) l[1] = y; else bands.push([y, y]); }
  return { png: btoa(s), bands, maxd };
}, { A: fs.readFileSync(A).toString('base64'), B: fs.readFileSync(B).toString('base64') });
fs.writeFileSync(OUT, Buffer.from(r.png, 'base64'));
console.log('max channel diff', r.maxd, 'row bands', JSON.stringify(r.bands));
await b.close();
