// Synthetic taps at the edges of every key, in the halo, in the ring and
// between the banks, against the design's hit model (checks/lib.mjs).
//   node taps.mjs <dpr> [radius] [WxH]
// Every tap is a real touch through CDP (touchStart, touchEnd), optionally
// with a contact radius so Chrome's touch adjustment comes into play.  The
// core never sees anything (every event pushed is held back), so the hero
// stays put and the core keeps waiting for a command: a map tap would travel,
// and every guard is on.  After each tap the overlay is put back to rest.
//
// What happened is read from the page:
//   a key's element got the pointerdown        -> that key
//   the guard logged halo / seam               -> swallowed
//   the guard logged ring (a preview)          -> ring
//   a click was pushed                         -> map
//   nothing                                    -> other
// What should happen is the hit model at the point the page received,
// with 'map' / 'ring' off the level's cells meaning nothing ('other').
import { launch, newCtx, openPage, resume, toucher, SIZES, writeJson, Checks, sleep, SP, SHOTS } from './common.mjs';
const { hitModel } = await import(`${SP}/design/v2/checks/lib.mjs`);

const dpr = Number(process.argv[2] || 1);
const radius = Number(process.argv[3] || 0);
const only = process.argv[4] || null;
const OFFS = [-1, 1, 3, 5, 7, 7.75, 8.5, 10, 11.5, 12.5, 14, 20, 31.5, 32.5, 36, 48];

function points(S) {
  const pts = [];
  const add = (x, y, why) => { if (x >= 0.5 && y >= 0.5 && x <= S.W - 0.5 && y <= S.H - 0.5) pts.push({ x: Math.round(x * 4) / 4, y: Math.round(y * 4) / 4, why }); };
  for (const c of S.controls) {
    if (c.behind) continue;
    for (const f of [0.5, 0.15, 0.85]) {
      for (const o of OFFS) {
        add(c.x + c.w * f, c.y - o, `${c.id} top${f} ${o}`);
        add(c.x + c.w * f, c.y + c.h + o, `${c.id} bottom${f} ${o}`);
        add(c.x - o, c.y + c.h * f, `${c.id} left${f} ${o}`);
        add(c.x + c.w + o, c.y + c.h * f, `${c.id} right${f} ${o}`);
      }
    }
    // the corners, diagonally out
    for (const o of [-1, 2, 5, 7, 9, 11, 13]) {
      const d = o / Math.SQRT2;
      add(c.x - d, c.y - d, `${c.id} tl ${o}`); add(c.x + c.w + d, c.y - d, `${c.id} tr ${o}`);
      add(c.x - d, c.y + c.h + d, `${c.id} bl ${o}`); add(c.x + c.w + d, c.y + c.h + d, `${c.id} br ${o}`);
    }
  }
  // between the banks, every 2 px across at each row's middle and its edges
  const L = S.controls.filter((c) => c.thumb === 'L' && !c.behind), R = S.controls.filter((c) => c.thumb === 'R' && !c.behind);
  const lx1 = Math.max(...L.map((c) => c.x + c.w)), rx0 = Math.min(...R.map((c) => c.x));
  if (rx0 > lx1) {
    const ys = [...new Set(L.flatMap((c) => [c.y + 1, c.y + c.h / 2, c.y + c.h - 1]))];
    for (const y of ys) for (let x = lx1 + 1; x < rx0; x += 2) add(x, y, `between ${Math.round(y)}`);
  }
  // dedupe
  const seen = new Set();
  return pts.filter((q) => { const k = `${q.x},${q.y}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

const b = await launch();
const all = [];
const summary = {};
for (const [W, H] of SIZES) {
  if (only && only !== `${W}x${H}`) continue;
  const C = new Checks(`taps ${dpr} r${radius} ${W}x${H}`);
  const MACROS = [{ name: 'M1', keys: 'Q' }, { name: 'M2', keys: 'Q' }, { name: 'M3', keys: 'Q' }, { name: 'Tap', keys: 'Q' }, { name: 'Kick', keys: '^D' }, { name: 'UR', keys: 'Q' }];
  const ctx = await newCtx(b, { w: W, h: H, dpr, prefs: { ghostDeck: { on: false, clean: 3, session: null }, macros: MACROS } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  await p.evaluate(() => {
    globalThis.__swallowAll = true;
    globalThis.__xy = [];
    window.addEventListener('pointerdown', (e) => { if (e.isTrusted) globalThis.__xy.push({ x: e.clientX, y: e.clientY }); }, true);
  });
  const S = await p.evaluate(() => globalThis.__tt.overlay.twin.spec);
  const hm = hitModel(S);
  const t = await toucher(ctx, p);
  const pts = points(S);
  const level = await p.evaluate(() => {
    const v = globalThis.__tt.view, r = document.getElementById('map').getBoundingClientRect();
    return { left: r.left + v.left, top: r.top + v.top, T: v.T };
  });
  const cellOf = (x, y) => ({ cx: Math.floor((x - level.left) / level.T), cy: Math.floor((y - level.top) / level.T) });
  const inLevel = (x, y) => { const { cx, cy } = cellOf(x, y); return cx >= 0 && cx < 80 && cy >= 0 && cy < 21; };
  const tally = {}, miss = [];
  let n = 0;
  for (const q of pts) {
    await p.evaluate(() => { globalThis.__downs = []; globalThis.__ev = []; globalThis.__xy = []; const o = globalThis.__tt.overlay; o.guardLog = []; });
    await t.tap(q.x, q.y, { r: radius, after: 30 });
    const res = await p.evaluate(() => {
      const R = globalThis.__tt, o = R.overlay;
      const log = (o.guardLog || []).map((g) => g.what);
      const downs = (globalThis.__downs || []).map((d) => d.id);
      const clicks = (globalThis.__ev || []).filter((e) => e.click).length;
      const xy = (globalThis.__xy || [])[0] || null;
      const st = { armed: !!o.armed, drawer: !!o.drawerOpen, layer: !!o.padLayer, fan: !!o.fanOpen, modal: R.modalOpen, kbd: R.kbdOn(), preview: !!R.ghostPreview, form: !document.getElementById('formwrap').hidden, scrim: o.scrim.classList.contains('on') };
      // back to rest
      o.closeAll(); o.disarm(); o.cancelAssignment();
      if (o.restWell && o.restWell.revealed) o.scrollWell(false);
      if (R.kbdOn()) R.showKeyboard(false);
      if (R.modalOpen) R.closeModal();
      R.clearPreview();
      R.resetClocks();
      return { log, downs, clicks, xy, st };
    });
    if (res.st.form) { await p.keyboard.press('Escape'); await sleep(50); await p.evaluate(() => globalThis.__tt.resetClocks()); }
    let got = 'other';
    if (res.log.includes('halo') || res.log.includes('seam')) got = 'swallowed';
    else if (res.log.includes('ring')) got = 'ring';
    else if (res.downs.length) got = res.downs[res.downs.length - 1];
    else if (res.clicks) got = 'map';
    const conflict = (res.downs.length && (res.clicks || res.log.includes('ring'))) || new Set(res.downs).size > 1;
    const at = res.xy || q;
    let want = hm(at.x, at.y);
    if ((want === 'map' || want === 'ring') && !inLevel(at.x, at.y)) want = 'other';
    if (want === 'none') want = 'other';
    n++;
    const k = `${want}->${got}`;
    // A point exactly as far from two keycaps (a gap's middle, a corner's
    // diagonal) is a tie the model breaks by its own order; either key agrees
    // (the final review, 2026-10-03).
    const capD = (id) => { const c = S.controls.find((q) => q.id === id); return c ? Math.hypot(Math.max(c.x - at.x, 0, at.x - (c.x + c.w)), Math.max(c.y - at.y, 0, at.y - (c.y + c.h))) : null; };
    const tie = want !== got && !conflict && capD(want) !== null && capD(got) !== null && Math.abs(capD(want) - capD(got)) < 0.01;
    if (tie) tally[`tie ${k}`] = (tally[`tie ${k}`] || 0) + 1;
    if ((want !== got && !tie) || conflict) {
      // within a px of a boundary the model gives the page's answer?
      let near = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        let w = hm(at.x + dx, at.y + dy);
        if ((w === 'map' || w === 'ring') && !inLevel(at.x + dx, at.y + dy)) w = 'other';
        if (w === 'none') w = 'other';
        if (w === got) near = true;
      }
      miss.push({ why: q.why, x: q.x, y: q.y, at, want, got, near, conflict: !!conflict, log: res.log, downs: res.downs, clicks: res.clicks, st: res.st });
      if (process.env.SHOWMISS && miss.length <= 40) console.log('  miss', JSON.stringify(miss[miss.length - 1]));
      tally[k] = (tally[k] || 0) + 1;
    }
    if ((n % 200) === 0) await p.evaluate(() => globalThis.__tagKeys && globalThis.__tagKeys());
    if ((n % 1000) === 0) console.log(`  ${W}x${H} ${n}/${pts.length} misses ${miss.length}`);
  }
  // the layout must not have moved under the sweep
  const S2 = await p.evaluate(() => globalThis.__tt.overlay.twin.spec);
  C.ok('layout unchanged by the sweep', JSON.stringify(S2.controls) === JSON.stringify(S.controls));
  const hard = miss.filter((m) => !m.near), soft = miss.filter((m) => m.near);
  C.ok(`taps agree with the hit model (${n} taps)`, hard.length === 0, hard.length ? { hard: hard.length, tally, first: hard.slice(0, 15) } : '');
  C.ok(`boundary taps (within 1 px) agree`, soft.length === 0, soft.length ? { soft: soft.length, first: soft.slice(0, 8) } : '');
  C.ok('console clean', p.errors.length === 0, p.errors.slice(0, 5));
  summary[`${W}x${H}`] = { taps: n, hard: hard.length, soft: soft.length, tally };
  writeJson(`taps-miss-${dpr}-r${radius}-${W}x${H}.json`, { n, miss });
  all.push(...C.list);
  await ctx.close();
}
await b.close();
writeJson(`taps-${dpr}-r${radius}${only ? '-' + only : ''}.json`, { summary, checks: all });
console.log(JSON.stringify(summary));
const f = all.filter((c) => !c.pass);
console.log(`taps ${dpr} r${radius}: ${all.length - f.length}/${all.length} pass`);
