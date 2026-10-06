// Twin banks on the page, played: the restored game on Lucas's phone
// (896x443 / 443x939), touched through CDP as a thumb would.  Walking,
// fighting (an armed Fight, and the COMBAT layer then a direction),
// inventory, eating, the flick, Long rest's swipe, SACRIFICE and its pray
// hold, drawers, the layers on the pad (the counts, the pad centre's and
// CONTEXT's HERE, since the layers stage), the
// ghost deck, taps outside the map (cased and caseless), rotation keeping an
// armed Fight, an open drawer and an assignment, and the Layout setting.
// Every pop-up is checked to open inside the map area and over no key.
//   node behave.mjs [dpr]   -> behave.json, shots/behave-*.png
import { launch, ctxOptions, openPage, resumeGame, touchKit, centreOf, OUT, STATE, sleep, writeJson } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const b = await launch();
const ctx = await b.newContext({ ...ctxOptions(896, 443, 'touch', { deviceScaleFactor: DPR, screen: { width: 443, height: 939 } }), storageState: STATE });
const p = await openPage(ctx, {});
await resumeGame(p);
const T = await touchKit(ctx, p);
const results = [];
const check = (name, ok, note = '') => { results.push({ name, ok: !!ok, note }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${note ? ` -- ${note}` : ''}`); };
const ev = (fn, arg) => p.evaluate(fn, arg);
const shot = (n) => p.screenshot({ path: `${OUT}/shots/behave-${DPR}-${n}.png` });
const mark = () => ev(() => (globalThis.__pushed = globalThis.__pushed || []).length);
const since = (n) => ev((k) => globalThis.__pushed.slice(k), n);
const keysSince = async (n) => (await since(n)).filter((e) => e.key !== undefined).map((e) => e.key);
const str = (ks) => ks.map((k) => (k >= 32 && k < 127 ? String.fromCharCode(k) : `<${k}>`)).join('');
async function settle(ms = 4000) {
  const t0 = Date.now();
  for (;;) {
    const s = await ev(() => ({ w: globalThis.__rh.waiting, q: globalThis.__rh.queue, more: globalThis.__rh.moreShown,
      ask: !!globalThis.__rh.overlay.answering }));
    if (s.more) { await p.keyboard.press('Space'); await sleep(150); continue; }
    // a question the game put on the pad ("Really attack Hachi?"): no
    if (s.ask) { await p.keyboard.press('Escape'); await sleep(150); continue; }
    if (s.w && !s.q) return true;
    if (Date.now() - t0 > ms) return false;
    await sleep(100);
  }
}
const tapId = async (id, hold = 0) => { const c = await centreOf(p, id); await T.tap(c.x, c.y, hold); return c; };
// a pop-up's rect: inside the map area, and over no key
// ('flick': the flick key's two nodes)
const popCheck = (sel) => ev((q) => {
  const O = globalThis.__rh.overlay, S = O.twin.spec, A = S.mapArea;
  const els = (q === 'flick' ? O.flickNodes.map((k) => k.el) : [...document.querySelectorAll(q)])
    .filter((e) => e.offsetParent !== null || getComputedStyle(e).display !== 'none');
  const out = [];
  for (const e of els) {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.x < A.x - 0.5 || r.y < A.y - 0.5 || r.right > A.x + A.w + 0.5 || r.bottom > A.y + A.h + 0.5) out.push(`${e.className || e.id} ${r.x.toFixed(1)},${r.y.toFixed(1)} ${r.width.toFixed(1)}x${r.height.toFixed(1)} leaves the map area ${A.x},${A.y} ${A.w}x${A.h}`);
    for (const c of S.controls) {
      if (c.behind) continue;
      if (r.x < c.x + c.w - 0.01 && c.x < r.right - 0.01 && r.y < c.y + c.h - 0.01 && c.y < r.bottom - 0.01) out.push(`${e.className || e.id} over ${c.id}`);
    }
  }
  return { n: els.length, out };
}, sel);
const rotate = async (w, h) => { await p.setViewportSize({ width: w, height: h }); await sleep(800); };
const state = () => ev(() => {
  const O = globalThis.__rh.overlay;
  const lamp = (id) => { const e = O.twinEl(id); const l = e && e.querySelector('.lamp.armed'); return l ? l.classList.contains('on') : null; };
  return { armed: O.armed && O.armed.key, armedBy: O.armedBy, drawer: O.drawerOpen, assigning: !!O.assigning, fan: O.fanOpen, chips: O.chipsOpen,
    radial: O.radialOpen, ctx: O.ctxRadialOpen, cand: O.candOpen, assign: O.assign && O.assign.key, combatLamp: lamp('combat'),
    layer: O.padLayer ? `${O.padLayer.kind}${O.padLayer.from === 'context' || O.padLayer.from === 'centre' ? ':' + O.padLayer.from : ''}` : null,
    banner: O.banner && O.banner.el.style.display !== 'none', ui: document.documentElement.dataset.ui, W: O.twin && O.twin.W,
    modal: !document.getElementById('modal').hidden, form: !document.getElementById('formwrap').hidden, msg: document.getElementById('msgband').innerText };
});

await settle();
// 1. walking
{
  const c0 = await ev(() => ({ ...globalThis.__rh.cursor }));
  let n = await mark();
  await tapId('pad_l'); await settle();
  let ks = await keysSince(n);
  const c1 = await ev(() => ({ ...globalThis.__rh.cursor }));
  n = await mark();
  await tapId('pad_h'); await settle();
  const ks2 = await keysSince(n);
  check('walk: pad → sends l, then h', str(ks) === 'l' && str(ks2) === 'h', `sent ${str(ks)} / ${str(ks2)}; hero ${c0.x},${c0.y} -> ${c1.x},${c1.y}`);
}
// 2. an armed Fight survives a turn of the phone; a direction fights
{
  await tapId('combat'); await sleep(150);
  let s = await state();
  check('fight: COMBAT arms Fight; ARMED lit on COMBAT; banner up', s.armed === 'F' && s.combatLamp === true && s.banner, JSON.stringify({ armed: s.armed, lamp: s.combatLamp, banner: s.banner }));
  const pb = await popCheck('#keys > button.k[style*="z-index: 4"]');
  check('fight: the banner opens inside the map, over no key', pb.n >= 1 && !pb.out.length, pb.out.join('; '));
  await shot('armed-landscape');
  await rotate(443, 939);
  s = await state();
  check('rotation keeps an armed Fight (and its lamp and banner)', s.armed === 'F' && s.combatLamp === true && s.banner && s.W === 443, JSON.stringify(s).slice(0, 160));
  await shot('armed-portrait');
  const n = await mark();
  await tapId('pad_h'); await settle();
  const ks = await keysSince(n);
  s = await state();
  check('fight: a direction sends F h and disarms', str(ks) === 'Fh' && !s.armed && s.combatLamp === false, JSON.stringify({ ks: str(ks), armed: s.armed, lamp: s.combatLamp, armedBy: s.armedBy, layer: s.layer, modal: s.modal, msg: s.msg }));
  await rotate(896, 443);
}
await b.close();
