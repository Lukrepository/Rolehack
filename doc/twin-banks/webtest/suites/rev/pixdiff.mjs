import { launch } from './common.mjs';
import fs from 'node:fs';
export async function pixdiff(b, f1, f2) {
  const p = await b.newPage();
  const d1 = fs.readFileSync(f1).toString('base64'), d2 = fs.readFileSync(f2).toString('base64');
  const r = await p.evaluate(async ([a, c]) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = 'data:image/png;base64,' + s; });
    const [i1, i2] = await Promise.all([load(a), load(c)]);
    const get = (i) => { const cv = document.createElement('canvas'); cv.width = i.width; cv.height = i.height; const x = cv.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
    const A = get(i1), B = get(i2);
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < i1.height; y++) for (let x = 0; x < i1.width; x++) {
      const k = (y * i1.width + x) * 4;
      const dd = Math.max(Math.abs(A[k]-B[k]),Math.abs(A[k+1]-B[k+1]),Math.abs(A[k+2]-B[k+2])); globalThis.mx = Math.max(globalThis.mx||0, dd); if (dd) { n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    }
    return { mx: globalThis.mx, n, box: n ? [x0, y0, x1, y1] : null, size: [i1.width, i1.height, i2.width, i2.height] };
  }, [d1, d2]);
  await p.close();
  return r;
}
if (process.argv[2]) { const b = await launch(); console.log(await pixdiff(b, process.argv[2], process.argv[3])); await b.close(); }
