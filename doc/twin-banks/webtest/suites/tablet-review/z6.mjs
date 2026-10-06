import { launch, newCtx, openPage, resume, sleep } from '../tablet/common.mjs';
const b = await launch();
for (const [w,h,t] of [[443,939,1],[768,1024,1],[1920,1080,0]]) {
  const ctx = await newCtx(b, { w, h, dpr: 1, touch: !!t, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const r = await p.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('.rhpanel')) {
      if (e.style.display === 'none') continue;
      const q = e.getBoundingClientRect();
      let bb = null; let who = null;
      for (let y = q.top + 0.5; y < q.bottom; y += 1) for (let x = q.left + 0.5; x < q.right; x += 1) {
        const el = document.elementFromPoint(x, y);
        if (el && el.classList.contains('halo')) {
          who = who || { cls: el.className, style: el.getAttribute('style'), rect: (() => { const z = el.getBoundingClientRect(); return [z.x, z.y, z.width, z.height]; })(), radius: getComputedStyle(el).borderRadius, pe: getComputedStyle(el).pointerEvents };
          bb = bb ? [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)] : [x, y, x, y];
        }
      }
      if (bb) out.push({ kind: e.dataset.kind, panel: [q.x, q.y, q.right, q.bottom], haloHits: bb, who });
    }
    const keys = [...document.querySelectorAll('#keys .key, #keys [data-id]')].slice(0, 0);
    return out;
  });
  console.log(`${w}x${h}`, JSON.stringify(r, null, 0));
  // spec halos
  const s = await p.evaluate(() => { const S = globalThis.__bt.overlay.twin.spec; return { decor: S.decor.filter(d => /halo/.test(d.name)).map(d => [d.x, d.y, d.w, d.h]), chrome: S.chrome.map(c => [c.name.slice(0, 20), c.x, c.y, c.w, c.h]) }; });
  console.log(JSON.stringify(s));
  await ctx.close();
}
await b.close();
