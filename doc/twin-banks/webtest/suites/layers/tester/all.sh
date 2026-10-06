#!/bin/bash
# The tester's suite for "Layers on the pad and the near-miss guard", at both
# densities.  Syncs the working tree's page files first (websync.sh, 8766) and
# serves HEAD's on 8782 (head-site/) for classic.mjs.  The tap sweeps take
# ~25 min a window and run four at a time.
#   bash all.sh            -> *.log and *.json beside the scripts, shots/
cd "$(dirname "$0")"
bash ../../../websync.sh >/dev/null
curl -s -o /dev/null http://localhost:8782/index.html || (cd head-site && nohup python3 -m http.server 8782 >/dev/null 2>&1 &)
[ -f _state.json ] || node setup.mjs
F='agent-proxy\|connect_rejected\|For details'
for d in 1 2.4375; do
  node rects.mjs $d 2>&1 | grep -v "$F" > rects-$d.log
  node layers.mjs $d 2>&1 | grep -v "$F" > layers-$d.log
  node states.mjs $d 2>&1 | grep -v "$F" > states-$d.log
  node extra.mjs $d 2>&1 | grep -v "$F" > extra-$d.log
  node popsweep.mjs $d 2>&1 | grep -v "$F" > pops-$d.log
  node classic.mjs $d 2>&1 | grep -v "$F" > classic-$d.log
done
for r in "1 0" "2.4375 0" "1 16"; do
  set -- $r
  for s in 896x443 443x939 360x640 390x844; do node taps.mjs $1 $2 $s 2>&1 | grep -v "$F" > run-taps-$1-r$2-$s.log & done
  wait
done
for f in rects layers states extra pops classic; do for d in 1 2.4375; do echo "$f-$d: $(tail -1 $f-$d.log)"; done; done
for f in run-taps-*.log; do echo "$f: $(tail -1 $f)"; done
