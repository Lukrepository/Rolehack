const R = '/home/user/Rolehack/win/web';
const { layout } = await import(`${R}/layout.js`);
for (const [W, H] of [[1366, 740], [1342, 740], [1390, 740], [1366, 716], [1366, 764], [1342, 716], [1390, 716], [1342, 764], [1390, 764], [1366, 699], [1342, 699], [1390, 699], [1366, 675], [1366, 723]]) {
  const r = layout(W, H, 'touch', {});
  console.log(`${W}x${H}: tier ${r.info.tier} cell ${r.info.DC.kind}${r.info.DC.whole ? ' whole' : ''} T=${r.info.T} map ${r.info.G.kind} fill ${r.info.fill.cols.toFixed(1)}x${r.info.fill.rows.toFixed(1)}`);
}
