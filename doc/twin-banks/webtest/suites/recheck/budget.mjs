// Recheck of the budget blocker/majors, in the browser, real device turns
// (window and screen through CDP).  Uses the tester's kit (banks/common.mjs).
import fs from 'node:fs';
import { launch, newCtx, openPage, resume, touch, sleep } from '../banks/common.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/recheck';
const b = await launch();
const res = { first: [], seq: [] };
const look = (p) => p.evaluate(() => {
  const o = globalThis.__bt.overlay, t = o.twin, S = t && t.spec;
  const f = (id) => { const e = document.querySelector(`[data-tw="${id}"]`); if (!e) return null; const r = e.getBoundingClientRect(); return [+r.x.toFixed(2), +r.y.toFixed(2), +r.width.toFixed(2), +r.height.toFixed(2)]; };
  return { ui: document.documentElement.dataset.ui, why: o.twinFallback, used: t ? t.budget : null, budget: t ? t.settings.budget : null,
    fit: S ? S.fit.level : null, pad: S ? +S.fit.pad.toFixed(2) : null, degraded: S ? S.fit.degraded : null,
    pad_b: f('pad_b'), combat: f('combat'), apply: f('apply'), cell: o.geom ? +(+o.geom.cell).toFixed(3) : null,
    stored: JSON.parse(localStorage.getItem('rh.budgets') || '{}').browser || null };
});

// 1. first visits, nothing stored
const FIRST = [
  [443, 460, 443, 939, 'classic'], [443, 640, 443, 939, 58], [412, 600, 412, 915, 58], [500, 700, 1366, 768, 58],
  [390, 664, 390, 844, 58], [412, 787, 412, 915, 58], [375, 553, 375, 667, 58], [600, 1000, 1920, 1080, 58],
  [443, 859, 443, 939, 58], [360, 560, 360, 640, 'any'], [800, 1280, 800, 1280, 'any'],
];
for (const [w, h, sw, sh, want] of FIRST) {
  const ctx = await newCtx(b, { w, h, screen: { width: sw, height: sh }, prefs: { budgets: {} } });
  const p = await openPage(ctx); await resume(p); await sleep(300);
  const s = await look(p);
  const ok = want === 'any' ? true : want === 'classic' ? s.ui === 'classic' : (s.ui === 'twin' && s.pad === want && !s.degraded);
  res.first.push({ w, h, sw, sh, want, ok, ...s, errors: p.errors });
  console.log(ok ? 'PASS' : 'FAIL', `first ${w}x${h} on ${sw}x${sh}`, JSON.stringify(s), p.errors.length ? p.errors : '');
  await ctx.close();
}

// 2. temporary windows on Lucas's phone (screen 443x939), after the device has
// shown both orientations full (896x443 / 443x939)
async function seq(name, steps, start = [[896, 443], [443, 939]], fresh = false) {
  const [w0, h0] = start[0];
  const ctx = await newCtx(b, { w: w0, h: h0, screen: w0 > h0 ? { width: 939, height: 443 } : { width: 443, height: 939 }, prefs: { budgets: {} } });
  const p = await openPage(ctx); await resume(p);
  const k = await touch(ctx, p);
  const scr = (w, h) => (w > h ? [939, 443] : [443, 939]);
  const rows = [];
  for (const [w, h] of start.slice(1)) { await k.rotate(w, h, 1, scr(w, h)); await sleep(300); }
  const base = await look(p); rows.push({ at: 'base', ...base });
  const baseOther = [];
  for (const [w, h] of steps) { await k.rotate(w, h, 1, scr(w, h)); await sleep(300); rows.push({ at: `${w}x${h}`, ...(await look(p)) }); }
  res.seq.push({ name, rows, errors: p.errors });
  for (const r of rows) console.log(`  ${name} ${r.at}: ${r.ui} ${r.fit} pad ${r.pad} pad_b ${r.pad_b} combat ${r.combat} cell ${r.cell} budget ${JSON.stringify(r.budget)} stored ${JSON.stringify(r.stored)}`);
  const last = rows[rows.length - 1];
  return { p, ctx, base, last, rows };
}
const same = (a, b) => JSON.stringify([a.pad, a.pad_b, a.combat, a.apply, a.cell, a.fit]) === JSON.stringify([b.pad, b.pad_b, b.combat, b.apply, b.cell, b.fit]);
for (const [name, steps, start] of [
  ['896x300 then portrait', [[896, 300], [443, 939]]],
  ['896x220 then portrait', [[896, 220], [443, 939]]],
  ['448x443 then portrait', [[448, 443], [443, 939]]],
  ['443x460 then portrait', [[443, 460], [443, 939]]],
  ['390x700 then landscape', [[390, 700], [896, 443]], [[443, 939], [896, 443], [443, 939]]],
  ['896x300 then landscape', [[896, 300], [896, 443]], [[443, 939], [896, 443]]],
]) {
  const { ctx, base, last, rows, p } = await seq(name, steps, start);
  const ok = same(base, last) && JSON.stringify(rows[0].stored) === JSON.stringify(last.stored);
  console.log(ok ? 'PASS' : 'FAIL', name, p.errors.length ? p.errors : '');
  res.seq[res.seq.length - 1].ok = ok;
  await ctx.close();
}
// first-visit flavour: never turned, then a short full-width landscape window
{
  const { ctx, rows, p } = await seq('fresh: 443x939, 896x300, 443x939, 896x443, 443x939', [[896, 300], [443, 939], [896, 443], [443, 939]], [[443, 939]]);
  console.log('INFO fresh flavour', rows.map((r) => `${r.at}:${r.ui}/${r.pad}`).join(' '), p.errors);
  await ctx.close();
}
fs.writeFileSync(`${OUT}/budget.json`, JSON.stringify(res, null, 1));
await b.close();
