// The in-page check, shared by the twin checks: the page's twin layout against
// layout.js's own result for the very inputs the page gave it (overlay.twin:
// W, H, pointer, settings), measured from the DOM.
export async function measure(p) {
  return p.evaluate(async () => {
    const O = globalThis.__rh.overlay, T = O.twin;
    if (!T) return { twin: false, fallback: O.twinFallback, ui: document.documentElement.dataset.ui };
    const m = await import('./layout.js');
    const r = m.layout(T.W, T.H, T.pointer, T.settings);
    const S = r.spec, dpr = devicePixelRatio;
    const bad = [];
    const rect = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    const near = (a, b, tol = 0.5) => ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) <= tol);
    const over = (a, b) => a.x + 0.01 < b.x + b.w && b.x + 0.01 < a.x + a.w && a.y + 0.01 < b.y + b.h && b.y + 0.01 < a.y + a.h;
    const fmt = (q) => `${q.x.toFixed(2)},${q.y.toFixed(2)} ${q.w.toFixed(2)}x${q.h.toFixed(2)}`;
    if (!r.usable) bad.push(`layout() says unusable: ${r.reason}`);
    for (const c of m.collisions(S)) bad.push(`collisions(): ${c}`);
    const keys = {};
    let worst = 0;
    for (const c of S.controls) {
      if (c.behind) continue;
      const e = O.twinEl(c.id);
      if (!e) { bad.push(`${c.id}: no element`); continue; }
      // the keycap as drawn: since the layers stage a key's element is its
      // hit cell, the keycap inset in it (overlay.js Key.cell)
      const d = O.twinCapRect ? (({ x, y, width, height }) => ({ x, y, w: width, h: height }))(O.twinCapRect(c.id)) : rect(e);
      keys[c.id] = d;
      for (const k of ['x', 'y', 'w', 'h']) worst = Math.max(worst, Math.abs(d[k] - c[k]));
      if (!near(d, c)) bad.push(`${c.id}: DOM ${fmt(d)}, layout ${fmt(c)}`);
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || !e.isConnected) bad.push(`${c.id}: not shown`);
      // what a tap at the key's centre lands on
      const at = document.elementFromPoint(d.x + d.w / 2, d.y + d.h / 2);
      if (!at || !e.contains(at)) bad.push(`${c.id}: its centre lands on ${at ? at.id || at.className : 'nothing'}`);
    }
    const ids = Object.keys(keys);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (over(keys[ids[i]], keys[ids[j]])) bad.push(`${ids[i]} overlaps ${ids[j]}`);
    const glass = rect(document.getElementById('glass')), cv = rect(document.getElementById('map'));
    if (!near(glass, S.glass)) bad.push(`glass: DOM ${fmt(glass)}, layout ${fmt(S.glass)}`);
    // the canvas is the map area, its edges moved in to whole device pixels:
    // inside it, and less than a device pixel in from each edge
    const A = S.mapArea, px = 1 / dpr + 0.01;
    const edges = [cv.x - A.x, cv.y - A.y, A.x + A.w - (cv.x + cv.w), A.y + A.h - (cv.y + cv.h)];
    // (or out by under a device pixel where only that holds the level: web.js layoutTwinGlass)
    if (edges.some((d) => d < -px || d > px)) bad.push(`canvas ${fmt(cv)} is not the map area ${fmt(A)} (edges in by ${edges.map((d) => d.toFixed(2)).join(' ')})`);
    for (const id of ids) if (over(keys[id], cv)) bad.push(`the map is under ${id}`);
    const mb = rect(document.getElementById('msgband'));
    if (!near(mb, S.bands[0])) bad.push(`message band: DOM ${fmt(mb)}, layout ${fmt(S.bands[0])}`);
    const sbEl = document.getElementById('statband');
    if (sbEl.style.display !== 'none') { const sb = rect(sbEl); if (!near(sb, S.bands[1])) bad.push(`status band: DOM ${fmt(sb)}, layout ${fmt(S.bands[1])}`); }
    for (const b of S.bands) for (const id of ids) if (over(b, keys[id])) bad.push(`${b.name} over ${id}`);
    // the map draws only inside its area: the canvas is the area
    const mid = document.elementFromPoint(A.x + A.w / 2, A.y + A.h / 2);
    if (!mid || mid.id !== 'map') bad.push(`the map area's centre lands on ${mid ? mid.id || mid.className : 'nothing'}`);
    // just outside the map area, beside it and under it, is not the map
    for (const [x, y] of [[A.x - 3, A.y + A.h / 2], [A.x + A.w + 3, A.y + A.h / 2], [A.x + A.w / 2, A.y + A.h + 3], [A.x + A.w / 2, A.y - 3]]) {
      if (x < 0 || y < 0 || x >= T.W || y >= T.H) continue;
      const q = document.elementFromPoint(x, y);
      if (q && q.id === 'map') bad.push(`(${x.toFixed(1)}, ${y.toFixed(1)}), outside the map area, lands on the map`);
    }
    const corner = (c) => ({ in: c.thumb === 'L' ? c.x : T.W - c.x - c.w, up: T.H - c.y - c.h, w: c.w, h: c.h });
    return {
      twin: true, W: T.W, H: T.H, dpr, pointer: T.pointer, mode: T.mode, settings: T.settings, fit: S.fit, source: S.source,
      worst, bad, corners: Object.fromEntries(S.controls.filter((c) => !c.behind).map((c) => [c.id, corner(c)])),
      mapArea: A, cell: r.info.T, view: { T: globalThis.__rh.view.T, area: globalThis.__rh.view.area },
    };
  });
}

// every key at the same offsets from its own bottom corner, both ways
export function parity(a, b) {
  const out = [];
  for (const [id, p] of Object.entries(a.corners)) {
    const q = b.corners[id];
    if (!q) { out.push(`${id} missing`); continue; }
    for (const k of ['in', 'up', 'w', 'h']) if (Math.abs(p[k] - q[k]) > 0.02) out.push(`${id}.${k} ${p[k]} then ${q[k]}`);
  }
  return out;
}
