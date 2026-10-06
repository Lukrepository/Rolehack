// A portrait-only player: the page opened full screen in portrait (never
// turned), then the phone splits the screen beside a wiki (443x460, the
// design's own example, section 12 and test 7), then a 2/3 split (443x640),
// then the split closes.  Expected: classic at 443x460, twin at 58 dp keys
// otherwise.
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, writeJson } from './common.mjs';
const b = await launch();
const out = [];
const ctx = await newCtx(b, { w: 443, h: 939, screen: { width: 443, height: 939 }, prefs: { budgets: {} } });
const p = await openPage(ctx); await resume(p);
const k = await touch(ctx, p);
const look = async (label, w, h) => {
  const s = await p.evaluate(() => { const o = globalThis.__bt.overlay, t = o.twin, e = document.querySelector('[data-tw="pad_b"]'), r = e && e.getBoundingClientRect();
    return { ui: document.documentElement.dataset.ui, budget: t ? t.settings.budget : null, fit: t ? t.spec.fit.level : null, pad: t ? +t.spec.fit.pad.toFixed(2) : null,
      padKeyDom: r ? `${r.width.toFixed(2)}x${r.height.toFixed(2)}` : null, stored: JSON.parse(localStorage.getItem('rh.budgets') || '{}').browser }; });
  const shot = `${SHOTS}/split-${label}-${w}x${h}.png`;
  await k.shot(shot);
  out.push({ label, w, h, ...s, shot, errors: [...p.errors] });
  console.log(label, `${w}x${h}`, JSON.stringify(s));
};
await look('full', 443, 939);
for (const [w, h, label] of [[443, 460, 'split-half'], [443, 640, 'split-2of3'], [443, 939, 'split-closed']]) {
  await k.rotate(w, h, 1, [443, 939]);   // the screen stays the phone's; only the window changes
  await sleep(400);
  await look(label, w, h);
}
writeJson('split.json', out);
console.log('errors', p.errors);
await b.close();
