// Crop and enlarge: node crop.mjs in.png x y w h scale out.png
import fs from 'node:fs';
import { launch } from './common.mjs';
const [IN, x, y, w, h, k, OUT] = process.argv.slice(2);
const b = await launch();
const p = await (await b.newContext()).newPage();
const png = await p.evaluate(async ({ s, x, y, w, h, k }) => {
  const i = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = `data:image/png;base64,${s}`; });
  const cv = new OffscreenCanvas(w * k, h * k), c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(i, x, y, w, h, 0, 0, w * k, h * k);
  const buf = new Uint8Array(await (await cv.convertToBlob({ type: 'image/png' })).arrayBuffer());
  let t = ''; for (const v of buf) t += String.fromCharCode(v); return btoa(t);
}, { s: fs.readFileSync(IN).toString('base64'), x: +x, y: +y, w: +w, h: +h, k: +k });
fs.writeFileSync(OUT, Buffer.from(png, 'base64'));
await b.close();
