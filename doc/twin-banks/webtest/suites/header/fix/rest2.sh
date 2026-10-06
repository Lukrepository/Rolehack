#!/bin/bash
# The rest of lane 2.4375 (the first run was stopped at its time limit during edges.mjs).
WT=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest
F=$WT/header/fix
L=2r
: > $F/logs/$L.sum
run() { local start=$(date +%s); (cd $WT/$2 && timeout 3000 bash -c "$3") > $F/logs/$L-$1.log 2>&1
  echo "rc=$? $(( $(date +%s)-start ))s [$2] $3 :: $(tail -1 $F/logs/$L-$1.log | cut -c1-200)" >> $F/logs/$L.sum; }
D=2.4375
run t-edges header/tester "node edges.mjs $D"; run t-gestures header/tester "node gestures.mjs $D"
run t-taps header/tester "node taps.mjs $D"; run t-classic header/tester "node classic.mjs $D"
for t in paging chipsplace guard barlabels; do run f-$t header/fix "node $t.mjs $D"; done
echo DONE >> $F/logs/$L.sum
