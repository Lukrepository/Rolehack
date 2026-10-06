// Taps on the bands while the game waits for a command (no --More--): the
// status band takes the tap and sends nothing; the message band opens the
// history (^P), as before; in both header places (the glass; over the banks).
//   node bandtaps.mjs <dpr>
import { launch, newCtx, openPage, resume, touch, sleep, writeJson } from './common.mjs';
const DPR = Number(process.argv[2] || 1);
const b = await launch();
const out = [];
let fails = 0;
for (const [w, h, cell] of [[896, 443, 'columns'], [896, 443, 'rows'], [915, 412, 'rows'], [443, 939, 'columns'], [1024, 768, 'columns']]) {
  const name = `bandtaps-${DPR}-${cell}-${w}x${h}`;
  const ctx = await newCtx(b, { w, h, dpr: DPR, prefs: { mapCell: cell, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  const T = await touch(ctx, p);
  await T.rotate(w, h, DPR);
  await resume(p);
  const bad = [];
  const at = (id) => p.evaluate((id) => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.x + r.width * 0.4, y: r.y + r.height * 0.5 }; }, id);
  await p.evaluate(() => { globalThis.__ev = []; });
  const s = await at('statband');
  await T.tap(s.x, s.y);
  await sleep(300);
  const ev1 = await p.evaluate(() => ({ ev: globalThis.__ev.splice(0), modal: !document.getElementById('modal').hidden }));
  if (ev1.ev.length || ev1.modal) bad.push(`a tap on the status band at a command wait sent ${JSON.stringify(ev1.ev)}${ev1.modal ? ' and opened a window' : ''}`);
  const m = await at('msgband');
  await T.tap(m.x, m.y);
  await sleep(500);
  const ev2 = await p.evaluate(() => ({ ev: globalThis.__ev.splice(0), modal: !document.getElementById('modal').hidden, title: document.getElementById('modal-title').textContent }));
  if (!ev2.modal) bad.push(`a tap on the message band did not open the history (${JSON.stringify(ev2.ev)})`);
  await p.keyboard.press('Escape');
  bad.push(...p.errors.splice(0).map((x) => `console: ${x}`));
  fails += bad.length;
  out.push({ name, bad, ev2 });
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${name} history="${ev2.title}" ${JSON.stringify(ev2.ev)}${bad.length ? `\n     ${bad.join('\n     ')}` : ''}`);
  await ctx.close();
}
writeJson(`bandtaps-${DPR}.json`, out);
console.log(`${fails} failures in ${out.length} windows`);
await b.close();
