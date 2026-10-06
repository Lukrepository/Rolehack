// Real play: a corpse on the floor, EAT, the 'n' chip tapped once with a real
// touch.  "What do you want to eat?" opens under the finger; nothing may be
// picked.  node eat.mjs [dpr] [origin]
import { launch, newCtx, openPage, resume, sleep, touch, WIZSTATE } from '../header/tester/common.mjs';
const DPR = +(process.argv[2] || 1);
const ORIGIN = process.argv[3] || 'http://localhost:8766';
const SHOTS = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/hfix2/shots';
const b = await launch();
const st = (p) => p.evaluate(() => { const $ = (id) => document.getElementById(id); return { modal: !$('modal').hidden, title: $('modal-title').textContent,
  line: !!($('line') && $('line').offsetParent), more: globalThis.__T.moreShown, cw: globalThis.__T.commandWait, msg: $('msgband').innerText,
  chips: [...document.querySelectorAll('#chips button')].map((q) => q.textContent), waiting: globalThis.__T.waiting }; });
async function settle(p, max = 20) {
  for (let i = 0; i < max; i++) { await sleep(250); const s = await st(p); if (s.more) { await p.keyboard.press('Space'); continue; } return s; }
  return st(p);
}
let bad = 0;
for (const [layout, W, H] of [['twin', 896, 443], ['twin', 443, 939], ['classic', 896, 443], ['classic', 443, 939]]) {
  const ctx = await newCtx(b, { w: W, h: H, dpr: DPR, state: WIZSTATE, wiz: true, origin: ORIGIN, screen: [W, H],
    prefs: { layout, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p, 'wizard');
  const k = await touch(ctx, p);
  // a wish for food to keep, and one for a lichen corpse (^W), then drop the corpse
  await p.evaluate(() => globalThis.__T.key(23));
  await sleep(500);
  if ((await st(p)).line) { await p.fill('#line', '3 food rations'); await p.press('#line', 'Enter'); }
  await settle(p);
  await p.evaluate(() => globalThis.__T.key(23));
  await sleep(500);
  let s = await st(p);
  if (s.line) { await p.fill('#line', 'lichen corpse'); await p.press('#line', 'Enter'); }
  s = await settle(p);
  const h = await p.evaluate(() => globalThis.__T.history.slice(-6));
  const got = h.map((t) => /^([a-zA-Z]) - .*lichen corpse/.exec(t)).find(Boolean);
  if (!got) { console.log(layout, W, H, 'no wish', h); bad++; await ctx.close(); continue; }
  await p.evaluate(() => globalThis.__T.key(100));   // d
  await sleep(400);
  await p.evaluate((c) => globalThis.__T.key(c), got[1].charCodeAt(0));
  s = await settle(p);
  if (s.modal) { await p.keyboard.press('Escape'); s = await settle(p); }
  await p.evaluate(() => { globalThis.__ev = []; globalThis.__T.key(101); });   // e
  await sleep(600);
  s = await st(p);
  const q = s.msg;
  const r = await p.evaluate(() => { const c = [...document.querySelectorAll('#chips button')].find((q) => q.textContent === 'n');
    if (!c) return null; const q = c.getBoundingClientRect(); return [q.x, q.y, q.width, q.height]; });
  if (!r) { console.log(layout, W, H, 'no n chip', JSON.stringify(s)); bad++; await ctx.close(); continue; }
  await k.tap(r[0] + r[2] / 2, r[1] + r[3] / 2);
  await sleep(900);
  const ev = await p.evaluate(() => globalThis.__ev.map((e) => e.key !== undefined ? String.fromCharCode(e.key) : JSON.stringify(e)).join(''));
  const after = await st(p);
  await k.shot(`${SHOTS}/eat-${layout}-${W}x${H}-${DPR}.png`);
  const ok = ev === 'en';
  if (!ok) bad++;
  console.log(ok ? 'ok  ' : 'FAIL', layout, `${W}x${H}@${DPR}`, `ev=${JSON.stringify(ev)}`, `q=${JSON.stringify(q.slice(0, 80))}`,
    `after: modal=${after.modal} title=${JSON.stringify(after.title)} msg=${JSON.stringify(after.msg.slice(0, 120))}`, p.errors);
  for (let n = 0; n < 3; n++) { await p.keyboard.press('Escape'); await sleep(250); }
  await ctx.close();
}
console.log(`${bad} failures`);
await b.close();
