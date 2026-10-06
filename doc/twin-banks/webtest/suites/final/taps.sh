#!/bin/bash
# The layers stage's tap sweeps (layers/tester/taps.mjs), 12 runs, P at a time:
#   ./taps.sh [P=2]   -> logs/taps-<dpr>-r<radius>-<WxH>.log, one line each in logs/taps.sum
WT=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest
F=$WT/final
: > $F/logs/taps.sum
one() {
  set -- $1
  local start=$(date +%s)
  (cd $WT/layers/tester && node taps.mjs $1 $2 $3) 2>&1 | grep -v 'agent-proxy\|connect_rejected\|For details' > $F/logs/taps-$1-r$2-$3.log
  echo "$(( $(date +%s)-start ))s taps $1 r$2 $3 :: $(tail -1 $F/logs/taps-$1-r$2-$3.log)" >> $F/logs/taps.sum
}
export -f one; export WT F
for r in "1 0" "2.4375 0" "1 16"; do for s in 896x443 443x939 360x640 390x844; do echo "$r $s"; done; done | xargs -P ${1:-2} -I{} bash -c 'one "{}"'
echo DONE >> $F/logs/taps.sum
