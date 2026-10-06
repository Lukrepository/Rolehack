#!/bin/bash
# cell.sh x y -> screen coords of a map cell's centre (grid index as dumped by map.sh)
./rh.sh "{\"op\":\"eval\",\"js\":\"(()=>{const v=globalThis.__rh.view,r=document.getElementById('map').getBoundingClientRect();return Math.round(r.left+v.left+($1+0.5)*v.T)+','+Math.round(r.top+v.top+($2+0.5)*v.T)})()\"}" | tr -d '"'
