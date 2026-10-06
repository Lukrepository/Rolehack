// The same page twice (and HEAD twice) at 443x939: is the glass corner's anti-aliasing stable run to run?
import { launch, newCtx, openPage, resume, sleep, WORK, HEAD } from './common.mjs';
import fs from 'node:fs';
const b = await launch();
for (const [name, origin] of [['work', WORK], ['work', WORK], ['head', HEAD], ['head', HEAD]]) {
  const ctx = await newCtx(b, { w: 443, h: 939, dpr: 1, touch: true, origin, screen: { width: 443, height: 939 } });
  const p = await openPage(ctx); await resume(p); await sleep(700);
  const i = fs.readdirSync('shots').filter((f) => f.startsWith(`self-${name}`)).length;
  fs.writeFileSync(`shots/self-${name}-${i}.png`, await p.screenshot());
  await ctx.close();
}
await b.close();
