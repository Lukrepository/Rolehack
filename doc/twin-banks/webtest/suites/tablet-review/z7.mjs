// hysteresis walk, mouse window on a 1920x1080 screen
import { launch, newCtx, openPage, resume, sleep } from '../tablet/common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 620, h: 768, dpr: 1, touch: false, screen: { width: 1920, height: 1080 }, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(300);
const st = () => p.evaluate(() => { const o = globalThis.__bt.overlay; const i = o.twin && o.twin.info; return { ui: document.documentElement.dataset.ui, tier: i && i.tier, cellTier: i && i.DC.tier, T: i && i.T, panels: (globalThis.__bt.geom.panels || []).map(q => q.kind).join(','), budget: JSON.stringify(globalThis.__bt.P.get('budgets')) }; });
const walk = [[620,768],[590,768],[577,768],[575,768],[600,768],[623,768],[625,768],[700,768],[700,500],[700,470],[700,457],[700,455],[700,480],[700,503],[700,505]];
for (const [w, h] of walk) {
  await p.setViewportSize({ width: w, height: h }); await sleep(500);
  console.log(`${w}x${h}`, JSON.stringify(await st()));
}
console.log('errors', p.errors);
await b.close();
