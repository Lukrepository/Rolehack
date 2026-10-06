// What the page draws at each window, as numbers: every key's hit cell and
// keycap on screen, the bands, the map canvas, the glass and the panels, with
// the layout's own spec, its tier and the pointer it was laid out for.  Run on
// the working tree (WORK, 8766) or on HEAD's page files (SITE=head, 8768), so
// the phone sizes can be compared before and after this stage.
//   node snap.mjs [dpr] [head]  -> snap-<site>-<dpr>.json
import { launch, newCtx, openPage, resume, sleep, writeJson, WORK, HEAD, SHOTS } from './common.mjs';

const dpr = Number(process.argv[2] || 1);
const site = process.argv[3] === 'head' ? 'head' : 'work';
const origin = site === 'head' ? HEAD : WORK;
// [w, h, touch, screen]
export const WINDOWS = [
  [896, 443, true, [443, 939]], [443, 939, true, [443, 939]], [640, 360, true], [360, 640, true],
  [915, 412, true], [412, 915, true], [844, 390, true], [390, 844, true],
  [896, 363, true, [443, 939]], [443, 859, true, [443, 939]],
  [1024, 768, true], [768, 1024, true], [1180, 820, true], [1366, 768, true], [960, 600, true], [600, 960, true],
  [1280, 800, false], [1920, 1080, false], [2560, 1440, false], [3440, 1440, false],
];

const b = await launch();
const out = {};
for (const [w, h, touch, scr] of WINDOWS) {
  const tag = `${w}x${h}${touch ? '' : ' mouse'}`;
  const ctx = await newCtx(b, { w, h, dpr, touch, origin, screen: scr ? { width: scr[0], height: scr[1] } : null,
    prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  try { await resume(p); } catch (e) { out[tag] = { error: String(e) }; await ctx.close(); continue; }
  await sleep(400);
  out[tag] = await p.evaluate(() => {
    const o = globalThis.__bt.overlay, $ = (id) => document.getElementById(id);
    const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 1000) / 1000); };
    const vis = (e) => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
    if (!o.twin || document.documentElement.dataset.ui !== 'twin') return { ui: document.documentElement.dataset.ui, fallback: o.twinFallback || null };
    const S = o.twin.spec;
    const keys = {};
    for (const id of o.twin.keys.keys()) {
      const e = o.twinEl(id), c = o.twinCapRect(id);
      keys[id] = { cell: R(e), cap: c ? [c.x, c.y, c.width, c.height].map((v) => Math.round(v * 1000) / 1000) : null };
    }
    const panels = [...document.querySelectorAll('.rhpanel')].filter(vis).map((e) => ({ kind: e.dataset.kind, rect: R(e), text: e.innerText.slice(0, 400) }));
    return {
      ui: 'twin', tier: o.twin.info.tier, cellTier: o.twin.info.DC && o.twin.info.DC.tier, pointer: S.pointer,
      dataTier: document.documentElement.dataset.tier || null,
      W: S.W, H: S.H, T: o.twin.info.T, whole: o.twin.info.fill.whole,
      spec: { controls: S.controls.map((c) => ({ id: c.id, x: c.x, y: c.y, w: c.w, h: c.h, behind: !!c.behind })), bands: S.bands, chrome: S.chrome, mapArea: S.mapArea, glass: S.glass, fit: S.fit },
      keys, msgband: R($('msgband')), statband: vis($('statband')) ? R($('statband')) : null, map: R($('map')), glass: R($('glass')),
      panels,
    };
  });
  out[tag].errors = p.errors;
  console.log(tag, out[tag].ui, out[tag].tier || '', out[tag].pointer || '', out[tag].panels ? `${out[tag].panels.length} panels` : '', p.errors.length ? `ERRORS ${p.errors.join(' | ')}` : '');
  await p.screenshot({ path: `${SHOTS}/snap-${site}-${dpr}-${w}x${h}${touch ? '' : '-mouse'}.png` });
  await ctx.close();
}
writeJson(`snap-${site}-${dpr}.json`, out);
await b.close();
