#!/bin/bash
# The final integration pass: every suite of every stage once, in four lanes
# that run side by side (./all.sh L1 | L2 | L3 | L4), then the tap sweeps
# (./all.sh taps, four windows at a time).  One line per run in
# logs/<lane>.sum, each run's output in logs/<lane>-<name>.log.  Lane lists
# are the union of tabrecheck/lanes/all.sh, tabrecheck/tablet-all.sh,
# layers/all.sh, layers/tester/all.sh and screens/all.sh, without repeats.
# The desk checks (layers/desk.mjs, header/desk.mjs) are left out: desktop
# mode is deferred (Lucas, 2026-10-03) and they expect the dock.
WT=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest
F=$WT/final
mkdir -p $F/logs
L=$1
: > $F/logs/$L.sum
FL='agent-proxy\|connect_rejected\|For details'
run() {   # run <name> <dir> <cmd>
  local start=$(date +%s)
  (cd $WT/$2 && timeout 5400 bash -c "$3") 2>&1 | grep -v "$FL" > $F/logs/$L-$1.log
  echo "rc=${PIPESTATUS[0]} $(( $(date +%s)-start ))s [$2] $3 :: $(tail -1 $F/logs/$L-$1.log | cut -c1-220)" >> $F/logs/$L.sum
}
bash $WT/../websync.sh >/dev/null
for p in 8768 8772 8782 8791; do curl -s -o /dev/null http://localhost:$p/index.html || echo "port $p down" >> $F/logs/$L.sum; done
WINS_CLASSIC=896x443,443x939,640x360,360x640,915x412,412x915,844x390,390x844,896x363,443x859,1024x768,768x1024,1180x820,1366x768,960x600,600x960,1280x800,1920x1080,2560x1440,3440x1440
case $L in
L1|L2)
  [ $L = L1 ] && D=1 || D=2.4375
  for t in header more more-turn map classic; do run h-$t header "node $t.mjs $D"; done
  run t-rects header/tester "node rects.mjs $D"; run t-variants header/tester "./variants.sh $D"
  run t-more header/tester "node more.mjs $D"; run t-moreturn header/tester "node more-turn.mjs $D"
  run t-edges header/tester "node edges.mjs $D"; run t-gestures header/tester "node gestures.mjs $D"
  run t-taps header/tester "node taps.mjs $D"; run t-classic header/tester "node classic.mjs $D"
  if [ "$D" = 1 ]; then run t-cellswitch header/tester "node cellswitch.mjs 1"; run t-bandtaps header/tester "node bandtaps.mjs 1"; run t-rotatep header/tester "node rotate-p.mjs 1"; fi
  for t in paging chipsplace guard barlabels; do run f-$t header/fix "node $t.mjs $D"; done
  for t in hitgrid guard layers habits classic; do run l-$t layers "node $t.mjs $D"; done
  for t in rects layers states extra popsweep classic; do run lt-$t layers/tester "node $t.mjs $D"; done
  ;;
L3)
  run header-taps header "node taps.mjs; node chips.mjs | tail -1"
  run banks-rects1 banks "node rects.mjs 1"; run banks-rects2 banks "node rects.mjs 2.4375"
  run banks-behaveL1 banks "node behave.mjs 1 896x443"; run banks-behaveP1 banks "node behave.mjs 1 443x939"
  run banks-behaveL2 banks "node behave.mjs 2.4375 896x443"; run banks-behaveP2 banks "node behave.mjs 2.4375 443x939"
  run banks-extra banks "node extra.mjs"; run banks-classic1 banks "node classic.mjs 1"; run banks-classic2 banks "node classic.mjs 2.4375"
  run banks-split banks "node split.mjs"; run banks-splitt banks "node split-turned.mjs"; run banks-switchglass banks "node switchglass.mjs"
  run banks-answers banks "node answers.mjs"; run banks-newgame banks "node newgame-classic.mjs"
  run fix3-ghost fix3 "node ghostclick.mjs"; run fix3-ghost2 fix3 "node ghostclick2.mjs"
  run fix3-minor1 fix3 "node minor.mjs 1"; run fix3-minor2 fix3 "node minor.mjs 2.4375"
  run fix3-dprT fix3 "LAYOUT=twin node dprchange.mjs"; run fix3-dprC fix3 "LAYOUT=classic node dprchange.mjs"
  run fix3-zoomT fix3 "LAYOUT=twin node zoomcheck.mjs"; run fix3-zoomC fix3 "LAYOUT=classic node zoomcheck.mjs"
  run fix3-screenT fix3 "LAYOUT=twin node screen.mjs"; run fix3-screenC fix3 "LAYOUT=classic node screen.mjs"
  run fix3-canvaspx fix3 "node canvaspx.mjs"; run fix3-retire fix3 "node ghostretire.mjs"; run rev-retire rev "node ghostretire.mjs"
  for t in budget est drawer mouse newgame orphans paranoid perf restore2 smoke switch switch2 variants; do run rev-$t rev "node $t.mjs"; done
  run r2-sw review2 "node sw.mjs"; run r2-taps review2 "node taps.mjs hfx"; run r2-dpr review2 "node dprchange.mjs"
  run r2-zoom review2 "node zoomcheck.mjs"; run r2-screen review2 "node screen.mjs"
  run td-taps tapdrift "node taps.mjs hfx"; run td-travel tapdrift "node travel.mjs"; run td-dpr tapdrift "node dprchange.mjs"; run td-zoom tapdrift "node zoomcheck.mjs"
  run layoutjs layoutjs "node browser.mjs"; run fix2 fix2 "node smoke.mjs"
  run twin-rects1 twin "node rects.mjs"; run twin-rects2 twin "node rects.mjs 2.4375"
  run twin-behave1 twin "node behave.mjs 1"; run twin-behave2 twin "node behave.mjs 2.4375"; run twin-extra twin "node extra.mjs"
  run twin-classic twin "node classic.mjs after"; run twin-compare twin "node classic.mjs compare"; run twin-smoke twin "node smoke.mjs"
  run hadv-blank1 hadv "node blank1.mjs"; run hadv-blank hadv "node blank.mjs"; run hadv-pagefull hadv "node pagefull.mjs"
  run hadv-hidden hadv "node hidden.mjs"; run hdr-moreturnP hdr-adv "node moreturn2.mjs 1 P"; run hdr-moreturnL hdr-adv "node moreturn2.mjs 1 L"
  run hdr-turnidle hdr-adv "node turnidle.mjs"; run hdr-whole hdr-adv "node whole.mjs"; run hdr-chipghost hdr-adv "node chipghost3.mjs"
  run tester-probe-switch header/tester "node probe-switch.mjs 360x640"
  run rc-killturn1 hfix2 "ORIGINS=http://localhost:8766,http://localhost:8791 node killturn.mjs 1"
  run rc-killturn2 hfix2 "ORIGINS=http://localhost:8766,http://localhost:8791 node killturn.mjs 2.4375"
  for d in 1 2.4375; do
    for t in tablet panels resize; do run tab-$t-$d tablet "node $t.mjs $d"; done
    run tab-snap-$d tablet "node snap.mjs $d"; run tab-compare-$d tablet "node compare.mjs $d"
    run tab-classic-$d tablet "NOTWIN=1 WINS=$WINS_CLASSIC node classic.mjs $d"
  done
  run tab-voids tablet "node voids.mjs"
  ;;
L4)
  run rc-qsplit1 hfix2 "node qsplit.mjs 1"; run rc-qsplitmsg1 hfix2 "MODE=msg node qsplit.mjs 1"
  run rc-qsplit2 hfix2 "node qsplit.mjs 2.4375"; run rc-qsplitmsg2 hfix2 "MODE=msg node qsplit.mjs 2.4375"
  run rc-qmore1 hfix2 "node qmore.mjs 1"; run rc-qmore2 hfix2 "node qmore.mjs 2.4375"
  run fx-samepage1 hfix2 "node samepage.mjs 1"; run fx-samepage2 hfix2 "node samepage.mjs 2.4375"
  run fx-classicturn1 hfix2 "node classicturn.mjs 1"; run fx-classicturn2 hfix2 "TAGS=small,lucas node classicturn.mjs 2.4375"
  run rc-sweep1 hfix2 "node sweep.mjs 1"; run rc-sweep2 hfix2 "TAGS=p390,small node sweep.mjs 2.4375"
  run rc-eat1 hfix2 "node eat.mjs 1"; run rc-eat2 hfix2 "node eat.mjs 2.4375"
  for d in 1 2.4375; do
    for t in screens panels resize phones classic extras rotate mapclick wheel monitor; do run s-$t-$d screens "node $t.mjs $d"; done
    run tf-fixes-$d tabfix "node fixes.mjs $d"; run tf-dcheck-$d tabfix "node dcheck.mjs $d"
  done
  ;;
L5)
  # the reviewers' probes: the layers re-check's (layers/rc/restx.sh) and the
  # tablet re-check's (tabrecheck), for comparison with their earlier logs
  run rv-guardrad rvlayers "RAD=15 OUTDIR=$WT/final/rvout node guardrad.mjs 1 | tail -3"
  run rv-probeL rvlayers "node probe.mjs 896x443 1 basics,heregroup,rebuildStates,beyondHalo,leaks,radii,softKbd,switchLayout,pinLeak,bounce,afterClose,moreBand,doubleTap,restAbove"
  run rv-probeP rvlayers "node probe.mjs 443x939 1 basics,heregroup,rebuildStates,beyondHalo,leaks,radii,softKbd,switchLayout,pinLeak,afterClose,moreBand,doubleTap,restAbove"
  run rv-perf rvlayers "node perf.mjs"
  run lrev-fat1 lrev "node fat.mjs 1"; run lrev-fat2 lrev "node fat.mjs 2.4375"; run lrev-pins lrev "node pins.mjs"
  run fin-pins layers/fin "node pins.mjs"; run fin-busy layers/fin "node busy.mjs"; run fin-lit layers/fin "node lit.mjs"
  run rc-budget recheck "node budget.mjs"; run rc-budgetdpr recheck "node budget-dpr.mjs"; run rc-ghost recheck "node ghostclick.mjs"; run rc-ghostdpr recheck "node ghostclick-dpr.mjs"; run rc-menudone recheck "node menudone.mjs"
  run hr-classic1 header-review "node classic.mjs 1"; run hr-gest1 header-review "node gest.mjs 1"; run hr-moreturn1 header-review "node moreturn.mjs 1"; run hr-probe1 header-review "node probe.mjs 1"; run hr-textscale header-review "node textscale.mjs 1"
  run tester-idle layers/tester "node idleprobe.mjs"; run tester-stick layers/tester "node stickprobe.mjs"; run tester-flick layers/tester "node flickprobe.mjs"
  for d in 1 2.4375; do for z in z2 z3 z4 z9 z10 z11; do run tr-$z-$d tablet-review "node $z.mjs $d"; done; done
  for d in 1 2.4375; do run trc-log-$d tabrecheck "node log.mjs $d"; run trc-chips-$d tabrecheck "node chips.mjs $d"; run trc-inv-$d tabrecheck "node inv.mjs $d"; done
  run trc-drift tabrecheck "node drift.mjs"; run trc-ring tabrecheck "node ring.mjs"
  run tabrev-portrait tabrev "node portrait.mjs"
  ;;
fix)
  # after the log panel's fix (a full history, a re-wrapped top line): every
  # suite that scrolls, fills or moves a panel, and classic beside it
  for d in 1 2.4375; do
    run trc-log-$d tabrecheck "node log.mjs $d"; run trc-inv-$d tabrecheck "node inv.mjs $d"; run trc-chips-$d tabrecheck "node chips.mjs $d"
    run tf-fixes-$d tabfix "node fixes.mjs $d"; run tf-dcheck-$d tabfix "node dcheck.mjs $d"
    run tab-panels-$d tablet "node panels.mjs $d"; run tab-tablet-$d tablet "node tablet.mjs $d"; run tab-resize-$d tablet "node resize.mjs $d"
    run s-screens-$d screens "node screens.mjs $d"; run s-panels-$d screens "node panels.mjs $d"; run s-rotate-$d screens "node rotate.mjs $d"
    run s-wheel-$d screens "node wheel.mjs $d"; run s-monitor-$d screens "node monitor.mjs $d"; run s-classic-$d screens "node classic.mjs $d"
    for z in z2 z3 z4 z9 z10 z11; do run tr-$z-$d tablet-review "node $z.mjs $d"; done
  done
  run trc-drift tabrecheck "node drift.mjs"
  ;;
taps)
  for r in "1 0" "2.4375 0" "1 16"; do
    set -- $r
    for s in 896x443 443x939 360x640 390x844; do
      ( start=$(date +%s); (cd $WT/layers/tester && node taps.mjs $1 $2 $s) 2>&1 | grep -v "$FL" > $F/logs/taps-$1-r$2-$s.log
        echo "$(( $(date +%s)-start ))s taps $1 r$2 $s :: $(tail -1 $F/logs/taps-$1-r$2-$s.log)" >> $F/logs/taps.sum ) &
    done
    wait
  done
  ;;
esac
echo DONE >> $F/logs/$L.sum
