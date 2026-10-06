// What a player does, with real touches (CDP), on twin banks: walking,
// fighting (armed Fight, and the COMBAT layer then a direction), inventory,
// eating, the flick, Long rest swiped up, SACRIFICE (tap offers, 380 ms hold
// prays), the drawers, the pad centre, the pop-ups' places, and a turn of the
// device with Fight armed and with a drawer open.  Each group runs in a fresh
// context restored from the same saved game.
//   node behave.mjs [dpr] [WxH]   -> behave-<dpr>-<WxH>.json, shots/behave-*.png
import { launch, newCtx, openPage, resume, touch, sleep, SHOTS, writeJson, evs, clearEvs, ctlRect } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const [W0, H0] = (process.argv[3] || '896x443').split('x').map(Number);
const PORTRAIT = H0 > W0;
const OTHER = W0 === 896 && H0 === 443 ? [443, 939] : W0 === 443 && H0 === 939 ? [896, 443] : [H0, W0];
const TAG = `${DPR}-${W0}x${H0}`;
const results = [];
const b = await launch();

// ---- helpers
async function fresh(prefs = {}) {
  const ctx = await newCtx(b, { w: W0, h: H0, dpr: DPR, screen: PORTRAIT ? { width: W0, height: H0 } : { width: H0, height: W0 }, prefs: { budgets: {}, ...prefs } });
  const p = await openPage(ctx);
  await resume(p);
  const k = await touch(ctx, p);
  await clearEvs(p);
  return { ctx, p, k };
}
async function settle(p, ms = 3000) {
  const t0 = Date.now();
  let ok = 0;
  while (Date.now() - t0 < ms) {
    const s = await p.evaluate(() => ({ w: globalThis.__bt.waiting, q: globalThis.__bt.queue }));
    if (s.w && !s.q) { if (++ok >= 3) return; } else ok = 0;
    await sleep(80);
  }
}
const msg = (p) => p.evaluate(() => document.getElementById('msgband').innerText.replace(/\s+/g, ' ').trim());
const cur = (p) => p.evaluate(() => { const c = globalThis.__bt.cursor; return c ? { x: c.x, y: c.y } : null; });
const O = (p, fn) => p.evaluate(fn);
const keyStr = (list) => list.map((e) => (e.key !== undefined ? (typeof e.key === 'number' ? (e.key >= 32 && e.key < 127 ? String.fromCharCode(e.key) : `<${e.key}>`) : String(e.key)) : e.click ? `click(${e.click.x},${e.click.y})` : JSON.stringify(e))).join('');
async function tapId(env, id, hold = 0) {
  const r = await ctlRect(env.p, id);
  if (!r) throw new Error(`no control ${id}`);
  await env.k.tap(r.cx, r.cy, hold);
  return r;
}
// a popup's rect against the map area and every key
async function popupCheck(p, sel) {
  return p.evaluate((s) => {
    const O = globalThis.__bt.overlay, A = O.twin.spec.mapArea;
    const els = [...document.querySelectorAll(s)].filter((e) => e.offsetParent || getComputedStyle(e).position === 'fixed');
    const out = [];
    const over = (a, b) => a.x + 0.5 < b.x + b.w && b.x + 0.5 < a.x + a.w && a.y + 0.5 < b.y + b.h && b.y + 0.5 < a.y + a.h;
    const keys = [...document.querySelectorAll('[data-tw]')].filter((e) => !e.closest('.pop') || e.offsetParent).map((e) => ({ id: e.dataset.tw, r: e.getBoundingClientRect() }));
    for (const e of els) {
      const r = e.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const box = { x: r.x, y: r.y, w: r.width, h: r.height };
      if (box.x < A.x - 0.5 || box.y < A.y - 0.5 || box.x + box.w > A.x + A.w + 0.5 || box.y + box.h > A.y + A.h + 0.5)
        out.push(`${s} ${box.x.toFixed(1)},${box.y.toFixed(1)} ${box.w.toFixed(1)}x${box.h.toFixed(1)} outside the map area ${A.x.toFixed(1)},${A.y.toFixed(1)} ${A.w.toFixed(1)}x${A.h.toFixed(1)}`);
      for (const k of keys) {
        if (e.contains(document.querySelector(`[data-tw="${k.id}"]`)) || document.querySelector(`[data-tw="${k.id}"]`).contains(e)) continue;
        const kr = { x: k.r.x, y: k.r.y, w: k.r.width, h: k.r.height };
        if (kr.w > 0 && over(box, kr)) out.push(`${s} over ${k.id}`);
      }
    }
    return { n: els.length, bad: out };
  }, sel);
}
async function test(name, env, fn) {
  let ok = false, detail = '';
  try { const r = await fn(); ok = r.ok; detail = r.detail; } catch (e) { detail = `threw: ${e.message}`; }
  const shot = `${SHOTS}/behave-${TAG}-${name}.png`;
  try { await env.k.shot(shot); } catch (e) { /* closed */ }
  results.push({ name, ok, detail, shot, errors: [...env.p.errors] });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}${env.p.errors.length ? ` CONSOLE ERRORS: ${env.p.errors.join(' | ')}` : ''}`);
}
const esc = async (env) => { await env.p.keyboard.press('Escape'); await settle(env.p); };

// ---- group 1: walking, fight, layer, inventory, eat, sacrifice, pad centre
{
  const env = await fresh();
  const { p } = env;
  await test('walk', env, async () => {
    const tries = [['pad_l', 'l', 1, 0], ['pad_h', 'h', -1, 0], ['pad_j', 'j', 0, 1], ['pad_k', 'k', 0, -1]];
    for (const [id, key, dx, dy] of tries) {
      const c0 = await cur(p);
      await clearEvs(p);
      await tapId(env, id);
      await settle(p);
      const c1 = await cur(p), e = keyStr(await evs(p));
      if (e !== key) return { ok: false, detail: `${id} sent "${e}", not "${key}"` };
      if (c1.x === c0.x + dx && c1.y === c0.y + dy) return { ok: true, detail: `${id} sent "${key}", hero ${c0.x},${c0.y} -> ${c1.x},${c1.y}` };
    }
    return { ok: false, detail: 'no pad key moved the hero' };
  });
  await test('fight-armed', env, async () => {
    await clearEvs(p);
    await tapId(env, 'combat');
    await sleep(150);
    const st = await O(p, () => {
      const o = globalThis.__bt.overlay, lamp = document.querySelector('[data-tw="combat"] .lamp.armed');
      const ban = [...document.querySelectorAll('#keys *')].find((e) => /PICK A DIRECTION/.test(e.textContent) && e.children.length < 4 && e.offsetParent);
      return { armed: o.armed && o.armed.key, lamp: !!(lamp && lamp.classList.contains('on')), banner: ban ? ban.getBoundingClientRect().toJSON() : null, sent: (globalThis.__ev || []).length };
    });
    const ban = await popupCheck(p, '#banner');
    if (st.armed !== 'F' || !st.lamp || st.sent) return { ok: false, detail: `after COMBAT tap: ${JSON.stringify(st)}` };
    const m0 = await msg(p);
    await tapId(env, 'pad_h');
    await settle(p);
    const e = keyStr(await evs(p)), m1 = await msg(p);
    const after = await O(p, () => !!globalThis.__bt.overlay.armed);
    const ok = e === 'Fh' && !after && !ban.bad.length;
    return { ok, detail: `armed F with the ARMED lamp on COMBAT, banner ${ban.bad.length ? ban.bad.join('; ') : 'inside the map'}; ← sent "${e}"; message "${m1.slice(0, 70)}"` };
  });
  await test('combat-layer-then-direction', env, async () => {
    await clearEvs(p);
    await tapId(env, 'combat', 520);
    await sleep(100);
    const st = await O(p, () => {
      const o = globalThis.__bt.overlay;
      const pill = document.querySelector('#keys > .layerpill');
      const h = document.querySelector('[data-tw="pad_h"]');
      return { fan: o.fanOpen, pill: pill && pill.classList.contains('on') ? pill.textContent : null, padH: h.innerText.replace(/\s+/g, ' ').trim() };
    });
    const pill = await popupCheck(p, '#keys > .layerpill.on');
    if (st.fan !== 'fight' || !/kick/i.test(st.padH)) return { ok: false, detail: `after holding COMBAT: ${JSON.stringify(st)}` };
    await tapId(env, 'pad_h');      // Kick's place
    await settle(p);
    const m1 = await msg(p);
    await tapId(env, 'pad_j');      // the direction
    await settle(p);
    const e = keyStr(await evs(p)), m2 = await msg(p);
    const ok = e === '<4>j' && /direction/i.test(m1) && !pill.bad.length;
    return { ok, detail: `layer "${st.pill}" (pill ${pill.n ? (pill.bad.length ? pill.bad.join('; ') : 'inside the map') : 'not shown'}), ← = "${st.padH}"; sent "${e}"; asked "${m1.slice(0, 50)}"; then "${m2.slice(0, 60)}"` };
  });
  await esc(env);
  await test('inventory', env, async () => {
    await clearEvs(p);
    await tapId(env, 'inventory');
    await settle(p);
    const e = keyStr(await evs(p));
    const st = await O(p, () => ({ modal: globalThis.__bt.modalOpen, body: document.getElementById('modal-body').innerText.slice(0, 200) }));
    await esc(env);
    return { ok: e === 'i' && st.modal && /sword|dagger|shield|ration/i.test(st.body), detail: `sent "${e}", inventory window ${st.modal ? 'open' : 'NOT open'}: "${st.body.replace(/\s+/g, ' ').slice(0, 80)}"` };
  });
  await test('eat', env, async () => {
    await clearEvs(p);
    await tapId(env, 'eat');
    await settle(p);
    const e = keyStr(await evs(p)), m = await msg(p);
    const modal = await O(p, () => globalThis.__bt.modalOpen);
    await esc(env);
    return { ok: e === 'e' && (/eat/i.test(m) || modal), detail: `sent "${e}"; "${m.slice(0, 70)}"${modal ? ' (a menu)' : ''}` };
  });
  await test('sacrifice-tap', env, async () => {
    await clearEvs(p);
    await tapId(env, 'sacrifice', 200);
    await settle(p);
    const e = await evs(p), m = await msg(p);
    await esc(env);
    return { ok: keyStr(e).length > 0 && !/pray/i.test(m), detail: `a 200 ms press sent ${JSON.stringify(e)}; "${m.slice(0, 60)}"` };
  });
  await test('sacrifice-hold-prays', env, async () => {
    await clearEvs(p);
    await tapId(env, 'sacrifice', 450);
    await settle(p);
    const e = await evs(p), m = await msg(p);
    await env.p.keyboard.press('n');
    await settle(p);
    const m2 = await msg(p);
    return { ok: /pray/i.test(m), detail: `a 450 ms hold sent ${JSON.stringify(e)}; "${m.slice(0, 60)}"; after n: "${m2.slice(0, 40)}"` };
  });
  await test('sacrifice-hold-380', env, async () => {
    // Lucas's 380 ms: a hold just past it prays, one well short of it offers
    await clearEvs(p);
    await tapId(env, 'sacrifice', 395);
    await settle(p);
    const m = await msg(p);
    await env.p.keyboard.press('n'); await settle(p);
    await clearEvs(p);
    await tapId(env, 'sacrifice', 330);
    await settle(p);
    const m2 = await msg(p);
    await esc(env);
    return { ok: /pray/i.test(m) && !/pray/i.test(m2), detail: `395 ms: "${m.slice(0, 50)}"; 330 ms: "${m2.slice(0, 50)}"` };
  });
  await test('pad-centre', env, async () => {
    await clearEvs(p);
    await tapId(env, 'pad_centre');
    await settle(p);
    const e = keyStr(await evs(p));
    await clearEvs(p);
    // HERE is a layer on the pad, slide-only (the layers stage): held, then
    // slid to ↘ Look here and lifted
    const c = await ctlRect(p, 'pad_centre'), look = await ctlRect(p, 'pad_n');
    await env.k.down(c.cx, c.cy);
    await sleep(520);
    const open = await O(p, () => { const L = globalThis.__bt.overlay.padLayer; return L && L.kind === 'here' ? L.from : null; });
    const pop = await popupCheck(p, '#keys > .layerpill.on');
    for (let i = 1; i <= 6; i++) { await env.k.move(c.cx + ((look.cx - c.cx) * i) / 6, c.cy + ((look.cy - c.cy) * i) / 6); await sleep(16); }
    await env.k.up();
    if (open !== 'centre') return { ok: false, detail: `tap sent "${e}"; hold opened ${open}` };
    await settle(p);
    const e2 = keyStr(await evs(p)), m = await msg(p);
    await esc(env);
    return { ok: e === 's' && e2 === ':' && pop.n > 0 && !pop.bad.length, detail: `tap sent "${e}"; hold put HERE on the pad (its pill ${pop.bad.length ? pop.bad.join('; ') : 'inside the map, over no key'}); slid to Look here sent "${e2}": "${m.slice(0, 60)}"` };
  });
  await test('rest-counts-popup', env, async () => {
    // the counts are a layer on the pad (the layers stage); held 750 ms it stays up
    await tapId(env, 'rest', 750);
    await sleep(150);
    const pop = await popupCheck(p, '#keys > .layerpill.on');
    const n = await O(p, () => { const o = globalThis.__bt.overlay; return o.padLayer && o.padLayer.kind === 'count' ? o.chipsOpen : null; });
    await env.k.tap(5, 5);   // the scrim closes it
    await sleep(150);
    await esc(env);
    return { ok: !!n && pop.n > 0 && !pop.bad.length, detail: `REST hold put counts "${n}" on the pad: its pill ${pop.bad.length ? pop.bad.join('; ') : 'inside the map, over no key'}` };
  });
  await env.ctx.close();
}

// ---- group 2: the flick, Long rest, drawers, MENU, the empty pin
{
  const env = await fresh();
  const { p } = env;
  await test('flick-up-kicks', env, async () => {
    await clearEvs(p);
    const r = await ctlRect(p, 'flick');
    await env.k.swipe(r.cx, r.cy, 4, -60, 8);
    await settle(p);
    const e = keyStr(await evs(p)), m = await msg(p);
    await esc(env);
    return { ok: e === '<4>' && /direction/i.test(m), detail: `stroke up sent "${e}": "${m.slice(0, 50)}"` };
  });
  await test('flick-up-right', env, async () => {
    await clearEvs(p);
    const r = await ctlRect(p, 'flick');
    await env.k.swipe(r.cx, r.cy, 46, -38, 8);
    await sleep(300);
    const form = await O(p, () => !document.getElementById('formwrap').hidden);
    const e = keyStr(await evs(p));
    await p.keyboard.press('Escape'); await sleep(200);
    return { ok: form && !e, detail: `stroke up-right (empty macro): editor ${form ? 'opened' : 'NOT opened'}, sent "${e}"` };
  });
  await test('flick-legend', env, async () => {
    const r = await ctlRect(p, 'flick');
    await env.k.down(r.cx, r.cy);
    await sleep(80);
    await env.k.move(r.cx, r.cy - 20);
    await sleep(300);
    const nodes = await O(p, () => {
      const o = globalThis.__bt.overlay;
      const spec = o.twin.spec.popups.filter((q) => q.owner === 'flick');
      return { open: o.radialOpen, nodes: o.flickNodes.map((n) => { const b = n.el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, shown: !!n.el.offsetParent }; }), spec };
    });
    await p.evaluate(() => globalThis.__bt.overlay.flickNodes.forEach((n) => n.el.classList.add('bt-flicknode')));
    const pop = await popupCheck(p, '.bt-flicknode');
    await env.k.move(r.cx - 30, r.cy + 30);   // a cancel direction
    await env.k.up();
    await sleep(200);
    await esc(env);
    const match = nodes.nodes.every((n, i) => nodes.spec[i] && ['x', 'y', 'w', 'h'].every((q) => Math.abs(n[q] - nodes.spec[i][q]) <= 0.5));
    return { ok: nodes.nodes.every((n) => n.shown) && match && !pop.bad.length, detail: `legend nodes ${nodes.nodes.map((n) => `${n.x.toFixed(0)},${n.y.toFixed(0)}`).join(' ')} ${match ? '= layout popups' : `vs layout ${JSON.stringify(nodes.spec)}`}; ${pop.bad.length ? pop.bad.join('; ') : 'inside the map'}` };
  });
  await test('longrest-swipe-up', env, async () => {
    const r = await ctlRect(p, 'rest');
    // sideways and downward swipes leave Long rest hidden
    await env.k.swipe(r.cx - 20, r.cy, 50, 0, 8);
    const side = await O(p, () => globalThis.__bt.overlay.restWell.revealed);
    await env.k.swipe(r.cx, r.cy - 10, 0, 40, 8);
    const down = await O(p, () => globalThis.__bt.overlay.restWell.revealed);
    await clearEvs(p);
    await env.k.swipe(r.cx, r.cy + 15, 0, -45, 10);
    await sleep(300);
    const st = await O(p, () => {
      const o = globalThis.__bt.overlay, lf = o.longFace.el.getBoundingClientRect(), s = o.restWell.slot.getBoundingClientRect();
      return { revealed: o.restWell.revealed, lf: { x: lf.x, y: lf.y, w: lf.width, h: lf.height }, slot: { x: s.x, y: s.y, w: s.width, h: s.height }, text: o.longFace.el.innerText.replace(/\s+/g, ' ') };
    });
    const sent0 = keyStr(await evs(p));
    const inPlace = ['x', 'y', 'w', 'h'].every((q) => Math.abs(st.lf[q] - st.slot[q]) <= 0.5);
    if (!st.revealed || !inPlace) return { ok: false, detail: `side ${side} down ${down}; after up: ${JSON.stringify(st)}` };
    await clearEvs(p);
    await env.k.tap(st.lf.x + st.lf.w / 2, st.lf.y + st.lf.h / 2);
    await sleep(300);
    const e = keyStr(await evs(p)), m = await msg(p);
    // stop the long rest
    await p.keyboard.press('Escape'); await settle(p, 6000);
    return { ok: !side && !down && !sent0 && /200s|n200s/.test(e), detail: `sideways ${side ? 'REVEALED' : 'no'}, down ${down ? 'REVEALED' : 'no'}; up: "${st.text}" in REST's slot; tap sent "${e}"; "${m.slice(0, 40)}"` };
  });
  for (const id of ['world', 'game']) {
    await test(`drawer-${id}`, env, async () => {
      await tapId(env, id);
      await sleep(250);
      const st = await O(p, () => {
        const o = globalThis.__bt.overlay, panel = document.querySelector('#keys .drawer .panel, .drawer.on .panel') || o.drawerEl.querySelector('.panel');
        const r = panel.getBoundingClientRect(), A = o.twin.spec.mapArea, pop = o.twin.spec.popups.find((q) => q.owner === 'world');
        const cols = getComputedStyle(o.drawerGrid).gridTemplateColumns.split(' ').length;
        return { open: o.drawerOpen, r: { x: r.x, y: r.y, w: r.width, h: r.height }, A, pop, cols, n: o.drawerGrid.querySelectorAll('.k').length };
      });
      const pop = await popupCheck(p, '.drawer.on .panel');
      const bottomOk = Math.abs(st.r.y + st.r.h - (st.pop.y + st.pop.h)) <= 0.5 && Math.abs(st.r.x - st.pop.x) <= 0.5 && Math.abs(st.r.w - st.pop.w) <= 0.5;
      // run its first item
      const first = await O(p, () => { const e = globalThis.__bt.overlay.drawerGrid.querySelector('.k'); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: e.innerText.replace(/\s+/g, ' ') }; });
      await clearEvs(p);
      await env.k.tap(first.x, first.y);
      await settle(p);
      const e = await evs(p), closed = await O(p, () => !globalThis.__bt.overlay.drawerOpen);
      await esc(env); await esc(env);
      return { ok: st.open === id && st.cols === 3 && bottomOk && !pop.bad.length && closed && e.length > 0,
        detail: `${st.n} items in ${st.cols} columns, panel ${st.r.x.toFixed(0)},${st.r.y.toFixed(0)} ${st.r.w.toFixed(0)}x${st.r.h.toFixed(0)} ${bottomOk ? '= layout drawer, bottom-anchored' : `vs layout ${JSON.stringify(st.pop)}`}; ${pop.bad.length ? pop.bad.join('; ') : 'inside the map, over no key'}; "${first.t}" sent ${keyStr(e)}, drawer ${closed ? 'closed' : 'still open'}` };
    });
  }
  await test('menu-settings-layout', env, async () => {
    await tapId(env, 'menu');
    await sleep(400);
    const st = await O(p, () => {
      const t = document.getElementById('formwrap').innerText;
      const lab = [...document.querySelectorAll('#formwrap label')].find((l) => /^Layout: twin banks/i.test(l.textContent));
      const opts = lab ? [...lab.querySelectorAll('.seg > *')].map((x) => ({ t: x.textContent.trim(), amber: x.classList.contains('amber') })) : [];
      return { formOpen: !document.getElementById('formwrap').hidden, layout: !!lab, ghost: /Old key spots/i.test(t), opts,
        classicOpt: opts.some((o) => /classic/i.test(o.t)), twinLit: opts.some((o) => /twin/i.test(o.t) && o.amber) };
    });
    await p.keyboard.press('Escape'); await sleep(300);
    return { ok: st.formOpen && st.layout && st.classicOpt && st.twinLit, detail: JSON.stringify(st) };
  });
  // PIN 2 starts on Fire since the layers stage (the design's section 16), so
  // the empty pin is PIN 1; Throw goes on it
  await test('empty-pin-tap-opens-picker', env, async () => {
    await tapId(env, 'pin1');
    await sleep(250);
    const st = await O(p, () => { const o = globalThis.__bt.overlay; return { drawer: o.drawerOpen, assigning: !!o.assigning, fill: o.fill ? o.fill.n : null }; });
    if (st.drawer !== 'fight' && !st.drawer) return { ok: false, detail: JSON.stringify(st) };
    const fire = await O(p, () => { const e = [...globalThis.__bt.overlay.drawerGrid.querySelectorAll('.k')].find((k) => /\bthrow\b/i.test(k.innerText)); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    if (fire) await env.k.tap(fire.x, fire.y);
    await sleep(300);
    const label = (await ctlRect(p, 'pin1')).text;
    await clearEvs(p);
    await tapId(env, 'pin1');
    await settle(p);
    const e = keyStr(await evs(p)), m = await msg(p);
    await esc(env);
    return { ok: st.assigning && /throw/i.test(label) && e === 't', detail: `tap on the empty PIN 1 opened the ${st.drawer} drawer, assigning ${st.assigning}; picked Throw -> key shows "${label}"; tap sent "${e}": "${m.slice(0, 40)}"` };
  });
  await env.ctx.close();
}

// ---- group 3: a turn with Fight armed, and with a drawer open
{
  const env = await fresh();
  const { p, k } = env;
  const scrOther = OTHER[1] > OTHER[0] ? [OTHER[0], OTHER[1]] : [OTHER[0], OTHER[1]];
  await test('rotate-keeps-armed-fight', env, async () => {
    await tapId(env, 'combat');
    await sleep(150);
    await k.rotate(OTHER[0], OTHER[1], DPR, scrOther);
    const st = await O(p, () => {
      const o = globalThis.__bt.overlay, lamp = document.querySelector('[data-tw="combat"] .lamp.armed');
      return { W: o.twin && o.twin.W, H: o.twin && o.twin.H, armed: o.armed && o.armed.key, lamp: !!(lamp && lamp.classList.contains('on')),
        banner: [...document.querySelectorAll('#keys *')].some((e) => /PICK A DIRECTION/.test(e.textContent) && e.children.length < 4 && e.offsetParent) };
    });
    const ban = await popupCheck(p, '#banner');
    await k.shot(`${SHOTS}/behave-${TAG}-rotate-armed-turned.png`);
    await clearEvs(p);
    await tapId(env, 'pad_l');
    await settle(p);
    const e = keyStr(await evs(p));
    await k.rotate(W0, H0, DPR, PORTRAIT ? [W0, H0] : [W0, H0]);
    return { ok: st.W === OTHER[0] && st.armed === 'F' && st.lamp && st.banner && !ban.bad.length && e === 'Fl', detail: `after the turn to ${st.W}x${st.H}: armed ${st.armed}, lamp ${st.lamp}, banner ${st.banner} (${ban.bad.length ? ban.bad.join('; ') : 'inside the map'}); → sent "${e}"` };
  });
  await test('rotate-keeps-open-drawer', env, async () => {
    await tapId(env, 'world');
    await sleep(250);
    const before = await O(p, () => globalThis.__bt.overlay.drawerGrid.querySelectorAll('.k').length);
    await k.rotate(OTHER[0], OTHER[1], DPR, scrOther);
    const st = await O(p, () => {
      const o = globalThis.__bt.overlay, panel = o.drawerEl.querySelector('.panel'), r = panel.getBoundingClientRect(), pop = o.twin.spec.popups.find((q) => q.owner === 'world');
      return { W: o.twin.W, open: o.drawerOpen, shown: o.drawerEl.classList.contains('on'), n: o.drawerGrid.querySelectorAll('.k').length,
        cols: getComputedStyle(o.drawerGrid).gridTemplateColumns.split(' ').length, r: { x: r.x, y: r.y, w: r.width, h: r.height }, pop };
    });
    const pop = await popupCheck(p, '.drawer.on .panel');
    await k.shot(`${SHOTS}/behave-${TAG}-rotate-drawer-turned.png`);
    const bottomOk = Math.abs(st.r.y + st.r.h - (st.pop.y + st.pop.h)) <= 0.5 && Math.abs(st.r.x - st.pop.x) <= 0.5;
    await k.rotate(W0, H0, DPR, [W0, H0]);
    const back = await O(p, () => globalThis.__bt.overlay.drawerOpen);
    await esc(env);
    return { ok: st.W === OTHER[0] && st.open === 'world' && st.shown && st.n === before && st.cols === 3 && bottomOk && !pop.bad.length && back === 'world',
      detail: `turned to ${st.W}: drawer ${st.open} shown ${st.shown}, ${st.n}/${before} items, ${st.cols} columns, ${bottomOk ? 'at the layout drawer' : `${JSON.stringify(st.r)} vs ${JSON.stringify(st.pop)}`}; ${pop.bad.length ? pop.bad.join('; ') : 'inside the map'}; turned back: ${back}` };
  });
  await test('map-tap-travels', env, async () => {
    // a tap deep in the map, far from any old deck spot, travels
    const pt = await O(p, () => { const A = globalThis.__bt.overlay.twin.spec.mapArea; return { x: A.x + A.w * 0.5, y: A.y + A.h * 0.25 }; });
    await clearEvs(p);
    await k.tap(pt.x, pt.y);
    await settle(p);
    const e = await evs(p);
    return { ok: e.some((q) => q.click), detail: `tap at ${pt.x.toFixed(0)},${pt.y.toFixed(0)} pushed ${keyStr(e) || 'nothing'}` };
  });
  await test('map-drag-free-axis', env, async () => {
    // the level fits neither axis here or one; a drag moves the view on both (Lucas, 2026-09-27)
    const v0 = await O(p, () => ({ ...globalThis.__bt.view, area: null }));
    const A = await O(p, () => globalThis.__bt.overlay.twin.spec.mapArea);
    await clearEvs(p);
    await k.down(A.x + A.w / 2, A.y + A.h / 2);
    for (let i = 1; i <= 8; i++) { await k.move(A.x + A.w / 2 + i * 6, A.y + A.h / 2 + i * 3); await sleep(16); }
    const v1 = await O(p, () => ({ ...globalThis.__bt.view, area: null }));
    await k.up();
    await sleep(200);
    const e = await evs(p);
    return { ok: (v1.panX !== v0.panX || v1.left !== v0.left) && (v1.panY !== v0.panY || v1.top !== v0.top) && !e.some((q) => q.click), detail: `left ${v0.left.toFixed(1)} -> ${v1.left.toFixed(1)}, top ${v0.top.toFixed(1)} -> ${v1.top.toFixed(1)}; pushed ${keyStr(e) || 'nothing'}` };
  });
  await env.ctx.close();
}

// ---- group 4: the ghost deck (landscape only), and the key flash's place
if (!PORTRAIT) {
  const env = await fresh();
  const { p, k } = env;
  await test('ghost-deck-preview', env, async () => {
    const spots = await O(p, () => globalThis.__bt.overlay.ghostSpots.map((g) => ({ id: g.id, r: g.r })));
    const A = await O(p, () => globalThis.__bt.overlay.twin.spec.mapArea);
    // a spot whose centre is on the map
    const s = spots.find((g) => { const x = g.r.x + g.r.w / 2, y = g.r.y + g.r.h / 2; return x > A.x + 2 && x < A.x + A.w - 2 && y > A.y + 2 && y < A.y + A.h - 2; });
    if (!s) return { ok: true, detail: `no old deck spot lands on the map here (${spots.map((g) => g.id).join(' ')})` };
    const x = s.r.x + s.r.w / 2, y = s.r.y + s.r.h / 2;
    await clearEvs(p);
    await k.tap(x, y);
    await sleep(200);
    const e1 = await evs(p);
    const prev = await O(p, () => !!document.querySelector('#keys > .ghost.on'));
    const gp = await popupCheck(p, '#keys > .ghost.on');
    await k.tap(x, y);
    await settle(p);
    const e2 = await evs(p);
    return { ok: !e1.some((q) => q.click) && prev && e2.some((q) => q.click) && !gp.bad.length, detail: `old ${s.id} spot: first tap pushed ${keyStr(e1) || 'nothing'} (flash ${prev ? 'shown' : 'NOT shown'}; ${gp.bad.length ? gp.bad.join('; ') : 'inside the map'}), second pushed ${keyStr(e2)}` };
  });
  await test('key-flash-inside-map', env, async () => {
    await tapId(env, 'search');
    await sleep(60);
    const f = await popupCheck(p, '#flash.on');
    await settle(p);
    return { ok: !f.bad.length, detail: `flash ${f.n ? (f.bad.length ? f.bad.join('; ') : 'inside the map, over no key') : 'not caught on screen'}` };
  });
  await env.ctx.close();
}

writeJson(`behave-${TAG}.json`, results);
const fails = results.filter((r) => !r.ok).length;
console.log(`${results.length - fails} of ${results.length} pass${fails ? `; FAILED: ${results.filter((r) => !r.ok).map((r) => r.name).join(', ')}` : ''}`);
await b.close();
