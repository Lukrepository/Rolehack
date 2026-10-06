#!/bin/bash
# Every check of this stage, one after another (they time holds and taps, so
# they run alone), at both densities.  The working tree's page files must be
# synced first (scratchpad/websync.sh) and HEAD's served on 8768
# (webtest/header/headsite.sh) for classic.mjs.
#   ./all.sh            -> *.log beside the scripts
cd "$(dirname "$0")"
bash ../../websync.sh >/dev/null
F='agent-proxy\|connect_rejected\|For details'
for d in 1 2.4375; do
  node hitgrid.mjs $d 2>&1 | grep -v "$F" > hitgrid-$d.log
  node guard.mjs $d 2>&1 | grep -v "$F" > guard-$d.log
  node layers.mjs $d 2>&1 | grep -v "$F" > layers-$d.log
  node habits.mjs $d 2>&1 | grep -v "$F" > habits-$d.log
  node classic.mjs $d 2>&1 | grep -v "$F" > classic-$d.log
done
node desk.mjs 2>&1 | grep -v "$F" > desk.log
for f in hitgrid guard layers habits classic; do for d in 1 2.4375; do echo "$f-$d: $(tail -1 $f-$d.log)"; done; done
echo "desk: $(tail -1 desk.log)"
(cd /home/user/Rolehack && node --test win/web/test/ 2>&1 | grep -E '^# (pass|fail)')
