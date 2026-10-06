// Classic is unchanged at the stage's sizes: the setting "Layout: classic" on
// the working tree against git HEAD's page: the glass, the canvas, the bands,
// every key's rect, the pixels; no panel; perm_invent off, so an inventory
// change pops nothing up.
//   node classic.mjs <dpr>
import { launch, newCtx, openPage, resume, settle, sleep, Checks, SHOTS, writeJson, WORK, HEAD, r1 } from './common.mjs';
import fs from 'node:fs';

const dpr = Number(process.argv[2] || 1);
const WINS = [[1024, 768, 'touch'], [768, 1024, 'touch'], [1366, 768, 'touch'], [1920, 1080, 'mouse'], [3440, 1440, 'mouse'], [896, 443, 'touch'], [443, 939, 'touch']];
const b = await launch();
const cmp = await (await b.newContext()).newPage();
const all = [];
const geo = (p) => p.evaluate(() => {
  const rr = (e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 100) / 100); };
  const keys = [...document.querySelectorAll('#keys *')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => `${e.className}:${rr(e)}`);
  return { ui: document.documentElement.dataset.ui, tier: document.documentElement.dataset.tier || null, glass: rr(document.getElementById('glass')), map: rr(document.getElementById('map')),
    msg: rr(document.getElementById('msgband')), stat: rr(document.getElementById('statband')), keys,
    panels: [...document.querySelectorAll('.rhpanel')].filter((e) => e.style.display !== 'none' && e.getBoundingClientRect().width > 0).length,
    perm: globalThis.__ts.permInvent };
});
for (const [w, h, input] of WINS) {
  const tag = `${w}x${h}${input === 'mouse' ? '-mouse' : ''}@${dpr}`;
  const C = new Checks(`classic-${tag}`);
  const got = {};
  for (const [name, origin] of [['work', WORK], ['head', HEAD]]) {
    const ctx = await newCtx(b, { w, h, dpr, touch: input === 'touch', origin, prefs: { layout: 'classic' } });
    const p = await openPage(ctx);
    await resume(p);
    await sleep(700);
    const g = await geo(p);
    const png = await p.screenshot();
    fs.writeFileSync(`${SHOTS}/classic-${name}-${tag}.png`, png);
    let popped = null;
    if (name === 'work') {
      // an inventory change: drop and pick up; nothing may pop up on its own
      await p.keyboard.press('d'); await sleep(400); await p.keyboard.press('d'); await settle(p);
      popped = await p.evaluate(() => ({ modal: globalThis.__ts.modalOpen, title: document.getElementById('modal-title').textContent }));
      await p.keyboard.press(','); await sleep(500);
      if (await p.evaluate(() => globalThis.__ts.modalOpen)) { await p.keyboard.press('Enter'); await sleep(300); }
      await settle(p);
    }
    got[name] = { g, png: `data:image/png;base64,${png.toString('base64')}`, errors: p.errors, popped };
    await ctx.close();
  }
  const A = got.work.g, Z = got.head.g;
  C.ok('classic drawn (no tier)', A.ui === 'classic' && !A.tier, [A.ui, A.tier]);
  C.ok('glass, canvas, bands identical to HEAD', JSON.stringify([A.glass, A.map, A.msg, A.stat]) === JSON.stringify([Z.glass, Z.map, Z.msg, Z.stat]), { work: [A.glass, A.map], head: [Z.glass, Z.map] });
  const kd = A.keys.filter((k, i) => k !== Z.keys[i]);
  C.ok(`every key element rect identical to HEAD (${A.keys.length})`, A.keys.length === Z.keys.length && !kd.length, kd.slice(0, 4));
  C.ok('no panel in classic', A.panels === 0, A.panels);
  C.ok('perm_invent off in classic', A.perm === false, A.perm);
  C.ok('an inventory change pops nothing up', got.work.popped && !got.work.popped.modal, got.work.popped);
  const pd = await cmp.evaluate(async ({ a, z }) => {
    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const [A, Z] = await Promise.all([load(a), load(z)]);
    const c = document.createElement('canvas'); c.width = A.width; c.height = A.height; const x = c.getContext('2d');
    x.drawImage(A, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data; x.drawImage(Z, 0, 0); const dz = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - dz[i]) > 8 || Math.abs(da[i + 1] - dz[i + 1]) > 8 || Math.abs(da[i + 2] - dz[i + 2]) > 8) n++;
    return n;
  }, { a: got.work.png, z: got.head.png });
  C.ok('pixels identical to HEAD', pd === 0, pd);
  C.ok('no console errors', !got.work.errors.length, got.work.errors.slice(0, 4));
  all.push(...C.list);
}
writeJson(`classic-${dpr}.json`, all);
console.log(`\nclassic dpr ${dpr}: ${all.filter((c) => c.pass).length} pass, ${all.filter((c) => !c.pass).length} fail`);
for (const f of all.filter((c) => !c.pass)) console.log(`  FAIL ${f.tag} ${f.name}`);
await b.close();
