// The hit cells as the page lays them out, against guardGeometry's numbers,
// and what elementFromPoint gives at the boundary (360x640's 3 dp gaps).
import { launch, newCtx, openPage, resume, toucher, sleep } from './common.mjs';
const [W, H] = (process.argv[2] || '360x640').split('x').map(Number);
const dpr = Number(process.argv[3] || 1);
const b = await launch();
const ctx = await newCtx(b, { w: W, h: H, dpr, prefs: { ghostDeck: { on: false, clean: 3, session: null } } });
const p = await openPage(ctx);
await resume(p);
const r = await p.evaluate(() => {
  const o = globalThis.__tt.overlay, G = o.twin.guard;
  const out = {};
  for (const id of ['pad_b', 'pad_j', 'pad_n', 'pad_y', 'pad_h', 'msgs', 'game', 'm1', 'drop']) {
    const el = o.twinEl(id), bx = el.getBoundingClientRect(), c = G.cells.get(id), cap = o.twinCapRect(id);
    out[id] = { dom: [bx.x, bx.y, bx.width, bx.height], cell: [c.x, c.y, c.w, c.h], cap: [cap.x, cap.y, cap.width, cap.height], style: [el.style.left, el.style.top, el.style.width, el.style.height], parent: el.parentElement.className, parentBox: (() => { const q = el.parentElement.getBoundingClientRect(); return [q.x, q.y]; })() };
  }
  const efp = (x, y) => { const e = document.elementFromPoint(x, y); const k = e && e.closest('[data-tw]'); return k ? k.dataset.tw : (e ? e.className : null); };
  const pb = out.pad_b.cap, pj = out.pad_j.cap;
  const midX = (pb[0] + pb[2] + pj[0]) / 2;
  const xs = [midX - 1, midX - 0.75, midX - 0.5, midX - 0.25, midX, midX + 0.25, midX + 0.5].map((x) => ({ x, at: efp(x, pb[1] + 20) }));
  return { out, midX, xs };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
