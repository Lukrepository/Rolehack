// (Copied from webtest/layers/classic.mjs for the stage "Tablet and
// touch-laptop tier, size classes and panels", which also compares the
// game's NETHACKOPTIONS: twin banks turn perm_invent on, classic must not.
// Copied from webtest/header/classic.mjs for the stage "Layers on the pad and
// the near-miss guard": HEAD on 8768 is git HEAD's page files, refreshed by
// webtest/header/headsite.sh.  The last part now holds twin banks' keycaps to
// HEAD's keys: each key's box became its hit cell, the keycap drawn inset
// where HEAD drew the key.)
// Classic unchanged: HEAD's page (8768, the committed code) against the
// working tree with the setting on classic (8766), the same saved game, at
// every test window.  Every element of the case, the keys and the glass is
// compared by rect, class and text, the viewport meta and the options file
// the game reads are compared, and the two screenshots pixel by pixel (in a
// browser canvas: no image library).  Then the run-time switch: twin -> classic
// must put every key where HEAD has it, and back.
//   node classic.mjs [dpr]  -> classic-<dpr>.json, shots/classic-<dpr>-{head,work}-WxH.png
import fs from 'node:fs';
import { launch, newCtx, openPage, resume, sleep, SHOTS, writeJson, HEAD, WORK, clearEvs, evs, touch } from './common.mjs';

const DPR = Number(process.argv[2] || 1);
const WINS = process.env.WINS ? process.env.WINS.split(',').map((x) => x.split('x').map(Number))
  : [[896, 443], [443, 939], [640, 360], [360, 640], [915, 412], [412, 915], [844, 390], [390, 844], [896, 363], [443, 859],
     [1024, 768], [768, 1024], [1366, 768]];
// SELF=1 compares HEAD with HEAD (the noise floor of a screenshot)
const SELF = !!process.env.SELF;
const b = await launch();

async function snap(p) {
  return p.evaluate(() => {
    const out = [];
    const r2 = (v) => Math.round(v * 1000) / 1000;
    for (const root of ['case', 'keys', 'glass']) {
      const R = document.getElementById(root);
      if (!R) continue;
      for (const e of [R, ...R.querySelectorAll('*')]) {
        if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue;
        const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
        out.push({ root, tag: e.tagName, id: e.id, cls: typeof e.className === 'string' ? e.className : '', x: r2(b.x), y: r2(b.y), w: r2(b.width), h: r2(b.height),
          vis: cs.display !== 'none' && cs.visibility !== 'hidden', t: e.children.length ? '' : (e.textContent || '').trim().slice(0, 40) });
      }
    }
    const meta = document.querySelector('meta[name="viewport"]').content;
    let rc = '';
    try { rc = globalThis.__bt.M.FS.readFile('/home/web_user/.nethackrc', { encoding: 'utf8' }); } catch (e) { rc = `ERR ${e.message}`; }
    const app = document.getElementById('app').getBoundingClientRect();
    const env = (globalThis.__bt.M && globalThis.__bt.M.ENV && globalThis.__bt.M.ENV.NETHACKOPTIONS) || '';
    return { els: out, meta, rc, env, app: { w: app.width, h: app.height }, attrs: Object.fromEntries(Object.entries(document.documentElement.dataset)) };
  });
}

function diffEls(a, b) {
  const out = [];
  if (a.length !== b.length) out.push(`element count ${a.length} vs ${b.length}`);
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n && out.length < 12; i++) {
    const x = a[i], y = b[i];
    for (const k of ['root', 'tag', 'id', 'cls', 'x', 'y', 'w', 'h', 'vis', 't']) {
      if (x[k] !== y[k]) { out.push(`#${i} ${x.tag}.${x.cls} ${k}: ${JSON.stringify(x[k])} vs ${JSON.stringify(y[k])}`); break; }
    }
  }
  return out;
}

// pixels that differ between two PNGs, counted in a page
async function pxDiff(pa, pb, skip = null) {
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  const A = fs.readFileSync(pa).toString('base64'), B = fs.readFileSync(pb).toString('base64');
  const r = await p.evaluate(async ({ A, B, skip }) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${s}`; });
    const [a, b] = await Promise.all([load(A), load(B)]);
    if (a.width !== b.width || a.height !== b.height) return { size: `${a.width}x${a.height} vs ${b.width}x${b.height}` };
    const c = new OffscreenCanvas(a.width, a.height), x = c.getContext('2d');
    x.drawImage(a, 0, 0); const da = x.getImageData(0, 0, a.width, a.height).data;
    x.clearRect(0, 0, a.width, a.height); x.drawImage(b, 0, 0); const db = x.getImageData(0, 0, a.width, a.height).data;
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < da.length; i += 4) {
      if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) {
        const px = (i / 4) % a.width, py = Math.floor(i / 4 / a.width);
        if (skip && [].concat(skip).some((k) => px >= k.x0 && px < k.x1 && py >= k.y0 && py < k.y1)) continue;
        n++;
        x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
      }
    }
    return { n, of: a.width * a.height, box: n ? [x0, y0, x1, y1] : null };
  }, { A, B, skip });
  await ctx.close();
  return r;
}

async function load(origin, w, h, prefs) {
  const ctx = await newCtx(b, { w, h, dpr: DPR, origin, prefs });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(1200);
  return { ctx, p };
}

const res = [];
let fails = 0;
for (const [w, h] of WINS) {
  // HEAD's default is twin banks: both sides are set to classic
  const H = await load(HEAD, w, h, { layout: 'classic' });
  const Wk = SELF ? await load(HEAD, w, h, { layout: 'classic' }) : await load(WORK, w, h, { layout: 'classic' });
  const sh = await snap(H.p), sw = await snap(Wk.p);
  const fh = `${SHOTS}/classic-${DPR}-head-${w}x${h}.png`, fw = `${SHOTS}/classic-${DPR}-work-${w}x${h}.png`;
  await H.p.screenshot({ path: fh });
  await Wk.p.screenshot({ path: fw });
  const d = diffEls(sh.els, sw.els);
  let px = await pxDiff(fh, fw);
  // A raster tile now and then comes out a few levels apart from one
  // screenshot to the next, in HEAD against HEAD as well (SELF=1: 16890
  // pixels in the 256 px tile at 0,256 of 360x640, one run in two,
  // 2026-10-03): a difference is believed only if it is there in three
  // pairs of screenshots running.
  for (let again = 0; again < 2 && px.n; again++) {
    await sleep(300);
    await H.p.screenshot({ path: fh });
    await Wk.p.screenshot({ path: fw });
    const q = await pxDiff(fh, fw);
    if (!q.n || q.n < px.n) px = q;
  }
  const live = (rc) => rc.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).join('\n');
  const rcSame = live(sh.rc) === live(sw.rc), metaSame = sh.meta === sw.meta;
  // classic still plays: a pad key walks
  const k = await touch(Wk.ctx, Wk.p);
  await clearEvs(Wk.p);
  const lk = await Wk.p.evaluate(() => {
    const e = [...document.querySelectorAll('#keys .k')].find((q) => q.innerText.trim() === 'l' && q.offsetParent);
    if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (lk) await k.tap(lk.x, lk.y);
  await sleep(500);
  const sent = (await evs(Wk.p)).map((e) => (e.key !== undefined ? String.fromCharCode(e.key) : JSON.stringify(e))).join('');
  const bad = [...d, ...(px.size ? [`screenshot size ${px.size}`] : px.n ? [`${px.n} of ${px.of} pixels differ in ${px.box}`] : []),
    ...(rcSame ? [] : ['the options file differs']), ...(metaSame ? [] : [`viewport meta "${sh.meta}" vs "${sw.meta}"`]),
    ...(sh.env === sw.env && /!perm_invent/.test(sw.env) ? [] : [`NETHACKOPTIONS "${sh.env}" vs "${sw.env}"`]),
    ...(sent === 'l' ? [] : [`classic's → key sent "${sent}"`]),
    ...(sw.attrs.ui === 'classic' ? [] : [`data-ui ${sw.attrs.ui}`]),
    ...(H.p.errors.length ? [`HEAD console: ${H.p.errors.join(' | ')}`] : []), ...(Wk.p.errors.length ? [`work console: ${Wk.p.errors.join(' | ')}`] : [])];
  fails += bad.length;
  console.log(`${w}x${h} @${DPR}: ${sh.els.length} elements; ${bad.length ? bad.join(' | ') : 'identical rects, pixels, options file and meta; → walks'}${/paranoid/.test(live(sw.rc)) ? ' [classic rc has a live paranoid_confirmation line!]' : ''}`);
  res.push({ w, h, bad, px, attrsHead: sh.attrs, attrsWork: sw.attrs, shots: [fh, fw] });
  await H.ctx.close(); await Wk.ctx.close();
}

// the switch at run time: twin first, then Settings -> Layout -> Classic, then back
for (const [w, h] of (SELF || process.env.NOSWITCH) ? [] : [[896, 443], [443, 939]]) {
  const H = await load(HEAD, w, h, { layout: 'classic' });
  const sh = await snap(H.p);
  // SWITCHPREFS (JSON) starts twin with more settings: {"mapCell":"rows"} has the header over the banks
  const Wk = await load(WORK, w, h, { budgets: {}, ...JSON.parse(process.env.SWITCHPREFS || '{}') });
  const ui0 = await Wk.p.evaluate(() => document.documentElement.dataset.ui);
  const k = await touch(Wk.ctx, Wk.p);
  const pick = async (label) => {
    const r = await Wk.p.evaluate(() => { const e = document.querySelector('[data-tw="menu"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    if (r) await k.tap(r.x, r.y);
    else {
      // classic's MENU key
      const m = await Wk.p.evaluate(() => { const e = [...document.querySelectorAll('#keys .k')].find((q) => /^MENU$/i.test(q.innerText.trim()) && q.offsetParent); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      await k.tap(m.x, m.y);
    }
    await sleep(500);
    const at = await Wk.p.evaluate((lab) => {
      const L = [...document.querySelectorAll('#formwrap label')].find((l) => /^Layout: twin banks/i.test(l.textContent));
      const o = [...L.querySelectorAll('.seg > *')].find((x) => new RegExp(lab, 'i').test(x.textContent));
      o.scrollIntoView(); const r = o.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, label);
    await k.tap(at.x, at.y);
    await sleep(200);
    // the form's primary button saves
    const save = await Wk.p.evaluate(() => { const bs = [...document.querySelectorAll('#formwrap button, #formwrap .k')].filter((x) => /^(save|done|ok)$/i.test(x.textContent.trim())); const e = bs[bs.length - 1]; if (!e) return null; e.scrollIntoView(); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: e.textContent.trim() }; });
    if (save) await k.tap(save.x, save.y); else await Wk.p.keyboard.press('Enter');
    await sleep(1200);
  };
  await pick('classic');
  const sc = await snap(Wk.p);
  const bandsIn = await Wk.p.evaluate(() => document.getElementById('bands').parentElement.id);
  if (bandsIn !== 'glass') sc.els.push({ root: 'bands', tag: 'not in the glass' });
  const ui1 = await Wk.p.evaluate(() => ({ ui: document.documentElement.dataset.ui, pref: localStorage.getItem('rh.layout'), meta: document.querySelector('meta[name="viewport"]').content, svh: 'svh' in document.documentElement.dataset }));
  // compare the keys (#keys and #case) only: the message band's text differs after a session
  const only = (s) => s.els.filter((e) => e.root !== 'glass');
  const d = diffEls(only(sh), only(sc));
  // the glass's own boxes too (their text differs after a session): the bands back where classic has them
  const boxes = (q) => q.els.filter((e) => ['glass', 'map', 'bands', 'msgband', 'statband', 'chips', 'tube'].includes(e.id)).map(({ text, t, ...r }) => r);
  if (JSON.stringify(boxes(sh)) !== JSON.stringify(boxes(sc))) d.push(`the glass's boxes: ${JSON.stringify(boxes(sc))} vs HEAD ${JSON.stringify(boxes(sh))}`);
  await Wk.p.screenshot({ path: `${SHOTS}/classic-${DPR}-switched-${w}x${h}.png` });
  await pick('twin');
  const ui2 = await Wk.p.evaluate(() => ({ ui: document.documentElement.dataset.ui, pref: localStorage.getItem('rh.layout'), twin: !!globalThis.__bt.overlay.twin, meta: document.querySelector('meta[name="viewport"]').content }));
  const bad = [...(ui0 === 'twin' ? [] : [`started as ${ui0}`]), ...(ui1.ui === 'classic' && /classic/.test(ui1.pref) ? [] : [`after switching: ${JSON.stringify(ui1)}`]),
    ...d.map((x) => `switched classic vs HEAD: ${x}`), ...(ui1.meta === sh.meta ? [] : [`switched meta "${ui1.meta}" vs HEAD "${sh.meta}"`]),
    ...(ui1.svh ? ['data-svh still set in classic'] : []),
    ...(ui2.ui === 'twin' && ui2.twin ? [] : [`switching back: ${JSON.stringify(ui2)}`]), ...(/viewport-fit=cover/.test(ui2.meta) ? [] : ['twin meta lacks viewport-fit=cover']),
    ...(Wk.p.errors.length ? [`console: ${Wk.p.errors.join(' | ')}`] : [])];
  fails += bad.length;
  console.log(`switch at ${w}x${h}: ${bad.length ? bad.join(' | ') : 'twin -> classic puts every key where HEAD has it, meta as HEAD; -> twin again'}`);
  res.push({ switch: [w, h], bad });
  await H.ctx.close(); await Wk.ctx.close();
}
// Twin banks' keys are where HEAD put them: each key's box is its hit cell
// now, and its keycap (.cap; REST's face that shows) is drawn exactly where
// HEAD drew the key, at every window, with the default settings (to 1/20 px:
// the cell's edge and the keycap's offset in it are each rounded to Chrome's
// 1/64 px layout units, 0.02 px apart on the 44.67 dp right columns).
// (Since HEAD has the layers stage, its key boxes are hit cells too, so this
// part compares the working tree's keycaps with HEAD's hit cells and fails
// at every key: NOTWIN=1 skips it.  snap.mjs and compare.mjs hold the twin
// keys, cells and keycaps alike, to HEAD's instead.)
for (const [w, h] of (SELF || process.env.NOTWIN) ? [] : WINS) {
  // PIN 2 empty on both sides: twin's PIN 2 is Fire now, HEAD's was empty
  // (twin's pins are its own, atkSlotsTwin, since the final review: an empty
  // classic PIN 2 takes Fire in twin)
  const H = await load(HEAD, w, h, { budgets: {}, atkSlots: [null, null] });
  const Wk = await load(WORK, w, h, { budgets: {}, atkSlots: [null, null], atkSlotsTwin: [null, null] });
  const head = await H.p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#keys [data-tw]')].map((e) => { const r = e.getBoundingClientRect(); return [e.dataset.tw, [r.x, r.y, r.width, r.height]]; })));
  const work = await Wk.p.evaluate(() => { const o = globalThis.__bt.overlay; return Object.fromEntries([...o.twin.keys.keys()].map((id) => { const r = o.twinCapRect(id); return [id, [r.x, r.y, r.width, r.height]]; })); });
  const d = [];
  for (const id of Object.keys(head)) {
    if (id === 'longrest') continue;
    const a = head[id], c = work[id];
    if (!c) { d.push(`${id} missing`); continue; }
    if (a.some((v, i) => Math.abs(v - c[i]) > 0.05)) d.push(`${id} keycap ${c.map((v) => Math.round(v * 100) / 100)} vs HEAD ${a.map((v) => Math.round(v * 100) / 100)}`);
  }
  // and drawn as HEAD drew them: the cells, halos and seams are invisible at
  // rest, so the two screens are the same to the pixel -- but in REST's cell,
  // whose slot clipped REST's drop shadow to the keycap and now lets it fall
  // into the cell, as every other key's does (device px)
  const fh = `${SHOTS}/twin-${DPR}-head-${w}x${h}.png`, fw = `${SHOTS}/twin-${DPR}-work-${w}x${h}.png`;
  await H.p.screenshot({ path: fh });
  await Wk.p.screenshot({ path: fw });
  // REST's cell and one device pixel round it (the shadow's blur tail reaches
  // the pixel its fractional edge falls in: 67.5 css px is 164.53 device px
  // at 2.4375), and the glass's four rounded corners with its 4 px ring, whose
  // anti-aliasing comes out a few levels apart from one screenshot to the next
  // in either page (seen at 443x939 and 640x360; none in clipped screenshots)
  // (REST's cell takes two device pixels round it: the slot's clipping edge
  // falls inside a device pixel, whose row below came out a few levels apart
  // at 2.4375 -- y 870 of 360x640, 1360 of 390x844, 2026-10-03)
  const rs = await Wk.p.evaluate((d) => {
    const box = (x0, y0, x1, y1, m = 1) => ({ x0: Math.floor(x0 * d) - m, y0: Math.floor(y0 * d) - m, x1: Math.ceil(x1 * d) + m, y1: Math.ceil(y1 * d) + m });
    const r = globalThis.__bt.overlay.twinEl('rest').getBoundingClientRect(), g = document.getElementById('glass').getBoundingClientRect(), c = 14;
    return [box(r.left, r.top, r.right, r.bottom, 2),
      box(g.left - 4, g.top - 4, g.left + c, g.top + c), box(g.right - c, g.top - 4, g.right + 4, g.top + c),
      box(g.left - 4, g.bottom - c, g.left + c, g.bottom + 4), box(g.right - c, g.bottom - c, g.right + 4, g.bottom + 4)];
  }, DPR);
  let px = await pxDiff(fh, fw, rs);
  // (three pairs of screenshots, as above)
  for (let again = 0; again < 2 && px.n > 20; again++) {
    await sleep(300);
    await H.p.screenshot({ path: fh });
    await Wk.p.screenshot({ path: fw });
    const q = await pxDiff(fh, fw, rs);
    if (q.n < px.n) px = q;
  }
  // (up to 20 pixels more, for the same anti-aliasing elsewhere)
  if (px.size) d.push(`screenshot size ${px.size}`); else if (px.n > 20) d.push(`${px.n} of ${px.of} pixels differ in ${px.box}`);
  if (px.n && px.n <= 20) console.log(`  (${px.n} pixels differ in ${px.box}: within the tolerance)`);
  const bad = [...d, ...(Wk.p.errors.length ? [`work console: ${Wk.p.errors.join(' | ')}`] : [])];
  fails += bad.length;
  console.log(`twin keycaps ${w}x${h} @${DPR}: ${Object.keys(head).length} keys; ${bad.length ? bad.slice(0, 6).join(' | ') : 'every keycap where HEAD drew its key, the screen the same to the pixel outside REST\'s cell and the glass\'s corners'}`);
  res.push({ twinKeys: [w, h], bad });
  await H.ctx.close(); await Wk.ctx.close();
}
writeJson(`classic-${DPR}.json`, res);
console.log(fails ? `FAILURES: ${fails}` : 'ALL PASS');
await b.close();
