import { launch, newCtx, openPage, resume, sleep } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, prefs: { budgets: {}, msgFont: 'screen' } });
const p = await openPage(ctx); await resume(p);
const t = 'The kitten picks up a gnome lord corpse.';
const r = await p.evaluate((t) => {
  const R = globalThis.__bt, mb = document.getElementById('msgband'), cs = getComputedStyle(mb);
  const cx = document.createElement('canvas').getContext('2d'); cx.font = `${cs.fontSize} ${cs.fontFamily}`;
  const d = document.createElement('div'); mb.appendChild(d);
  d.style.cssText = `position:absolute;left:0;top:0;white-space:pre`; d.textContent = t;
  const fonts = [...document.fonts].map((f) => `${f.family}:${f.status}`);
  const out = { font: cx.font, canvas: cx.measureText(t).width, dom: d.getBoundingClientRect().width, more: cx.measureText('--More--').width, m: R.bandMetrics(), fonts, rows: R.rowsOf(['You see here a +0 dagger.', t]) };
  d.remove();
  return out;
}, t);
console.log(JSON.stringify(r, null, 1));
await b.close();
