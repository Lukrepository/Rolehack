// node crop.mjs in.png x y w h scale out.png  (CSS px at the given device scale)
import fs from 'node:fs';
import { launch } from './common.mjs';
const [IN, x, y, w, h, sc, OUT] = process.argv.slice(2);
const b = await launch(); const p = await (await b.newContext()).newPage();
const data = await p.evaluate(async ({ s, x, y, w, h, sc }) => {
  const i = await new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.src = `data:image/png;base64,${s}`; });
  const c = new OffscreenCanvas(w * sc, h * sc); c.getContext('2d').drawImage(i, x * sc, y * sc, w * sc, h * sc, 0, 0, w * sc, h * sc);
  const buf = new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer());
  let t = ''; for (let k = 0; k < buf.length; k += 0x8000) t += String.fromCharCode(...buf.subarray(k, k + 0x8000)); return btoa(t);
}, { s: fs.readFileSync(IN).toString('base64'), x: +x, y: +y, w: +w, h: +h, sc: +sc });
fs.writeFileSync(OUT, Buffer.from(data, 'base64')); await b.close();
