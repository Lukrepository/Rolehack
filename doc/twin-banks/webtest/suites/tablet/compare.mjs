// Before and after this stage (snap.mjs on HEAD's page files and on the
// working tree): at every window that was a phone or a tablet with touch, the
// same keys (hit cells and keycaps), bands, map canvas and glass, to 0.01 px,
// and the same tier; what is new is the panels.  The mouse windows were the
// desk at HEAD and are the tablet tier now, so only their tier is listed.
//   node compare.mjs [dpr]  -> compare-<dpr>.json
import fs from 'node:fs';
import { DIR, writeJson } from './common.mjs';

const dpr = process.argv[2] || '1';
const head = JSON.parse(fs.readFileSync(`${DIR}/snap-head-${dpr}.json`, 'utf8'));
const work = JSON.parse(fs.readFileSync(`${DIR}/snap-work-${dpr}.json`, 'utf8'));
const same = (a, b) => (a === null || b === null ? a === b : a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= 0.01));
const out = {};
let bad = 0;
for (const tag of Object.keys(head)) {
  const H = head[tag], W = work[tag];
  if (!W) { out[tag] = 'missing in the working tree'; bad++; continue; }
  if (/mouse/.test(tag)) {
    out[tag] = `HEAD ${H.ui} ${H.tier} (${H.pointer}); now ${W.ui} ${W.tier} (${W.pointer}), ${W.panels.length} panels`;
    if (W.tier !== 'tablet' || W.pointer !== 'touch') bad++;
    continue;
  }
  const diffs = [];
  if (H.ui !== W.ui || H.tier !== W.tier) diffs.push(`ui/tier ${H.ui} ${H.tier} -> ${W.ui} ${W.tier}`);
  for (const id of new Set([...Object.keys(H.keys || {}), ...Object.keys(W.keys || {})])) {
    const a = H.keys[id], b = W.keys[id];
    if (!a || !b) { diffs.push(`${id} ${a ? 'gone' : 'new'}`); continue; }
    if (!same(a.cell, b.cell)) diffs.push(`${id} cell ${a.cell} -> ${b.cell}`);
    if (!same(a.cap, b.cap)) diffs.push(`${id} cap ${a.cap} -> ${b.cap}`);
  }
  for (const k of ['msgband', 'statband', 'map', 'glass']) if (!same(H[k], W[k])) diffs.push(`${k} ${H[k]} -> ${W[k]}`);
  if (JSON.stringify(H.spec.controls) !== JSON.stringify(W.spec.controls)) diffs.push('layout controls differ');
  if (JSON.stringify(H.spec.bands) !== JSON.stringify(W.spec.bands) || JSON.stringify(H.spec.mapArea) !== JSON.stringify(W.spec.mapArea)) diffs.push('layout bands or map differ');
  const errs = [...(H.errors || []), ...(W.errors || [])];
  bad += diffs.length + (W.errors || []).length;
  out[tag] = { tier: W.tier, keys: Object.keys(W.keys).length, same: !diffs.length, diffs: diffs.slice(0, 8), panelsBefore: H.panels.length, panelsNow: W.panels.map((p) => p.kind), errors: errs };
  console.log(`${tag}: ${W.tier}, ${Object.keys(W.keys).length} keys, ${diffs.length ? `DIFFERS: ${diffs.slice(0, 4).join('; ')}` : 'keys, bands, map and glass unchanged'}; panels now: ${W.panels.map((p) => p.kind).join(', ') || 'none'}${(W.errors || []).length ? `; ERRORS ${W.errors}` : ''}`);
}
for (const [tag, v] of Object.entries(out)) if (typeof v === 'string') console.log(`${tag}: ${v}`);
writeJson(`compare-${dpr}.json`, out);
console.log(bad ? `DIFFERENCES: ${bad}` : 'ALL SAME (the mouse windows now the tablet tier)');
