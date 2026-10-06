// Two screenshots: how many pixels differ, where, and by how much at most
// per channel.  node maxdiff.mjs a.png b.png [a.png b.png ...]
import fs from 'node:fs';
import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext()).newPage();
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const A = fs.readFileSync(args[i]).toString('base64'), B = fs.readFileSync(args[i + 1]).toString('base64');
  const r = await p.evaluate(async ({ A, B }) => {
    const load = (s) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = `data:image/png;base64,${s}`; });
    const [a, c] = await Promise.all([load(A), load(B)]);
    const cv = new OffscreenCanvas(a.width, a.height), x = cv.getContext('2d');
    x.drawImage(a, 0, 0); const da = x.getImageData(0, 0, a.width, a.height).data;
    x.clearRect(0, 0, a.width, a.height); x.drawImage(c, 0, 0); const db = x.getImageData(0, 0, a.width, a.height).data;
    let n = 0, max = 0, box = [1e9, 1e9, -1, -1];
    for (let k = 0; k < da.length; k += 4) {
      const d = Math.max(Math.abs(da[k] - db[k]), Math.abs(da[k + 1] - db[k + 1]), Math.abs(da[k + 2] - db[k + 2]));
      if (d) { n++; max = Math.max(max, d); const px = (k / 4) % a.width, py = Math.floor(k / 4 / a.width);
        box = [Math.min(box[0], px), Math.min(box[1], py), Math.max(box[2], px), Math.max(box[3], py)]; }
    }
    return { n, max, box };
  }, { A, B });
  console.log(args[i].split('/').pop(), JSON.stringify(r));
}
await b.close();
