#!/bin/bash
D=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad/webtest/hreview
cat $D/lib.js - | curl -s -X POST --data-binary @- "http://localhost:$1/"
