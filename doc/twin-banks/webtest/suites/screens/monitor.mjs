// A monitor's window dragged wider across the width where the tablet tier's
// cell cap rises from 24 to 48 dp (layout.js tabletCap, new in this stage):
// the drawn cell per 2 px step, and screenshots either side.
import { launch, newCtx, openPage, resume, sleep, Checks, SHOTS, writeJson } from './common.mjs';
import { readPage } from './lib.mjs';
import fs from 'node:fs';
const dpr = Number(process.argv[2] || 1);
const b = await launch();
const all = [];
for (const [W0, W1, H] of [[2396, 2420, 1080], [2830, 2850, 900]]) {
  const C = new Checks(`monitor-${H}@${dpr}`);
  const ctx = await newCtx(b, { w: W0, h: H, dpr, touch: false, screen: { width: 3840, height: 2160 } });
  const p = await openPage(ctx);
  const cdp = await ctx.newCDPSession(p);
  const resizeTo = (w, h) => cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dpr, mobile: false, screenWidth: 3840, screenHeight: 2160 });
  const shot = async (path) => { const r = await cdp.send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path, Buffer.from(r.data, 'base64')); };
  await resizeTo(W0, H);
  await resume(p);
  await sleep(300);
  await shot(`${SHOTS}/monitor-${W0}x${H}-start@${dpr}.png`);
  const seq = [];
  for (let w = W0; w <= W1; w += 2) {
    await resizeTo(w, H); await sleep(150);
    const s = await readPage(p);
    seq.push({ w, T: s.info.T, drawn: s.view.T, tier: s.tier });
  }
  const jumps = seq.filter((x, i) => i && Math.abs(x.T - seq[i - 1].T) / seq[i - 1].T > 0.15).map((x) => `${x.w - 2}->${x.w}: ${seq[seq.indexOf(x) - 1].T} -> ${x.T} dp`);
  C.ok(`dragging ${W0}..${W1} x ${H}: no cell jump over 15% between windows 2 px apart`, !jumps.length, { jumps, seq: seq.map((x) => `${x.w}:${x.T}`).join(' ') });
  await shot(`${SHOTS}/monitor-${W1}x${H}-end@${dpr}.png`);
  C.ok('no console errors', !p.errors.length, p.errors.slice(0, 4));
  all.push(...C.list);
  await ctx.close();
}
writeJson(`monitor-${dpr}.json`, all);
console.log(`\nmonitor dpr ${dpr}: ${all.filter((c) => c.pass).length} pass, ${all.filter((c) => !c.pass).length} fail`);
await b.close();
