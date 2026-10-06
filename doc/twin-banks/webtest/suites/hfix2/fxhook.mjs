// the fixer's __fx hook (header/fix/common.mjs), for scripts that route web.js themselves
export const FX = `
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
};
`;
