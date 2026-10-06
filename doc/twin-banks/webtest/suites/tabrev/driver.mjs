// Interactive driver: one browser page, commands from cmd.js, results to out.json.
import fs from 'node:fs';
import { launch, newCtx, openPage, resume, sleep, touch, SHOTS } from './common.mjs';
const [W, H] = (process.argv[2] || '896x443').split('x').map(Number);
const dpr = Number(process.argv[3] || 1);
const isTouch = process.argv[4] !== 'mouse';
const fresh = process.argv[5] === 'fresh';
const DIR = process.cwd();
const b = await launch();
const ctx = await newCtx(b, { w: W, h: H, dpr, touch: isTouch, state: !fresh });
const p = await openPage(ctx);
const t = await touch(ctx, p);
const h = {
  sleep,
  cap: (id) => p.evaluate((id) => { const r = globalThis.__bt.overlay.twinCapRect(id); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, id),
  async key(id, hold = 0) { const c = await h.cap(id); if (isTouch) await t.tap(c.x, c.y, hold); else { await p.mouse.move(c.x, c.y); await p.mouse.down(); if (hold) await sleep(hold); await p.mouse.up(); } await sleep(250); },
  async keys(...ids) { for (const id of ids) await h.key(id); },
  async tap(x, y, hold = 0) { if (isTouch) await t.tap(x, y, hold); else { await p.mouse.click(x, y, { delay: hold }); } await sleep(250); },
  cellXY: (cx, cy) => p.evaluate(([cx, cy]) => { const v = globalThis.__bt.view; const r = document.getElementById('map').getBoundingClientRect(); return { x: r.left + v.left + (cx + 0.5) * v.T, y: r.top + v.top + (cy + 0.5) * v.T }; }, [cx, cy]),
  async cell(cx, cy) { const q = await h.cellXY(cx, cy); await h.tap(q.x, q.y); },
  async kb(k) { await p.keyboard.press(k); await sleep(250); },
  async shot(name) { await t.shot(`${SHOTS}/${name}.png`); return `${SHOTS}/${name}.png`; },
  async st() {
    return p.evaluate(() => {
      const R = globalThis.__bt, $ = (id) => document.getElementById(id), o = R.overlay;
      const pan = [...document.querySelectorAll('.rhpanel')].filter((e) => e.style.display !== 'none').map((e) => `[${e.dataset.kind}] ${e.innerText.replace(/\n+/g, ' | ').slice(-400)}`);
      return { msg: $('msgband').innerText, status: $('statband').innerText.replace(/\n/g, ' | '), more: R.moreShown, modal: R.modalOpen ? $('modal-title').textContent + ' :: ' + $('modal').innerText.slice(0, 600) : null,
        cursor: R.cursor, waiting: R.waiting, cw: R.commandWait, armed: o.armed ? o.armed.key : null, layer: o.padLayer ? o.padLayer.kind : null, answering: !!o.answering,
        tier: document.documentElement.dataset.tier, ui: document.documentElement.dataset.ui, pan, form: !$('formwrap').hidden };
    });
  },
  errors: () => p.errors,
  // one look at the level: grid chars, flags, colours, hero
  async world() { return p.evaluate(() => { const g = globalThis.__bt.grid, c = globalThis.__bt.cursor; return { at: { x: c.x, y: c.y }, g: g.map((r) => r.map((q) => [q.ch, q.flags, q.color])) }; }); },
  async moreAway() { for (let i = 0; i < 12; i++) { const s = await h.st(); if (s.more) { const r = await p.evaluate(() => { const b = document.getElementById('msgband').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }); await h.tap(r.x, r.y); await h.sleep(200); continue; } return s; } return h.st(); },
  async explore(maxActions = 40, opts = {}) {
    const log = [];
    const DIRS = { '-1,-1': 'pad_y', '0,-1': 'pad_k', '1,-1': 'pad_u', '-1,0': 'pad_h', '1,0': 'pad_l', '-1,1': 'pad_b', '0,1': 'pad_j', '1,1': 'pad_n' };
    const isMon = (ch) => /[A-Za-z@&:;']/.test(String.fromCharCode(ch));
    const pass = (q) => { const ch = String.fromCharCode(q[0]); if (q[0] === 32) return false; if (isMon(q[0])) return true; if ('.#<>%)[$?!/="(*`{_^,0'.includes(ch)) return true; if (ch === '+' ) return true; if ((ch === '|' || ch === '-') && q[2] === 3) return true; return false; };
    let stuck = 0, lastAt = null, searched = 0, lastId = null;
    for (let a = 0; a < maxActions; a++) {
      let s = await h.moreAway();
      if (s.modal || s.answering || s.form) { log.push('STOP: ' + (s.modal || 'ask: ' + s.msg)); break; }
      const w = await h.world();
      const { at, g } = w;
      h.visited = h.visited || new Set(); h.visited.add(at.y * 80 + at.x);
      if (h.lastDl !== s.status.match(/Dlvl:(\d+)/)?.[1]) { h.visited = new Set(); h.lastDl = s.status.match(/Dlvl:(\d+)/)?.[1]; }
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
        if (!down && !(x === at.x && y === at.y)) { let fr = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const q = g[y + dy] && g[y + dy][x + dx]; if (q && q[0] === 32) fr = true; } if (fr && !h.visited.has(key(x, y)) && !(opts.avoid || []).includes(key(x, y))) { goal = [x, y]; break; } }
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || nx > 79 || ny < 0 || ny > 20) continue; if (prev.has(key(nx, ny))) continue; if (!pass(g[ny][nx])) continue; const door = (c) => { const q = g[c[1]][c[0]]; const ch = String.fromCharCode(q[0]); return ch === '+' || ((ch === '|' || ch === '-') && q[2] === 3); }; if (dx && dy && (door([x, y]) || door([nx, ny]) || (h.noDiag || new Set()).has(key(x, y)) || (h.noDiag || new Set()).has(key(nx, ny)))) continue; prev.set(key(nx, ny), [x, y]); Q.push([nx, ny]); } }
      if (!goal) { await h.key('search'); searched++; log.push('search (no frontier)'); if (searched > 15) { log.push('STOP: nothing to explore'); break; } continue; }
      // first step of the path
      let c = goal, path = [];
      while (c && !(c[0] === at.x && c[1] === at.y)) { path.unshift(c); c = prev.get(key(c[0], c[1])); }
      const st = path[0];
      const id = DIRS[`${st[0] - at.x},${st[1] - at.y}`];
      if (lastAt && lastAt.x === at.x && lastAt.y === at.y) stuck++; else stuck = 0;
      if (stuck === 1 && lastId && /pad_[yubn]/.test(lastId)) { (h.noDiag = h.noDiag || new Set()).add(key(at.x, at.y)); }
      if (stuck > 3) { (opts.avoid = opts.avoid || []).push(key(goal[0], goal[1])); stuck = 0; log.push(`stuck; avoid ${goal}`); }
      lastAt = at; lastId = id;
      await h.key(id);
      if (opts.verbose) log.push(`${id} toward ${goal}${down ? ' (>)' : ''}`);
    }
    const s = await h.st();
    log.push(`end at ${JSON.stringify(s.cursor)} T ${s.status.match(/T:(\d+)/)?.[1]} HP ${s.status.match(/HP:(\S+)/)?.[1]} msg ${s.msg.replace(/\n/g, ' / ')}`);
    return log;
  },

  async go(ids, n = 1) { const log = []; for (let i = 0; i < n; i++) for (const id of [].concat(ids)) { let s = await h.st(); let g = 0; while ((s.more) && g++ < 6) { await h.key('pad_centre'); s = await h.st(); log.push('MORE:' + s.msg.replace(/\n/g, ' / ')); } await h.key(id); s = await h.st(); log.push(id + ' -> ' + s.msg.replace(/\n/g, ' / ') + (s.more ? ' [MORE]' : '') + (s.modal ? ' [MODAL]' : '') + (s.answering ? ' [ASK]' : '')); } return log; },
  async look(x0 = 0, x1 = 79, y0 = 0, y1 = 20) { const s = await h.st(); return { msg: s.msg, more: s.more, modal: s.modal, ask: s.answering, st: s.status.replace(/Banks the Stripling \| /, ''), at: s.cursor, pan: s.pan, map: (await h.mapText(x0, x1, y0, y1)).split('\n') }; },
  mapText: (x0 = 0, x1 = 79, y0 = 0, y1 = 20) => p.evaluate(([x0, x1, y0, y1]) => { const g = globalThis.__bt.grid, c = globalThis.__bt.cursor; const out = []; for (let y = y0; y <= y1; y++) { let r = ''; for (let x = x0; x <= x1; x++) r += (x === c.x && y === c.y) ? '@' : String.fromCharCode(g[y][x].ch || 32); out.push(String(y).padStart(2) + ' ' + r); } return out.join('\n'); }, [x0, x1, y0, y1]),
  // the map's glyph text near the hero (text of the level from the core's map is not kept; use the canvas glyph state if available)
};
fs.writeFileSync(`${DIR}/driver.ready`, String(process.pid));
await resume(p).catch((e) => fs.writeFileSync(`${DIR}/driver.err`, String(e)));
fs.writeFileSync(`${DIR}/driver.resumed`, '1');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
for (;;) {
  if (fs.existsSync(`${DIR}/cmd.js`)) {
    const body = fs.readFileSync(`${DIR}/cmd.js`, 'utf8');
    fs.unlinkSync(`${DIR}/cmd.js`);
    if (body.trim() === 'QUIT') break;
    let out;
    try { out = await new AsyncFunction('p', 't', 'h', 'ctx', body)(p, t, h, ctx); } catch (e) { out = { error: String(e && e.stack || e) }; }
    fs.writeFileSync(`${DIR}/out.tmp`, JSON.stringify(out, null, 1));
    fs.renameSync(`${DIR}/out.tmp`, `${DIR}/out.json`);
  }
  await sleep(100);
}
await b.close();
process.exit(0);
