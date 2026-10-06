import { launch, newCtx, openPage, resume, sleep } from './common.mjs';
const b = await launch();
const ctx = await newCtx(b, { w: 896, h: 443, prefs: { budgets: {}, msgFont: 'screen' } });
const p = await openPage(ctx); await resume(p);
const probe = () => p.evaluate(() => {
  const mb = document.getElementById('msgband'), cs = getComputedStyle(mb), R = globalThis.__bt;
  const cx = document.createElement('canvas').getContext('2d'); cx.font = `${cs.fontSize} ${cs.fontFamily}`;
  return { m: R.bandMetrics(), rows: R.rowsOf(['The kitten picks up a gnome lord corpse.']), fresh: cx.measureText('The kitten picks up a gnome lord corpse.').width, fs: cs.fontSize, ff: cs.fontFamily, vt: [...document.fonts].find((f) => f.family === 'VT323').status };
});
console.log(JSON.stringify(await probe()));
await sleep(400);
console.log(JSON.stringify(await probe()));
await p.evaluate(() => globalThis.__bt.msg.begin());
await p.evaluate(() => globalThis.__bt.msg.put('You hit the newt.'));
console.log(JSON.stringify(await probe()));
await p.evaluate(() => globalThis.__bt.msg.end());
await b.close();
