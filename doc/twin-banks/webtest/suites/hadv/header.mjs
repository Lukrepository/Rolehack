// The header where layout() puts it: at every test window, the message band,
// the status band, the MORE lamp and a prompt's chips are checked against the
// layout the page used and against layout() called here with the design's
// settings (no header option: the rule's own 'auto'), and against every key:
//  - each band's DOM rect is the layout's, to a device pixel;
//  - no band overlaps a key, the other band or the map, and each is at least
//    the 12 dp halo from every key; a point inside each band reaches it;
//  - over the banks the bands have left the glass for #app; otherwise they are
//    inside the glass;
//  - the message band pages by the layout's rows and its drawn width
//    (bandMetrics), and its height holds those rows;
//  - the status lines fit their band, and the HP/Pw bars show exactly where the
//    band has the room for them;
//  - a prompt's chips lie inside the map area;
//  - the drawn map cell is floor(T x dpr) / dpr of the layout's device cell.
// Phones are opened in landscape, turned to portrait and back (the window and
// the screen swap); the tablets and the laptop are opened alone.  Variants:
// the map cell 'rows' (the header over the banks), Message size 1.4, compact
// status lines, caseless.
//   node header.mjs [dpr]   -> header-<dpr>.json, shots/header-<dpr>-*.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, writeJson, PHONES, BIG } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const only = process.env.ONLY;

async function check(p, variant) {
  return p.evaluate(async ({ variant }) => {
    const L = await import('./layout.js');
    const R = globalThis.__bt, O = R.overlay, $ = (id) => document.getElementById(id), dpr = devicePixelRatio;
    const bad = [], notes = [];
    if (document.documentElement.dataset.ui !== 'twin' || !O.twin) return { bad: [`not twin: ${O.twinFallback}`], notes };
    const W = O.twin.W, H = O.twin.H, S = O.twin.spec, ps = O.twin.settings;
    if (ps.header !== undefined) bad.push(`the page asked for header ${ps.header}`);
    const ts = 1;   // the system's text size in this browser
    const t = L.textMetrics({ msgFont: variant.msgFont || 'atkinson', msgSize: variant.msgSize || 1, textScale: ts, xHeight: 9.5 });
    const statusH = { compact: 48 - 13.5, hidden: 0 }[variant.statusLines] ?? 48;
    const settings = { padKey: 58, budget: ps.budget, sideInsets: ps.sideInsets, insets: { l: 0, r: 0, t: 0, b: 0 },
      msgRowH: t.msgRowH, statusH, mapCell: variant.mapCell || 'columns', prevTier: ps.prevTier };
    const rA = L.layout(W, H, 'touch', settings);
    const same = (k) => JSON.stringify(rA.spec[k]) === JSON.stringify(S[k]);
    for (const k of ['controls', 'bands', 'mapArea', 'glass']) if (!same(k)) bad.push(`the page's ${k} differ from layout()'s`);
    const box = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    const f = (q) => `${q.x.toFixed(2)},${q.y.toFixed(2)} ${q.w.toFixed(2)}x${q.h.toFixed(2)}`;
    const over = (a, b, e = 0.01) => a.x + e < b.x + b.w && b.x + e < a.x + a.w && a.y + e < b.y + b.h && b.y + e < a.y + a.h;
    const inside = (a, b, e) => a.x >= b.x - e && a.y >= b.y - e && a.x + a.w <= b.x + b.w + e && a.y + a.h <= b.y + b.h + e;
    const gap = (a, b) => Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
    const px = 1 / dpr + 0.02;
    const keys = {};
    for (const c of S.controls) if (!c.behind) { const e = document.querySelector(`[data-tw="${c.id}"]`); if (e) keys[c.id] = box(e); }
    if (Object.keys(keys).length !== 36) bad.push(`${Object.keys(keys).length} keys, not 36`);
    const mbE = $('msgband'), sbE = $('statband');
    const mb = box(mbE), sb = box(sbE), cv = box($('map')), glass = box($('glass'));
    const [Lm, Ls] = S.bands;
    const dev = (a, b) => Math.max(...['x', 'y', 'w', 'h'].map((k) => Math.abs(a[k] - b[k])));
    if (dev(mb, Lm) > px) bad.push(`msgband ${f(mb)} vs layout ${f(Lm)}`);
    const statusShown = variant.statusLines !== 'hidden';
    if (statusShown && dev(sb, Ls) > px) bad.push(`statband ${f(sb)} vs layout ${f(Ls)}`);
    const bands = statusShown ? [['msgband', mb], ['statband', sb]] : [['msgband', mb]];
    for (const [n, q] of bands) {
      if (q.x < -0.01 || q.y < -0.01 || q.x + q.w > W + 0.01 || q.y + q.h > H + 0.01) bad.push(`${n} off screen ${f(q)}`);
      for (const [id, k] of Object.entries(keys)) {
        if (over(q, k)) bad.push(`${n} over ${id}`);
        else if (gap(q, k) < 12 - px) bad.push(`${n} ${gap(q, k).toFixed(2)} from ${id}`);
      }
      if (over(q, cv)) bad.push(`${n} over the map canvas`);
      const hit = document.elementFromPoint(q.x + q.w / 2, q.y + q.h / 2);
      if (!hit || !(hit.closest('#msgband, #statband, #chips'))) bad.push(`the middle of ${n} reaches ${hit ? hit.id || hit.className || hit.tagName : 'nothing'}`);
    }
    if (statusShown && over(mb, sb)) bad.push('the bands overlap each other');
    const overBanks = !!O.twin.info.G.over, parent = $('bands').parentElement.id;
    if (overBanks !== !!R.geom.headerOver) bad.push('geom.headerOver is not the layout\'s');
    if (overBanks ? parent !== 'app' : parent !== 'glass') bad.push(`the bands are in #${parent} with the header ${overBanks ? 'over the banks' : 'in the glass'}`);
    if (!overBanks) for (const [n, q] of bands) if (!inside(q, glass, px)) bad.push(`${n} ${f(q)} outside the glass ${f(glass)}`);
    if (overBanks) for (const [n, q] of bands) if (over(q, glass)) bad.push(`${n} over the glass with the header over the banks`);
    // the message band pages by its own rows and drawn width
    const m = R.bandMetrics(), cs = getComputedStyle(mbE);
    const rows = O.twin.info.fill.rows_msg, lineH = parseFloat(cs.lineHeight);
    if (m.rows !== rows) bad.push(`bandMetrics rows ${m.rows} vs the layout's ${rows}`);
    const innerW = mbE.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (Math.abs(m.width - innerW) > 0.01) bad.push(`bandMetrics width ${m.width} vs drawn ${innerW}`);
    if (Math.abs(lineH - t.msgRowH) > 0.02) bad.push(`row height ${lineH} vs the layout's ${t.msgRowH}`);
    const holds = parseFloat(cs.paddingTop) + rows * lineH + parseFloat(cs.paddingBottom);
    if (mb.h + px < holds) bad.push(`the band ${mb.h.toFixed(2)} tall cannot hold ${rows} rows (${holds.toFixed(2)})`);
    // the status lines and the bars
    let bars = null;
    if (statusShown && R.status.BL_HPMAX) {
      const rowsEl = sbE.querySelectorAll('.row'), barsEl = sbE.querySelector('.bars');
      const inner = { ...sb, y: sb.y + parseFloat(getComputedStyle(sbE).paddingTop) };
      inner.h = sb.h - parseFloat(getComputedStyle(sbE).paddingTop) - parseFloat(getComputedStyle(sbE).paddingBottom);
      for (const r of [...rowsEl, ...(barsEl ? [barsEl] : [])]) { const q = box(r); if (q.y + q.h > sb.y + sb.h + px) bad.push(`a status row ends at ${(q.y + q.h).toFixed(2)}, under the band's ${(sb.y + sb.h).toFixed(2)}`); }
      const room = Ls.h - statusH;
      bars = !!barsEl;
      if (bars !== room >= 10) bad.push(`bars ${bars ? 'shown' : 'not shown'} with ${room.toFixed(2)} dp of room`);
      if (barsEl) {
        const fills = [...barsEl.querySelectorAll('.fill')].map((e) => parseFloat(e.style.width));
        const hp = Number(R.status.BL_HP.text) / Number(R.status.BL_HPMAX.text);
        if (Math.abs(fills[0] - 100 * Math.min(1, hp)) > 0.1) bad.push(`HP bar ${fills[0]}% vs ${100 * hp}%`);
        const en = Number(R.status.BL_ENE.text), enm = Number(R.status.BL_ENEMAX.text);
        if (enm > 0 && Math.abs(fills[1] - 100 * Math.min(1, en / enm)) > 0.1) bad.push(`Pw bar ${fills[1]}% vs ${100 * en / enm}%`);
        notes.push(`bars HP ${fills[0]}% Pw ${fills[1]}%`);
      }
      if (sbE.scrollWidth > sbE.clientWidth + 1) bad.push(`the status lines overflow: ${sbE.scrollWidth} > ${sbE.clientWidth}`);
    }
    // the MORE lamp sits in the message band
    const lamp = $('morelamp');
    if (lamp && !inside(box(lamp), mb, px)) bad.push(`the MORE lamp ${f(box(lamp))} is outside the message band ${f(mb)}`);
    // the map cell
    const T = O.twin.info.T, Tcss = Math.floor(T * dpr + 1e-6) / dpr;
    if (Math.abs(R.view.T - Tcss) > 1e-6 && Math.abs((Number(localStorage.getItem('rh.zoomFactor')) || 1) - 1) < 1e-9) bad.push(`drawn cell ${R.view.T} vs floor(T x dpr) / dpr ${Tcss}`);
    return { bad, notes, W, H, over: overBanks, side: O.twin.info.G.hd.sideBySide, kind: O.twin.info.G.kind, rows, T, drawnT: R.view.T, bars,
      bands: S.bands.map((b) => ({ name: b.name, x: b.x, y: b.y, w: b.w, h: b.h })), map: S.mapArea };
  }, { variant });
}

// A prompt's chips: #pray asks y or n, and the chips must lie in the map
async function chips(p) {
  await p.evaluate(() => globalThis.__bt.send('#pray\n'));
  await sleep(400);
  const r = await p.evaluate(() => {
    const $ = (id) => document.getElementById(id), S = globalThis.__bt.overlay.twin.spec, A = S.mapArea;
    const bs = [...$('chips').querySelectorAll('button')].map((b) => { const q = b.getBoundingClientRect(); return { t: b.textContent, x: q.x, y: q.y, w: q.width, h: q.height }; });
    const out = bs.filter((q) => q.x < A.x - 0.5 || q.y < A.y - 0.5 || q.x + q.w > A.x + A.w + 0.5 || q.y + q.h > A.y + A.h + 0.5);
    const keys = [...document.querySelectorAll('[data-tw]')].map((e) => e.getBoundingClientRect());
    const onKey = bs.filter((q) => keys.some((k) => q.x < k.right && k.left < q.x + q.w && q.y < k.bottom && k.top < q.y + q.h));
    return { n: bs.length, labels: bs.map((q) => q.t).join(' '), out: out.map((q) => q.t), onKey: onKey.map((q) => q.t), msg: $('msgband').innerText };
  });
  await p.keyboard.press('Escape');
  await sleep(300);
  return r;
}

const b = await launch();
const out = [];
let fails = 0;
const report = (tag, m) => {
  fails += m.bad.length;
  console.log(`${tag} @${DPR}: ${m.kind}${m.over ? ' header over the banks' : m.side ? ' side by side' : ' stacked'}, ${m.rows} rows, T ${m.T && m.T.toFixed(2)} drawn ${m.drawnT && m.drawnT.toFixed(3)}, bars ${m.bars}; `
    + `${m.bad.length ? `BAD ${m.bad.length}: ${m.bad.slice(0, 6).join(' | ')}` : 'ok'}${m.notes.length ? ` (${m.notes.join('; ')})` : ''}`);
};
const VARIANTS = [
  { name: 'default', prefs: {} },
  { name: 'rows', prefs: { mapCell: 'rows' }, mapCell: 'rows' },
  { name: 'big-text', prefs: { msgSize: 1.4 }, msgSize: 1.4, phones: ['lucas', 'small'] },
  { name: 'compact', prefs: { statusLines: 'compact' }, statusLines: 'compact', phones: ['lucas'] },
  { name: 'caseless', prefs: { case: false }, phones: ['lucas'] },
];
for (const v of VARIANTS) {
  for (const pr of PHONES) {
    if (v.phones && !v.phones.includes(pr.tag)) continue;
    if (only && !`${v.name}-${pr.tag}`.startsWith(only)) continue;
    const scrL = [pr.scr[1], pr.scr[0]];
    const ctx = await newCtx(b, { w: pr.L[0], h: pr.L[1], dpr: DPR, screen: { width: scrL[0], height: scrL[1] }, prefs: { ...v.prefs, budgets: {} } });
    const p = await openPage(ctx);
    await resume(p);
    const k = await touch(ctx, p);
    await sleep(500);
    for (const [i, o] of ['L', 'P', 'L'].entries()) {
      const [W, H] = pr[o];
      if (i) await k.rotate(W, H, DPR, o === 'P' ? pr.scr : scrL);
      const m = await check(p, v);
      const shot = `${SHOTS}/header-${DPR}-${v.name}-${pr.tag}-${i}-${W}x${H}.png`;
      await k.shot(shot);
      if (v.name === 'default' || v.name === 'rows') m.chips = await chips(p);
      if (m.chips && (m.chips.out.length || m.chips.onKey.length || m.chips.n < 2)) m.bad.push(`chips: ${JSON.stringify(m.chips)}`);
      report(`${v.name} ${pr.tag} ${i} ${W}x${H}`, m);
      out.push({ variant: v.name, tag: pr.tag, step: i, shot, ...m });
    }
    if (p.errors.length) { fails++; console.log('  console:', p.errors.join(' | ')); }
    await ctx.close();
  }
  for (const [W, H] of (v.phones ? [] : BIG)) {
    if (only && !`${v.name}-${W}x${H}`.startsWith(only)) continue;
    const ctx = await newCtx(b, { w: W, h: H, dpr: DPR, prefs: { ...v.prefs, budgets: {} } });
    const p = await openPage(ctx);
    await resume(p);
    await sleep(500);
    const m = await check(p, v);
    const shot = `${SHOTS}/header-${DPR}-${v.name}-${W}x${H}.png`;
    await p.screenshot({ path: shot });
    m.chips = await chips(p);
    if (m.chips.out.length || m.chips.onKey.length || m.chips.n < 2) m.bad.push(`chips: ${JSON.stringify(m.chips)}`);
    report(`${v.name} ${W}x${H}`, m);
    out.push({ variant: v.name, W, H, shot, ...m });
    if (p.errors.length) { fails++; console.log('  console:', p.errors.join(' | ')); }
    await ctx.close();
  }
}
writeJson(`header-${DPR}.json`, out);
console.log(fails ? `FAILURES: ${fails}` : 'ALL PASS');
await b.close();
