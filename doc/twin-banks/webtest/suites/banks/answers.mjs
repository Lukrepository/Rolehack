// A y/n question's answers painted on the pad, in twin: the pray prompt, then
// n on the pad.  Both orientations.
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, evs, clearEvs, ctlRect, writeJson } from './common.mjs';
const b = await launch();
const out = [];
for (const [w, h] of [[896, 443], [443, 939]]) {
  const ctx = await newCtx(b, { w, h, screen: h > w ? { width: w, height: h } : { width: h, height: w }, prefs: { budgets: {} } });
  const p = await openPage(ctx); await resume(p);
  const k = await touch(ctx, p);
  const s = await ctlRect(p, 'sacrifice');
  await k.tap(s.cx, s.cy, 450);
  await sleep(800);
  const st = await p.evaluate(() => {
    const o = globalThis.__bt.overlay;
    const pad = ['pad_y', 'pad_k', 'pad_u', 'pad_h', 'pad_centre', 'pad_l', 'pad_b', 'pad_j', 'pad_n'].map((id) => document.querySelector(`[data-tw="${id}"]`).innerText.replace(/\s+/g, ' ').trim());
    const pill = document.querySelector('#keys > .layerpill');
    return { answering: !!o.answering, pad, pill: pill && pill.classList.contains('on') ? pill.textContent : null };
  });
  await k.shot(`${SHOTS}/answers-${w}x${h}.png`);
  const idx = st.pad.findIndex((t) => /^n\b|\bno\b/i.test(t));
  const ids = ['pad_y', 'pad_k', 'pad_u', 'pad_h', 'pad_centre', 'pad_l', 'pad_b', 'pad_j', 'pad_n'];
  await clearEvs(p);
  if (idx >= 0) { const r = await ctlRect(p, ids[idx]); await k.tap(r.cx, r.cy); }
  await sleep(800);
  const e = (await evs(p)).map((q) => String.fromCharCode(q.key)).join('');
  const after = await p.evaluate(() => ({ answering: !!globalThis.__bt.overlay.answering, msg: document.getElementById('msgband').innerText.replace(/\s+/g, ' ') }));
  const ok = st.answering && idx >= 0 && e === 'n' && !after.answering;
  console.log(`${w}x${h}: ${ok ? 'PASS' : 'FAIL'} answering ${st.answering}, pad ${JSON.stringify(st.pad)}, pill ${st.pill}; tapped ${ids[idx]} -> "${e}"; after: ${JSON.stringify(after)}; errors ${p.errors.length}`);
  out.push({ w, h, ok, st, e, after, errors: p.errors });
  await ctx.close();
}
writeJson('answers.json', out);
await b.close();
