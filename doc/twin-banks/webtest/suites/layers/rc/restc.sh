#!/bin/bash
WT=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest
F=$WT/layers/rc
mkdir -p $F/logs
L=$1
: > $F/logs/$L.sum
run() {   # run <name> <dir> <cmd>
  local start=$(date +%s)
  (cd $WT/$2 && timeout 3600 bash -c "$3") > $F/logs/$L-$1.log 2>&1
  echo "rc=$? $(( $(date +%s)-start ))s [$2] $3 :: $(tail -1 $F/logs/$L-$1.log | cut -c1-200)" >> $F/logs/$L.sum
}
  run rc-sweep1 hfix2 "node sweep.mjs 1"; run rc-sweep2 hfix2 "TAGS=p390,small node sweep.mjs 2.4375"
  run rc-eat1 hfix2 "node eat.mjs 1"; run rc-eat2 hfix2 "node eat.mjs 2.4375"
echo DONE >> $F/logs/$L.sum
