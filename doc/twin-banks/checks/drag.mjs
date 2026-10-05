// The glass's band (layout.js section 7; Lucas, 2026-10-04), checked the way the page uses it:
// windows dragged a few dp at a time, each laid out with the tiers and glasses the last one
// left (viewer.js withClasses and classesOf, as overlay.js rebuildTwin does), in five variants.
//
//   node doc/twin-banks/checks/drag.mjs
//
// Wherever the band keeps a glass the ranking alone would not pick, the result must pass the
// design's own checks (lib.mjs screenIssues and drawable; an issue the plain layout of the
// same window also has is not the band's), its keys must be the plain layout's, and the
// window must not lose twin banks the plain layout has.  The band may keep twin banks where
// the ranking's own pick is unusable (a usable glass the ranking ranks lower); those are
// counted, not flagged.  Exit code 1 on any issue.
import { layout, evaluate, screenIssues, drawable } from './lib.mjs';
const { withClasses, classesOf } = await import('../../../win/web/viewer.js');

const variants = [{}, { header: 'stacked' }, { padKey: 52 }, { padKey: 46 }, { mapCell: 'rows' }];
const span = (a, b, s) => { const o = []; for (let v = a; s > 0 ? v <= b : v >= b; v += s) o.push(v); return o; };
const drags = [];
for (const W of span(480, 2000, 40)) drags.push([...span(320, 1000, 4), ...span(996, 320, -4)].map((H) => [W, H]));
for (const H of span(320, 1000, 40)) drags.push([...span(480, 2000, 4), ...span(1996, 480, -4)].map((W) => [W, H]));
const keys = (r) => JSON.stringify(r.spec.controls.map((c) => [c.id, c.x, c.y, c.w, c.h]));
const issuesOf = (r, key, pad) => {
  const res = evaluate({ name: 'one', screens: { [key]: r.spec }, retired: {} });
  const is = [...res.validation.errors.map((e) => `spec error ${e}`), ...screenIssues(r.spec, res.screens[key], { pad })];
  const dr = drawable(r.spec, r.info && r.info.fill);
  if (dr.length) is.push(`not drawable: ${dr.slice(0, 3).join(', ')}`);
  return is;
};
const shape = (s) => s.replace(/[0-9.]+/g, '#');

let n = 0, kept = 0, rescued = 0;
const issues = [];
const t0 = Date.now();
for (const v of variants) {
  const tag = JSON.stringify(v), pad = v.padKey ?? 58;
  for (const d of drags) {
    let classes = null;
    for (const [W, H] of d) {
      const fed = layout(W, H, 'touch', withClasses(v, classes));
      const bare = layout(W, H, 'touch', v);
      n++;
      classes = classesOf(fed, classes);
      if (!fed.spec) { issues.push(`${tag} ${W}x${H}: no spec (${fed.reason})`); continue; }
      if (bare.usable && !fed.usable) { issues.push(`${tag} ${W}x${H}: unusable, where the plain layout is usable`); continue; }
      if (!fed.usable || JSON.stringify(fed.spec) === JSON.stringify(bare.spec)) continue;
      kept++;
      if (!bare.usable) rescued++;
      else if (keys(fed) !== keys(bare)) issues.push(`${tag} ${W}x${H}: a key moved`);
      const key = `${W}x${H}`;
      const plain = bare.usable ? new Set(issuesOf(bare, key, pad).map(shape)) : new Set();
      const own = issuesOf(fed, key, pad).filter((s) => !plain.has(shape(s)));
      if (own.length) issues.push(`${tag} ${key}: ${own.join(' | ')}`);
    }
  }
}
console.log(`${n} dragged layouts in ${((Date.now() - t0) / 1000).toFixed(0)} s: the band kept another glass at ${kept} (${rescued} of them where the ranking's own pick is unusable); ${issues.length} issues`);
for (const i of issues.slice(0, 40)) console.log('  ' + i);
process.exit(issues.length ? 1 : 0);
