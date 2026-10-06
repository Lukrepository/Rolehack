// The in-page checks of a twin window (run with page.evaluate): every key's
// DOM rect against layout()'s, the bands against layout()'s, overlaps between
// keys, bands, lamp, chips and the canvas, the 12 dp halo, what a finger at a
// band's or a key's points reaches, the band's rows against its height, the
// status lines and bars against their band, the canvas against the map area,
// and the drawn cell (from the canvas spy's last frame) against
// floor(T x zoomFactor x dpr) / dpr.  layout() is called here with settings
// made by the test from the prefs (not the page's own settings object); the
// budget the page remembered is passed only for the comparison of a second
// result, and any difference between the two is reported.
export async function twinCheck(opt) {
  const L = await import('./layout.js');
  const R = globalThis.__T, O = R.overlay, $ = (id) => document.getElementById(id), dpr = devicePixelRatio;
  const bad = [], notes = [], info = {};
  const pref = (k, d) => { try { const v = localStorage.getItem(`rh.${k}`); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  if (document.documentElement.dataset.ui !== 'twin' || !O.twin) return { bad: [`not twin (ui=${document.documentElement.dataset.ui}, fallback ${O.twinFallback})`], notes, info };
  const W = innerWidth, H = innerHeight;
  const app = $('app').getBoundingClientRect();
  if (Math.abs(app.width - W) > 0.5 || Math.abs(app.height - H) > 0.5) notes.push(`#app is ${app.width}x${app.height} in a ${W}x${H} window`);
  const msgSize = Number(pref('msgSize', 1)) || 1, msgFont = pref('msgFont', 'atkinson') === 'screen' ? 'screen' : 'atkinson';
  // the system's text size is the test's own setting (CDP Page.setFontSizes), passed in
  const ts = Math.min(2, Math.max(0.8, (opt && opt.textScale) || 1));
  const t = L.textMetrics({ msgFont, msgSize, textScale: ts, xHeight: 9.5 });
  const statusH = ts * ({ compact: 48 - 13.5, hidden: 0 }[pref('statusLines', 'full')] ?? 48);
  const mine = { padKey: Number(pref('padCell', 58)) || 58, insets: { l: 0, r: 0, t: 0, b: 0 }, msgRowH: t.msgRowH, statusH,
    mapCell: pref('mapCell', 'columns') === 'rows' ? 'rows' : 'columns' };
  const ps = O.twin.settings || {};
  const rNone = L.layout(W, H, 'touch', mine);
  const rB = L.layout(W, H, 'touch', { ...mine, budget: ps.budget, sideInsets: ps.sideInsets, prevTier: ps.prevTier });
  const r = rB;
  if (!r.usable) bad.push(`layout() says unusable: ${r.reason}`);
  const S = r.spec;
  const sameJ = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const k of ['controls', 'bands', 'mapArea', 'glass']) if (!sameJ(rNone.spec[k], S[k])) notes.push(`with the page's budget ${JSON.stringify(ps.budget)} the ${k} differ from layout() without one`);
  info.W = W; info.H = H; info.T = r.info.T; info.over = !!r.info.G.over; info.kind = r.info.G.kind; info.rows = r.info.fill.rows_msg;
  info.tier = r.info.tier; info.budget = ps.budget || null; info.map = S.mapArea; info.bands = S.bands.map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h }));
  const box = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const f = (q) => `${q.x.toFixed(2)},${q.y.toFixed(2)} ${q.w.toFixed(2)}x${q.h.toFixed(2)}`;
  const ov = (a, b, e = 0.01) => a.x + e < b.x + b.w && b.x + e < a.x + a.w && a.y + e < b.y + b.h && b.y + e < a.y + a.h;
  const inside = (a, b, e) => a.x >= b.x - e && a.y >= b.y - e && a.x + a.w <= b.x + b.w + e && a.y + a.h <= b.y + b.h + e;
  const gap = (a, b) => { const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0), dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0); return Math.hypot(dx, dy); };
  const dev = (a, b) => Math.max(...['x', 'y', 'w', 'h'].map((k) => Math.abs(a[k] - b[k])));
  const PX = 1 / dpr + 0.011;

  // 1. keys: one element per live control, at layout()'s rect
  const keys = {};
  let maxDev = 0;
  for (const c of S.controls) {
    if (c.behind) continue;
    const els = [...document.querySelectorAll(`[data-tw="${c.id}"]`)];
    if (els.length !== 1) { bad.push(`${els.length} elements for ${c.id}`); if (!els.length) continue; }
    const q = box(els[0]);
    keys[c.id] = q;
    const d = dev(q, c);
    maxDev = Math.max(maxDev, d);
    if (d > PX) bad.push(`key ${c.id} DOM ${f(q)} vs layout ${f(c)} (off by ${d.toFixed(3)} px)`);
    const cs = getComputedStyle(els[0]);
    if (cs.visibility === 'hidden' || cs.display === 'none') bad.push(`key ${c.id} not shown`);
  }
  info.keys = Object.keys(keys).length; info.keyMaxDev = +maxDev.toFixed(4);
  if (info.keys !== 36) bad.push(`${info.keys} keys, not 36`);
  const ids = Object.keys(keys);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (ov(keys[ids[i]], keys[ids[j]])) bad.push(`key ${ids[i]} overlaps ${ids[j]}`);

  // 2. bands at layout()'s rects
  const mbE = $('msgband'), sbE = $('statband'), cvE = $('map');
  const mb = box(mbE), sb = box(sbE), cv = box(cvE);
  const [Lm, Ls] = S.bands;
  const statusShown = getComputedStyle(sbE).display !== 'none';
  if (dev(mb, Lm) > PX) bad.push(`message band DOM ${f(mb)} vs layout ${f(Lm)}`);
  if (statusShown && dev(sb, Ls) > PX) bad.push(`status band DOM ${f(sb)} vs layout ${f(Ls)}`);
  info.msgband = mb; info.statband = sb; info.canvas = cv;
  const over = !!r.info.G.over;
  const inGlass = $('glass').contains(mbE);
  if (over === inGlass) bad.push(`header over the banks ${over}, but the bands are ${inGlass ? 'inside' : 'outside'} #glass`);
  if (!!O.geom.headerOver !== over) bad.push(`geom.headerOver ${O.geom.headerOver} vs layout over ${over}`);

  // 3. overlaps: bands vs keys, each other, the canvas; the 12 dp halo
  const bands = [['message band', mb]];
  if (statusShown) bands.push(['status band', sb]);
  const lamp = $('morelamp');
  for (const [n, q] of bands) {
    if (q.x < -0.01 || q.y < -0.01 || q.x + q.w > W + 0.01 || q.y + q.h > H + 0.01) bad.push(`${n} off screen ${f(q)}`);
    let least = Infinity, who = '';
    for (const [id, k] of Object.entries(keys)) {
      if (ov(q, k)) bad.push(`${n} ${f(q)} overlaps key ${id} ${f(k)}`);
      const g = gap(q, k);
      if (g < least) { least = g; who = id; }
    }
    info[`${n} least gap`] = `${least.toFixed(2)} to ${who}`;
    if (least < 12 - PX) bad.push(`${n} only ${least.toFixed(2)} px from key ${who} (halo 12)`);
    if (ov(q, cv)) bad.push(`${n} ${f(q)} overlaps the map canvas ${f(cv)}`);
  }
  if (statusShown && ov(mb, sb)) bad.push(`message band ${f(mb)} overlaps the status band ${f(sb)}`);
  for (const [id, k] of Object.entries(keys)) if (ov(k, cv)) bad.push(`key ${id} overlaps the canvas`);
  if (lamp && getComputedStyle(lamp).display !== 'none') {
    const lq = box(lamp);
    info.lamp = lq;
    if (!inside(lq, mb, PX)) bad.push(`MORE lamp ${f(lq)} outside the message band ${f(mb)}`);
    for (const [id, k] of Object.entries(keys)) if (ov(lq, k)) bad.push(`MORE lamp overlaps key ${id}`);
  }

  // 4. the canvas: the map area, edges on device pixels, store 1:1
  const m = S.mapArea;
  // each edge moved inward to the next device pixel, never more -- but on an
  // axis where only the outward pixel holds the level's cells at the device
  // cell (a whole-level screen, a 21-row cell: the fix-up, 2026-10-02), both
  // edges moved outward to it instead
  const up = (v) => Math.ceil(v * dpr - 1e-6) / dpr, down = (v) => Math.floor(v * dpr + 1e-6) / dpr;
  const outAxis = (a, len, n) => { const need = n * Math.max(4, Math.floor(r.info.T * dpr + 1e-6)) / dpr - 1e-6;
    return down(a + len) - up(a) < need && up(a + len) - down(a) >= need; };
  const ox = outAxis(m.x, m.w, 80), oy = outAxis(m.y, m.h, 21);
  info.canvasOut = [ox, oy];
  const inward = [cv.x - m.x, cv.y - m.y, (m.x + m.w) - (cv.x + cv.w), (m.y + m.h) - (cv.y + cv.h)].map((v, i) => ((i % 2 ? oy : ox) ? -v : v));
  // (and Chrome's 1/64 px layout unit)
  if (inward.some((v) => v < -0.017 || v > PX + 1 / 64)) bad.push(`canvas ${f(cv)} is not the map area ${f(m)} moved ${ox || oy ? `out (x ${ox}, y ${oy}) or in` : 'in'} to device pixels (by ${inward.map((v) => v.toFixed(3)).join(' ')})`);
  if (Math.abs(cvE.width - Math.round(cv.w * dpr)) > 0 || Math.abs(cvE.height - Math.round(cv.h * dpr)) > 0) bad.push(`canvas store ${cvE.width}x${cvE.height} for a ${cv.w}x${cv.h} box at dpr ${dpr}`);
  // within Chrome's 1/64 px layout unit of a device pixel
  for (const k of ['x', 'y']) { const v = cv[k] * dpr; if (Math.abs(v - Math.round(v)) > 0.05) bad.push(`canvas ${k} ${cv[k]} not on a device pixel`); }

  // 5. what a finger reaches: band points reach the band, key centres the key
  const hits = (x, y, el) => { const e = document.elementFromPoint(x, y); return e && (e === el || el.contains(e)); };
  for (const [n, q, el] of [['message band', mb, mbE], ...(statusShown ? [['status band', sb, sbE]] : [])]) {
    for (const fx of [0.05, 0.5, 0.95]) for (const fy of [0.15, 0.5, 0.85]) {
      const x = q.x + q.w * fx, y = q.y + q.h * fy;
      if (lamp && lamp.offsetParent && inside({ x, y, w: 0, h: 0 }, box(lamp), 1)) continue;
      if (!hits(x, y, el)) { const e = document.elementFromPoint(x, y); bad.push(`${n} at (${x.toFixed(1)},${y.toFixed(1)}) is covered by ${e ? e.id || e.className || e.tagName : 'nothing'}`); }
    }
  }
  for (const [id, k] of Object.entries(keys)) {
    const el = document.querySelector(`[data-tw="${id}"]`);
    if (!hits(k.x + k.w / 2, k.y + k.h / 2, el)) {
      const e = document.elementFromPoint(k.x + k.w / 2, k.y + k.h / 2);
      // a key's centre may carry its own label layers; only a band or the map there is wrong
      if (e && (mbE.contains(e) || sbE.contains(e) || e === cvE)) bad.push(`key ${id}'s centre reaches ${e.id || e.className}`);
    }
  }

  // 6. the message band: its rows are the layout's and its height holds them
  const cs = getComputedStyle(mbE);
  const lh = parseFloat(cs.lineHeight), padT = parseFloat(cs.paddingTop), padB = parseFloat(cs.paddingBottom);
  const contentH = mbE.getBoundingClientRect().height - padT - padB;
  // A row is held when its line box fits the content box to within one device
  // pixel: the band's edges are snapped to device pixels, which can take up
  // to one off its height, and the line box's leading lies under the glyphs.
  // A row that runs into the bottom padding is still drawn whole (the band
  // clips at its padding box), so this is no clipping.
  const fitRows = Math.floor((contentH + 1 / dpr + 0.01) / lh + 1e-6);
  const clipped = (r.info.fill.rows_msg * lh) - (contentH + padB);
  if (clipped > 0.01) bad.push(`the band's last row runs ${clipped.toFixed(2)} px past its padding box (clipped)`);
  info.lineH = lh; info.bandRowsFit = fitRows; info.geomRows = O.geom.msgRows;
  if (O.geom.msgRows !== r.info.fill.rows_msg) bad.push(`the page pages by ${O.geom.msgRows} rows, layout() gives ${r.info.fill.rows_msg}`);
  if (fitRows !== r.info.fill.rows_msg) bad.push(`the message band's ${contentH.toFixed(2)} px of content hold ${fitRows} rows of ${lh.toFixed(2)} px, layout() gives ${r.info.fill.rows_msg}`);
  if (Math.abs(lh - mine.msgRowH) > 0.05 && Math.abs(lh - t.msgRowH) > 0.05) notes.push(`band line height ${lh} vs textMetrics ${t.msgRowH}`);

  // 7. the status lines and the bars inside their band
  if (statusShown) {
    const rows = [...sbE.querySelectorAll('.row')], bars = sbE.querySelector('.bars');
    for (const [i, rw] of rows.entries()) {
      const q = box(rw);
      if (q.y + q.h > sb.y + sb.h + PX || q.y < sb.y - PX) bad.push(`status line ${i + 1} ${f(q)} outside its band ${f(sb)}`);
      if (rw.scrollWidth > sbE.clientWidth + 1) bad.push(`status line ${i + 1} is ${rw.scrollWidth} px wide in a ${sbE.clientWidth} px band`);
    }
    const room = Ls.h - statusH;
    info.barsRoom = +room.toFixed(2); info.bars = !!bars;
    if (room >= 10 && !bars) bad.push(`the status band has ${room.toFixed(1)} px under its lines and no HP/Pw bars`);
    if (room < 10 && bars) bad.push(`HP/Pw bars with only ${room.toFixed(1)} px of room`);
    if (bars) {
      const q = box(bars);
      if (!inside(q, sb, PX)) bad.push(`the bars ${f(q)} reach outside the status band ${f(sb)}`);
      for (const rw of rows) if (ov(q, box(rw), 0.5)) bad.push(`the bars ${f(q)} overlap a status line ${f(box(rw))}`);
    }
  }

  // 8. a prompt's chips inside the map
  const chips = [...$('chips').children];
  if (chips.length) {
    const cq = box($('chips'));
    info.chips = cq;
    if (!inside(cq, m, PX)) bad.push(`chips ${f(cq)} outside the map area ${f(m)}`);
    for (const c of chips) { const q = box(c); if (q.y + q.h <= cq.y + cq.h + 1) for (const [id, k] of Object.entries(keys)) if (ov(q, k)) bad.push(`chip ${c.textContent} overlaps key ${id}`); }
    for (const [n, q] of bands) if (ov(cq, q)) bad.push(`chips overlap the ${n}`);
  }

  // 9. the drawn cell
  const fr = globalThis.__frame;
  const zf = Number(pref('zoomFactor', 1)) || 1;
  const want = Math.max(4, Math.floor(Math.min(Math.max(r.info.T * zf, 8), 96) * dpr + 1e-6));
  if (fr) {
    const b = fr.strokes.find((s) => s.lw === 2 && /39, ?39, ?48|#272730/i.test(s.style));
    if (b) {
      const Td = (b.w - 6) / 80;
      info.Td = Td; info.cellCss = Td / dpr;
      if (Math.abs(Td - want) > 0.01) bad.push(`drawn cell ${Td} device px, want floor(${r.info.T} x ${zf} x ${dpr}) = ${want}`);
      if (fr.cw !== cvE.width || fr.ch !== cvE.height) notes.push('the last frame was drawn on another canvas size');
    } else bad.push('no level border in the last frame');
  } else bad.push('no frame drawn');
  return { bad, notes, info };
}
