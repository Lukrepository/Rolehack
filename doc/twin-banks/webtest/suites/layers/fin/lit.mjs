// The lit place of a count layer and the stairs' centre: their legend's
// contrast against the keycap's top face, both tones (WCAG), at least 4.5:1
// (the final review: amber on amber was 1.12:1).  Screenshots in shots/.
//   node lit.mjs [dpr] [style]
process.env.OUTDIR = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/layers/fin';
const { launch, newCtx, openPage, resume, touch, sleep, SHOTS } = await import('../common.mjs');
const { capOf, Checks } = await import('../kit.mjs');
import fs from 'node:fs';
const DPR = Number(process.argv[2] || 1), STYLE = process.argv[3] || null;
fs.mkdirSync(SHOTS, { recursive: true });
const C = new Checks(`lit @${DPR}${STYLE ? ' ' + STYLE : ''}`);
const b = await launch();
for (const [w, h] of [[896, 443], [443, 939]]) {
  const ctx = await newCtx(b, { w, h, dpr: DPR, prefs: { ghostDeck: { on: false, clean: 0, session: null }, ...(STYLE ? { style: STYLE } : {}) } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  const t = await touch(ctx, p);
  const contrast = (i) => p.evaluate((i) => {
    const o = globalThis.__bt.overlay, f = o.padFace(i), cs = getComputedStyle(f.el), lg = getComputedStyle(f.lg).color;
    const hex = (s) => { s = s.trim(); if (s.startsWith('#')) return [1, 3, 5].map((k) => parseInt(s.slice(k, k + 2), 16)); return s.match(/\d+/g).slice(0, 3).map(Number); };
    const L = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const fg = hex(lg), t1 = hex(cs.getPropertyValue('--t1')), t2 = hex(cs.getPropertyValue('--t2'));
    return { text: f.lg.textContent, lit: f.el.classList.contains('lit'), fg: lg, t1: cs.getPropertyValue('--t1').trim(), min: Math.min(ratio(fg, t1), ratio(fg, t2)) };
  }, i);
  const rest = await capOf(p, 'rest');
  await t.down([[rest.cx, rest.cy]]); await sleep(750); await t.up(); await sleep(150);
  const lit = await p.evaluate(() => { const o = globalThis.__bt.overlay; return [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => o.padFace(i).el.classList.contains('lit')); });
  C.ok(`${w}x${h}: one count lit`, lit.length === 1, lit);
  if (lit.length) {
    const c = await contrast(lit[0]);
    C.ok(`${w}x${h}: the lit count (${c.text}) reads at 4.5:1 or more`, c.min >= 4.5, c);
    const other = await contrast(lit[0] === 0 ? 1 : 0);
    C.ok(`${w}x${h}: an unlit count (${other.text}) reads at 4.5:1 or more`, other.min >= 4.5, other);
  }
  await t.shot(`${SHOTS}/lit-${DPR}-${w}x${h}${STYLE ? '-' + STYLE : ''}-count.png`);
  await p.evaluate(() => globalThis.__bt.overlay.closeAll());
  await p.evaluate(() => globalThis.__bt.overlay.setHere(0x02, ''));
  const ctxk = await capOf(p, 'context');
  await t.tap(ctxk.cx, ctxk.cy); await sleep(150);
  const c = await contrast(4);
  C.ok(`${w}x${h}: the stairs' centre (${c.text}) reads at 4.5:1 or more`, c.text === 'Descend' && c.min >= 4.5, c);
  await t.shot(`${SHOTS}/lit-${DPR}-${w}x${h}${STYLE ? '-' + STYLE : ''}-stairs.png`);
  await p.evaluate(() => globalThis.__bt.overlay.closeAll());
  C.ok(`${w}x${h}: console clean`, p.errors.length === 0, p.errors.slice(0, 5));
  await ctx.close();
}
const bad = C.list.filter((c) => !c.pass);
console.log(`lit: ${C.list.length - bad.length}/${C.list.length} pass`);
await b.close();
