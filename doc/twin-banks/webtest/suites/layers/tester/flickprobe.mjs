// A short FLICK stroke (18 px, under FLICK_MIN 26): what it does, timed.
import { launch, newCtx, openPage, resume, toucher, sleep } from './common.mjs';
import { cap, mark, pushed, reset } from './probe.mjs';
const MACROS = [{ name: '', keys: '' }, { name: '', keys: '' }, { name: '', keys: '' },
  { name: 'TapA', keys: 'A' }, { name: 'Kick', keys: '^D' }, { name: 'UpRtB', keys: 'B' }];
const layout = process.argv[2] || 'twin';
const b = await launch();
for (const [W, H] of [[896, 443], [443, 939]]) {
  const ctx = await newCtx(b, { w: W, h: H, prefs: { ghostDeck: { on: false, clean: 3, session: null }, macros: MACROS, layout } });
  const p = await openPage(ctx);
  await resume(p);
  await p.evaluate(() => { globalThis.__swallowAll = true; globalThis.__pl = []; for (const ty of ['pointerdown', 'pointermove', 'pointerup']) window.addEventListener(ty, (e) => globalThis.__pl.push(`${ty[7]}${Math.round(performance.now())}@${Math.round(e.clientX)},${Math.round(e.clientY)}`), true); });
  const t = await toucher(ctx, p);
  let k;
  if (layout === 'twin') k = await cap(p, 'flick');
  else k = await p.evaluate(() => { const r = globalThis.__tt.overlay.flickFace.el.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; });
  for (const len of [12, 18, 24, 30]) {
    for (const steps of [1, 3, 5]) {
      await reset(p); await mark(p);
      await p.evaluate(() => { globalThis.__pl = []; });
      const a = (-85 * Math.PI) / 180;
      await t.slide([k.cx, k.cy], [k.cx + Math.cos(a) * len, k.cy + Math.sin(a) * len], { steps });
      await sleep(150);
      const r = await p.evaluate(() => ({ radial: globalThis.__tt.overlay.radialOpen, form: !document.getElementById('formwrap').hidden }));
      console.log(layout, W, H, 'len', len, 'steps', steps, 'sent', JSON.stringify(await pushed(p)), r, (await p.evaluate(() => globalThis.__pl)).join(' '));
    }
  }
  await ctx.close();
}
await b.close();
