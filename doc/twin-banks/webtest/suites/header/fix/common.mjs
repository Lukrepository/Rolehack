// The fix-up of the stage "The header over the banks, and the map cell": the
// header suite's kit (../common.mjs) with one more hook, __fx, appended to
// web.js as it is served: the hero put at a cell as the core's cliparound
// would (it stays there), and the band's rows as drawn.
export * from '../common.mjs';
import * as C from '../common.mjs';

// OUTDIR keeps a run on another copy of the page from overwriting these results
export const DIR = process.env.OUTDIR || '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/header/fix';
export const SHOTS = `${DIR}/shots`;

const FX = `
;globalThis.__fx = {
  hero(x, y) { focus = { x, y }; cursor = { x, y }; render(); },
  band() { return [...$('msgband').querySelectorAll('.r')].map((e) => e.textContent); },
  get scrollRow() { return scrollRow; },
  // the page's rows the band shows, as letter ranges from the page's start (a
  // row breaks at spaces, or inside a word too long for it: the letters stay)
  shown() {
    const m = bandMetrics(), all = pageRowsOf(page, m), L = (r) => r.t.replace(/\\s+/g, '').length;
    let a = 0;
    const off = all.map((r) => { const s = a; a += L(r); return [s, a]; });
    const lo = scrollRow, hi = Math.min(all.length, scrollRow + m.rows);
    return { key: page.length ? page[0].text : '', total: a, n: all.length, lo, hi, ranges: off.slice(lo, hi),
      rows: all.slice(lo, hi).map((r) => r.t), dom: [...$('msgband').querySelectorAll('.r')].map((e) => e.textContent) };
  },
  // the page's newest entry: the rows it takes at the page's end, and whether the band holds that many
  newest() {
    const m = bandMetrics(), n = pageRowsOf(page, m).length, k = n - pageRowsOf(page.slice(0, -1), m).length;
    return { text: page.length ? page[page.length - 1].text : '', from: n - k, n, rows: k, fits: k <= m.rows };
  },
  ask(q) { this.asked = handlers.shim_yn_function(q, 'ynq', 110); return true; },
};
`;

export async function newCtx(b, opts) {
  const ctx = await C.newCtx(b, opts);
  await ctx.unroute('**/web.js');
  await ctx.route('**/web.js', async (route) => {
    const resp = await route.fetch();
    const body = (await resp.text()) + C.HOOK + FX;
    await route.fulfill({ response: resp, body, headers: { ...resp.headers(), 'content-type': 'text/javascript' } });
  });
  return ctx;
}
