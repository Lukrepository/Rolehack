// The desk (no touch screen: the dock of 40 dp keys under the map).  The
// guard's cells stop at the dock's edge, a map click beside the dock walks
// at once (no ring for a mouse), the halos and seams are in place, and a
// mouse hold on REST still paints the counts on the pad.  node desk.mjs
import { launch, newCtx, openPage, resume, sleep, writeJson } from './common.mjs';
import { Checks, state } from './kit.mjs';
const b = await launch();
const C = new Checks('1280x800 mouse');
const ctx = await newCtx(b, { w: 1280, h: 800, dpr: 1, touch: false, prefs: { ghostDeck: { on: false, clean: 0, session: null } } });
const p = await openPage(ctx);
await resume(p);
await sleep(300);
const g = await p.evaluate(() => {
  const o = globalThis.__bt.overlay, S = o.twin.spec, live = S.controls.filter((c) => !c.behind);
  const box = { x0: Math.min(...live.map((c) => c.x)), y0: Math.min(...live.map((c) => c.y)), x1: Math.max(...live.map((c) => c.x + c.w)), y1: Math.max(...live.map((c) => c.y + c.h)) };
  const cells = [...o.twin.guard.cells.values()];
  return { pointer: S.pointer, box, out: cells.filter((c) => c.x < box.x0 - 0.01 || c.y < box.y0 - 0.01 || c.x + c.w > box.x1 + 0.01 || c.y + c.h > box.y1 + 0.01).length,
    halos: document.querySelectorAll('#keys > .halo').length, seams: document.querySelectorAll('#keys > .seam').length, m: S.mapArea };
});
C.ok('the desk layout (pointer mouse)', g.pointer === 'mouse', g.pointer);
C.ok('no hit cell reaches past the dock', g.out === 0, g);
C.ok('the halos and seams are built', g.halos === 2 && g.seams === 4, g);
await p.evaluate(() => { globalThis.__swallowClicks = true; globalThis.__ev = []; });
// a click on the map 20 dp above the dock: walks at once
const pt = { x: (g.box.x0 + g.box.x1) / 2, y: Math.min(g.m.y + g.m.h - 3, g.box.y0 - 20) };
await p.mouse.click(pt.x, pt.y); await sleep(200);
const ev = await p.evaluate(() => globalThis.__ev.map((e) => (e.click ? '@' : String.fromCharCode(e.key))).join(''));
C.ok('a map click 20 dp above the dock walks at once (no ring for a mouse)', ev === '@', { ev, pt });
const rest = await p.evaluate(() => { const r = globalThis.__bt.overlay.twinCapRect('rest'); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await p.mouse.move(rest.x, rest.y); await p.mouse.down(); await sleep(450);
let s = await state(p);
C.ok('a mouse hold on REST paints the counts on the pad', s.layer && s.layer.kind === 'count', s.layer);
await p.mouse.up(); await sleep(150);
s = await state(p);
C.ok('and they go on the release', !s.layer);
C.ok('no console errors', !p.errors.length, p.errors);
await b.close();
writeJson('desk.json', C.list);
console.log(C.failed ? `FAIL: ${C.failed}` : 'PASS');
