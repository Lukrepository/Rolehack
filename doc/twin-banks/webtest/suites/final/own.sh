#!/bin/bash
# This pass's own checks, both densities, one after another: ./own.sh -> <name>-<dpr>.log
cd "$(dirname "$0")"
bash ../../websync.sh >/dev/null
F='agent-proxy\|connect_rejected\|For details'
for d in 1 2.4375; do
  node screens.mjs $d 2>&1 | grep -v "$F" > screens-$d.log
  node play.mjs $d 120 2>&1 | grep -v "$F" > play-$d.log
  node turns.mjs $d 2>&1 | grep -v "$F" > turns-$d.log
  node classic.mjs $d 2>&1 | grep -v "$F" > classic-$d.log
done
node skins.mjs 1 2>&1 | grep -v "$F" > skins-1.log
for f in screens play turns classic; do for d in 1 2.4375; do echo "$f-$d: $(tail -1 $f-$d.log)"; done; done > own.sum
echo "skins-1: $(tail -1 skins-1.log)" >> own.sum
(cd /home/user/Rolehack && node --test win/web/test/ 2>&1 | grep -E '^# (pass|fail)') >> own.sum
echo DONE >> own.sum
