// log panel follow-the-end across individual transitions, each starting at the end
import { launch, newCtx, openPage, resume, sleep } from '../tablet/common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await launch();
const ctx = await newCtx(b, { w: 1024, h: 768, dpr: DPR, touch: true, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(400);
const st = () => p.evaluate(() => {
  const e = document.querySelector('.rhpanel[data-kind="log"]');
  if (!e || e.style.display === 'none') return { shown: false };
  const b = e.querySelector('.pbody');
  return { parent: e.parentNode.id, scrollTop: Math.round(b.scrollTop), max: b.scrollHeight - b.clientHeight, atEnd: b.scrollTop + b.clientHeight >= b.scrollHeight - 4 };
});
const toEnd = () => p.evaluate(() => { const b = document.querySelector('.rhpanel[data-kind="log"] .pbody'); b.scrollTop = b.scrollHeight; });
for (let i = 0; i < 30; i++) { await p.keyboard.press(':'); await sleep(80); if (await p.evaluate(() => globalThis.__bt.moreShown)) { await p.keyboard.press('Space'); await sleep(80);} }
await sleep(400);
const trans = [ [[1024,768],[1100,768]], [[1100,768],[1024,700]], [[1024,768],[896,443]], [[1024,768],[768,1024]], [[1024,768],[1366,768]] ];
for (const [a, z] of trans) {
  await p.setViewportSize({ width: a[0], height: a[1] }); await sleep(800);
  await toEnd(); await sleep(100);
  const s0 = await st();
  await p.setViewportSize({ width: z[0], height: z[1] }); await sleep(800);
  const s1 = await st();
  await p.setViewportSize({ width: a[0], height: a[1] }); await sleep(800);
  const s2 = await st();
  await p.keyboard.press(':'); await sleep(500);
  const s3 = await st();
  console.log(`${a.join('x')} -> ${z.join('x')} -> back: before ${JSON.stringify(s0)} | there ${JSON.stringify(s1)} | back ${JSON.stringify(s2)} | +msg ${JSON.stringify(s3)}`);
}
console.log('errors', p.errors);
await b.close();
