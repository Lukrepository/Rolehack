// Drag a window a pixel at a time across the glass ranking's steps and back,
// feeding back what the page keeps (viewer.js), and print where the device
// cell's glass and size change.
const R = process.env.REPO || '/home/user/Rolehack/win/web';
const { layout } = await import(`${R}/layout.js`);
const { withClasses, classesOf } = await import(`${R}/viewer.js`);
const BASE = {};
function drag(sizes) {
  let classes = null, last = null; const out = [];
  for (const [W, H] of sizes) {
    const r = layout(W, H, 'touch', withClasses(BASE, classes));
    classes = classesOf(r, classes);
    const d = r.info && r.info.DC;
    const s = d ? `${d.tier} ${d.kind}${d.over ? '+over' : ''}${d.whole ? ' whole' : ''} T=${d.T.toFixed(2)} | glass ${r.info.G.kind} fill ${r.info.fill.cols.toFixed(1)}x${r.info.fill.rows.toFixed(1)}` : 'none';
    if (s !== last) out.push(`${W}x${H}: ${s}`);
    last = s;
  }
  return out;
}
const span = (a, b) => { const s = []; const d = a < b ? 1 : -1; for (let v = a; v !== b + d; v += d) s.push(v); return s; };
const cases = {
  'H 1000 wide 560..660..560': [...span(560, 660), ...span(659, 560)].map((h) => [1000, h]),
  'H 1000 wide 520..420..520': [...span(520, 420), ...span(421, 520)].map((h) => [1000, h]),
  'H 1280 wide 600..680..600': [...span(600, 680), ...span(679, 600)].map((h) => [1280, h]),
  'H 1366 wide 620..700..620': [...span(620, 700), ...span(699, 620)].map((h) => [1366, h]),
  'W 800 tall 930..1010..930': [...span(930, 1010), ...span(1009, 930)].map((w) => [w, 800]),
};
for (const [k, v] of Object.entries(cases)) { console.log(`== ${k}`); for (const l of drag(v)) console.log('  ' + l); }
