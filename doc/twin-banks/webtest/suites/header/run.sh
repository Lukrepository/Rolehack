#!/bin/bash
# Every check of the stage "The header over the banks, and the map cell".
#   ./run.sh            both densities, then the taps and the desk smoke test
#   ./run.sh 2.4375     one density only (two shells can run 1 and 2.4375 at once)
#   ./run.sh taps       the tap drift check (both densities inside), desk.mjs, chips.mjs
# Logs: <name>-<dpr>.log; results: <name>-<dpr>.json; screenshots: shots/.
# Needs the working tree synced (websync.sh, port 8766) and, for classic.mjs,
# HEAD's page files on 8768 (headsite.sh); both are done here first.
D=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad
bash $D/websync.sh >/dev/null
cd $D/webtest/header
./headsite.sh >/dev/null
ARGS=${@:-1 2.4375 taps}
for a in $ARGS; do
  if [ "$a" = taps ]; then
    node taps.mjs > taps.log 2>&1; echo "taps: $(tail -1 taps.log)"
    node desk.mjs > desk.log 2>&1; echo "desk: $(tail -1 desk.log)"
    node chips.mjs > chips.log 2>&1; echo "chips: $(tail -1 chips.log)"
    continue
  fi
  for t in header more more-turn map classic; do
    node $t.mjs $a > $t-$a.log 2>&1; echo "$t @$a: $(tail -1 $t-$a.log)"
  done
done
(cd /home/user/Rolehack && node --test win/web/test/ 2>&1 | grep -E '^# (pass|fail)')
