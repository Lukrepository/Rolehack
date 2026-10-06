  // one look at the level: grid chars, flags, colours, hero
  async world() { return p.evaluate(() => { const g = globalThis.__bt.grid, c = globalThis.__bt.cursor; return { at: { x: c.x, y: c.y }, g: g.map((r) => r.map((q) => [q.ch, q.flags, q.color])) }; }); },
  async moreAway() { for (let i = 0; i < 12; i++) { const s = await h.st(); if (s.more) { const r = await p.evaluate(() => { const b = document.getElementById('msgband').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }); await h.tap(r.x, r.y); await h.sleep(200); continue; } return s; } return h.st(); },
  async explore(maxActions = 40, opts = {}) {
    const log = [];
    const DIRS = { '-1,-1': 'pad_y', '0,-1': 'pad_k', '1,-1': 'pad_u', '-1,0': 'pad_h', '1,0': 'pad_l', '-1,1': 'pad_b', '0,1': 'pad_j', '1,1': 'pad_n' };
    const isMon = (ch) => /[A-Za-z@&:;']/.test(String.fromCharCode(ch));
    const pass = (q) => { const ch = String.fromCharCode(q[0]); if (q[0] === 32) return false; if (isMon(q[0])) return true; if ('.#<>%)[$?!/="(*`{_^,'.includes(ch)) return true; if (ch === '+' ) return true; if ((ch === '|' || ch === '-') && q[2] === 3) return true; return false; };
    let stuck = 0, lastAt = null, searched = 0;
    for (let a = 0; a < maxActions; a++) {
      let s = await h.moreAway();
      if (s.modal || s.answering || s.form) { log.push('STOP: ' + (s.modal || 'ask: ' + s.msg)); break; }
      const w = await h.world();
      const { at, g } = w;
      if (/You die|DYWYPI|Do you want your possessions/.test(s.msg)) { log.push('DEAD'); break; }
      // a hostile next to the hero: fight it
      let fought = false;
      for (const [d, id] of Object.entries(DIRS)) { const [dx, dy] = d.split(',').map(Number); const q = g[at.y + dy] && g[at.y + dy][at.x + dx]; if (q && isMon(q[0]) && !(q[1] & 0x10)) { if (opts.combat) { await h.key('combat'); } await h.key(id); log.push(`fight ${String.fromCharCode(q[0])} ${id}${opts.combat ? ' (F)' : ''}: ${(await h.st()).msg.replace(/\n/g, ' / ')}`); fought = true; break; } }
      if (fought) continue;
      if (g[at.y][at.x][0] === 62 && opts.stopOnStairs !== false) { log.push('ON >'); break; }
      // BFS
      const key = (x, y) => y * 80 + x, prev = new Map([[key(at.x, at.y), null]]), Q = [[at.x, at.y]];
      let goal = null, down = null;
      for (let y = 0; y < 21; y++) for (let x = 0; x < 80; x++) if (g[y][x][0] === 62) down = [x, y];
      while (Q.length) { const [x, y] = Q.shift();
        if (down && x === down[0] && y === down[1]) { goal = [x, y]; break; }
        if (!down && !(x === at.x && y === at.y)) { let fr = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const q = g[y + dy] && g[y + dy][x + dx]; if (q && q[0] === 32) fr = true; } if (fr && !(opts.avoid || []).includes(key(x, y))) { goal = [x, y]; break; } }
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || nx > 79 || ny < 0 || ny > 20) continue; if (prev.has(key(nx, ny))) continue; if (!pass(g[ny][nx])) continue; const door = (c) => { const q = g[c[1]][c[0]]; const ch = String.fromCharCode(q[0]); return ch === '+' || ((ch === '|' || ch === '-') && q[2] === 3); }; if (dx && dy && (door([x, y]) || door([nx, ny]))) continue; prev.set(key(nx, ny), [x, y]); Q.push([nx, ny]); } }
      if (!goal) { await h.key('search'); searched++; log.push('search (no frontier)'); if (searched > 15) { log.push('STOP: nothing to explore'); break; } continue; }
      // first step of the path
      let c = goal, path = [];
      while (c && !(c[0] === at.x && c[1] === at.y)) { path.unshift(c); c = prev.get(key(c[0], c[1])); }
      const st = path[0];
      const id = DIRS[`${st[0] - at.x},${st[1] - at.y}`];
      if (lastAt && lastAt.x === at.x && lastAt.y === at.y) stuck++; else stuck = 0;
      if (stuck > 3) { (opts.avoid = opts.avoid || []).push(key(goal[0], goal[1])); stuck = 0; log.push(`stuck; avoid ${goal}`); }
      lastAt = at;
      await h.key(id);
      if (opts.verbose) log.push(`${id} toward ${goal}${down ? ' (>)' : ''}`);
    }
    const s = await h.st();
    log.push(`end at ${JSON.stringify(s.cursor)} T ${s.status.match(/T:(\d+)/)?.[1]} HP ${s.status.match(/HP:(\S+)/)?.[1]} msg ${s.msg.replace(/\n/g, ' / ')}`);
    return log;
  },
