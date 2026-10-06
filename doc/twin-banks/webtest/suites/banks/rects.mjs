// Every key's DOM rect against layout()'s, at every test window, both
// densities, starting in either orientation and turning the device (window
// AND screen swap, through CDP) without reloading.  The settings handed to
// layout() are derived here from DESIGN.md section 12, not read from the page.
//   node rects.mjs [dpr]   -> rects-<dpr>.json, shots/rects-<dpr>-*.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, writeJson } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
// pairs: [landscape window], [portrait window], screen in portrait (the device)
const PAIRS = [
  { tag: 'lucas', L: [896, 443], P: [443, 939], scr: [443, 939] },
  { tag: 'small', L: [640, 360], P: [360, 640], scr: [360, 640] },
  { tag: 'p412', L: [915, 412], P: [412, 915], scr: [412, 915] },
  { tag: 'p390', L: [844, 390], P: [390, 844], scr: [390, 844] },
  { tag: 'tab', L: [896, 363], P: [443, 859], scr: [443, 939] },
];
// what each control's key must show, so a rect is checked on the right key
const LABEL = {
  pad_y: /^y$|↖/, pad_k: /^k$|↑/, pad_u: /^u$|↗/, pad_h: /^h$|←/, pad_l: /^l$|→/, pad_b: /^b$|↙/, pad_j: /^j$|↓/, pad_n: /^n$|↘/, pad_centre: /REST|SEARCH|PICK|\./i,
  msgs: /MSGS/i, drop: /DROP/i, pin1: /\+|TAP/i, game: /GAME/i, m1: /M1|MACRO/i, menu: /MENU/i, rest: /REST/i, world: /WORLD/i,
  sacrifice: /SACRIFICE/i, apply: /APPLY/i, search: /SEARCH/i, inventory: /INVENTORY/i, eat: /EAT/i, context: /./, combat: /COMBAT/i,
  // PIN 2 starts on Fire since the layers stage (the design's section 16)
  look: /LOOK/i, flick: /FLICK|\+/i, pin2: /FIRE/i, eq_swap: /SWAP/i, eq_remove: /REMOVE/i, eq_takeoff: /TAKE OFF/i,
  eq_wield: /WIELD/i, eq_puton: /PUT ON/i, eq_wear: /WEAR/i, m3: /M3|MACRO/i, keys: /KEYS/i, m2: /M2|MACRO/i,
};

// The budget per DESIGN.md section 12: portrait width, landscape height and
// width seen; the side not seen yet estimated from the screen.
function budgetAfter(seen, scr) {
  const short = Math.min(...scr), long = Math.max(...scr);
  const b = {};
  if (seen.P) b.w = seen.P[0]; else b.w = short;
  if (seen.L) { b.h = seen.L[1]; b.l = seen.L[0]; } else { const cur = seen.cur; b.h = short - (long - cur[1]); b.l = long; }
  return b;
}

async function check(p, W, H, budget, sideInsets) {
  return p.evaluate(async ({ W, H, budget, sideInsets, LS }) => {
    const LABEL = Object.fromEntries(Object.entries(LS).map(([k, [src, fl]]) => [k, new RegExp(src, fl)]));
    const L = await import('./layout.js');
    const O = globalThis.__bt.overlay;
    const dpr = devicePixelRatio;
    const t = L.textMetrics({ msgFont: 'atkinson', msgSize: 1, textScale: 1, xHeight: 9.5 });
    const settings = { padKey: 58, budget, sideInsets, insets: { l: 0, r: 0, t: 0, b: 0 }, msgRowH: t.msgRowH, statusH: 48 };
    const rA = L.layout(W, H, 'touch', settings);                       // the design's own header rule
    const rS = L.layout(W, H, 'touch', { ...settings, header: 'stacked' });
    const S = rS.spec;
    const bad = [], notes = [];
    const box = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    const f = (q) => `${q.x.toFixed(2)},${q.y.toFixed(2)} ${q.w.toFixed(2)}x${q.h.toFixed(2)}`;
    const over = (a, b, e = 0.01) => a.x + e < b.x + b.w && b.x + e < a.x + a.w && a.y + e < b.y + b.h && b.y + e < a.y + a.h;
    const inside = (a, b, e) => a.x >= b.x - e && a.y >= b.y - e && a.x + a.w <= b.x + b.w + e && a.y + a.h <= b.y + b.h + e;
    if (document.documentElement.dataset.ui !== 'twin') bad.push(`data-ui is ${document.documentElement.dataset.ui}, not twin`);
    if (!O.twin) return { bad: [...bad, `no twin layout (${O.twinFallback})`], notes };
    if (!rS.usable) bad.push(`layout() unusable: ${rS.reason}`);
    // the header option the page uses must not change anything at these windows
    const sameAB = JSON.stringify(rA.spec.controls) === JSON.stringify(S.controls) && JSON.stringify(rA.spec.mapArea) === JSON.stringify(S.mapArea)
      && JSON.stringify(rA.spec.bands) === JSON.stringify(S.bands);
    if (!sameAB) notes.push(`header 'stacked' (page) differs from the design's 'auto' here`);
    // what the page itself used, to explain any mismatch
    const ps = O.twin.settings;
    const pageBudget = ps.budget;
    if (JSON.stringify(pageBudget) !== JSON.stringify(budget)) notes.push(`page budget ${JSON.stringify(pageBudget)} vs derived ${JSON.stringify(budget)}`);
    if (Math.abs(ps.msgRowH - t.msgRowH) > 1e-9) notes.push(`page msgRowH ${ps.msgRowH} vs ${t.msgRowH}`);
    if (O.twin.W !== W || O.twin.H !== H) bad.push(`page laid out ${O.twin.W}x${O.twin.H}, window is ${W}x${H}`);
    const keys = {};
    let worst = 0;
    for (const c of S.controls) {
      if (c.behind) continue;
      const els = document.querySelectorAll(`[data-tw="${c.id}"]`);
      if (els.length !== 1) { bad.push(`${c.id}: ${els.length} elements`); continue; }
      // the keycap as drawn: since the layers stage a key's element is its hit
      // cell, the keycap inset in it (overlay.js Key.cell)
      const e = els[0], d = O.twinCapRect ? (({ x, y, width, height }) => ({ x, y, w: width, h: height }))(O.twinCapRect(c.id)) : box(e);
      keys[c.id] = d;
      const dev = Math.max(...['x', 'y', 'w', 'h'].map((k) => Math.abs(d[k] - c[k])));
      worst = Math.max(worst, dev);
      if (dev > 0.5) bad.push(`${c.id}: DOM ${f(d)} vs layout ${f(c)} (off ${dev.toFixed(2)})`);
      const txt = e.innerText.replace(/\s+/g, ' ').trim();
      if (LABEL[c.id] && !LABEL[c.id].test(txt)) bad.push(`${c.id}: shows "${txt}"`);
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.5) bad.push(`${c.id}: hidden`);
      // nothing sits on the key: 9 points inside it all reach it
      for (const fx of [0.15, 0.5, 0.85]) for (const fy of [0.15, 0.5, 0.85]) {
        const q = document.elementFromPoint(d.x + d.w * fx, d.y + d.h * fy);
        if (!q || !(e === q || e.contains(q))) { bad.push(`${c.id}: (${fx},${fy}) reaches ${q ? (q.id || q.className || q.tagName) : 'nothing'}`); break; }
      }
    }
    const ids = Object.keys(keys);
    if (ids.length !== 36) bad.push(`${ids.length} keys measured, not 36`);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (over(keys[ids[i]], keys[ids[j]])) bad.push(`${ids[i]} overlaps ${ids[j]}`);
    for (const id of ids) {
      const k = keys[id];
      if (k.x < -0.01 || k.y < -0.01 || k.x + k.w > W + 0.01 || k.y + k.h > H + 0.01) bad.push(`${id} off screen ${f(k)}`);
    }
    // any other visible key (a classic leftover, a stray pop-up) on a twin key
    const twinEls = ids.map((id) => document.querySelector(`[data-tw="${id}"]`));
    for (const e of document.querySelectorAll('#keys .k, #case *')) {
      if (twinEls.some((t) => t === e || t.contains(e) || e.contains(t))) continue;
      if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue;
      const r = box(e);
      if (r.w < 1 || r.h < 1) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      if (e.closest('#case') && /\bwell\b/.test(e.className)) continue;    // a bank's well lies under its keys by design
      for (const id of ids) if (over(r, keys[id], 0.5)) { bad.push(`visible ${e.className || e.tagName} ${f(r)} on ${id}`); break; }
    }
    // the glass, the bands, the canvas
    const $ = (id) => document.getElementById(id);
    const glass = box($('glass')), cv = box($('map')), mb = box($('msgband')), sb = box($('statband'));
    const A = S.mapArea, px = 1 / dpr + 0.02;
    if (Math.max(...['x', 'y', 'w', 'h'].map((k) => Math.abs(glass[k] - S.glass[k]))) > 0.5) bad.push(`glass DOM ${f(glass)} vs ${f(S.glass)}`);
    if (Math.max(...['x', 'y', 'w', 'h'].map((k) => Math.abs(mb[k] - S.bands[0][k]))) > 0.5) bad.push(`msgband DOM ${f(mb)} vs ${f(S.bands[0])}`);
    if (Math.max(...['x', 'y', 'w', 'h'].map((k) => Math.abs(sb[k] - S.bands[1][k]))) > 0.5) bad.push(`statband DOM ${f(sb)} vs ${f(S.bands[1])}`);
    // inside, or out by under a device pixel where only that holds the level (web.js layoutTwinGlass)
    if (!inside(cv, A, px)) bad.push(`canvas ${f(cv)} reaches outside the map area ${f(A)}`);
    if (cv.x - A.x > px || cv.y - A.y > px || A.x + A.w - cv.x - cv.w > px || A.y + A.h - cv.y - cv.h > px) bad.push(`canvas ${f(cv)} does not fill the map area ${f(A)}`);
    const cvs = document.querySelectorAll('canvas');
    const visibleCanvases = [...cvs].filter((c) => c.offsetParent && box(c).w > 0);
    if (visibleCanvases.length !== 1) notes.push(`${visibleCanvases.length} visible canvases`);
    for (const id of ids) {
      if (over(keys[id], cv)) bad.push(`canvas under ${id}`);
      if (over(keys[id], glass)) bad.push(`glass under ${id}`);
      if (over(keys[id], mb)) bad.push(`msgband over ${id}`);
      if (over(keys[id], sb)) bad.push(`statband over ${id}`);
    }
    // the canvas's backing store maps one device pixel to one pixel
    const c0 = $('map');
    if (Math.abs(c0.width - cv.w * dpr) > 0.5 || Math.abs(c0.height - cv.h * dpr) > 0.5) bad.push(`canvas store ${c0.width}x${c0.height} vs ${cv.w * dpr}x${cv.h * dpr}`);
    // the drawn cell: the layout's device cell, snapped to device pixels
    const V = globalThis.__bt.view, T = rS.info.T, Tcss = Math.floor(T * dpr) / dpr;
    const tile = globalThis.__bt.tileSize();
    if (Math.abs(tile - T) > 1e-6) notes.push(`tileSize() ${tile} vs layout cell ${T}`);
    if (Math.abs(V.T - Tcss) > 0.02) notes.push(`drawn cell ${V.T} vs floor(T*dpr)/dpr ${Tcss.toFixed(3)}`);
    // the hero's cell is inside the drawn canvas
    const cur = globalThis.__bt.cursor;
    let hero = null;
    if (cur && cur.x >= 0) {
      hero = { x: cv.x + V.left + cur.x * V.T, y: cv.y + V.top + cur.y * V.T, w: V.T, h: V.T };
      if (!inside(hero, cv, 0.5)) bad.push(`hero cell ${f(hero)} outside the canvas ${f(cv)}`);
    }
    // a point just outside the map area is never the map
    for (const [x, y] of [[A.x - 2, A.y + A.h / 2], [A.x + A.w + 2, A.y + A.h / 2], [A.x + A.w / 2, A.y - 2], [A.x + A.w / 2, A.y + A.h + 2]]) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const q = document.elementFromPoint(x, y);
      if (q && q.id === 'map') bad.push(`(${x.toFixed(1)},${y.toFixed(1)}) outside the map area reaches the canvas`);
    }
    const corners = {};
    for (const c of S.controls) if (!c.behind) {
      const d = keys[c.id]; if (!d) continue;
      corners[c.id] = { in: c.thumb === 'L' ? d.x : W - d.x - d.w, up: H - d.y - d.h, w: d.w, h: d.h };
    }
    return { bad, notes, worst, fit: S.fit.level, pad: S.fit.pad, cell: T, drawnT: V.T, map: A, corners, hero,
      pageSettings: { budget: ps.budget, sideInsets: ps.sideInsets, header: ps.header } };
  }, { W, H, budget, sideInsets, LS: Object.fromEntries(Object.entries(LABEL).map(([k, v]) => [k, [v.source, v.flags]])) });
}

function parity(a, b) {
  const out = [];
  for (const [id, q] of Object.entries(a.corners)) {
    const r = b.corners[id];
    if (!r) { out.push(`${id} missing`); continue; }
    for (const k of ['in', 'up', 'w', 'h']) if (Math.abs(q[k] - r[k]) > 0.5) out.push(`${id}.${k} ${q[k].toFixed(2)} vs ${r[k].toFixed(2)}`);
  }
  return out;
}

const b = await launch();
const out = [];
let fails = 0;
for (const pr of PAIRS) {
  for (const first of ['L', 'P']) {
    const seq = first === 'L' ? ['L', 'P', 'L'] : ['P', 'L', 'P'];
    const scrFor = (o) => (o === 'P' ? pr.scr : [pr.scr[1], pr.scr[0]]);
    const [w0, h0] = pr[first];
    const s0 = scrFor(first);
    // a device that has never shown this page: no remembered budget
    const ctx = await newCtx(b, { w: w0, h: h0, dpr: DPR, screen: { width: s0[0], height: s0[1] }, prefs: { budgets: {} } });
    // LABEL regexes do not survive serialisation: pass sources
    const p = await openPage(ctx);
    await resume(p);
    const k = await touch(ctx, p);
    const seen = {};
    const steps = [];
    for (let i = 0; i < seq.length; i++) {
      const o = seq[i], [W, H] = pr[o];
      if (i > 0) await k.rotate(W, H, DPR, scrFor(o));
      else await sleep(500);
      seen[o] = [W, H]; seen.cur = [W, H];
      const budget = budgetAfter(seen, pr.scr);
      const sideInsets = seen.L ? { l: 0, r: 0 } : null;
      const m = await check(p, W, H, budget, sideInsets);
      const shot = `${SHOTS}/rects-${DPR}-${pr.tag}-${first}first-${i}-${W}x${H}.png`;
      await k.shot(shot);
      steps.push({ W, H, o, budget, shot, ...m });
      fails += m.bad.length;
      console.log(`${pr.tag} ${first}-first step ${i} ${W}x${H} @${DPR}: ${m.fit} pad ${m.pad} cell ${m.cell && m.cell.toFixed(2)} drawn ${m.drawnT && m.drawnT.toFixed(3)} worst ${m.worst !== undefined ? m.worst.toFixed(3) : '-'}; bad ${m.bad.length}${m.bad.length ? ': ' + m.bad.slice(0, 5).join(' | ') : ''}${m.notes.length ? '; notes: ' + m.notes.join(' | ') : ''}`);
    }
    // the same banks both ways, and the first layout the same as after the turn
    const par = steps[1].corners && steps[2].corners ? parity(steps[1], steps[2]) : ['missing'];
    const par0 = steps[0].corners && steps[1].corners ? parity(steps[0], steps[1]) : ['missing'];
    if (par.length) fails++;
    if (par0.length) fails++;
    console.log(`  parity after turn: ${par.length ? par.slice(0, 5).join(' | ') : 'all 36 keys at the same corner offsets'}; first vs turned: ${par0.length ? par0.slice(0, 5).join(' | ') : 'same'}`);
    if (p.errors.length) { fails++; console.log('  CONSOLE ERRORS:', p.errors); }
    out.push({ pair: pr, first, steps, parity: par, parityFirst: par0, errors: p.errors });
    await ctx.close();
  }
}
writeJson(`rects-${DPR}.json`, out);
console.log(fails ? `FAILURES: ${fails}` : 'ALL PASS');
await b.close();
