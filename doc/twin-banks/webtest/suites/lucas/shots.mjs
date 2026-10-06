import * as K from '../banks/common.mjs';
const b = await K.launch();
for (const [w, h] of [[896, 443], [443, 939]]) {
  const ctx = await K.newCtx(b, { w, h, dpr: 2.4375 });
  const p = await K.openPage(ctx);
  await K.resume(p);
  await K.sleep(1500);
  await p.screenshot({ path: `/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/lucas/twin-${w}x${h}.png` });
  console.log(w, h, 'errors:', p.errors.length, p.errors.slice(0, 3));
  await ctx.close();
}
await b.close();
