// A tablet turned: the same banks in both orientations (every key the same
// distance from its corner), the same map cell, the panels kept and filled,
// layout() at both, nothing lost (Fight armed through the turn).
//   node rotate.mjs <dpr>
import { launch, newCtx, openPage, resume, sleep, Checks, SHOTS, writeJson, r1 } from './common.mjs';
import { readPage, expected, maxDiff } from './lib.mjs';
import fs from 'node:fs';

const dpr = Number(process.argv[2] || 1);
const b = await launch();
const all = [];
for (const [L, S] of [[1024, 768], [1180, 820], [1366, 1024]]) {
  const C = new Checks(`rotate-${L}x${S}@${dpr}`);
  const ctx = await newCtx(b, { w: L, h: S, dpr, touch: true, screen: { width: S, height: L } });
  const p = await openPage(ctx);
  const cdp = await ctx.newCDPSession(p);
  const turn = (w, h) => cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: true, screenWidth: S, screenHeight: L,
    screenOrientation: w > h ? { type: 'landscapePrimary', angle: 90 } : { type: 'portraitPrimary', angle: 0 } });
  const shot = async (path) => { const r = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path, Buffer.from(r.data, 'base64')); };
  await turn(L, S);
  await resume(p);
  await sleep(500);
  const a = await readPage(p);
  const cb = a.keys.combat;
  await p.touchscreen.tap(cb.x + cb.w / 2, cb.y + cb.h / 2);
  await sleep(300);
  await turn(S, L);
  await sleep(800);
  const z = await readPage(p);
  await shot(`${SHOTS}/rotate-${S}x${L}@${dpr}.png`);
  C.ok('both orientations tablet', a.tier === 'tablet' && z.tier === 'tablet', [a.tier, z.tier]);
  // each key's offset from its own corner (left bank: left and bottom edges; right bank: right and bottom)
  const off = (s, c) => (c.thumb === 'L' ? { x: c.x, b: s.H - (c.y + c.h), w: c.w, h: c.h } : { x: s.W - (c.x + c.w), b: s.H - (c.y + c.h), w: c.w, h: c.h });
  const bad = [];
  for (const c of a.spec.controls) {
    if (c.behind) continue;
    const q = z.spec.controls.find((x) => x.id === c.id);
    const o1 = off(a, c), o2 = off(z, q);
    if (Math.abs(o1.x - o2.x) > 0.01 || Math.abs(o1.b - o2.b) > 0.01 || Math.abs(o1.w - o2.w) > 0.01 || Math.abs(o1.h - o2.h) > 0.01) bad.push(`${c.id} ${JSON.stringify(o1)} vs ${JSON.stringify(o2)}`);
  }
  C.ok('every key the same distance from its corner in both orientations', !bad.length, bad.slice(0, 6));
  const dk = Object.keys(z.keys).filter((id) => id !== 'longrest' && maxDiff(z.keys[id], z.spec.controls.find((c) => c.id === id)) > 0.1);
  C.ok('portrait: every keycap at the spec', !dk.length, dk);
  C.ok('the same map cell', a.info.T === z.info.T, [a.info.T, z.info.T]);
  const E = expected(S, L, { screen: { w: S, h: L }, prev: { tier: 'tablet', cellTier: 'tablet' } });
  C.ok("portrait spec: layout()'s with the device's budget", E.spec.controls.every((c) => { const q = z.spec.controls.find((x) => x.id === c.id); return q && maxDiff(c, q) < 1e-6; }), { budget: z.settings.budget, used: z.info.budget });
  const inv = z.panels.find((q) => q.kind === 'inventory' && q.vis), log = z.panels.find((q) => q.kind === 'log' && q.vis);
  C.ok('portrait: inventory and log shown and filled', inv && inv.lines.length >= 6 && log && log.lines.length >= 1, { inv: inv && inv.lines.length, log: log && log.lines.length });
  const armed = await p.evaluate(() => !!globalThis.__ts.overlay.armed);
  C.ok('Fight still armed after the turn', armed);
  await turn(L, S);
  await sleep(800);
  const back = await readPage(p);
  C.ok('turned back: the same layout as before', JSON.stringify(back.spec.controls) === JSON.stringify(a.spec.controls) && JSON.stringify(back.spec.chrome) === JSON.stringify(a.spec.chrome));
  C.ok('no console errors', !p.errors.length, p.errors.slice(0, 4));
  all.push(...C.list);
  await ctx.close();
}
writeJson(`rotate-${dpr}.json`, all);
console.log(`\nrotate dpr ${dpr}: ${all.filter((c) => c.pass).length} pass, ${all.filter((c) => !c.pass).length} fail`);
for (const f of all.filter((c) => !c.pass)) console.log(`  FAIL ${f.tag} ${f.name}`);
await b.close();
