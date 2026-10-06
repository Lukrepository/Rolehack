#!/bin/bash
# Every check of the stage "Tablet and touch-laptop tier, size classes and
# panels", one after another (they time taps and resizes, so they run alone),
# at both densities, then the earlier stages' suites on this working tree
# (their logs in prev/), then node's tests.  The working tree's page files are
# synced first (scratchpad/websync.sh, port 8766) and HEAD's served on 8768
# (webtest/header/headsite.sh) for snap.mjs head and classic.mjs.
#   ./all.sh            -> *.log beside the scripts, shots/ for the screenshots
#   ./all.sh stage      this stage's checks only
# The earlier stages' desk checks (layers/desk.mjs, header/desk.mjs) are left
# out: they expect the desk's dock for a mouse, which this stage switched off
# (desktop mode deferred, Lucas, 2026-10-03); tablet.mjs checks the mouse
# windows instead.
cd "$(dirname "$0")"
HERE=$PWD
WT=$HERE/..
bash ../../websync.sh >/dev/null
bash ../header/headsite.sh >/dev/null
F='agent-proxy\|connect_rejected\|For details'
WINS_CLASSIC=896x443,443x939,640x360,360x640,915x412,412x915,844x390,390x844,896x363,443x859,1024x768,768x1024,1180x820,1366x768,960x600,600x960,1280x800,1920x1080,2560x1440,3440x1440
node voids.mjs > voids.log 2>&1
for d in 1 2.4375; do
  node tablet.mjs $d 2>&1 | grep -v "$F" > tablet-$d.log
  node panels.mjs $d 2>&1 | grep -v "$F" > panels-$d.log
  node resize.mjs $d 2>&1 | grep -v "$F" > resize-$d.log
  node snap.mjs $d 2>&1 | grep -v "$F" > snap-work-$d.log
  [ -f snap-head-$d.json ] || node snap.mjs $d head 2>&1 | grep -v "$F" > snap-head-$d.log
  node compare.mjs $d 2>&1 | grep -v "$F" > compare-$d.log
  NOTWIN=1 WINS=$WINS_CLASSIC node classic.mjs $d 2>&1 | grep -v "$F" > classic-$d.log
done
for f in tablet panels resize compare classic; do for d in 1 2.4375; do echo "$f-$d: $(tail -1 $f-$d.log)"; done; done
if [ "$1" != stage ]; then
  mkdir -p prev
  # the layers stage: hit cells, the near-miss guard, the layers, the old habits
  for d in 1 2.4375; do
    for t in hitgrid guard layers habits; do
      (cd $WT/layers && OUTDIR=$HERE/prev node $t.mjs $d 2>&1 | grep -v "$F" > $HERE/prev/$t-$d.log)
    done
  done
  # the header stage: the bands, --More--, the map cell; the tap drift and the chips
  for d in 1 2.4375; do
    for t in header more more-turn map; do
      (cd $WT/header && OUTDIR=$HERE/prev node $t.mjs $d 2>&1 | grep -v "$F" > $HERE/prev/$t-$d.log)
    done
  done
  (cd $WT/header && OUTDIR=$HERE/prev node taps.mjs 2>&1 | grep -v "$F" > $HERE/prev/taps.log)
  (cd $WT/header && OUTDIR=$HERE/prev node chips.mjs 2>&1 | grep -v "$F" > $HERE/prev/chips.log)
  for f in prev/*.log; do echo "$f: $(tail -1 $f)"; done
fi
(cd /home/user/Rolehack && node --test win/web/test/ 2>&1 | grep -E '^# (pass|fail)')
