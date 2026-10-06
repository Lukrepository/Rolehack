const R = '/home/user/Rolehack/win/web';
const { layout } = await import(`${R}/layout.js`);
const { withClasses, classesOf } = await import(`${R}/viewer.js`);
const span = (a, b, s) => { const o = []; for (let v = a; s > 0 ? v <= b : v >= b; v += s) o.push(v); return o; };
for (const mode of ['all', 'tiers', 'glass', 'cellGlass']) {
  let classes = null, bad = [];
  for (const H of [...span(320, 1000, 4), ...span(996, 320, -4)]) {
    const W = 600;
    const c = classes ? { ...classes } : null;
    if (c && mode === 'tiers') { c.glass = null; c.cellGlass = null; }
    if (c && mode === 'glass') { c.cellGlass = null; }
    if (c && mode === 'cellGlass') { c.glass = null; }
    const r = layout(W, H, 'touch', withClasses({}, c)), b = layout(W, H, 'touch', {});
    if (r.usable !== b.usable) bad.push(`${W}x${H} ${r.reason?.slice(-160)} | G ${r.info?.G?.kind} DC ${r.info?.DC?.kind} bareG ${b.info.G.kind} prev ${JSON.stringify(c?.glass)}`);
    classes = classesOf(r, classes);
  }
  console.log(mode, bad.length); for (const x of bad.slice(0, 3)) console.log('  ' + x);
}
