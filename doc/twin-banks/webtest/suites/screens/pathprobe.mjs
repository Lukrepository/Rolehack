import { expected } from './lib.mjs';
const paths = { w900: [], h1000: [], w700: [], h800: [] };
for (let W = 700; W >= 540; W -= 4) paths.w900.push([W, 900]);
for (let H = 600; H >= 420; H -= 4) paths.h1000.push([1000, H]);
for (const [k, pts] of Object.entries(paths)) {
  let prev = null, out = [];
  for (const [W, H] of pts) { const r = expected(W, H, { prev }); out.push(`${W}x${H}:${r.usable ? r.info.tier[0] : 'U'}${r.usable ? '/' + (r.info.DC?.tier?.[0] || '?') : ''}`); if (r.usable) prev = { tier: r.info.tier, cellTier: r.info.DC?.tier }; }
  console.log(k, out.join(' '));
}
