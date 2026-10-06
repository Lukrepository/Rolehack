#!/bin/bash
# The tester's own copy of HEAD's page files over the deployed build (same
# nethack.wasm), served on 8769: the classic baseline.
set -e
SP=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad
DST=$SP/webtest/header/tester/head-site
mkdir -p "$DST"
cp -r "$SP"/testsite/* "$DST"/
cd /home/user/Rolehack
for f in $(git ls-tree --name-only HEAD win/web/ | grep -E '\.(js|css|html|json|nh)$'); do
  git show "HEAD:$f" > "$DST/$(basename "$f")"
done
git show HEAD:win/web/sw.js | sed "s/__VERSION__/head$(date +%s)/" > "$DST/sw.js"
if ! curl -s -o /dev/null http://localhost:8769/index.html; then
  (cd "$DST" && nohup python3 -m http.server 8769 >/dev/null 2>&1 &)
  sleep 1
fi
echo "HEAD $(git rev-parse --short HEAD) -> $DST on 8769"
