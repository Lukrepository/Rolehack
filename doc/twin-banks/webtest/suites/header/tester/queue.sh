#!/bin/bash
# the rest of the runs, after the --More-- runs finish
cd /tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/header/tester
while pgrep -f "[n]ode more.mjs" >/dev/null; do sleep 5; done
node classic.mjs 1 > classic-1.log 2>&1 &
node gestures.mjs 2.4375 > gestures-2.4375.log 2>&1 &
wait
node taps.mjs 1 > taps-1.log 2>&1 &
node classic.mjs 2.4375 > classic-2.4375.log 2>&1 &
wait
