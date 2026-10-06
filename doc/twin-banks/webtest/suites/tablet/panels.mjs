// The panels as the game goes on (the stage "Tablet and touch-laptop tier,
// size classes and panels"), with real CDP touches:
//  1. 1024x768 (the tray between the banks): drop the food ration and pick it
//     up again -- the inventory panel loses it and gets it back, and each
//     message reaches the log, the newest bright at its end; the band's own
//     messages stand in the log too (a tablet's log is the whole history);
//  2. a tap on the log opens the history (^P), a tap on the inventory opens
//     the inventory ('i'), and the touch clicks nothing in what it opened; a
//     drag scrolls a panel and opens nothing; at --More-- a tap on a panel is
//     Space, once, on a panel in the glass (768x1024's log) as out of it;
//  3. 443x939 (a phone's log under the map): the log shows the history up to
//     the band's first message, so no message stands on both; it follows as
//     messages come and the band pages;
//  4. a game begun in classic (perm_invent off) and switched to twin banks
//     shows a note in the inventory panel, and no inventory window pops up;
//     a game in twin banks never opens the permanent inventory as a window.
//   node panels.mjs [dpr]  -> panels-<dpr>.json, shots/panels-*.png
import { launch, newCtx, openPage, resume, sleep, SHOTS, writeJson, touch } from './common.mjs';
import { Checks, mark, pushed } from './kit.mjs';

const DPR = Number(process.argv[2] || 1);
const b = await launch();
const results = {};
let failed = 0;
const done = (C) => { failed += C.failed; results[C.tag] = C.list; };

const panelState = (p) => p.evaluate(() => {
  const get = (k) => {
    const e = document.querySelector(`.rhpanel[data-kind="${k}"]`);
    if (!e || e.style.display === 'none') return null;
    const body = e.querySelector('.pbody'), r = e.getBoundingClientRect();
    return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, pane: e.dataset.pane !== undefined,
      lines: [...body.querySelectorAll('.pl, .pi, .ph, .pnote')].map((q) => q.innerText.replace(/\s+/g, ' ').trim()),
      bright: [...body.querySelectorAll('.pl.new')].map((q) => q.innerText.trim()),
      atEnd: body.scrollTop + body.clientHeight >= body.scrollHeight - 4, scrollTop: body.scrollTop, scrollMax: body.scrollHeight - body.clientHeight };
  };
  const B = globalThis.__bt;
  return { log: get('log'), inv: get('inventory'), modal: B.modalOpen, title: document.getElementById('modal-title').textContent,
    more: B.moreShown, waiting: B.waiting, commandWait: B.commandWait, history: B.history.slice(-8), band: document.getElementById('msgband').innerText };
});
async function waitIdle(p, ms = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await p.evaluate(() => ({ w: globalThis.__bt.waiting, c: globalThis.__bt.commandWait, m: globalThis.__bt.modalOpen, more: globalThis.__bt.moreShown }));
    if (s.more) { await p.keyboard.press('Space'); await sleep(150); continue; }
    if (s.w && s.c && !s.m) return true;
    await sleep(80);
  }
  return false;
}

// ---- 1 and 2: 1024x768
{
  const C = new Checks(`1024x768 @${DPR}`);
  const ctx = await newCtx(b, { w: 1024, h: 768, dpr: DPR, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(400);
  const t = await touch(ctx, p);
  let s = await panelState(p);
  C.ok('the inventory panel holds the food ration', s.inv && s.inv.lines.some((l) => /^d .*food ration/.test(l)), s.inv && s.inv.lines);
  // drop it: d, then d at "What do you want to drop?"
  await p.keyboard.press('d'); await sleep(250);
  await p.keyboard.press('d'); await sleep(500);
  await waitIdle(p);
  s = await panelState(p);
  C.ok('dropped: the inventory panel no longer has it', s.inv && !s.inv.lines.some((l) => /food ration/.test(l)), s.inv && s.inv.lines);
  C.ok('the drop message is the log\'s last line, bright', s.log && /drop/i.test(s.log.lines[s.log.lines.length - 1] || '') && s.log.bright.some((l) => /drop/i.test(l)), s.log && s.log.lines.slice(-3));
  C.ok('the log is at its end', s.log && s.log.atEnd);
  await p.screenshot({ path: `${SHOTS}/panels-${DPR}-1024x768-dropped.png` });
  // pick it up again
  await p.keyboard.press(','); await sleep(500);
  if ((await panelState(p)).modal) { await p.keyboard.press('Enter'); await sleep(400); }
  await waitIdle(p);
  s = await panelState(p);
  C.ok('picked up: the inventory panel has it again', s.inv && s.inv.lines.some((l) => /food ration/.test(l)), s.inv && s.inv.lines);
  C.ok('the pick-up message reached the log', s.log && s.log.lines.slice(-2).some((l) => /food ration/.test(l)), s.log && s.log.lines.slice(-3));
  // a turn: the band's page dims, so does the log's end
  await p.keyboard.press('s'); await sleep(400); await waitIdle(p);
  s = await panelState(p);
  C.ok('after a turn the log\'s end is no longer bright', s.log && !s.log.bright.length, s.log && s.log.bright);

  // 2. taps
  const centre = (q) => ({ x: q.rect.x + q.rect.w / 2, y: q.rect.y + q.rect.h / 2 });
  await mark(p);
  await t.tap(centre(s.log).x, centre(s.log).y); await sleep(400);
  let m = await panelState(p);
  let ev = await pushed(p);
  C.ok('a tap on the log opens the history', m.modal && /Messages/.test(m.title) && ev === '^P', { title: m.title, ev });
  await p.keyboard.press('Escape'); await sleep(300); await waitIdle(p);
  await mark(p);
  // on an item's line, where the inventory window's own lines open under the finger
  const invPt = await p.evaluate(() => { const e = document.querySelector('.rhpanel[data-kind="inventory"] .pi'); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await t.tap(invPt.x, invPt.y); await sleep(500);
  m = await panelState(p);
  ev = await pushed(p);
  C.ok('a tap on the inventory opens the inventory, and clicks nothing in it', m.modal && ev === 'i', { title: m.title, ev });
  await p.keyboard.press('Escape'); await sleep(300); await waitIdle(p);
  // a drag scrolls the log and opens nothing: fill it first
  await p.evaluate(async () => {
    const B = globalThis.__bt;
    B.msg.begin();
    for (let i = 0; i < 40; i++) {
      B.msg.put(`Filler line ${i}.`);
      for (let k = 0; k < 10 && B.moreShown; k++) { B.msg.key(32); await new Promise((r) => setTimeout(r, 10)); }
      await B.msg.settle();
    }
    B.msg.end();
  });
  await sleep(200);
  s = await panelState(p);
  await mark(p);
  const c = centre(s.log);
  // a finger drawn down the log scrolls it back
  await t.drag(c.x, c.y - 60, 0, 120, 10);
  await sleep(300);
  const s2 = await panelState(p);
  ev = await pushed(p);
  C.ok('a drag scrolls the log and opens nothing', !s2.modal && ev === '' && s2.log.scrollTop !== s.log.scrollTop, { before: s.log.scrollTop, after: s2.log.scrollTop, max: s2.log.scrollMax, ev });
  // scrolled back, a new message does not pull the log to its end
  await t.drag(c.x, c.y - 60, 0, 60, 10); await sleep(200);
  const back = (await panelState(p)).log.scrollTop;
  await p.keyboard.press('s'); await sleep(400); await waitIdle(p);
  const s3 = await panelState(p);
  C.ok('a log scrolled back keeps its place through a turn', Math.abs(s3.log.scrollTop - back) < 2 && !s3.log.atEnd, { back, now: s3.log.scrollTop });
  // at --More--: a tap on a panel is Space, once
  await p.evaluate(() => { const B = globalThis.__bt; B.msg.begin(); for (let i = 0; i < 6; i++) B.msg.put(`A message long enough to fill the band, number ${i}, with words to spare for the row and more words.`); });
  await sleep(300);
  let mo = await p.evaluate(() => globalThis.__bt.moreShown);
  await mark(p);
  const invNow = (await panelState(p)).inv;
  await t.tap(centre(invNow).x, centre(invNow).y); await sleep(250);
  ev = await pushed(p);
  C.ok('at --More-- a tap on the inventory panel is Space, once', mo && ev === ' ', { more: mo, ev });
  await p.evaluate(async () => { const B = globalThis.__bt; for (let i = 0; i < 20 && B.moreShown; i++) { B.msg.key(32); await new Promise((r) => setTimeout(r, 30)); } B.msg.end(); });
  await waitIdle(p);
  // the Layout setting to classic and back: classic shows no panel; twin
  // banks show them again, as full as they were
  const visiblePanels = () => p.evaluate(() => [...document.querySelectorAll('.rhpanel')].filter((e) => e.style.display !== 'none' && e.getBoundingClientRect().width > 0).map((e) => e.dataset.kind));
  await p.evaluate(() => { globalThis.__bt.P.set('layout', 'classic'); globalThis.__bt.overlay.rebuild(); });
  await sleep(400);
  const inClassic = await visiblePanels();
  C.ok('switched to classic: no panel shows', !inClassic.length && await p.evaluate(() => document.documentElement.dataset.ui === 'classic'), inClassic);
  await p.evaluate(() => { globalThis.__bt.P.set('layout', 'twin'); globalThis.__bt.overlay.rebuild(); });
  await sleep(400);
  s = await panelState(p);
  C.ok('and back to twin banks: the log and the inventory, full', s.log && s.log.lines.length > 10 && s.inv && s.inv.lines.some((l) => /food ration/.test(l)), { log: s.log && s.log.lines.length, inv: s.inv && s.inv.lines.length });
  C.ok('no console errors', !p.errors.length, p.errors);
  done(C);
  await ctx.close();
}

// ---- 2b: a panel in the glass (768x1024's log under the map) at --More--
{
  const C = new Checks(`768x1024 @${DPR}`);
  const ctx = await newCtx(b, { w: 768, h: 1024, dpr: DPR, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(400);
  const t = await touch(ctx, p);
  let s = await panelState(p);
  C.ok('the log is in the glass (no pane), the inventory a pane in the tray', s.log && !s.log.pane && s.inv && s.inv.pane, { log: s.log && s.log.pane, inv: s.inv && s.inv.pane });
  await p.evaluate(() => { const B = globalThis.__bt; B.msg.begin(); for (let i = 0; i < 8; i++) B.msg.put(`A message long enough to fill the band, number ${i}, with words to spare for the row and more words still.`); });
  await sleep(300);
  const mo = await p.evaluate(() => globalThis.__bt.moreShown);
  await mark(p);
  await t.tap(s.log.rect.x + s.log.rect.w / 2, s.log.rect.y + s.log.rect.h / 2); await sleep(250);
  const ev = await pushed(p);
  C.ok('at --More-- a tap on the log in the glass is Space, once (not the glass\'s too)', mo && ev === ' ', { more: mo, ev });
  await p.evaluate(async () => { const B = globalThis.__bt; for (let i = 0; i < 30 && B.moreShown; i++) { B.msg.key(32); await new Promise((r) => setTimeout(r, 30)); } B.msg.end(); });
  s = await panelState(p);
  C.ok('the log ends with the last message put', s.log && /number 7/.test(s.log.lines[s.log.lines.length - 1] || ''), s.log && s.log.lines.slice(-2));
  await p.screenshot({ path: `${SHOTS}/panels-${DPR}-768x1024.png` });
  C.ok('no console errors', !p.errors.length, p.errors);
  done(C);
  await ctx.close();
}

// ---- 3: a phone's log under the map shows what the band no longer does
{
  const C = new Checks(`443x939 @${DPR}`);
  const ctx = await newCtx(b, { w: 443, h: 939, dpr: DPR, screen: { width: 443, height: 939 }, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(400);
  const both = (s) => s.log.lines.filter((l) => l && s.band.replace(/\s+/g, ' ').includes(l));
  let s = await panelState(p);
  C.ok('the log under the map holds what came before the band', s.log && s.log.lines.length >= 1 && !both(s).length, { log: s.log && s.log.lines, band: s.band });
  // a run of short messages: the band shows the newest, the log the rest
  await p.evaluate(() => { const B = globalThis.__bt; B.msg.begin(); for (let i = 1; i <= 9; i++) B.msg.put(`Note ${i}.`); });
  await sleep(300);
  const pages = [];
  for (let i = 0; i < 6; i++) {
    s = await panelState(p);
    pages.push({ more: s.more, band: s.band.replace(/\s+/g, ' ').slice(0, 80), log: s.log.lines.slice(-3), dup: both(s) });
    if (!s.more) break;
    await p.evaluate(() => globalThis.__bt.msg.key(32));
    await sleep(150);
  }
  await p.evaluate(() => globalThis.__bt.msg.end());
  C.ok('as the band pages, no message stands on the band and in the log', pages.every((q) => !q.dup.length), pages);
  s = await panelState(p);
  const lastBand = (s.band.match(/Note (\d)/g) || []).map((x) => +x.slice(5));
  const lastLog = (s.log.lines.join(' ').match(/Note (\d)/g) || []).map((x) => +x.slice(5));
  C.ok('the log runs up to the band\'s first message', lastLog.length && lastBand.length && Math.max(...lastLog) === Math.min(...lastBand) - 1, { log: lastLog, band: lastBand });
  await p.screenshot({ path: `${SHOTS}/panels-${DPR}-443x939.png` });
  C.ok('no console errors', !p.errors.length, p.errors);
  done(C);
  await ctx.close();
}

// ---- 4: a game begun in classic, then twin banks
{
  const C = new Checks(`classic then twin @${DPR}`);
  const ctx = await newCtx(b, { w: 1024, h: 768, dpr: DPR, prefs: { budgets: {}, layout: 'classic', ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  C.ok('classic: no panel', await p.evaluate(() => ![...document.querySelectorAll('.rhpanel')].some((e) => e.style.display !== 'none' && e.getBoundingClientRect().width > 0)));
  // switch, as Settings does (prefs then a rebuild)
  await p.evaluate(() => { globalThis.__bt.P.set('layout', 'twin'); globalThis.__bt.overlay.rebuild(); });
  await sleep(500);
  let s = await panelState(p);
  C.ok('switched to twin: the inventory panel says when it will show', s.inv && /next start/.test(s.inv.lines.join(' ')), s.inv && s.inv.lines);
  await p.keyboard.press('d'); await sleep(250); await p.keyboard.press('d'); await sleep(400); await waitIdle(p);
  await p.keyboard.press(','); await sleep(400);
  if ((await panelState(p)).modal) { await p.keyboard.press('Enter'); await sleep(300); }
  await waitIdle(p);
  s = await panelState(p);
  C.ok('no inventory window pops up on a change', !s.modal);
  C.ok('no console errors', !p.errors.length, p.errors);
  done(C);
  await ctx.close();
}
{
  // a twin game: every inventory change is taken for the panel, none opened
  const C = new Checks(`twin, no permanent inventory window @${DPR}`);
  const ctx = await newCtx(b, { w: 896, h: 443, dpr: DPR, screen: { width: 443, height: 939 }, prefs: { budgets: {}, ghostDeck: { on: false, clean: 0, session: null } } });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(300);
  await p.evaluate(() => {
    const B = globalThis.__bt;
    globalThis.__menus = 0;
    globalThis.__titles = [];
    const o = new MutationObserver(() => { if (!document.getElementById('modal').hidden) { globalThis.__menus++; globalThis.__titles.push(document.getElementById('modal-title').textContent + ' | ' + document.getElementById('modal-body').innerText.slice(0, 80)); } });
    o.observe(document.getElementById('modal'), { attributes: true, attributeFilter: ['hidden'] });
  });
  await p.keyboard.press('d'); await sleep(250); await p.keyboard.press('d'); await sleep(400); await waitIdle(p);
  await p.keyboard.press(','); await sleep(400);
  const pick = await p.evaluate(() => globalThis.__menus);
  const titles = await p.evaluate(() => globalThis.__titles);
  if ((await panelState(p)).modal) { await p.keyboard.press('Enter'); await sleep(300); }
  await waitIdle(p);
  const inv = await p.evaluate(() => (globalThis.__bt.overlay && document.querySelector('.rhpanel[data-kind="inventory"]')) ? 'panel' : 'none');
  // the drop's own "What do you want to drop?" may come as a menu; the
  // permanent inventory would come with no prompt, after each change
  const perm = titles.filter((x) => !/^What do you want/.test(x));
  C.ok('a phone (no inventory panel): drop and pick up open no permanent inventory window', perm.length === 0, { windows: pick, titles, inv });
  C.ok('no console errors', !p.errors.length, p.errors);
  done(C);
  await ctx.close();
}
writeJson(`panels-${DPR}.json`, results);
console.log(failed ? `FAILURES: ${failed}` : 'ALL PASS');
await b.close();
