import { layout as W } from './work-layout.mjs';
import { layout as B } from './base-layout.mjs';
const base = { padKey: 58, insets: { l: 0, r: 0, t: 0, b: 0 }, mapCell: 'columns', msgRowH: 20, statusH: 40 };
for (const [name, L, cell] of [['work', W, true], ['8e3ebda', B, false]]) {
  for (const dir of ['up', 'down']) {
    let prev = null, prevCell = null, Ts = [];
    const hs = dir === 'up' ? Array.from({ length: 90 }, (_, i) => 422 + 2 * i) : Array.from({ length: 90 }, (_, i) => 598 - 2 * i);
    for (const h of hs) {
      const r = L(1000, h, 'touch', { ...base, prevTier: prev, prevCellTier: prevCell });
      if (!r.usable) { Ts.push(`${h}:x`); continue; }
      prev = r.info.tier; prevCell = r.info.DC && r.info.DC.tier;
      Ts.push(`${h}:${r.info.T}${r.info.tier[0]}${r.info.G.kind[0]}`);
    }
    // collapse runs
    const out = []; let last = null; for (const t of Ts) { const v = t.split(':')[1]; if (v !== last) out.push(t); last = v; }
    console.log(name, dir, out.join(' '));
  }
}
