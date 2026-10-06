#!/bin/bash
# rects.mjs under the variants: system text 1.5 and 2, caseless, compact status, Message size 1.4
cd /tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/header/tester
D=${1:-1}
VARIANT=text1.5 TEXT=1.5 node rects.mjs $D rows > rects-$D-text1.5.log 2>&1
VARIANT=text2 TEXT=2 node rects.mjs $D columns > rects-$D-text2.log 2>&1
VARIANT=caseless VPREFS='{"case":false}' node rects.mjs $D > rects-$D-caseless.log 2>&1
VARIANT=compact VPREFS='{"statusLines":"compact"}' node rects.mjs $D columns > rects-$D-compact.log 2>&1
VARIANT=msg1.4 VPREFS='{"msgSize":1.4}' node rects.mjs $D > rects-$D-msg1.4.log 2>&1
for v in text1.5 text2 caseless compact msg1.4; do echo "$v: $(tail -1 rects-$D-$v.log)"; done
