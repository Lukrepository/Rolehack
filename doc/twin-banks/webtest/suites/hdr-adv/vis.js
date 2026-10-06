const vis = () => p.evaluate(() => { const B = globalThis.__bt, v = B.view, c = B.cursor, cv = document.getElementById('map'); const x = v.left + c.x * v.T, y = v.top + c.y * v.T; const W = cv.width / devicePixelRatio, H = cv.height / devicePixelRatio; return { c: [c.x, c.y], x: +x.toFixed(1), y: +y.toFixed(1), inside: x >= -0.01 && y >= -0.01 && x + v.T <= W + 0.01 && y + v.T <= H + 0.01 }; });
const out = [];
for (const key of g.state.keys) {
  if (key.startsWith('tap:')) await tapId(key.slice(4)); else await p.keyboard.press(key);
  await settle(5000);
  let i = await info(); const v = await vis();
  out.push(`${key} ${JSON.stringify(v)} ${i.msg.replace(/\n/g, ' / ')}${i.more ? ' [MORE]' : ''}${i.modal ? ' [MODAL ' + i.title + ']' : ''}`);
  let n = 0; while (i.more && n++ < 10) { await k.tap(g.state.tapX || 448, g.state.tapY || 300); await settle(); i = await info(); out.push('  more-> ' + i.msg.replace(/\n/g, ' / ')); }
  if (i.modal) { await p.keyboard.press('Escape'); await settle(); }
}
out.push(await g.full());
return out.join('\n');
