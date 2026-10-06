#!/bin/bash
# walk.sh <dir> <n>: tap a pad key n times (landscape or portrait coords from the layout)
d=$1; n=${2:-1}
xy=$(./rh.sh "{\"op\":\"eval\",\"js\":\"(()=>{const e=globalThis.__rh.overlay.twinEl('pad_$d');const r=e.getBoundingClientRect();return Math.round(r.x+r.width/2)+','+Math.round(r.y+r.height/2)})()\"}" | tr -d '"')
x=${xy%,*}; y=${xy#*,}
last=""
for i in $(seq 1 $n); do
  m=$(./rh.sh "{\"op\":\"tap\",\"x\":$x,\"y\":$y,\"wait\":220}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["msg"].replace("\n"," ")+" |more="+str(d["more"])+" ans="+str(d["answering"]))')
  if [ "$m" != "$last" ]; then echo "$i: $m"; last="$m"; fi
done
