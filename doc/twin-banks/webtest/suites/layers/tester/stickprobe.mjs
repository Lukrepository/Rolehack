// Tap every key's centre once (core held back) and see what each leaves
// behind after the sweep's reset, and whether a deep map tap still travels.
import { launch, newCtx, openPage, resume, toucher, sleep } from './common.mjs';
import { cap, spec, mark, pushed, state, reset } from './probe.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 443, h: 939, prefs: { ghostDeck: { on: false, clean: 3, session: null } } });
const p = await openPage(ctx);
await resume(p);
await p.evaluate(() => { globalThis.__swallowAll = true; });
const t = await toucher(ctx, p);
const S = await spec(p);
for (const c of S.controls) {
  if (c.behind) continue;
  const k = await cap(p, c.id);
  await mark(p);
  await t.tap(k.cx, k.cy, { after: 150 });
  const before = await state(p);
  await reset(p);
  await sleep(100);
  const after = await state(p);
  // probe: tap pad_k's centre: must record pad_k
  const pk = await cap(p, 'pad_k');
  await mark(p);
  await t.tap(pk.cx, pk.cy, { after: 80 });
  const probe = await state(p);
  const sent = await pushed(p);
  await reset(p);
  const fw = await p.evaluate(() => ({ form: !document.getElementById('formwrap').hidden, active: document.activeElement && document.activeElement.tagName, kbd: globalThis.__tt.kbdOn(), scrim: globalThis.__tt.overlay.scrim.classList.contains('on') }));
  console.log(c.id.padEnd(11), 'tap->', JSON.stringify({ drawer: before.drawer, form: before.form, modal: before.modal, armed: before.armed, layer: before.layer && before.layer.kind, assign: before.assign, scrim: before.scrim }),
    '| probe pad_k downs', JSON.stringify(probe.downs), 'sent', JSON.stringify(sent), JSON.stringify(fw));
}
console.log('errors', p.errors);
await b.close();
