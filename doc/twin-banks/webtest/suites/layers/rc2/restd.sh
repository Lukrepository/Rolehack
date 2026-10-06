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
  run fx-samepage1 hfix2 "node samepage.mjs 1"; run fx-samepage2 hfix2 "node samepage.mjs 2.4375"
  run fx-classicturn1 hfix2 "node classicturn.mjs 1"; run fx-classicturn2 hfix2 "TAGS=small,lucas node classicturn.mjs 2.4375"
echo DONE >> $F/logs/$L.sum
