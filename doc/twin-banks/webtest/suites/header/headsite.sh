#!/bin/bash
# HEAD's page files (git HEAD of the Rolehack checkout) over the deployed build
# of the same commit (testsite's nethack.wasm), served on 8768: the classic
# baseline for classic.mjs.
set -e
SP=/tmp/claude-0/-home-user/1f4c6304-ab2c-5e82-982d-3df83f263ee2/scratchpad
DST=$SP/webtest/header/head-site
# overwritten in place, never removed: the server on 8768 serves from this directory
mkdir -p "$DST"
cp -r "$SP"/testsite/* "$DST"/
cd /home/user/Rolehack
for f in $(git ls-tree --name-only HEAD win/web/ | grep -E '\.(js|css|html|json|nh)$'); do
  git show "HEAD:$f" > "$DST/$(basename "$f")"
done
git show HEAD:win/web/sw.js | sed "s/__VERSION__/head$(date +%s)/" > "$DST/sw.js"
git rev-parse --short HEAD > "$DST/HEAD.txt"
if ! curl -s -o /dev/null http://localhost:8768/index.html; then
  (cd "$DST" && nohup python3 -m http.server 8768 >/dev/null 2>&1 &)
  sleep 1
fi
echo "HEAD $(cat "$DST/HEAD.txt") page files -> $DST; serving http://localhost:8768/"
