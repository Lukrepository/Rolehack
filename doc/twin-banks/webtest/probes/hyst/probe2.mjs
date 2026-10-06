// Like probe.mjs, printing only where the device cell's glass or the map's glass changes, and cell jumps.
const R = process.env.REPO || '/home/user/Rolehack/win/web';
const { layout } = await import(`${R}/layout.js?${Date.now()}`);
const { withClasses, classesOf } = await import(`${R}/viewer.js?${Date.now()}`);
function drag(sizes, feed = true) {
  let classes = null, last = null, lastT = null; const out = [];
  for (const [W, H] of sizes) {
    const r = layout(W, H, 'touch', feed ? withClasses({}, classes) : {});
    classes = classesOf(r, classes);
    const d = r.info.DC, G = r.info.G;
    const s = `cell ${d.tier} ${d.kind}${d.over ? '+over' : ''}${d.whole ? ' whole' : ''} | map ${G.kind}${G.over ? '+over' : ''}`;
    const jump = lastT != null && Math.abs(d.T - lastT) > 0.6;
    if (s !== last || jump) out.push(`${W}x${H}: ${s} T=${d.T.toFixed(2)} fill ${r.info.fill.cols.toFixed(1)}x${r.info.fill.rows.toFixed(1)}${r.usable ? '' : ' UNUSABLE'}`);
    last = s; lastT = d.T;
  }
  return out;
}
const span = (a, b) => { const s = []; const d = a < b ? 1 : -1; for (let v = a; v !== b + d; v += d) s.push(v); return s; };
const there = (a, b) => [...span(a, b), ...span(b - Math.sign(b - a), a)];
const cases = {
  'H 1000 wide 560..700..560': there(560, 700).map((h) => [1000, h]),
  'H 1280 wide 600..680..600': there(600, 680).map((h) => [1280, h]),
  'H 1366 wide 620..740..620': there(620, 740).map((h) => [1366, h]),
  'W 800 tall 930..1010..930': there(930, 1010).map((w) => [w, 800]),
  'W 900 tall 930..1010..930': there(930, 1010).map((w) => [w, 900]),
  'wobble 1000 x 598/602': [598, 602, 598, 602, 598, 602].map((h) => [1000, h]),
};
for (const [k, v] of Object.entries(cases)) { console.log(`== ${k}`); for (const l of drag(v, process.env.BARE !== '1')) console.log('  ' + l); }
