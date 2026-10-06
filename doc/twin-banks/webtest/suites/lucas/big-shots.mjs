import * as K from '../layers/common.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/lucas';
const b = await K.launch();
for (const [w, h, touch, name] of [[1024, 768, true, 'tablet-landscape'], [768, 1024, true, 'tablet-portrait'], [1920, 1080, false, 'mouse-1920']]) {
  const ctx = await K.newCtx(b, { w, h, dpr: 1, touch });
  const p = await K.openPage(ctx);
  await K.resume(p);
  await K.sleep(1500);
  await p.screenshot({ path: `${OUT}/${name}-${w}x${h}.png` });
  console.log(name, w, h, 'errors:', p.errors.length, p.errors.slice(0, 2));
  await ctx.close();
}
await b.close();
