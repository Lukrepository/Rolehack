// A prompt's chips in twin banks: inside the map area, under no key, and when
// there are more than the map holds (a getobj-style "[a-z or ?*]" on a small
// phone), they scroll: the container takes touches then, a drag scrolls it, a
// tap on a chip still answers.  With few chips the container takes no touch,
// so the map beside them still pans.  The chips are shown through the page's
// own showChips() (common.mjs hook), with the game waiting for a command.
//   node chips.mjs -> chips.json, shots/chips-*.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, writeJson, clearEvs, evs } from './common.mjs';
const b = await launch();
const out = [];
let fails = 0;
const MANY = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN'];
for (const [w, h] of [[640, 360], [896, 443], [443, 939], [1024, 768]]) {
  for (const list of [['y', 'n'], MANY]) {
    const ctx = await newCtx(b, { w, h, prefs: { budgets: {} } });
    const p = await openPage(ctx); await resume(p); await sleep(300);
    const k = await touch(ctx, p);
    await p.evaluate((l) => globalThis.__bt.chips(l), list);
    await sleep(100);
    const geo = () => p.evaluate(() => {
      const c = document.getElementById('chips'), A = globalThis.__bt.overlay.twin.spec.mapArea, cr = c.getBoundingClientRect();
      const keys = [...document.querySelectorAll('[data-tw]')].map((e) => e.getBoundingClientRect());
      const vis = [...c.querySelectorAll('button')].map((e) => e.getBoundingClientRect()).filter((q) => q.top >= cr.top - 0.5 && q.bottom <= cr.bottom + 0.5);
      return { scroll: c.classList.contains('scroll'), pe: getComputedStyle(c).pointerEvents, sh: c.scrollHeight, ch: c.clientHeight, top: c.scrollTop,
        box: { x: cr.x, y: cr.y, w: cr.width, h: cr.height }, A,
        outside: cr.x < A.x - 0.5 || cr.y < A.y - 0.5 || cr.right > A.x + A.w + 0.5 || cr.bottom > A.y + A.h + 0.5,
        onKey: keys.some((kq) => cr.left < kq.right && kq.left < cr.right && cr.top < kq.bottom && kq.top < cr.bottom),
        first: vis[0] && { x: vis[0].x + vis[0].width / 2, y: vis[0].y + vis[0].height / 2 } };
    });
    const g0 = await geo();
    const bad = [];
    if (g0.outside) bad.push(`the chips' box ${JSON.stringify(g0.box)} leaves the map ${JSON.stringify(g0.A)}`);
    if (g0.onKey) bad.push('the chips lie on a key');
    const many = list.length > 10;
    const needs = g0.sh > g0.ch + 1;
    if (g0.scroll !== needs) bad.push(`scroll ${g0.scroll} with ${g0.sh} of ${g0.ch} px`);
    if (!g0.scroll && g0.pe !== 'none') bad.push(`the container takes touches with nothing to scroll (${g0.pe})`);
    if (g0.scroll) {
      // a drag up on the chips scrolls them, and sends nothing
      await clearEvs(p);
      await k.drag(g0.box.x + g0.box.w / 2, g0.box.y + g0.box.h - 20, 0, -120, 8);
      const g1 = await geo();
      if (!(g1.top > 0)) bad.push(`a drag did not scroll the chips (scrollTop ${g1.top})`);
      const sent = await evs(p);
      if (sent.length) bad.push(`the drag sent ${JSON.stringify(sent)}`);
      await k.shot(`${SHOTS}/chips-${w}x${h}-scrolled.png`);
    }
    // a tap on the first visible chip answers with its key
    const g2 = await geo();
    await clearEvs(p);
    const label = await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.textContent, [g2.first.x, g2.first.y]);
    await k.tap(g2.first.x, g2.first.y);
    const sent = await evs(p);
    if (!(sent.length === 1 && sent[0].key === label.charCodeAt(0))) bad.push(`a tap on "${label}" sent ${JSON.stringify(sent)}`);
    if (!many) await k.shot(`${SHOTS}/chips-${w}x${h}-few.png`);
    await p.evaluate(() => globalThis.__bt.chips([]));
    if (p.errors.length) bad.push(`console: ${p.errors.join(' | ')}`);
    fails += bad.length;
    console.log(`${w}x${h} ${list.length} chips: box ${g0.box.w.toFixed(0)}x${g0.box.h.toFixed(0)}, ${g0.sh}/${g0.ch} px, scroll ${g0.scroll}; ${bad.length ? `BAD: ${bad.join(' | ')}` : 'ok'}`);
    out.push({ w, h, n: list.length, g0, bad });
    await ctx.close();
  }
}
writeJson('chips.json', out);
console.log(fails ? `FAILURES: ${fails}` : 'ALL PASS');
await b.close();
