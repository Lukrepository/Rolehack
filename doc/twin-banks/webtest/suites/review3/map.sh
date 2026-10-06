#!/bin/bash
# dump the visible map rows as text, with the cursor (hero) marked
./rh.sh '{"op":"eval","js":"(()=>{const R=globalThis.__rh,g=R.grid,c=R.cursor;let out=[];for(let y=0;y<g.length;y++){let s=\"\";for(let x=0;x<g[y].length;x++){const k=g[y][x];let ch=k&&k.ch?String.fromCodePoint(k.ch):\" \";if(c&&c.x===x&&c.y===y)ch=\"@\";s+=ch;}if(s.trim())out.push(String(y).padStart(2)+\" \"+s.replace(/\\s+$/,\"\"));}return out.join(\"\\n\")+\"\\n\"+JSON.stringify(c);})()"}' | python3 -c 'import json,sys; print(json.load(sys.stdin))'
