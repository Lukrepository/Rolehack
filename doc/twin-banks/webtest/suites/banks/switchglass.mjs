// After a run-time switch twin -> classic, the glass (bands, canvas, their
// text styles) is HEAD's classic glass: geometry and style, not text.
import { launch, newCtx, openPage, resume, sleep, HEAD, WORK, writeJson } from './common.mjs';
const b = await launch();
const glass = (p) => p.evaluate(() => Object.fromEntries(['glass', 'bands', 'msgband', 'statband', 'map', 'chips'].map((id) => {
  const e = document.getElementById(id), r = e.getBoundingClientRect(), cs = getComputedStyle(e);
  return [id, { x: r.x, y: r.y, w: r.width, h: r.height, font: cs.fontSize, lh: cs.lineHeight, pad: cs.padding, disp: cs.display, cw: e.width, ch: e.height, radius: cs.borderRadius }];
})));
const out = [];
for (const [w, h] of [[896, 443], [443, 939], [640, 360]]) {
  // HEAD's classic glass (HEAD opens twin by default since the twin banks went on the page)
  const hc = await newCtx(b, { w, h, origin: HEAD, prefs: { layout: 'classic' } }); const hp = await openPage(hc); await resume(hp); await sleep(800);
  const gh = await glass(hp);
  const wc = await newCtx(b, { w, h, origin: WORK, prefs: { budgets: {} } }); const wp = await openPage(wc); await resume(wp); await sleep(800);
  const ui0 = await wp.evaluate(() => document.documentElement.dataset.ui);
  // the setting, as Settings -> Layout saves it (P.set through the page's own prefs module)
  await wp.evaluate(async () => { const P = await import('./prefs.js'); P.set('layout', 'classic'); });
  await sleep(1200);
  const gw = await glass(wp);
  const diffs = [];
  for (const id of Object.keys(gh)) for (const k of Object.keys(gh[id])) {
    const a = gh[id][k], c = gw[id][k];
    if (typeof a === 'number' ? Math.abs(a - c) > 0.01 : a !== c) diffs.push(`${id}.${k} HEAD ${a} vs switched ${c}`);
  }
  console.log(`${w}x${h}: started ${ui0}; after the switch: ${diffs.length ? diffs.join(' | ') : 'glass identical to HEAD'}; errors ${wp.errors.length}`);
  out.push({ w, h, ui0, diffs, errors: wp.errors });
  await hc.close(); await wc.close();
}
writeJson('switchglass.json', out);
await b.close();
