import { launch, ctxOptions, openPage, resumeGame, OUT, STATE, sleep } from './common.mjs';
import { measure } from './measure.mjs';
const b = await launch();
const variants = [
  { statusLines: 'hidden' }, { statusLines: 'compact' }, { case: false }, { style: 'light' }, { style: 'gamecube' },
  { labelMode: 'keys' }, { labelMode: 'both' }, { padCell: 46 }, { padCell: 52 }, { msgFont: 'screen', msgSize: 1.4 }, { msgSize: 1.4 },
  { mapMode: 'text' }, { zoom: 30 },
];
for (const [W, H] of [[896, 443], [443, 939], [360, 640], [640, 360]]) {
  const ctx = await b.newContext({ ...ctxOptions(W, H, 'touch'), storageState: STATE });
  const p = await openPage(ctx, {});
  await resumeGame(p); await sleep(400);
  for (const v of variants) {
    await p.evaluate(async (v) => { const P = await import('./prefs.js'); for (const [k, x] of Object.entries(v)) P.set(k, x); }, v);
    await sleep(350);
    const m = await measure(p);
    const extra = await p.evaluate(() => ({ ui: document.documentElement.dataset.ui, sb: document.getElementById('statband').style.display, wells: document.querySelectorAll('#case .well.twin').length }));
    console.log(W, H, JSON.stringify(v), m.twin ? `bad ${m.bad.length}${m.bad.length ? ': ' + m.bad.slice(0, 4).join(' | ') : ''} worst ${m.worst.toFixed(3)} level ${m.fit.level}` : `fallback ${m.fallback}`, JSON.stringify(extra), p.errors.length ? p.errors : '');
    await p.screenshot({ path: `${OUT}/shots/var-${W}x${H}-${Object.entries(v).map(([k, x]) => k + x).join('-')}.png` });
    // back to defaults
    await p.evaluate(async (v) => { const P = await import('./prefs.js'); for (const k of Object.keys(v)) { localStorage.removeItem('rh.' + k); } location.reload(); }, v).catch(() => {});
    await p.waitForFunction(() => globalThis.__rh && !document.getElementById('boot'), null, { timeout: 60000 });
    await resumeGame(p); await sleep(300);
  }
  await ctx.close();
}
await b.close();
