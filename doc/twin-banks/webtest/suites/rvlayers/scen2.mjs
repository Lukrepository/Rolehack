export async function worldItems({ p, t, cap, sleep, out }) {
  const world = await cap('world');
  await t.tap(world.x, world.y); await sleep(300);
  out(JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#drawer .grid .k')].map((k) => k.textContent))));
}
