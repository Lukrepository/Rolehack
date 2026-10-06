const out=[]; 
for (const key of g.state.keys) { await p.keyboard.press(key); await settle(5000); let i = await info(); out.push(key+" "+JSON.stringify(i.cur)+" "+i.msg.replace(/\n/g," / ")+(i.more?" [MORE]":"")); let n=0; while (i.more && n++<10) { await k.tap(g.state.tapX || 448, g.state.tapY || 300); await settle(); i = await info(); out.push("  more-> "+i.msg.replace(/\n/g," / ")+(i.more?" [MORE]":"")); } }
out.push(await g.full()); return out.join("\n");
