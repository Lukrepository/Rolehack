// The void of a layout's spec: the share of the window that is no key, no
// map, no band and no panel, on a 2 dp raster (decor -- wells, halos, the
// ring -- counts as void, as in the design's harness).  Also the map's and the
// panels' shares.
export function voidOf(S) {
  const step = 2, rects = [...S.controls.filter((c) => !c.behind), S.mapArea, ...S.bands, ...S.chrome];
  let n = 0, v = 0;
  for (let y = step / 2; y < S.H; y += step) for (let x = step / 2; x < S.W; x += step) {
    n++;
    if (!rects.some((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)) v++;
  }
  const panels = S.chrome.reduce((a, r) => a + r.w * r.h, 0) / (S.W * S.H);
  return { void: v / n, map: (S.mapArea.w * S.mapArea.h) / (S.W * S.H), panels };
}
