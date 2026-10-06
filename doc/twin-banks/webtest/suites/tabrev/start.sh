#!/bin/bash
# start.sh WxH dpr [touch|mouse] [fresh]
D=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/tabrev
cd $D
rm -f driver.ready driver.resumed driver.err cmd.js out.json
nohup node driver.mjs "$@" > driver.log 2>&1 &
for i in $(seq 1 100); do [ -f driver.resumed ] && break; sleep 1; done
cat driver.err 2>/dev/null
echo started
