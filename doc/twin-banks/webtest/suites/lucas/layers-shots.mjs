import * as K from '../layers/common.mjs';
import { capOf, state } from '../layers/kit.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/lucas';
const b = await K.launch();
for (const [w, h, key, hold, name] of [[896, 443, 'combat', 700, 'combat'], [443, 939, 'rest', 800, 'count']]) {
  const ctx = await K.newCtx(b, { w, h, dpr: 2.4375 });
  const p = await K.openPage(ctx);
  await K.resume(p);
  await K.sleep(1200);
  const t = await K.touch(ctx, p);
  const c = await capOf(p, key);
  await t.down([[c.cx, c.cy]]);
  await K.sleep(hold);
  if (name === 'combat') await t.shot(`${OUT}/layer-${w}x${h}-${name}.png`);
  await t.up();
  await K.sleep(400);
  if (name === 'count') await t.shot(`${OUT}/layer-${w}x${h}-${name}.png`);
  const s = await state(p);
  console.log(w, h, name, 'layer:', JSON.stringify(s.layer), 'pill:', s.pill, 'errors:', p.errors.length);
  await ctx.close();
}
await b.close();
