import { layout } from '/home/user/Rolehack/win/web/layout.js';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
fs.writeFileSync('/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/tabrev/head-layout.mjs', execSync('git -C /home/user/Rolehack show HEAD:win/web/layout.js'));
const H = await import('./head-layout.mjs');
for (const [W, Hh] of [[1080, 1920], [1200, 1920], [1440, 2560], [1600, 2560], [2160, 3840], [1080, 1800], [1440, 2400]]) {
  for (const [name, L] of [['work', layout], ['head', H.layout]]) {
    const r = L(W, Hh, 'touch', {});
    const S = r.spec, m = S.mapArea;
    console.log(`${W}x${Hh} ${name} tier ${r.info.tier} T ${r.info.T} cols ${(m.w / r.info.T).toFixed(1)} rows ${(m.h / r.info.T).toFixed(1)} map ${[m.x, m.y, m.w, m.h].map(Math.round)} panels ${S.chrome.filter(c => /^panel/.test(c.name)).map(c => (c.name.includes('inventory') ? 'inv' : 'log') + '@' + [c.x, c.y, c.w, c.h].map(Math.round).join(',')).join(' ')}`);
  }
}
