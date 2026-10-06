// The panels follow the game: the inventory panel against the game's own
// inventory window ('i') after a drop, a pick-up and a wield; the message log
// against the history after each, after a run of messages longer than the
// panel (it keeps to its end), and after a scroll back (it keeps its place).
//   node panels.mjs <dpr>
import { launch, newCtx, openPage, resume, settle, sleep, Checks, SHOTS, writeJson } from './common.mjs';
import { readPage } from './lib.mjs';

const dpr = Number(process.argv[2] || 1);
const WINS = [{ w: 1024, h: 768, input: 'touch' }, { w: 768, h: 1024, input: 'touch' }, { w: 1920, h: 1080, input: 'mouse' }, { w: 2560, h: 1440, input: 'mouse' }];
const b = await launch();
const all = [];
const norm = (t) => t.replace(/\s+/g, '');

for (const win of WINS) {
  const tag = `${win.w}x${win.h}${win.input === 'mouse' ? '-mouse' : ''}@${dpr}`;
  const C = new Checks(tag);
  const ctx = await newCtx(b, { w: win.w, h: win.h, dpr, touch: win.input === 'touch' });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(400);

  // the game's own inventory window: its item lines, letter and text
  const gameInv = async () => {
    await p.keyboard.press('i');
    await p.waitForFunction(() => globalThis.__ts.modalOpen, null, { timeout: 5000 }).catch(() => {});
    await sleep(300);
    const body = await p.evaluate(() => document.getElementById('modal-body').innerText);
    await p.keyboard.press('Escape');
    await sleep(300);
    await settle(p);
    // "a\n - \na +0 short sword ..." -> "a - a +0 short sword"
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
    const items = [];
    for (let i = 0; i < lines.length; i++) if (/^[a-zA-Z$#]$/.test(lines[i]) && lines[i + 1] === '-') { items.push(norm(lines[i] + lines[i + 2])); i += 2; }
    return items;
  };
  const panelState = async () => {
    const s = await readPage(p);
    const inv = s.panels.find((q) => q.kind === 'inventory' && q.vis), log = s.panels.find((q) => q.kind === 'log' && q.vis);
    return { s, inv, log, invItems: inv ? inv.lines.filter((l, i, a) => true).map(norm) : [], logLines: log ? log.lines : [] };
  };
  const agree = async (what) => {
    const want = await gameInv();
    const st = await panelState();
    const got = st.invItems;
    const missing = want.filter((w) => !got.includes(w));
    const extra = got.filter((g) => /^[a-zA-Z]/.test(g) && !want.includes(g) && /^[a-zA-Z][a-z0-9+-]/.test(g) && st.inv && st.inv.lines.some((l) => norm(l) === g)
      && !st.s.inv.some((i) => !i.sel && norm(i.text) === g));
    C.ok(`${what}: inventory panel = the game's inventory`, want.length > 0 && !missing.length && !extra.length, { missing, extra, want: want.length });
    const hist = st.s.history.map((t) => t.replace(/\s+/g, ' ').trim());
    const ll = st.logLines;
    C.ok(`${what}: message log = the history, newest last`, ll.length > 0 && JSON.stringify(ll) === JSON.stringify(hist.slice(-ll.length)),
      { log: ll.slice(-3), hist: hist.slice(-3) });
    return st;
  };

  let st = await agree('start');
  const before = st.invItems.slice();
  // drop the potion: it leaves the panel
  const potion = st.s.inv.find((i) => i.sel && /potion/.test(i.text));
  const letter = potion ? String.fromCharCode(potion.ch) : 'd';
  await p.keyboard.press('d');
  await sleep(400);
  await p.keyboard.press(letter);
  await settle(p);
  st = await agree(`after dropping ${letter}`);
  C.ok('the dropped item left the panel', !st.invItems.some((x) => x.startsWith(letter) && /potion/.test(x)), st.invItems);
  C.ok('the drop is the log\'s newest line', /drop/i.test(st.logLines.slice(-2).join(' ')), st.logLines.slice(-2));
  await p.screenshot({ path: `${SHOTS}/panels-${tag}-dropped.png` });
  // pick it up again
  await p.keyboard.press(',');
  await sleep(500);
  const m = await p.evaluate(() => globalThis.__ts.modalOpen);
  if (m) { await p.keyboard.press('Enter'); await sleep(300); }
  await settle(p);
  st = await agree('after picking it up');
  C.ok('the item is back in the panel', st.invItems.some((x) => /potion/.test(x)), st.invItems);
  // wield the daggers: an item's text changes in place
  const dag = st.s.inv.find((i) => i.sel && /dagger/.test(i.text));
  if (dag) {
    await p.keyboard.press('w');
    await sleep(400);
    await p.keyboard.press(String.fromCharCode(dag.ch));
    await settle(p);
    st = await agree('after wielding the daggers');
    C.ok("the panel shows the daggers wielded", st.invItems.some((x) => /dagger.*\(wielded\)/i.test(x)), st.invItems.filter((x) => /dagger/.test(x)));
    // and back
    const sw = st.s.inv.find((i) => i.sel && /short sword/.test(i.text));
    if (sw) { await p.keyboard.press('w'); await sleep(400); await p.keyboard.press(String.fromCharCode(sw.ch)); await settle(p); }
  }
  // a run of messages longer than the panel: ':' (look here) many times
  for (let i = 0; i < 40; i++) { await p.keyboard.press(':'); await sleep(60); }
  await settle(p);
  st = await panelState();
  const lg = st.log;
  C.ok('a long log scrolls and keeps to its newest line', lg && lg.scrollH > lg.clientH && lg.scrollTop + lg.clientH >= lg.scrollH - 4,
    lg && { sh: lg.scrollH, ch: lg.clientH, top: lg.scrollTop });
  const hist = st.s.history.map((t) => t.replace(/\s+/g, ' ').trim());
  C.ok('a long log holds the history', JSON.stringify(st.logLines) === JSON.stringify(hist.slice(-st.logLines.length)) && st.logLines.length >= Math.min(hist.length, 40),
    { n: st.logLines.length, hist: hist.length });
  // scroll back: a new message leaves the place the player scrolled to
  if (lg) {
    const box = lg;
    if (win.input === 'touch') {
      await p.evaluate(() => { const b = document.querySelector('.rhpanel[data-kind="log"] .pbody'); b.scrollTop = 0; b.dispatchEvent(new Event('scroll')); });
    } else {
      await p.mouse.move(box.x + box.w / 2, box.y + box.h / 2);
      for (let i = 0; i < 20; i++) await p.mouse.wheel(0, -400);
    }
    await sleep(300);
    const top0 = await p.evaluate(() => document.querySelector('.rhpanel[data-kind="log"] .pbody').scrollTop);
    await p.keyboard.press(':');
    await settle(p);
    const top1 = await p.evaluate(() => document.querySelector('.rhpanel[data-kind="log"] .pbody').scrollTop);
    C.ok('scrolled back, the log keeps its place when a message comes', top0 < 5 && Math.abs(top1 - top0) < 2, { top0, top1 });
    // a tap on the scrolled log still opens the history
    await p.evaluate(() => { globalThis.__ev = []; });
    if (win.input === 'touch') await p.touchscreen.tap(box.x + box.w / 2, box.y + box.h / 2); else await p.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
    await sleep(600);
    const ev = await p.evaluate(() => ({ ev: (globalThis.__ev || []).map((e) => e.key), modal: globalThis.__ts.modalOpen }));
    C.ok('a tap on the log opens the history', ev.modal && ev.ev.includes(16), ev);
    await p.keyboard.press('Escape');
    await settle(p);
  }
  await p.screenshot({ path: `${SHOTS}/panels-${tag}-end.png` });
  C.ok('no console errors', !p.errors.length, p.errors.slice(0, 5));
  all.push(...C.list);
  await ctx.close();
}
writeJson(`panels-${dpr}.json`, all);
console.log(`\npanels dpr ${dpr}: ${all.filter((c) => c.pass).length} pass, ${all.filter((c) => !c.pass).length} fail`);
for (const f of all.filter((c) => !c.pass)) console.log(`  FAIL ${f.tag} ${f.name}`);
await b.close();
