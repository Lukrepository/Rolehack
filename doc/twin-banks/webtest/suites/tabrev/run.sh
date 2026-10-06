#!/bin/bash
D=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/tabrev
rm -f $D/out.json
printf '%s' "$1" > $D/cmd.tmp && mv $D/cmd.tmp $D/cmd.js
[ "$1" = QUIT ] && { sleep 2; exit 0; }
for i in $(seq 1 900); do [ -f $D/out.json ] && break; sleep 0.1; done
cat $D/out.json; echo
