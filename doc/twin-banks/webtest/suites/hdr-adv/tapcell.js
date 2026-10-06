const c = await p.evaluate(([x,y]) => { const v = globalThis.__bt.view, r = document.getElementById("map").getBoundingClientRect(); return { px: r.x + v.left + (x+0.5)*v.T, py: r.y + v.top + (y+0.5)*v.T }; }, g.state.cell);
await k.tap(c.px, c.py); await settle(6000); let i = await info(); const out=[JSON.stringify(c), i.msg.replace(/\n/g," / "), JSON.stringify(i.cur), i.more];
return out;
