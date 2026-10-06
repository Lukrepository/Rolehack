import { launch, newCtx, openPage, resume, sleep } from './common.mjs';
import fs from 'node:fs';
const src = fs.readFileSync('more.mjs', 'utf8');
const oracle = eval('(' + src.slice(src.indexOf('const ORACLE = ') + 'const ORACLE = '.length, src.indexOf('async function state(p)')).trim().replace(/;$/, '').replace(/\n\/\/[^\n]*/g, '').split('\nconst tol')[0] + ')');
const MSG = src.match(/'The hill orc swings[\s\S]*?heavy iron ball\.'/)[0];
const text = eval(MSG);
const [W, H] = (process.argv[2] || '640x360').split('x').map(Number);
const b = await launch();
const ctx = await newCtx(b, { w: W, h: H, prefs: { budgets: {}, ...(process.argv[3] ? JSON.parse(process.argv[3]) : {}) } });
await ctx.addInitScript(oracle);
const p = await openPage(ctx); await resume(p);
const r = await p.evaluate((t) => {
  const R = globalThis.__bt, m = R.bandMetrics(), mb = document.getElementById('msgband'), cs = getComputedStyle(mb);
  const rows = R.rowsOf([t]);
  const cx = document.createElement('canvas').getContext('2d'); cx.font = `${cs.fontSize} ${cs.fontFamily}`;
  const n = globalThis.__lines([t], m.slot, m.rows, 0);
  const d = globalThis.__probe, e = d.lastElementChild;
  // the DOM's lines: words by their top
  const words = []; const tn = e.firstChild; let i = 0;
  for (const w of t.split(/(\s+)/)) { if (w.trim()) { const rg = document.createRange(); rg.setStart(tn, i); rg.setEnd(tn, i + w.length); words.push({ w, top: Math.round(rg.getBoundingClientRect().top) }); } i += w.length; }
  const lines = []; let lastTop = null;
  for (const q of words) { if (q.top !== lastTop) { lines.push([]); lastTop = q.top; } lines[lines.length - 1].push(q.w); }
  return { m, n, page: rows.map((x, k) => ({ k, x, cw: cx.measureText(x).width })), dom: lines.map((l) => l.join(' ')) };
}, text);
for (let k = 0; k < Math.max(r.page.length, r.dom.length); k++) console.log(k, (r.page[k] ? `${r.page[k].cw.toFixed(1)} ${r.page[k].x}` : '').padEnd(70), '|', r.dom[k] || '');
console.log(r.m, r.n);
await b.close();
