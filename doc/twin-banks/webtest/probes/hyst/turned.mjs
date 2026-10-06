// A rotation keeps nothing: each spec screen laid out with the classes its turned
// counterpart left must equal the bare layout.  And the page's budget flow on Lucas's phone.
const R = '/home/user/Rolehack/win/web';
const { layout } = await import(`${R}/layout.js`);
const { withClasses, classesOf, budgetedLayout } = await import(`${R}/viewer.js`);
const pairs = [[896, 443], [640, 360], [915, 412], [844, 390], [1024, 768], [1180, 820], [1366, 768], [1280, 800], [1920, 1080], [2560, 1440], [3440, 1440]];
let bad = 0;
for (const base of [{}, { header: 'stacked' }, { padKey: 52 }, { padKey: 46 }, { mapCell: 'rows' }]) {
  for (const [a, b] of pairs) for (const [W, H, W2, H2] of [[a, b, b, a], [b, a, a, b]]) {
    const prev = classesOf(layout(W2, H2, 'touch', base));
    const fed = layout(W, H, 'touch', withClasses(base, prev)), bare = layout(W, H, 'touch', base);
    if (JSON.stringify(fed.spec) !== JSON.stringify(bare.spec)) { bad++; console.log(`DIFF ${JSON.stringify(base)} ${W}x${H} after ${W2}x${H2}: fed ${fed.info.G.kind}/${fed.info.DC.kind} T ${fed.info.T} bare ${bare.info.G.kind}/${bare.info.DC.kind} T ${bare.info.T}`); }
  }
}
console.log(`turned: ${bad} differ`);
// Lucas's phone in a tab: portrait first (guessed), landscape, portrait, landscape -- fed vs bare
const scr = { w: 443, h: 939 }, ins = { l: 0, r: 0 };
for (const fed of [false, true]) {
  let entry = {}, classes = null; const out = [];
  for (const [W, H] of [[443, 859], [896, 363], [443, 859], [896, 363], [443, 859]]) {
    const o = budgetedLayout(W, H, 'touch', fed ? withClasses({}, classes) : {}, scr, ins, entry);
    if (o.learn) entry = o.learn;
    classes = classesOf(o.r, classes);
    out.push(`${W}x${H} ${o.used} T=${o.r.info.T.toFixed(2)} ${o.r.info.G.kind} ${o.r.info.fill.cols.toFixed(1)}x${o.r.info.fill.rows.toFixed(1)}`);
  }
  console.log(fed ? 'FED ' : 'BARE', out.join(' | '));
}
