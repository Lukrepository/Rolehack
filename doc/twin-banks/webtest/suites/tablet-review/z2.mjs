// log panel scroll state across resizes
import { launch, newCtx, openPage, resume, sleep } from '../tablet/common.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/tablet-review/shots';
const DPR = Number(process.argv[2] || 1);
const b = await launch();
const ctx = await newCtx(b, { w: 1024, h: 768, dpr: DPR, touch: true, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(400);
const st = (tag) => p.evaluate((tag) => {
  const e = document.querySelector('.rhpanel[data-kind="log"]');
  if (!e || e.style.display === 'none') return { tag, shown: false };
  const b = e.querySelector('.pbody');
  const lines = [...b.querySelectorAll('.pl')];
  // which line is at the bottom of the visible area
  const br = b.getBoundingClientRect();
  const vis = lines.filter((l) => { const r = l.getBoundingClientRect(); return r.bottom > br.top + 2 && r.top < br.bottom - 2; }).map((l) => l.textContent);
  return { tag, shown: true, parent: e.parentNode.id, n: lines.length, scrollTop: b.scrollTop, clientH: b.clientHeight, scrollH: b.scrollHeight,
    atEnd: b.scrollTop + b.clientHeight >= b.scrollHeight - 4, firstVisible: vis[0], lastVisible: vis[vis.length - 1], last: lines.length ? lines[lines.length-1].textContent : null };
}, tag);
// many real messages: ':' look here
for (let i = 0; i < 30; i++) { await p.keyboard.press(':'); await sleep(90); const m = await p.evaluate(() => globalThis.__bt.moreShown); if (m) { await p.keyboard.press('Space'); await sleep(80);} }
await sleep(400);
await p.keyboard.press('Shift+S').catch(()=>{}); // nothing
await sleep(100);
await p.keyboard.press('Escape'); await sleep(300);
console.log(JSON.stringify(await st('1024x768 after 30 looks')));
await p.screenshot({ path: `${OUT}/z2-${DPR}-a.png` });
await p.setViewportSize({ width: 768, height: 1024 }); await sleep(900);
console.log(JSON.stringify(await st('768x1024')));
await p.screenshot({ path: `${OUT}/z2-${DPR}-b.png` });
await p.setViewportSize({ width: 1024, height: 768 }); await sleep(900);
console.log(JSON.stringify(await st('back to 1024x768')));
await p.screenshot({ path: `${OUT}/z2-${DPR}-c.png` });
// a new message now: does the log follow?
await p.keyboard.press(':'); await sleep(500);
console.log(JSON.stringify(await st('1024x768 after one more look')));
// width-only resize within the tablet tier
await p.setViewportSize({ width: 1100, height: 768 }); await sleep(900);
console.log(JSON.stringify(await st('1100x768')));
await p.keyboard.press(':'); await sleep(500);
console.log(JSON.stringify(await st('1100x768 after one more look')));
// phone landscape (no log) and back
await p.setViewportSize({ width: 896, height: 443 }); await sleep(900);
console.log(JSON.stringify(await st('896x443')));
await p.setViewportSize({ width: 1024, height: 768 }); await sleep(900);
console.log(JSON.stringify(await st('1024x768 again')));
await p.keyboard.press(':'); await sleep(500);
console.log(JSON.stringify(await st('1024x768 again + look')));
await p.screenshot({ path: `${OUT}/z2-${DPR}-d.png` });
console.log('errors', p.errors);
await b.close();
