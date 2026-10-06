import { chromium } from '/usr/local/lib/node_modules/playwright/index.mjs';
const OUT = '/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/release/verify-web';
const URL = 'http://127.0.0.1:8799/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const st = (p) => p.evaluate(() => {
  const vis = (id) => { const e = document.getElementById(id); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').slice(0, 200) : ''; };
  return { modal: vis('modal'), form: vis('formwrap'), msg: (document.getElementById('msgband') || {}).innerText?.replace(/\s+/g, ' ').slice(-260), stat: (document.getElementById('statband') || {}).innerText?.replace(/\s+/g, ' ').slice(0, 140) };
});
const open = async (ctx) => { const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('pageerror', e.message)); await p.goto(URL); await p.waitForTimeout(4500); return p; };
async function newChar(p, name) {
  await p.keyboard.press('Control+a'); await p.keyboard.press('Backspace');
  await p.keyboard.type(name); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
  for (let i = 0; i < 14; i++) {
    const s = await st(p);
    const all = s.modal + ' ' + s.form + ' ' + s.msg;
    if (/T:\d/.test(s.stat || '') && !s.modal && !s.form && !/More|\[yn/.test(s.msg)) return s;
    const k = /tutorial/.test(all) ? 'n' : /Is this ok/.test(s.modal + s.msg.slice(-60)) ? 'y' : (!s.modal && /Shall I pick[^\]]*\]\s*$/.test(s.msg)) ? 'y' : 'Enter';
    await p.keyboard.press(k); await p.waitForTimeout(900);
  }
  return st(p);
}
const which = process.argv[2] || 'all';

if (which === 'all' || which === 'v1') {
  // WEB-01: a checkpoint whose incarnation's low byte (EDITLEVEL) differs
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  let p = await open(ctx);
  console.log('V1 newchar', JSON.stringify(await newChar(p, 'Vee')));
  for (let i = 0; i < 6; i++) { await p.keyboard.press('s'); await p.waitForTimeout(250); }
  await p.waitForTimeout(1500);
  for (let i = 0; i < 4; i++) { const s0 = await st(p); if (/More/.test(s0.msg) || s0.modal) { await p.keyboard.press('Enter'); await p.waitForTimeout(500); } }
  const before = await st(p);
  console.log('V1 before close', JSON.stringify(before));
  await p.close({ runBeforeUnload: true });
  p = await open(ctx);
  const info = await p.evaluate(() => {
    const FS = rolehackFiles(); const d = FS.readFile('/save/0Vee.0');
    let at = -1;
    for (let i = 8; i < 400; i++) if (d[i] === 0x68 && d[i + 2] === 0 && d[i + 3] === 2 && d[i + 4] === 4) { at = i; break; }
    const n = d[at + 1]; const off = at + 2 + n;
    const vb = Array.from(d.slice(off, off + 12));
    d[off] ^= 0x01;   // EDITLEVEL 0 -> 1, as a build with a raised EDITLEVEL would have written it
    FS.writeFile('/save/0Vee.0', d);
    return { size: d.length, indicatorAt: at, cscount: n, versionAt: off, versionBytes: vb, after: Array.from(d.slice(off, off + 4)) };
  });
  console.log('V1 patched checkpoint', JSON.stringify(info));
  await p.keyboard.press('Control+a'); await p.keyboard.press('Backspace');
  await p.keyboard.type('Vee'); await p.keyboard.press('Enter'); await p.waitForTimeout(3500);
  const s = await st(p);
  console.log('V1 after restore', JSON.stringify(s));
  await p.screenshot({ path: `${OUT}/v1-restored.png` });
  await p.close(); await ctx.close();
}

if (which === 'all' || which === 'v2') {
  // WEB-08: does a player's line for an option that defaults.nh sets take effect?
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('rh.userRc', JSON.stringify('OPTIONS=autopickup')); } catch (e) {} });
  const p = await open(ctx);
  const msgs = [];
  console.log('V2 newchar', JSON.stringify(await newChar(p, 'Opt')));
  console.log('V2 log', JSON.stringify(await p.evaluate(() => document.body.innerText.match(/(Line \d+[^\n]*|[^\n]*specified multiple[^\n]*|[^\n]*error[^\n]*)/g))));
  await p.keyboard.press('@'); await p.waitForTimeout(900);
  console.log('V2 after @', JSON.stringify(await st(p)));
  await p.keyboard.press('@'); await p.waitForTimeout(900);
  console.log('V2 after @@', JSON.stringify(await st(p)));
  // WEB-07: '#' then typed "version"
  await p.keyboard.press('#'); await p.waitForTimeout(900);
  console.log('V3 after #', JSON.stringify(await st(p)));
  await p.keyboard.type('v'); await p.waitForTimeout(900);
  console.log('V3 after #v', JSON.stringify(await st(p)));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/v2-opt.png` });
  await ctx.close();
}
await b.close();
