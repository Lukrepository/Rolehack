// Windows dragged a few dp at a time, each laid out with the classes the last one left (the
// page's loop), in five variants.  Wherever the band keeps a glass the plain rule would not
// pick, the result goes through the design's own checks (screenIssues, drawable), and its
// keys must be the plain layout's.  Prints the windows the band changed and every issue.
process.env.RH_LAYOUT = process.env.RH_LAYOUT || '/home/user/Rolehack/win/web/layout.js';
const { layout, evaluate, screenIssues, drawable } = await import('/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/design/v2/checks/lib.mjs');
const { withClasses, classesOf } = await import('/home/user/Rolehack/win/web/viewer.js');
const variants = [{}, { header: 'stacked' }, { padKey: 52 }, { padKey: 46 }, { mapCell: 'rows' }];
const span = (a, b, s) => { const o = []; for (let v = a; s > 0 ? v <= b : v >= b; v += s) o.push(v); return o; };
const drags = [];
for (const W of span(480, 2000, 40)) drags.push([...span(320, 1000, 4), ...span(996, 320, -4)].map((H) => [W, H]));
for (const H of span(320, 1000, 40)) drags.push([...span(480, 2000, 4), ...span(1996, 480, -4)].map((W) => [W, H]));
const keys = (r) => JSON.stringify(r.spec.controls.map((c) => [c.id, c.x, c.y, c.w, c.h]));
let n = 0, kept = 0, issues = [], keyMoves = 0, unusableFed = 0;
const t0 = Date.now();
for (const v of variants) for (const d of drags) {
  let classes = null;
  for (const [W, H] of d) {
    const fed = layout(W, H, 'touch', withClasses(v, classes));
    const bare = layout(W, H, 'touch', v);
    n++;
    if (!fed.spec) { issues.push(`${JSON.stringify(v)} ${W}x${H}: no spec`); continue; }
    if (fed.usable !== bare.usable) { unusableFed++; issues.push(`${JSON.stringify(v)} ${W}x${H}: usable ${fed.usable} vs bare ${bare.usable}`); }
    if (fed.usable && JSON.stringify(fed.spec) !== JSON.stringify(bare.spec)) {
      kept++;
      if (keys(fed) !== keys(bare)) { keyMoves++; issues.push(`${JSON.stringify(v)} ${W}x${H}: keys differ from the plain layout`); }
      const key = `${W}x${H}`;
      const res = evaluate({ name: 'one', screens: { [key]: fed.spec }, retired: {} });
      const is = [...res.validation.errors.map((e) => `spec error ${e}`), ...screenIssues(fed.spec, res.screens[key], { pad: v.padKey ?? 58 })];
      const dr = drawable(fed.spec, fed.info && fed.info.fill);
      if (dr.length) is.push(`not drawable: ${dr.slice(0, 3).join(', ')}`);
      // the issues the plain layout has at this window are not the band's
      const resB = evaluate({ name: 'one', screens: { [key]: bare.spec }, retired: {} });
      const isB = new Set(screenIssues(bare.spec, resB.screens[key], { pad: v.padKey ?? 58 }).map((s) => s.replace(/[0-9.]+/g, '#')));
      const own = is.filter((s) => !isB.has(s.replace(/[0-9.]+/g, '#')));
      if (own.length) issues.push(`${JSON.stringify(v)} ${key}: ${own.join(' | ')}`);
    }
    classes = classesOf(fed, classes);
  }
}
console.log(`${n} dragged layouts in ${((Date.now() - t0) / 1000).toFixed(0)} s; the band kept another glass at ${kept}; keys moved ${keyMoves}; usable differs ${unusableFed}; issues ${issues.length}`);
for (const i of issues.slice(0, 40)) console.log('  ' + i);
process.exit(issues.length ? 1 : 0);
