// Variants of layout.js tabletCap: voids at monitor windows, jumps along widths, portrait columns.
import fs from 'fs';
import { voidOf } from '../tablet/void-lib.mjs';
const src = fs.readFileSync('/home/user/Rolehack/win/web/layout.js', 'utf8');
const VARIANTS = {
  step: null,
  m1: 'return Math.min(Math.max(st.tabletCellMax, st.tabletWideCellMax), Math.max(st.tabletCellMax, (regionW - 2 * WIDE_STRIP) / (80 * a)));',
  m2: 'return Math.min(Math.max(st.tabletCellMax, st.tabletWideCellMax), Math.max(st.tabletCellMax, st.tabletCellMax + 2 * (regionW - 2 * WIDE_STRIP - 80 * a * st.tabletCellMax) / (80 * a)));',
  m3: 'return Math.min(Math.max(st.tabletCellMax, st.tabletWideCellMax), Math.max(st.tabletCellMax, st.tabletCellMax + 3 * (regionW - 2 * WIDE_STRIP - 80 * a * st.tabletCellMax) / (80 * a)));',
};
const mods = {};
for (const [k, body] of Object.entries(VARIANTS)) {
  let s = src;
  if (body) s = s.replace(/function tabletCap\(regionW, a, st\) \{\n.*\n\}/, `function tabletCap(regionW, a, st) {\n  ${body}\n}`);
  const f = `/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/tabfix/lay-${k}.mjs`;
  fs.writeFileSync(f, s);
  mods[k] = (await import(f)).layout;
}
const WINS = ['1920x1080','2400x1350','2440x1080','2560x1440','2560x1080','2752x1152','3440x1440','3440x1080','3840x1080','3840x1600','3840x2160','5120x1440','5120x2160','1440x2560','2160x3840','1080x1920'];
for (const w of WINS) {
  const [W, H] = w.split('x').map(Number);
  let line = w.padEnd(10);
  for (const [k, L] of Object.entries(mods)) {
    const r = L(W, H, 'touch', {});
    const v = voidOf(r.spec);
    line += ` | ${k} T${r.info.T} ${r.info.G.kind[0]} cols ${r.info.fill.cols.toFixed(1)} void ${(v.void * 100).toFixed(1)}%${r.spec.chrome.length}`;
  }
  console.log(line);
}
// jumps: along widths at several heights, 2 dp step
for (const [k, L] of Object.entries(mods)) {
  const jumps = [];
  for (const H of [700, 900, 1080, 1200, 1440, 1600, 2160]) {
    let prev = null;
    for (let W = 1200; W <= 5200; W += 2) {
      const T = L(W, H, 'touch', {}).info.T;
      if (prev && Math.abs(T - prev.T) / prev.T > 0.06) jumps.push(`${prev.W}->${W}x${H}: ${prev.T}->${T}`);
      prev = { W, T };
    }
  }
  console.log(k, jumps.length, jumps.slice(0, 20).join('; '));
}
