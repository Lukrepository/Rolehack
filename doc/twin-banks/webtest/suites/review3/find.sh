#!/bin/bash
# find.sh <char> : grid cells holding that glyph char
./rh.sh "{\"op\":\"eval\",\"js\":\"(()=>{const g=globalThis.__rh.grid;let o=[];for(let y=0;y<g.length;y++)for(let x=0;x<g[y].length;x++){const k=g[y][x];if(k&&k.ch&&String.fromCodePoint(k.ch)==='$1')o.push(x+','+y)}return o.join(' ')+' | hero '+globalThis.__rh.cursor.x+','+globalThis.__rh.cursor.y})()\"}"
