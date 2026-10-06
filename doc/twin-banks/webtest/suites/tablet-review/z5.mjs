// sample every panel's area: what does a pointer there hit?
import { launch, newCtx, openPage, resume, sleep } from '../tablet/common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await launch();
const sizes = [[1024,768,1],[768,1024,1],[1180,820,1],[1366,768,1],[1280,800,0],[1920,1080,0],[2560,1440,0],[3440,1440,0],[443,939,1],[412,915,1]];
for (const [w,h,t] of sizes) {
  const ctx = await newCtx(b, { w, h, dpr: DPR, touch: !!t, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const r = await p.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('.rhpanel')) {
      if (e.style.display === 'none') continue;
      const q = e.getBoundingClientRect();
      const bad = {};
      let n = 0;
      for (let y = q.top + 0.5; y < q.bottom; y += 3) for (let x = q.left + 0.5; x < q.right; x += 3) {
        n++;
        const el = document.elementFromPoint(x, y);
        if (!el || !e.contains(el)) { const k = el ? (el.id || el.className || el.tagName) : 'none'; bad[k] = (bad[k] || 0) + 1; }
      }
      out.push({ kind: e.dataset.kind, rect: [q.x, q.y, q.width, q.height].map((v) => Math.round(v * 10) / 10), n, bad });
    }
    return { tier: document.documentElement.dataset.tier, ui: document.documentElement.dataset.ui, out };
  });
  console.log(`${w}x${h}${t ? '' : ' mouse'}`, JSON.stringify(r));
  if (p.errors.length) console.log('errors', p.errors);
  await ctx.close();
}
await b.close();
