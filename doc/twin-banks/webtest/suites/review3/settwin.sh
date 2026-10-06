#!/bin/bash
# settwin.sh <TWIN BANKS|CLASSIC> : switch layout via the Settings screen
./rh.sh '{"op":"eval","js":"globalThis.__rh.overlay.openSettings(); 1"}' > /dev/null; sleep 0.6
xy=$(./rh.sh "{\"op\":\"eval\",\"js\":\"(()=>{const b=[...document.querySelectorAll('#formwrap button')].find(b=>b.innerText.trim().toUpperCase()==='$1');b.scrollIntoView();const r=b.getBoundingClientRect();return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2)})()\"}" | tr -d '"')
./rh.sh "{\"op\":\"tap\",\"x\":${xy%,*},\"y\":${xy#*,},\"wait\":300}" > /dev/null
xy=$(./rh.sh "{\"op\":\"eval\",\"js\":\"(()=>{const b=[...document.querySelectorAll('#formwrap button')].find(b=>/^DONE/i.test(b.innerText.trim()));const r=b.getBoundingClientRect();return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2)})()\"}" | tr -d '"')
./rh.sh "{\"op\":\"tap\",\"x\":${xy%,*},\"y\":${xy#*,},\"wait\":1000}" | grep '"ui"'
