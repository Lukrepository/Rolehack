H.log = H.log || [];
H.map = async () => (await p.evaluate(() => globalThis.__bt.asciiMap())).split('\n');
H.near = async (r = 6) => { const s = await H.state(); const m = await H.map(); const c = s.cursor; return m.slice(Math.max(0, c.y - r), c.y + r + 1).map(l => l.slice(Math.max(0, c.x - 20), c.x + 21)); };
H.act = async (ids, opts = {}) => {
  const out = [];
  for (const id of ids) {
    if (typeof id === 'string' && id.startsWith('key:')) { await p.keyboard.press(id.slice(4)); }
    else if (typeof id === 'string' && id.startsWith('hold:')) { const [, n, ms] = id.split(':'); await H.tapId(n, Number(ms)); }
    else await H.tapId(id);
    await H.settle(2500);
    let s = await H.state();
    let line = `${id} @${s.cursor.x},${s.cursor.y} T=${(s.status.match(/T:(\d+)/)||[])[1]} HP=${(s.status.match(/HP:(\S+)/)||[])[1]} | ${s.msg.slice(0, 140)}${s.more ? ' [MORE]' : ''}${s.modal ? ` [MODAL ${s.title}]` : ''}${s.chips.length ? ` [chips ${s.chips.join(',')}]` : ''}`;
    out.push(line);
    let guard = 0;
    while (s.more && opts.autoMore !== false && guard++ < 10) {
      const mb = await p.evaluate(() => { const r = document.getElementById('msgband').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      await k.tap(mb.x, mb.y); await H.settle(2000); s = await H.state();
      out.push(`  (more tapped) ${s.msg.slice(0, 140)}${s.more ? ' [MORE]' : ''}${s.modal ? ` [MODAL ${s.title}]` : ''}`);
    }
  }
  H.log.push(...out);
  return out;
};
H.follow = async (n = 30, prefer = null) => {
  // follow a corridor: step to an unvisited # or . neighbour
  const D = { pad_h: [-1, 0], pad_l: [1, 0], pad_k: [0, -1], pad_j: [0, 1], pad_y: [-1, -1], pad_u: [1, -1], pad_b: [-1, 1], pad_n: [1, 1] };
  H.seen = H.seen || new Set();
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = await H.state(); const m = await H.map(); const c = s.cursor;
    H.seen.add(`${c.x},${c.y}`);
    let best = null;
    for (const [id, [dx, dy]] of Object.entries(D)) {
      const x = c.x + dx, y = c.y + dy; if (y < 0 || y > 20 || x < 0 || x > 79) continue;
      const ch = m[y][x];
      if (!'#.+<>{%)[?!/=*$"_|-'.includes(ch) || ch === '|' || ch === '-') continue;
      if (ch === ' ') continue;
      if (H.seen.has(`${x},${y}`)) continue;
      const score = (ch === '#' ? 2 : 1) + (prefer && id === prefer ? 3 : 0) + (dx && dy ? 0 : 0.5);
      if (!best || score > best.score) best = { id, score, ch };
    }
    if (!best) { out.push(`stuck @${c.x},${c.y}`); break; }
    const r = await H.act([best.id]);
    out.push(...r);
    const s2 = await H.state();
    if (s2.cursor.x === c.x && s2.cursor.y === c.y) { H.seen.add(`${c.x + D[best.id][0]},${c.y + D[best.id][1]}`); }
    if (/You see|There is|You find|hits|bites|misses|Things/.test(s2.msg) && s2.msg !== s.msg) { out.push('-- message stop'); break; }
  }
  return out;
};
