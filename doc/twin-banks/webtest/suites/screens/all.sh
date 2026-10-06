#!/bin/bash
# Every tester check of the stage "Tablet and touch-laptop tier, size classes
# and panels", at both densities, one suite at a time (they time taps and
# resizes).  Syncs the working tree first (websync.sh, 8766); HEAD's page
# files are served from head-site/ on 8772.  Logs: <suite>-<dpr>.log; JSON:
# <suite>-<dpr>.json; screenshots: shots/.
cd "$(dirname "$0")"
bash ../../websync.sh >/dev/null
curl -s -o /dev/null http://localhost:8772/index.html || (cd head-site && nohup python3 -m http.server 8772 >/dev/null 2>&1 &)
F='agent-proxy\|connect_rejected\|For details'
for d in 1 2.4375; do
  for t in screens panels resize phones classic extras rotate mapclick wheel monitor; do
    node $t.mjs $d 2>&1 | grep -v "$F" > $t-$d.log
  done
done
for t in screens panels resize phones classic extras rotate mapclick wheel monitor; do for d in 1 2.4375; do echo "$t-$d: $(tail -1 $t-$d.log | head -c 200) $(grep -c '^FAIL' $t-$d.log) FAIL lines"; done; done
