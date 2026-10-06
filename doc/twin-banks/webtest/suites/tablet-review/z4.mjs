// phone portrait log 'beyond' and phone portrait <-> tablet
import { launch, newCtx, openPage, resume, sleep } from '../tablet/common.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/tablet-review/shots';
const DPR = Number(process.argv[2] || 1);
const b = await launch();
const ctx = await newCtx(b, { w: 443, h: 939, dpr: DPR, touch: true, screen: { width: 443, height: 939 }, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(400);
const st = () => p.evaluate(() => {
  const e = document.querySelector('.rhpanel[data-kind="log"]');
  const band = document.getElementById('msgband').innerText;
  if (!e || e.style.display === 'none') return { shown: false, band };
  const b = e.querySelector('.pbody');
  const lines = [...b.querySelectorAll('.pl')].map((l) => l.textContent);
  const r = e.getBoundingClientRect();
  return { rect: [r.x, r.y, r.width, r.height].map(Math.round), parent: e.parentNode.id, last3: lines.slice(-3), band, atEnd: b.scrollTop + b.clientHeight >= b.scrollHeight - 4 };
});
console.log(JSON.stringify(await st()));
for (let i = 0; i < 6; i++) { await p.keyboard.press(':'); await sleep(150); if (await p.evaluate(() => globalThis.__bt.moreShown)) { await p.keyboard.press('Space'); await sleep(80);} }
await sleep(300);
console.log(JSON.stringify(await st()));
await p.screenshot({ path: `${OUT}/z4-${DPR}-443x939.png` });
console.log('errors', p.errors);
await b.close();
