import { launch, newCtx, openPage, resume, settle, sleep } from './common.mjs';
import { expected, readPage } from './lib.mjs';
import { layout } from '/home/user/Rolehack/win/web/layout.js';
const b = await launch();
const ctx = await newCtx(b, { w: 1000, h: 600, dpr: 1, touch: false, screen: { width: 2560, height: 1440 } });
const p = await openPage(ctx);
await resume(p);
for (let h = 598; h >= 420; h -= 2) { await p.setViewportSize({ width: 1000, height: h }); await sleep(40); }
await sleep(500);
const s = await readPage(p);
console.log('page settings', JSON.stringify(s.settings), s.info.tier, JSON.stringify(s.info.DC), s.info.budget);
console.log('page pad_b', JSON.stringify(s.spec.controls.find(c=>c.id==='pad_b')), s.spec.fit);
const cls = await p.evaluate(() => globalThis.__ts.overlay.twinClasses);
console.log('classes', cls);
for (const prev of [null, { tier: 'tablet', cellTier: 'tablet' }, { tier: 'phone', cellTier: 'phone' }, {tier:'phone', cellTier:'tablet'}]) {
  const E = expected(1000, 420, { screen: { w: 2560, h: 1440 }, prev });
  console.log(JSON.stringify(prev), E.info.tier, JSON.stringify(E.spec.controls.find(c=>c.id==='pad_b')), E.info.DC.tier, E.spec.fit.pad);
}
const r = layout(1000, 420, 'touch', { ...s.settings, prevTier: cls.tier, prevCellTier: cls.cellTier });
console.log('node w/ page settings', JSON.stringify(r.spec.controls.find(c=>c.id==='pad_b')));
// fresh load at 1000x420
const ctx2 = await newCtx(b, { w: 1000, h: 420, dpr: 1, touch: false, screen: { width: 2560, height: 1440 } });
const p2 = await openPage(ctx2); await resume(p2);
const s2 = await readPage(p2);
console.log('fresh 1000x420 pad_b', JSON.stringify(s2.spec.controls.find(c=>c.id==='pad_b')), JSON.stringify(s2.settings));
await b.close();
