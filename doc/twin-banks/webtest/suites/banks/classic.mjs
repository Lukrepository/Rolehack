// Classic unchanged: HEAD's page (8767, the committed code) against the
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
  : [[896, 443], [443, 939], [640, 360], [360, 640], [915, 412], [412, 915], [844, 390], [390, 844], [896, 363], [443, 859]];
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
    return { els: out, meta, rc, app: { w: app.width, h: app.height }, attrs: Object.fromEntries(Object.entries(document.documentElement.dataset)) };
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
async function pxDiff(pa, pb) {
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  const A = fs.readFileSync(pa).toString('base64'), B = fs.readFileSync(pb).toString('base64');
  const r = await p.evaluate(async ({ A, B }) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = `data:image/png;base64,${s}`; });
    const [a, b] = await Promise.all([load(A), load(B)]);
    if (a.width !== b.width || a.height !== b.height) return { size: `${a.width}x${a.height} vs ${b.width}x${b.height}` };
    const c = new OffscreenCanvas(a.width, a.height), x = c.getContext('2d');
    x.drawImage(a, 0, 0); const da = x.getImageData(0, 0, a.width, a.height).data;
    x.clearRect(0, 0, a.width, a.height); x.drawImage(b, 0, 0); const db = x.getImageData(0, 0, a.width, a.height).data;
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < da.length; i += 4) {
      if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) {
        n++; const px = (i / 4) % a.width, py = Math.floor(i / 4 / a.width);
        x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
      }
    }
    return { n, of: a.width * a.height, box: n ? [x0, y0, x1, y1] : null };
  }, { A, B });
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

// HEAD in classic: HEAD opens twin by default since the twin banks went on the page (63ffc2f)
const HEADPREFS = { layout: 'classic' };
const res = [];
let fails = 0;
for (const [w, h] of WINS) {
  const H = await load(HEAD, w, h, HEADPREFS);
  const Wk = SELF ? await load(HEAD, w, h, HEADPREFS) : await load(WORK, w, h, { layout: 'classic' });
  const sh = await snap(H.p), sw = await snap(Wk.p);
  const fh = `${SHOTS}/classic-${DPR}-head-${w}x${h}.png`, fw = `${SHOTS}/classic-${DPR}-work-${w}x${h}.png`;
  await H.p.screenshot({ path: fh });
  await Wk.p.screenshot({ path: fw });
  const d = diffEls(sh.els, sw.els);
  const px = await pxDiff(fh, fw);
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
  const H = await load(HEAD, w, h, HEADPREFS);
  const sh = await snap(H.p);
  const Wk = await load(WORK, w, h, { budgets: {} });
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
  const ui1 = await Wk.p.evaluate(() => ({ ui: document.documentElement.dataset.ui, pref: localStorage.getItem('rh.layout'), meta: document.querySelector('meta[name="viewport"]').content, svh: 'svh' in document.documentElement.dataset }));
  // compare the keys (#keys and #case) only: the message band's text differs after a session
  const only = (s) => s.els.filter((e) => e.root !== 'glass');
  const d = diffEls(only(sh), only(sc));
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
writeJson(`classic-${DPR}.json`, res);
console.log(fails ? `FAILURES: ${fails}` : 'ALL PASS');
await b.close();
