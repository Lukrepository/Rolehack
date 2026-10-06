import { expected } from './lib.mjs';
const run = (pts) => { let prev = null, out = [], last = ''; for (const [W, H] of pts) { const r = expected(W, H, { screen: { w: 2560, h: 1440 }, prev });
  const k = `${r.info.tier[0]} T${r.info.T.toFixed(2)} ${r.info.G.kind}${r.info.fill.whole ? ' whole' : ''} DC:${r.info.DC.tier[0]}/${r.info.DC.T.toFixed(2)}`;
  if (k !== last) { out.push(`${W}x${H}: ${k}`); last = k; } prev = { tier: r.info.tier, cellTier: r.info.DC.tier }; } return out; };
const down = [], up = []; for (let h = 600; h >= 420; h -= 2) down.push([1000, h]); for (let h = 420; h <= 600; h += 2) up.push([1000, h]);
console.log('shorter\n ' + run(down).join('\n '));
console.log('taller\n ' + run(up).join('\n '));
const d2 = []; for (let h = 700; h >= 420; h -= 2) d2.push([1366, h]);
console.log('1366 shorter\n ' + run(d2).join('\n '));
