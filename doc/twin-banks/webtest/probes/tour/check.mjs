const pw = await import('/usr/local/lib/node_modules/playwright/index.mjs');
const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const out = {};
for (const [name, vp, scheme] of [['desktop-light', { width: 1400, height: 900 }, 'light'], ['phone-dark', { width: 400, height: 860 }, 'dark']]) {
  const ctx = await b.newContext({ viewport: vp, colorScheme: scheme, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await p.goto('http://localhost:8811/twin-banks-tour.html', { waitUntil: 'networkidle' }).catch((e) => errs.push('GOTO ' + e.message));
  await p.waitForTimeout(800);
  const info = await p.evaluate(() => ({
    readout: [...document.querySelectorAll('#readout div')].map((d) => d.textContent),
    keys: document.querySelectorAll('#screen .key').length,
    glyphs: document.querySelectorAll('#screen .glyph').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
  }));
  out[name] = { errs, info };
  if (name === 'desktop-light') {
    // functional checks: portrait phone, tablet, 960x600 ranking, the tap tester, a classic window
    const read = async () => p.evaluate(() => [...document.querySelectorAll('#readout div')].map((d) => d.textContent).join(' | '));
    await p.click('#devices .chip[data-device="phone"]'); await p.click('#turn'); out.phonePort = await read();
    await p.click('#devices .chip[data-device="tablet"]'); out.tabletPort = await read(); await p.click('#turn'); out.tabletLand = await read();
    await p.click('#devices .chip[data-device="chrome"]'); out.chromeLand = await read();
    await p.click('#s12 [data-act]'); out.split = await read();
    await p.click('#s8 [data-act]'); out.tab8 = await read(); out.rank = await p.evaluate(() => document.querySelector('#ranking').innerText);
    await p.click('#devices .chip[data-device="phone"]');
    const box = await p.evaluate(() => { const svg = document.querySelector('#screen'); const r = svg.getBoundingClientRect(); const vb = svg.viewBox.baseVal; return { x: r.x, y: r.y, w: r.width, h: r.height, vb: [vb.x, vb.y, vb.width, vb.height] }; });
    const at = async (x, y) => { const s = box.w / box.vb[2]; await p.mouse.click(box.x + (x - box.vb[0]) * s, box.y + (y - box.vb[1]) * s); return p.textContent('#tapline'); };
    out.taps = [await at(113, 330), await at(113, 72), await at(212, 300), await at(232, 300), await at(400, 300), await at(150, 268)];
    await p.click('#s11 [data-act]');
    await p.screenshot({ path: 'shot-desktop.png' });
  }
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
