#!/bin/bash
WT=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest
F=$WT/layers/rc2
mkdir -p $F/logs
L=$1
: > $F/logs/$L.sum
run() {   # run <name> <dir> <cmd>
  local start=$(date +%s)
  (cd $WT/$2 && timeout 3600 bash -c "$3") > $F/logs/$L-$1.log 2>&1
  echo "rc=$? $(( $(date +%s)-start ))s [$2] $3 :: $(tail -1 $F/logs/$L-$1.log | cut -c1-200)" >> $F/logs/$L.sum
}
  run rc-killturn1 hfix2 "ORIGINS=http://localhost:8766,http://localhost:8791 node killturn.mjs 1"
  run rc-killturn2 hfix2 "ORIGINS=http://localhost:8766,http://localhost:8791 node killturn.mjs 2.4375"
  run rc-qsplit1 hfix2 "node qsplit.mjs 1"; run rc-qsplitmsg1 hfix2 "MODE=msg node qsplit.mjs 1"
  run rc-qsplit2 hfix2 "node qsplit.mjs 2.4375"; run rc-qsplitmsg2 hfix2 "MODE=msg node qsplit.mjs 2.4375"
  run rc-qmore1 hfix2 "node qmore.mjs 1"; run rc-qmore2 hfix2 "node qmore.mjs 2.4375"
echo DONE >> $F/logs/$L.sum
