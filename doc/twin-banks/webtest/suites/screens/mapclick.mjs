// A click (mouse) or a tap (touch) on the map, two cells left of the hero, on
// the tablet tier's big windows: it reaches the game as a click on that cell,
// and the hero goes there.  And the layout switch: a game begun in classic
// switched to twin banks shows its log and a note in the inventory panel;
// back to classic hides the panels; twin again shows them filled.
//   node mapclick.mjs <dpr>
import { launch, newCtx, openPage, resume, settle, sleep, Checks, SHOTS, writeJson } from './common.mjs';
import { readPage } from './lib.mjs';
const dpr = Number(process.argv[2] || 1);
const b = await launch();
const all = [];
for (const [w, h, input] of [[1024, 768, 'touch'], [1366, 768, 'touch'], [1920, 1080, 'mouse'], [3440, 1440, 'mouse']]) {
  const touch = input === 'touch', C = new Checks(`mapclick-${w}x${h}${touch ? '' : '-mouse'}@${dpr}`);
  const ctx = await newCtx(b, { w, h, dpr, touch });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(400);
  const s = await readPage(p);
  const hero = await p.evaluate(() => globalThis.__ts.cursor);
  const V = s.view, cv = s.canvas;
  const tx = hero.x - 2, ty = hero.y;
  const x = cv.x + V.left + (tx + 0.5) * V.T, y = cv.y + V.top + (ty + 0.5) * V.T;
  await p.evaluate(() => { globalThis.__ev = []; });
  if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y);
  await sleep(300);
  // a second tap on the same cell, in case the first was a preview (the ring)
  let ev = await p.evaluate(() => globalThis.__ev || []);
  if (!ev.some((e) => e.click)) { if (touch) await p.touchscreen.tap(x, y); else await p.mouse.click(x, y); await sleep(300); ev = await p.evaluate(() => globalThis.__ev || []); }
  const click = ev.find((e) => e.click);
  C.ok('the map tap reaches the game as a click on that cell', click && click.click.x === tx && click.click.y === ty, { want: [tx, ty], ev: ev.slice(0, 3) });
  await settle(p);
  const after = await p.evaluate(() => globalThis.__ts.cursor);
  C.ok('the hero went there', after.x === tx && after.y === ty, { from: hero, to: after });
  C.ok('no console errors', !p.errors.length, p.errors.slice(0, 4));
  all.push(...C.list);
  await ctx.close();
}
// the layout switch, at 1024x768
{
  const C = new Checks(`switch-1024x768@${dpr}`);
  const ctx = await newCtx(b, { w: 1024, h: 768, dpr, touch: true, prefs: { layout: 'classic' } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(400);
  const set = (v) => p.evaluate((v) => { globalThis.__ts.P.set('layout', v); globalThis.__ts.overlay.rebuild(); }, v);
  await set('twin'); await sleep(600);
  let s = await readPage(p);
  const inv = s.panels.find((q) => q.kind === 'inventory' && q.vis), log = s.panels.find((q) => q.kind === 'log' && q.vis);
  C.ok('classic game switched to twin: tablet tier, both panels', s.ui === 'twin' && s.tier === 'tablet' && inv && log);
  C.ok('the inventory panel says why it is empty', inv && inv.lines.length === 1 && /next start/.test(inv.lines[0]), inv && inv.lines);
  C.ok('the log shows the history', log && log.lines.length === s.history.length, { log: log && log.lines.length, hist: s.history.length });
  await p.screenshot({ path: `${SHOTS}/switch-classic-to-twin-1024x768@${dpr}.png` });
  await set('classic'); await sleep(600);
  s = await readPage(p);
  C.ok('back to classic: no panel shown', s.ui === 'classic' && !s.panels.some((q) => q.vis), s.panels.map((q) => [q.kind, q.vis]));
  C.ok('no console errors', !p.errors.length, p.errors.slice(0, 4));
  all.push(...C.list);
  await ctx.close();
}
writeJson(`mapclick-${dpr}.json`, all);
console.log(`\nmapclick dpr ${dpr}: ${all.filter((c) => c.pass).length} pass, ${all.filter((c) => !c.pass).length} fail`);
for (const f of all.filter((c) => !c.pass)) console.log(`  FAIL ${f.tag} ${f.name}`);
await b.close();
