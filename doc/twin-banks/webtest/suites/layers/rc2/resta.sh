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
  run header-taps header "node taps.mjs; node desk.mjs | tail -1; node chips.mjs | tail -1"
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
  # the reviewers' own repros
  run hadv-blank1 hadv "node blank1.mjs"; run hadv-blank hadv "node blank.mjs"; run hadv-pagefull hadv "node pagefull.mjs"
  run hadv-hidden hadv "node hidden.mjs"; run hdr-moreturnP hdr-adv "node moreturn2.mjs 1 P"; run hdr-moreturnL hdr-adv "node moreturn2.mjs 1 L"
  run hdr-turnidle hdr-adv "node turnidle.mjs"; run hdr-whole hdr-adv "node whole.mjs"; run hdr-chipghost hdr-adv "node chipghost3.mjs"
  run tester-probe-switch header/tester "node probe-switch.mjs 360x640"
  # the re-check's repros (hrecheck) and this fix's own (hfix2)
echo DONE >> $F/logs/$L.sum
