import { launch, newCtx, openPage, resume, sleep } from './common.mjs';
import { layout } from '/home/user/Rolehack/win/web/layout.js';
const W = [['1024x768', true], ['768x1024', true], ['1180x820', true], ['1366x768', true], ['1280x800', false], ['1920x1080', false], ['2560x1440', false], ['3440x1440', false], ['896x443', true], ['443x939', true]];
const dpr = Number(process.argv[2] || 1);
const b = await launch();
let bad = 0;
for (const [s, touch] of W) {
  const [w, h] = s.split('x').map(Number);
  const ctx = await newCtx(b, { w, h, dpr, touch });
  const p = await openPage(ctx);
  await resume(p);
  await sleep(400);
  const d = await p.evaluate(() => {
    const o = globalThis.__bt.overlay, S = o.twin.spec;
    const keys = S.controls.filter((c) => c.id !== 'longrest').map((c) => { const e = o.twin.keys.get(c.id); const el = e && (e.el || e); const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null; const cap = o.twinCapRect(c.id); return { id: c.id, spec: [c.x, c.y, c.w, c.h], dom: r ? [r.x, r.y, r.width, r.height] : null, cap: [cap.x, cap.y, cap.width, cap.height] }; });
    const panels = [...document.querySelectorAll('.rhpanel')].filter((e) => e.style.display !== 'none').map((e) => { const r = e.getBoundingClientRect(); return { kind: e.dataset.kind, r: [r.x, r.y, r.width, r.height] }; });
    const cv = document.getElementById('map').getBoundingClientRect();
    const bands = ['msgband', 'statband'].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
    return { keys, panels, map: [cv.x, cv.y, cv.width, cv.height], spec_map: S.mapArea, chrome: S.chrome.map((c) => ({ name: c.name, r: [c.x, c.y, c.w, c.h] })), bands, settings: o.twin.settings, W: o.twin.W, H: o.twin.H, tier: o.twin.info.tier, T: o.twin.info.T, docw: document.documentElement.scrollWidth, doch: document.documentElement.scrollHeight };
  });
  // independent: layout() from node with the page's own settings
  const r = layout(d.W, d.H, 'touch', d.settings);
  const issues = [];
  for (const k of d.keys) {
    const c = r.spec.controls.find((q) => q.id === k.id);
    const diff = Math.max(...k.cap.map((v, i) => 0)); // placeholder
    if (!c) { issues.push(`no ${k.id} in node layout`); continue; }
    // the keycap lies within the spec rect (hit cell >= cap)
    const [cx, cy, cw, ch] = k.cap;
    if (cx < c.x - 0.6 || cy < c.y - 0.6 || cx + cw > c.x + c.w + 0.6 || cy + ch > c.y + c.h + 0.6) issues.push(`${k.id} cap ${k.cap.map((v) => v.toFixed(1))} outside spec ${[c.x, c.y, c.w, c.h].map((v) => v.toFixed(1))}`);
    if (Math.abs(cw - c.w) > 1 || Math.abs(ch - c.h) > 1) issues.push(`${k.id} cap size ${cw.toFixed(1)}x${ch.toFixed(1)} vs spec ${c.w.toFixed(1)}x${c.h.toFixed(1)}`);
    if (cw < 43.9 || ch < 43.9) issues.push(`${k.id} under 44: ${cw}x${ch}`);
  }
  const ov = (a, b2, m = 0.5) => a[0] + m < b2[0] + b2[2] && b2[0] + m < a[0] + a[2] && a[1] + m < b2[1] + b2[3] && b2[1] + m < a[1] + a[3];
  for (const q of d.panels) {
    for (const k of d.keys) { const halo = [k.cap[0] - 12, k.cap[1] - 12, k.cap[2] + 24, k.cap[3] + 24]; if (ov(q.r, k.cap)) issues.push(`panel ${q.kind} over key ${k.id}`); else if (ov(q.r, halo, 1)) issues.push(`panel ${q.kind} within 12 of ${k.id}`); }
    if (ov(q.r, d.map)) issues.push(`panel ${q.kind} over map`);
    for (const bd of d.bands) if (bd[2] > 0 && ov(q.r, bd)) issues.push(`panel ${q.kind} over band`);
    const ch = r.spec.chrome.find((c) => c.name.includes(q.kind === 'log' ? 'message log' : 'inventory'));
    if (!ch) issues.push(`panel ${q.kind} not in node layout`);
    else if (Math.max(Math.abs(ch.x - q.r[0]), Math.abs(ch.y - q.r[1]), Math.abs(ch.w - q.r[2]), Math.abs(ch.h - q.r[3])) > 1.01) issues.push(`panel ${q.kind} ${q.r.map((v) => v.toFixed(1))} vs node ${[ch.x, ch.y, ch.w, ch.h].map((v) => v.toFixed(1))}`);
  }
  const want = r.spec.chrome.filter((c) => /^panel: (message log|inventory)/.test(c.name)).length;
  if (want !== d.panels.length) issues.push(`node layout has ${want} panels, page shows ${d.panels.length}`);
  if (d.docw > w + 0.5 || d.doch > h + 0.5) issues.push(`page scrolls ${d.docw}x${d.doch}`);
  if (p.errors.length) issues.push('console: ' + p.errors.join(' | '));
  bad += issues.length;
  console.log(`${s} dpr ${dpr} ${touch ? 'touch' : 'mouse'} tier ${d.tier} T ${d.T} panels ${d.panels.map((q) => q.kind + '@' + q.r.map(Math.round).join(',')).join(' ')} :: ${issues.length ? issues.slice(0, 8).join('; ') : 'OK'}`);
  await ctx.close();
}
console.log(bad ? `${bad} issues` : 'ALL OK');
await b.close();
