#!/bin/bash
# run.sh lane "dir|cmd" ...  : runs each in its dir, logs to logs/<lane>-<n>.log, summary to logs/<lane>.sum
WT=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest
L=$1; shift; n=0
: > $WT/recheck/logs/$L.sum
for spec in "$@"; do
  n=$((n+1)); d=${spec%%|*}; c=${spec#*|}
  log=$WT/recheck/logs/$L-$n.log
  start=$(date +%s)
  (cd $WT/$d && timeout 900 bash -c "$c") > $log 2>&1
  rc=$?
  echo "$n rc=$rc $(( $(date +%s)-start ))s [$d] $c" >> $WT/recheck/logs/$L.sum
done
echo DONE >> $WT/recheck/logs/$L.sum
