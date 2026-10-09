// The CI gate: the v2 rule run over every screen, setting and edge case the verifiers raised
// (2 October 2026), each screen scored by the harness and checked against every rule in
// lib.mjs screenIssues().  Exit code 1 on any issue.
//
//   node doc/twin-banks/checks/sweep.mjs [-v]
//
// Sections:
//  1. the matrix: 46/52/58 dp keys x {default, left-handed, combat-left, Android text cells,
//     mapCell rows} over 13 phones, 7 tablets and 4 foldables or split screens (Surface
//     Duo, iPad mini half, Z Fold5 and Pixel Fold inner) in both orientations, 4 touch
//     laptops and 11 mouse screens; every orientation pair scored by the harness (0
//     switches, 0 moves, 0 bearings, 0 order swaps, 36 of 36 both ways with the 3 dp margin)
//     and by the hit model (no point of a bank or its halo resolves differently);
//  2. the map never shrinks as the keys shrink (46 >= 52 >= 58): every screen and variant of
//     the matrix, and dense grids of windows 480-1000 x 600-960 dp (step 8) and 1000-2000 x
//     320-480 (steps 16 and 8) in every variant, where a full-width map a hair short of 21
//     rows once lost to a 120 dp column;
//  3. uneven pairs (the landscape short side or long side differs from portrait's), with the
//     remembered budget: parity; without it: every single-screen rule;
//  4. iPhone safe areas (14, 15, 15 Pro Max: 47/59/62 dp side insets) under each anchor rule;
//  5. Android side cutouts of 8/24/30 dp at 360/390/412 dp wide: the margin clears the
//     cutout, only the depth beyond the margin is added, the bottom offset never pays;
//  6. grip lift 0/20/40/80 on phones and tablets: clamped, never under a band or off screen;
//     and with anchor 'safe' and a bottom inset (iPhone 12 mini, 14, 15 Pro Max, 640x360),
//     where the inset once raised the banks past the fit;
//  7. short screens (640x336, 592x336, 600x330, 700x320, 1024x300, 800x250, 480x300, 300x200
//     and their portraits), near-square windows 320-520 dp (Android split screen) and
//     windows smaller than their remembered budget: never throws, the pad steps 58 -> 52 ->
//     46, the right columns stay >= 40, anything below the rule is flagged degraded with a
//     reason, and a window with no room for twin banks and a map comes back unusable (the
//     page shows classic) -- never as a spec with keys on keys or bands over them;
//  8. text sizes: both message faces x Message size 0.85-1.4 x system text 0.85-2;
//  9. 960x600 / 600x960 (the landscape glass shows all 21 rows) and ultrawide 3440x1440
//     (void under today's 21.8% at 1920x1080 on every mouse screen, tiles and text cells);
// 10. layout() never throws, on 3000 seeded random windows and settings, nonsense included,
//     and every result it calls usable is drawable (lib.mjs drawable(), not layout.js's own
//     check).
//
// Everywhere but sections 7 and 10 an unusable result is an issue.
//
// It runs win/web/layout.js; RH_LAYOUT=<path> runs another build of the rule.  The design's
// first cut (29 September, before the verifiers) failed it in every section.
import { layout, evaluate, pairScore, hitParity, screenIssues, drawable, MM } from './lib.mjs';

const verbose = process.argv.includes('-v');
const phones = [[344, 882], [360, 800], [360, 640], [390, 844], [393, 852], [402, 874], [412, 915], [412, 924], [428, 926], [430, 932], [440, 956], [443, 939], [448, 997]];
const tablets = [[600, 960], [712, 1138], [768, 1024], [820, 1180], [853, 1280], [912, 1368], [1032, 1376]];
// Surface Duo, an iPad mini 6 split-view half, the Z Fold5 and Pixel Fold inner screens
const foldables = [[540, 720], [561, 744], [690, 829], [701, 841]];
const touchL = [[1280, 950], [1366, 768], [1536, 864], [1280, 720]];
const mouse = [[1280, 800], [1440, 900], [1920, 1080], [1920, 1200], [2560, 1440], [2560, 1600], [3440, 1440], [3840, 2160], [1280, 720], [1536, 864], [5120, 2160]];
// Lucas's phone is uneven: 896 wide in landscape, 939 tall in portrait (the audit's captures)
const LUCAS = { land: [896, 443], port: [443, 939] };

let total = 0, screensRun = 0;
const sections = [];
function section(name) { const s = { name, screens: 0, unusable: 0, issues: [], t0: Date.now() }; if (sections.length) sections[sections.length - 1].ms = Date.now() - sections[sections.length - 1].t0; sections.push(s); return s; }
function run(sec, W, H, p, st, tag, opts = {}) {
  const r = layout(W, H, p, st);
  sec.screens++; screensRun++;
  if (!r.spec) { sec.issues.push(`${tag} ${W}x${H}: NO SPEC (${r.reason})`); return null; }
  if (r.usable === false) {
    sec.unusable++;
    if (!opts.allowUnusable) sec.issues.push(`${tag} ${W}x${H}: unusable (${r.reason})`);
    return null;
  }
  const key = `${W}x${H}`;
  const res = evaluate({ name: 'one', screens: { [key]: r.spec }, retired: {} });
  const is = [...res.validation.errors.map((e) => `spec error ${e}`), ...screenIssues(r.spec, res.screens[key], { pad: p === 'touch' ? st.padKey ?? 58 : null })];
  const dr = drawable(r.spec, r.info && r.info.fill);
  if (dr.length) is.push(`not drawable: ${dr.slice(0, 3).join(', ')}`);
  const fit = r.spec.fit || { level: 'full', reasons: [] };
  if (opts.expectFull && fit.level !== 'full' && p === 'touch') is.push(`level ${fit.level}: ${r.reason}`);
  if (is.length) sec.issues.push(`${tag} ${W}x${H}: ${is.join(' | ')}`);
  return { ...r, m: res.screens[key] };
}
function pair(sec, A, B, tag, { hits = true } = {}) {
  if (!A || !B) return;
  const s = pairScore(A.spec, B.spec);
  const bad = [];
  if (s.sw || s.mv || s.be || s.or) bad.push(`sw ${s.sw} mv ${s.mv} bear ${s.be} order ${s.or}`);
  if (s.same !== s.n || s.back !== s.n || s.sameMargin !== s.n || s.backMargin !== s.n) bad.push(`trained taps L>P ${s.same}(${s.sameMargin}) P>L ${s.back}(${s.backMargin}) of ${s.n}`);
  if (hits) { const h = hitParity(A.spec, B.spec); if (h.area > 0) bad.push(`hit model differs over ${h.area} dp² (${h.top.join(', ')})`); }
  if (bad.length) sec.issues.push(`${tag} pair ${A.spec.W}x${A.spec.H}/${B.spec.W}x${B.spec.H}: ${bad.join(' | ')}`);
}
const budgetOf = (land, port) => ({ w: port[0], h: land[1], l: land[0] });

// ---- 1. the matrix -----------------------------------------------------------------------
const VARIANTS = [['default', {}], ['left-handed', { hand: 'left' }], ['combat-left', { combatThumb: 'L' }], ['text cells', { cellAspect: 0.5625 }], ['cell rows', { mapCell: 'rows' }]];
// the map a screen shows: its cells, then its area (the harness's map share)
const mapPct = new Map();
const mapOf = (R) => ({ cells: R.info.fill.cols * R.info.fill.rows, pct: R.m.map.pct });
{
  const sec = section('1. matrix: 3 pad sizes x 5 variants, phones, tablets, laptops, mouse; pairs by harness and hit model');
  for (const [vname, variant] of VARIANTS) {
    for (const k of [46, 52, 58]) {
      const st = { ...variant, padKey: k }, tag = `${vname} pad ${k}`;
      for (const [w, h] of [...phones, ...tablets, ...foldables]) {
        const P = run(sec, w, h, 'touch', st, tag, { expectFull: w >= 358 });
        const L = run(sec, h, w, 'touch', st, tag, { expectFull: w >= 358 });
        pair(sec, L, P, tag);
        if (P) mapPct.set(`${vname}|${w}x${h}|${k}`, mapOf(P));
        if (L) mapPct.set(`${vname}|${h}x${w}|${k}`, mapOf(L));
      }
      // Lucas's phone with the budget its device remembers, and its first portrait visit
      const b = budgetOf(LUCAS.land, LUCAS.port);
      pair(sec, run(sec, ...LUCAS.land, 'touch', { ...st, budget: b }, tag, { expectFull: true }), run(sec, ...LUCAS.port, 'touch', { ...st, budget: b }, tag, { expectFull: true }), `${tag} Lucas`);
      run(sec, ...LUCAS.port, 'touch', st, `${tag} Lucas first visit`, { expectFull: true });
      for (const [w, h] of touchL) { const R = run(sec, w, h, 'touch', st, tag, { expectFull: true }); if (R) mapPct.set(`${vname}|${w}x${h}|${k}`, mapOf(R)); }
      if (k === 58) for (const [w, h] of mouse) {
        const R = run(sec, w, h, 'mouse', st, tag);
        if (R && R.m.void.pct > 21.8) sec.issues.push(`${tag} ${w}x${h} mouse: void ${R.m.void.pct.toFixed(1)}% (over today's 21.8%)`);
      }
    }
  }
}

// ---- 2. the map never shrinks as the keys shrink ------------------------------------------
{
  // Smaller keys never show less of the level: never fewer cells and never a smaller map share
  // (the device cell is decided at 58 dp keys, so the freed width becomes columns).
  const sec = section('2. as the keys shrink (58 -> 52 -> 46) the map never shrinks: cells and map share, every touch screen and variant');
  const keys = new Set([...mapPct.keys()].map((k) => k.split('|').slice(0, 2).join('|')));
  const less = (a, b) => a.cells < b.cells - 0.01 || a.pct < b.pct - 1e-6;
  for (const base of keys) {
    sec.screens++;
    const v = [46, 52, 58].map((k) => mapPct.get(`${base}|${k}`));
    if (v.some((x) => x == null)) continue;
    if (less(v[0], v[1]) || less(v[1], v[2])) sec.issues.push(`${base}: ${v.map((x) => `${x.cells.toFixed(0)} cells ${x.pct.toFixed(2)}%`).join(' / ')} at 46 / 52 / 58 dp`);
  }
  // the dense grid: layout() alone (no harness), cells and map area at each key size; a
  // window usable at one size must stay usable at the smaller ones
  const grid = [];
  for (let W = 480; W <= 1000; W += 8) for (let H = 600; H <= 960; H += 8) grid.push([W, H]);
  // and wide, short windows (landscape phones beside a panel, 21:9 split views), where the
  // header over the banks once handed its top margin back at 46 dp and lost a sliver of map
  for (let W = 1000; W <= 2000; W += 16) for (let H = 320; H <= 480; H += 8) grid.push([W, H]);
  for (const [vname, variant] of VARIANTS) for (const [W, H] of grid) {
    sec.screens++; screensRun += 3;
    const v = [46, 52, 58].map((k) => layout(W, H, 'touch', { ...variant, padKey: k }));
    const ok = v.map((r) => !!r.spec && r.usable !== false);
    if ((ok[2] && !ok[1]) || (ok[1] && !ok[0])) { sec.issues.push(`${vname} ${W}x${H}: usable at ${ok.map((o, i) => (o ? [46, 52, 58][i] : '')).filter(Boolean).join('/')} dp only`); continue; }
    if (!ok[2]) continue;
    const m = v.map((r) => ({ cells: r.info.fill.cols * r.info.fill.rows, area: r.spec.mapArea.w * r.spec.mapArea.h }));
    const lessA = (a, b) => a.cells < b.cells - 0.01 || a.area < b.area - 0.5;
    if (lessA(m[0], m[1]) || lessA(m[1], m[2])) sec.issues.push(`${vname} ${W}x${H}: ${m.map((x) => `${x.cells.toFixed(0)} cells ${x.area.toFixed(0)} dp²`).join(' / ')} at 46 / 52 / 58 dp`);
  }
}

// ---- 3. uneven pairs ------------------------------------------------------------------------
{
  const sec = section('3. uneven pairs: with the budget, parity; without, every single-screen rule');
  const uneven = [[[915, 388], [412, 891]], [[830, 390], [390, 860]], [[896, 419], [443, 915]], [[844, 366], [390, 820]], [[640, 336], [360, 616]], [[896, 443], [443, 939]], [[800, 412], [412, 915]]];
  for (const [vname, variant] of VARIANTS) for (const k of [46, 52, 58]) {
    const st = { ...variant, padKey: k }, tag = `${vname} pad ${k}`;
    for (const [land, port] of uneven) {
      const b = budgetOf(land, port);
      pair(sec, run(sec, ...land, 'touch', { ...st, budget: b }, `${tag} budget`), run(sec, ...port, 'touch', { ...st, budget: b }, `${tag} budget`), `${tag} budget`);
      run(sec, ...land, 'touch', st, `${tag} no budget`);
      run(sec, ...port, 'touch', st, `${tag} no budget`);
    }
  }
}

// ---- 4. iPhone safe areas --------------------------------------------------------------------
{
  const sec = section('4. iPhone safe areas (side insets 47/59/62) under each anchor rule');
  const phonesI = [['iPhone 14', [844, 390], 47, 47], ['iPhone 15', [852, 393], 59, 59], ['iPhone 15 Pro Max', [932, 430], 62, 59]];
  for (const [name, [lw, lh], side, top] of phonesI) for (const anchor of ['auto', 'physical', 'safe']) for (const k of [46, 52, 58]) for (const oneSided of [false, true]) {
    const ins = { l: side, r: oneSided ? 0 : side, t: 0, b: 21 };
    const st = { padKey: k, anchor, sideInsets: { l: ins.l, r: ins.r } };
    const tag = `${name} ${anchor}${oneSided ? ' one side' : ''} pad ${k}`;
    const L = run(sec, lw, lh, 'touch', { ...st, insets: ins }, tag);
    const P = run(sec, lh, lw, 'touch', { ...st, insets: { l: 0, r: 0, t: top, b: 34 } }, tag);
    if (L && anchor !== 'physical') {
      // the outer columns clear the side insets
      const live = L.spec.controls.filter((c) => !c.behind);
      const inIns = live.filter((c) => c.x < ins.l - 0.01 || c.x + c.w > lw - ins.r + 0.01).map((c) => c.id);
      if (inIns.length) sec.issues.push(`${tag}: keys in the side inset: ${inIns.join(', ')}`);
      // the bands clear them too
      for (const b of L.spec.bands) if (b.x < ins.l - 0.01 || b.x + b.w > lw - ins.r + 0.01) sec.issues.push(`${tag}: ${b.name.split(' (')[0]} in the side inset`);
    }
    if (anchor === 'physical') pair(sec, L, P, tag);
  }
}

// ---- 5. Android cutouts -------------------------------------------------------------------------
{
  const sec = section('5. Android side cutouts 8/24/30 dp at 360/390/412 wide');
  for (const [w, h] of [[360, 780], [390, 844], [412, 915], [360, 640]]) for (const cut of [0, 8, 24, 30]) for (const k of [46, 52, 58]) for (const [vname, variant] of VARIANTS) {
    const st = { ...variant, padKey: k, avoidCutout: cut }, tag = `${vname} cutout ${cut} pad ${k}`;
    const P = run(sec, w, h, 'touch', st, tag), L = run(sec, h, w, 'touch', st, tag);
    pair(sec, L, P, tag);
    if (!L || !P) continue;
    const plainR = layout(h, w, 'touch', { ...variant, padKey: k });
    if (!plainR.info) continue;
    const plain = plainR.info.M, M = L.info.M;
    if (M.m < Math.min(cut, plain.m + cut) - 0.01) sec.issues.push(`${tag} ${h}x${w}: margin ${M.m} does not clear the ${cut} dp cutout`);
    if (M.k === plain.k && M.m > Math.max(plain.m, cut) + 0.01) sec.issues.push(`${tag} ${h}x${w}: margin ${M.m.toFixed(1)} adds more than the depth beyond ${plain.m.toFixed(1)}`);
    // the bottom offset never pays for a side cutout: never more than the margin without one
    if (M.k === plain.k && M.mb > plain.m + 0.01) sec.issues.push(`${tag} ${h}x${w}: the bottom offset ${M.mb.toFixed(1)} is over the margin without the cutout, ${plain.m.toFixed(1)}`);
  }
}

// ---- 6. grip lift --------------------------------------------------------------------------------
{
  const sec = section('6. grip lift 0/20/40/80 dp');
  for (const [land, port] of [[[896, 443], [443, 939]], [[640, 360], [360, 640]], [[844, 390], [390, 844]], [[915, 412], [412, 915]], [[1024, 768], [768, 1024]], [[1180, 820], [820, 1180]]]) {
    for (const lift of [0, 20, 40, 80]) for (const mode of ['columns', 'rows']) for (const k of [46, 58]) {
      const b = budgetOf(land, port), st = { padKey: k, gripLift: lift, mapCell: mode, budget: b }, tag = `lift ${lift} ${mode} pad ${k}`;
      const L = run(sec, ...land, 'touch', st, tag), P = run(sec, ...port, 'touch', st, tag);
      pair(sec, L, P, tag);
      if (L && L.info.M.lift > lift + 1e-6) sec.issues.push(`${tag}: lift ${L.info.M.lift} over the setting`);
    }
  }
  // anchor 'safe' with a bottom inset and grip lift: the inset's share and the lift are
  // clamped together, so no key leaves the screen (screenIssues checks every key)
  for (const [name, [lw, lh], side, top] of [['iPhone 12 mini', [812, 375], 50, 50], ['iPhone 14', [844, 390], 47, 47], ['iPhone 15 Pro Max', [932, 430], 62, 59], ['640x360', [640, 360], 0, 24]]) {
    for (const lift of [0, 20, 40, 80]) for (const k of [46, 58]) {
      const st = { padKey: k, anchor: 'safe', gripLift: lift, sideInsets: { l: side, r: side } }, tag = `${name} safe lift ${lift} pad ${k}`;
      const L = run(sec, lw, lh, 'touch', { ...st, insets: { l: side, r: side, t: 0, b: 21 } }, tag);
      run(sec, lh, lw, 'touch', { ...st, insets: { l: 0, r: 0, t: top, b: 34 } }, tag);
      if (L && L.info.lift > lift + 1e-6) sec.issues.push(`${tag}: lift ${L.info.lift} over the setting`);
    }
  }
}

// ---- 7. short screens -----------------------------------------------------------------------------
{
  const sec = section('7. short screens: never throw, step the pad, flag what is below the rule');
  const short = [[640, 336], [592, 336], [600, 330], [700, 320], [1024, 300], [800, 250], [480, 300], [300, 200]];
  for (const [w, h] of short) for (const k of [46, 52, 58]) for (const [vname, variant] of VARIANTS) {
    const st = { ...variant, padKey: k }, tag = `${vname} pad ${k}`;
    for (const [W, H] of [[w, h], [h, w]]) {
      const R = run(sec, W, H, 'touch', st, tag, { allowUnusable: true });
      if (!R) continue;
      const f = R.spec.fit || { level: 'full', reasons: [], pad: Math.min(...R.spec.controls.filter((c) => c.kind === 'pad').map((c) => c.w)), rightColumns: R.info.M.kR };
      if (f.pad < Math.min(46, k) - 1e-6 && f.level !== 'degraded') sec.issues.push(`${tag} ${W}x${H}: pad ${f.pad} under 46 at level ${f.level}`);
      if (f.rightColumns < 40 - 1e-6 && f.level !== 'degraded') sec.issues.push(`${tag} ${W}x${H}: right columns ${f.rightColumns} under 40 at level ${f.level}`);
      if (f.level !== 'full' && !f.reasons.length) sec.issues.push(`${tag} ${W}x${H}: level ${f.level} with no reason`);
      if (verbose && vname === 'default') console.log(`   short ${W}x${H} pad ${k}: ${f.level}, pad ${f.pad}, right ${f.rightColumns}${R.degraded ? ', DEGRADED' : ''}: ${R.reason || ''}`);
    }
  }
  // near-square windows (an Android split screen: 443x460 is Lucas's phone beside a wiki):
  // usable and clean, or unusable; at the default text size the reason never blames it
  for (let W = 320; W <= 520; W += 8) for (let H = 320; H <= 520; H += 8) for (const k of [46, 52, 58]) {
    const R = run(sec, W, H, 'touch', { padKey: k }, `near-square pad ${k}`, { allowUnusable: true });
    const r = R || layout(W, H, 'touch', { padKey: k });
    if (r.spec && r.spec.fit && r.spec.fit.reasons.some((x) => /text is too large/.test(x))) sec.issues.push(`near-square pad ${k} ${W}x${H}: blames the text at the default size`);
  }
  // windows smaller than the remembered budget, on either axis: laid out without it
  for (const [W, H, b] of [[400, 363, { w: 443, h: 363, l: 896 }], [380, 363, { w: 443, h: 363, l: 896 }], [440, 400, { w: 443, h: 363, l: 896 }], [600, 443, { w: 443, h: 443, l: 896 }],
    [480, 443, { w: 443, h: 443, l: 896 }], [443, 460, { w: 443, h: 443, l: 896 }], [360, 400, { w: 360, h: 443, l: 800 }], [412, 420, { w: 412, h: 412, l: 915 }], [700, 600, { w: 600, h: 600, l: 960 }],
    [896, 400, { w: 443, h: 443, l: 896 }], [430, 939, { w: 443, h: 443, l: 896 }]]) {
    run(sec, W, H, 'touch', { budget: b }, `budget ${b.w}/${b.h}/${b.l}`, { allowUnusable: true });
  }
}

// ---- 8. text sizes ---------------------------------------------------------------------------------
{
  const sec = section('8. text sizes: message face x Message size x system text size');
  for (const [land, port] of [[[896, 443], [443, 939]], [[640, 360], [360, 640]], [[844, 390], [390, 844]], [[915, 412], [412, 915]], [[1024, 768], [768, 1024]]]) {
    for (const msgFont of ['atkinson', 'screen']) for (const msgSize of [0.85, 1, 1.2, 1.4]) for (const textScale of [0.85, 1, 1.3, 2]) for (const mode of ['columns', 'rows']) {
      const b = budgetOf(land, port), st = { text: { msgFont, msgSize, textScale }, mapCell: mode, budget: b }, tag = `${msgFont} ${msgSize} x${textScale} ${mode}`;
      // The one allowance (2026-10-08, the status lines at the text metric; DESIGN.md's
      // CHANGES): 360x640 with the screen font at Text size Larger and twice the system text
      // is classic.  One status line alone is 104 dp there (the old 48 dp band at that text
      // size was 96), and the rule drops no further than one line.
      const corner = port[0] === 360 && msgFont === 'screen' && msgSize === 1.4 && textScale === 2;
      pair(sec, run(sec, ...land, 'touch', st, tag), run(sec, ...port, 'touch', st, tag, { allowUnusable: corner }), tag, { hits: false });
    }
  }
}

// ---- 9. 960x600 and the ultrawide --------------------------------------------------------------------
{
  const sec = section('9. 960x600 / 600x960 shows all 21 rows; mouse void under today\'s 21.8% (ultrawide, text cells)');
  for (const k of [46, 52, 58]) for (const mode of ['columns', 'rows']) {
    const st = { padKey: k, mapCell: mode }, tag = `pad ${k} ${mode}`;
    const L = run(sec, 960, 600, 'touch', st, tag), P = run(sec, 600, 960, 'touch', st, tag);
    pair(sec, L, P, tag);
    for (const R of [L, P]) if (R && R.info.fill.rows < 21 - 1e-6) sec.issues.push(`${tag} ${R.spec.W}x${R.spec.H}: ${R.info.fill.rows.toFixed(1)} of 21 rows`);
  }
  for (const a of [1, 0.5625]) for (const [w, h] of [[3440, 1440], [2560, 1440], [1920, 1080], [3840, 1600], [5120, 1440]]) {
    const R = run(sec, w, h, 'mouse', { cellAspect: a }, `cells ${a}`);
    if (R && R.m.void.pct > 21.8) sec.issues.push(`cells ${a} ${w}x${h}: void ${R.m.void.pct.toFixed(1)}% (over today's 21.8%)`);
    if (verbose && R) console.log(`   mouse ${w}x${h} cells ${a}: void ${R.m.void.pct.toFixed(1)}%, map ${R.m.map.pct.toFixed(1)}%, ${R.spec.source.split('map cell ')[1]}`);
  }
}

// ---- 10. never throws --------------------------------------------------------------------------------
{
  // seeded random windows (some not numbers at all) and settings (some nonsense): every call
  // must come back with a spec whose every number is finite
  const sec = section('10. layout() never throws: 3000 seeded random windows and settings, odd values included');
  let a = 42;
  const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = (xs) => xs[Math.floor(r() * xs.length)];
  const odd = [NaN, 0, -5, 1, 50, Infinity, '400', null, undefined];
  for (let i = 0; i < 3000; i++) {
    const W = r() < 0.05 ? pick(odd) : Math.round(100 + r() * 4000), H = r() < 0.05 ? pick(odd) : Math.round(100 + r() * 2500);
    const st = { padKey: pick([46, 52, 58, 40, 70, NaN]), hand: pick(['left', 'right']), combatThumb: pick(['L', 'R']), cellAspect: pick([1, 0.5625, 0, NaN]), mapCell: pick(['columns', 'rows', 'x']),
      gripLift: pick([0, 20, 80, 500, -10]), avoidCutout: pick([0, 8, 30, 200]), insets: pick([undefined, { l: 47, r: 47 }, { t: 400 }, { l: NaN }]), anchor: pick(['auto', 'safe', 'physical']),
      text: pick([undefined, { msgFont: 'screen', msgSize: 1.4, textScale: 2 }, { msgSize: 'x' }]), budget: pick([null, { w: 443, h: 443, l: 896 }, { w: 2000, h: 50 }, { w: NaN }]), msgRows: pick([undefined, { landscape: 0, portrait: 9 }]) };
    const p = pick(['touch', 'touch', 'mouse']);
    sec.screens++; screensRun++;
    const res = layout(W, H, p, st);
    if (!res.spec) { sec.issues.push(`${W}x${H} ${p} ${JSON.stringify(st)}: ${res.reason}`); continue; }
    const bad = [];
    const walk = (o, at) => { if (typeof o === 'number' && !Number.isFinite(o)) bad.push(at); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, `${at}.${k}`); };
    walk(res.spec, 'spec');
    if (bad.length) sec.issues.push(`${W}x${H} ${p} ${JSON.stringify(st)}: not finite at ${bad[0]}`);
    if (res.usable === false) { sec.unusable++; continue; }
    const dr = drawable(res.spec, res.info && res.info.fill);
    if (dr.length) sec.issues.push(`${W}x${H} ${p} ${JSON.stringify(st)}: usable but not drawable: ${dr.slice(0, 3).join(', ')}`);
  }
}

// ---- summary ------------------------------------------------------------------------------------------
sections[sections.length - 1].ms = Date.now() - sections[sections.length - 1].t0;
for (const s of sections) {
  console.log(`${s.name}: ${s.screens} screens${s.unusable ? ` (${s.unusable} unusable, shown as classic)` : ''}, ${s.issues.length} issues${verbose ? ` (${(s.ms / 1000).toFixed(1)} s)` : ''}`);
  if (s.issues.length) console.log('   ' + s.issues.slice(0, verbose ? 1e9 : 25).join('\n   ') + (s.issues.length > 25 && !verbose ? `\n   ... ${s.issues.length - 25} more (-v)` : ''));
  total += s.issues.length;
}
console.log(`sweep: ${screensRun} screen layouts in ${sections.length} sections, ${total} issues`);
process.exit(total ? 1 : 0);
