// node zoomcrop.mjs a.png b.png x y w h zoom out.png : the same region of two shots, side by side, enlarged
import fs from 'node:fs';
import { launch } from '../banks/common.mjs';
const [A, B, x, y, w, h, z, OUT] = process.argv.slice(2);
const br = await launch(); const p = await (await br.newContext()).newPage();
const data = await p.evaluate(async ({ a, b, x, y, w, h, z }) => {
  const ld = (s) => new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.src = `data:image/png;base64,${s}`; });
  const [i1, i2] = await Promise.all([ld(a), ld(b)]);
  const c = new OffscreenCanvas(w * z * 2 + 10, h * z), cx = c.getContext('2d');
  cx.imageSmoothingEnabled = false; cx.fillStyle = '#f0f'; cx.fillRect(0, 0, c.width, c.height);
  cx.drawImage(i1, x, y, w, h, 0, 0, w * z, h * z); cx.drawImage(i2, x, y, w, h, w * z + 10, 0, w * z, h * z);
  const buf = new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer());
  let t = ''; for (let k = 0; k < buf.length; k += 0x8000) t += String.fromCharCode(...buf.subarray(k, k + 0x8000)); return btoa(t);
}, { a: fs.readFileSync(A).toString('base64'), b: fs.readFileSync(B).toString('base64'), x: +x, y: +y, w: +w, h: +h, z: +z });
fs.writeFileSync(OUT, Buffer.from(data, 'base64')); await br.close();
