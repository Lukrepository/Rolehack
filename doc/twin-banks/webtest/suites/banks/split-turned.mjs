// The same split after the phone HAS been turned once (landscape seen):
// the budget is real, and 443x460 should fall back to classic.
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, writeJson } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, screen: { width: 939, height: 443 }, prefs: { budgets: {} } });
const p = await openPage(ctx); await resume(p);
const k = await touch(ctx, p);
const out = [];
for (const [w, h, sc, label] of [[443, 939, [443, 939], 'portrait'], [443, 460, [443, 939], 'split-half'], [443, 640, [443, 939], 'split-2of3'], [443, 939, [443, 939], 'closed']]) {
  await k.rotate(w, h, 1, sc); await sleep(300);
  const s = await p.evaluate(() => { const o = globalThis.__bt.overlay, t = o.twin;
    return { ui: document.documentElement.dataset.ui, budget: t ? t.settings.budget : null, fit: t ? t.spec.fit.level : null, pad: t ? t.spec.fit.pad : null, why: o.twinFallback, pref: localStorage.getItem('rh.layout') }; });
  await k.shot(`${SHOTS}/split-turned-${label}-${w}x${h}.png`);
  out.push({ label, w, h, ...s }); console.log(label, `${w}x${h}`, JSON.stringify(s));
}
console.log('errors', p.errors);
writeJson('split-turned.json', out);
await b.close();
