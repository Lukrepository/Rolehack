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
run rv-guardrad rvlayers "RAD=15 OUTDIR=$WT/layers/rc2/rvout node guardrad.mjs 1 | tail -3"
run rv-probeL rvlayers "node probe.mjs 896x443 1 basics,heregroup,rebuildStates,beyondHalo,leaks,radii,softKbd,switchLayout,pinLeak,bounce,afterClose,moreBand,doubleTap,restAbove"
run rv-probeP rvlayers "node probe.mjs 443x939 1 basics,heregroup,rebuildStates,beyondHalo,leaks,radii,softKbd,switchLayout,pinLeak,afterClose,moreBand,doubleTap,restAbove"
run rv-newgame rvlayers "node newgame.mjs 896x443"; run rv-perf rvlayers "node perf.mjs"
run lrev-fat1 lrev "node fat.mjs 1"; run lrev-fat2 lrev "node fat.mjs 2.4375"; run lrev-pins lrev "node pins.mjs"
run fin-pins layers/fin "node pins.mjs"; run fin-busy layers/fin "node busy.mjs"; run fin-lit layers/fin "node lit.mjs"
run rc-budget recheck "node budget.mjs"; run rc-budgetdpr recheck "node budget-dpr.mjs"; run rc-ghost recheck "node ghostclick.mjs"; run rc-ghostdpr recheck "node ghostclick-dpr.mjs"; run rc-menudone recheck "node menudone.mjs"
run hr-classic1 header-review "node classic.mjs 1"; run hr-gest1 header-review "node gest.mjs 1"; run hr-moreturn1 header-review "node moreturn.mjs 1"; run hr-probe1 header-review "node probe.mjs 1"; run hr-textscale header-review "node textscale.mjs 1"
run tester-idle layers/tester "node idleprobe.mjs"; run tester-stick layers/tester "node stickprobe.mjs"; run tester-flick layers/tester "node flickprobe.mjs"
echo DONE >> $F/logs/$L.sum
